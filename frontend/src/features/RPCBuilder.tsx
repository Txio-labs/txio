
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, appStore } from '@/lib/store';
import { useWallet } from '@/wallet';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { RequestPanel } from '../components/RequestPanel/RequestPanel';
import { RequestItem, RequestType, Network } from '../types';
import {
    executeSuiRpc,
    looksLikeSuiNs,
    resolveSuiAddress,
    simulateMoveCall,
    signAndExecuteMoveCall,
    SuiRpcError,
} from '../services/suiService';
import { ADDRESS_FIRST_PARAM_METHODS } from '@/lib/constants';
import { SignTransactionModal } from '../components/SignTransactionModal';
import { NetworkSwitcherModal } from '../components/NetworkSwitcherModal';
import {
    ensureTerminalOpen,
    logCommandToTerminal
} from '@/lib/terminalLog';

const ZERO_ADDRESS =
    '0x0000000000000000000000000000000000000000000000000000000000000000';

const resolveVariables = (
    raw: string,
    vars: { key: string; value: string }[]
): string =>
    vars.reduce(
        (str, v) =>
            str.replaceAll(`{{${v.key}}}`, v.value),
        raw
    );

const resolveRequestVars = (
    request: RequestItem,
    vars: { key: string; value: string }[]
): RequestItem => {
    if (!vars.length) return request;

    if (request.type === RequestType.RPC) {
        try {
            const raw = JSON.stringify(request.rpcParams.params);
            const resolved = resolveVariables(raw, vars);
            return {
                ...request,
                rpcParams: {
                    ...request.rpcParams,
                    method: resolveVariables(request.rpcParams.method, vars),
                    params: JSON.parse(resolved)
                }
            };
        } catch {
            return request;
        }
    }

    const mp = request.moveParams;
    return {
        ...request,
        moveParams: {
            ...mp,
            packageId: resolveVariables(mp.packageId, vars),
            module: resolveVariables(mp.module, vars),
            function: resolveVariables(mp.function, vars),
            typeArguments: mp.typeArguments.map((t: string) =>
                resolveVariables(t, vars)
            ),
            arguments: mp.arguments.map((a: any) => ({
                ...a,
                value: resolveVariables(String(a.value), vars)
            }))
        }
    };
};

export const RPCBuilder: React.FC = () => {
    const {
        tabs,
        activeTabId,
        network,
        envVariables,
    } = useAppStore();
    const { currentWallet, openModal } = useWallet();
    const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
    const activeTab = tabs.find(t => t.id === activeTabId);
    const connectedAddress = currentWallet?.family === 'sui' ? currentWallet.address : null;

    const [isLoading, setIsLoading] = useState(false);
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [isNetworkSwitchOpen, setIsNetworkSwitchOpen] = useState(false);
    const [isExecuteMode, setIsExecuteMode] = useState(false);
    const [pendingNetwork, setPendingNetwork] = useState<Network | null>(null);

    const request = activeTab?.data as RequestItem;

    useEffect(() => {
        if (
            activeTabId &&
            request &&
            request.network !== network
        ) {
            appStore.finalizeRequest(
                activeTabId,
                request.type === RequestType.RPC
                    ? 'rpc'
                    : 'ptb',
                {
                    ...request,
                    network
                }
            );
        }
    }, [
        activeTabId,
        network,
        request
    ]);

    const handleRequestChange = (updatedReq: RequestItem) => {
        if (activeTabId) {
            appStore.finalizeRequest(activeTabId, updatedReq.type === RequestType.RPC ? 'rpc' : 'ptb', updatedReq);
        }
    };

    const handleSend = async () => {
        if (!request) return;
        await executeCall();
    };

    const executeCall = async (
        simulationSender = connectedAddress ||
            ZERO_ADDRESS
    ) => {
        if (!request) {
            return;
        }

        setIsLoading(true);

        const resolved = resolveRequestVars(request, envVariables);

        // Auto-resolve SuiNS in the first param for address-taking RPC methods.
        if (
            resolved.type === RequestType.RPC &&
            ADDRESS_FIRST_PARAM_METHODS.has(resolved.rpcParams.method) &&
            Array.isArray(resolved.rpcParams.params) &&
            typeof resolved.rpcParams.params[0] === 'string' &&
            looksLikeSuiNs(resolved.rpcParams.params[0])
        ) {
            const originalName = resolved.rpcParams.params[0];
            try {
                const address = await resolveSuiAddress(network, originalName);
                resolved.rpcParams = {
                    ...resolved.rpcParams,
                    params: [address, ...resolved.rpcParams.params.slice(1)],
                };
            } catch (err) {
                const message =
                    err instanceof Error && err.message.trim()
                        ? err.message
                        : `Could not resolve ${originalName}`;
                appStore.pushLog(`SuiNS resolution failed: ${message}`, 'cli', 'error');
                setIsLoading(false);
                return;
            }
        }

        const commandLine =
            resolved.type === RequestType.TRANSACTION
                ? `txio sui simulate ${resolved.moveParams.packageId}::${resolved.moveParams.module}::${resolved.moveParams.function}`
                : `txio sui call --method ${resolved.rpcParams.method}${
                      resolved.rpcParams.params?.length
                          ? ` --params ${JSON.stringify(resolved.rpcParams.params)}`
                          : ''
                  }`;

        ensureTerminalOpen();

        try {
            let res;

            if (
                resolved.type ===
                RequestType.TRANSACTION
            ) {
                const {
                    packageId,
                    module,
                    function: func,
                    typeArguments,
                    arguments: args
                } = resolved.moveParams;

                res =
                    await simulateMoveCall(
                        network,
                        simulationSender,
                        packageId,
                        module,
                        func,
                        typeArguments,
                        args
                    );
            } else {
                res =
                    await executeSuiRpc(
                        network,
                        resolved.rpcParams.method,
                        resolved.rpcParams.params
                    );
            }

            const { result, duration, status } = res;

            appStore.addToHistory(request, status, duration);

            logCommandToTerminal({
                command: commandLine,
                network,
                body: result,
                status,
                duration,
                successLabel:
                    request.type === RequestType.RPC
                        ? 'executed'
                        : 'simulated'
            });
        } catch (error) {
            const rpcError =
                error instanceof SuiRpcError
                    ? error
                    : null;
            const message =
                error instanceof Error &&
                error.message.trim()
                    ? error.message
                    : 'Request failed.';

            appStore.addToHistory(
                request,
                rpcError?.status ?? 500,
                rpcError?.duration ?? 0
            );

            logCommandToTerminal({
                command: commandLine,
                network,
                error: message,
                status: rpcError?.status ?? 500,
                duration: rpcError?.duration
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReviewSimulation = (
        signer: string
    ) => {
        setIsSignModalOpen(false);
        void executeCall(signer);
    };

    const handleExecuteTransaction = async () => {
        if (!request || !connectedAddress) return;

        // Check if trying to execute on mainnet - show network switch confirmation
        if (network === 'mainnet') {
            setPendingNetwork(network);
            setIsNetworkSwitchOpen(true);
            return;
        }

        await executeRealTransaction();
    };

    const executeRealTransaction = async () => {
        if (!request || !connectedAddress) return;

        setIsLoading(true);
        setIsNetworkSwitchOpen(false);

        const resolved = resolveRequestVars(request, envVariables);

        const commandLine =
            resolved.type === RequestType.TRANSACTION
                ? `txio sui execute ${resolved.moveParams.packageId}::${resolved.moveParams.module}::${resolved.moveParams.function}`
                : `txio sui call --method ${resolved.rpcParams.method}${
                      resolved.rpcParams.params?.length
                          ? ` --params ${JSON.stringify(resolved.rpcParams.params)}`
                          : ''
                  }`;

        ensureTerminalOpen();

        try {
            let res;

            if (resolved.type === RequestType.TRANSACTION) {
                const {
                    packageId,
                    module,
                    function: func,
                    typeArguments,
                    arguments: args
                } = resolved.moveParams;

                res = await signAndExecuteMoveCall(
                    network,
                    connectedAddress,
                    packageId,
                    module,
                    func,
                    typeArguments,
                    args,
                    signAndExecuteTransaction
                );
            } else {
                throw new Error('Execute mode is only supported for Move calls, not raw RPC requests.');
            }

            const { result, duration, status } = res;

            appStore.addToHistory(request, status, duration);

            logCommandToTerminal({
                command: commandLine,
                network,
                body: result,
                status,
                duration,
                successLabel: 'executed',
                isExecution: true
            });
        } catch (error) {
            const rpcError =
                error instanceof SuiRpcError
                    ? error
                    : null;
            const message =
                error instanceof Error &&
                error.message.trim()
                    ? error.message
                    : 'Transaction execution failed.';

            appStore.addToHistory(
                request,
                rpcError?.status ?? 500,
                rpcError?.duration ?? 0
            );

            logCommandToTerminal({
                command: commandLine,
                network,
                error: message,
                status: rpcError?.status ?? 500,
                duration: rpcError?.duration
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!request) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col h-full overflow-hidden bg-near-black"
        >
            <div className="flex-1 flex flex-col min-h-0">
                <RequestPanel
                    request={request}
                    network={network}
                    isLoading={isLoading}
                    onChange={handleRequestChange}
                    onSend={handleSend}
                    onExecute={() => setIsSignModalOpen(true)}
                    activeAddress={connectedAddress}
                    envVars={envVariables}
                />
            </div>

            <SignTransactionModal
                isOpen={isSignModalOpen}
                onClose={() => setIsSignModalOpen(false)}
                onConfirm={handleReviewSimulation}
                onExecute={handleExecuteTransaction}
                wallet={currentWallet}
                onRequestConnect={openModal}
                request={request}
            />

            <NetworkSwitcherModal
                isOpen={isNetworkSwitchOpen}
                onClose={() => setIsNetworkSwitchOpen(false)}
                onConfirm={executeRealTransaction}
                from={network}
                to={pendingNetwork || network}
            />
        </motion.div>
    );
};
