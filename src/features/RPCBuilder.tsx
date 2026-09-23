
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, appStore } from '@/lib/store';
import { useWallet } from '@/wallet';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { RequestPanel } from '../components/RequestPanel/RequestPanel';
import { RequestOutcome, TxProgress } from '../components/RequestPanel/response/types';
import { RequestItem, RequestType, Network, AssertionResult } from '../types';
import {
    executeChainRpc,
    looksLikeSuiNs,
    resolveChainRpcUrl,
    resolveSuiAddress,
    SuiRpcError,
} from '../services/suiService';
import {
    describeTransaction,
    executeTransaction,
    getTxChain,
    isMainnetExecution,
    signerAddressFor,
    simulateTransaction
} from '../services/transactionService';
import { sendSolanaTransaction } from '@/wallet';
import { ADDRESS_FIRST_PARAM_METHODS } from '@/lib/constants';
import { SignTransactionModal } from '../components/SignTransactionModal';
import { NetworkSwitcherModal } from '../components/NetworkSwitcherModal';
import { MainnetExecutionWarningModal } from '../components/MainnetExecutionWarningModal';
import {
    ensureTerminalOpen,
    logCommandToTerminal
} from '@/lib/terminalLog';
import { runHooks } from '@/lib/hooksEngine';
import { evaluateAssertions, logAssertionResults } from '@/lib/assertionsEngine';

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

    // Non-Sui transaction params are plain strings throughout, so a JSON
    // round-trip substitutes variables in every field at once.
    const resolveDeep = <T,>(value: T | undefined): T | undefined => {
        if (value === undefined) return value;
        try {
            return JSON.parse(resolveVariables(JSON.stringify(value), vars)) as T;
        } catch {
            return value;
        }
    };

    const mp = request.moveParams;
    return {
        ...request,
        evmTxParams: resolveDeep(request.evmTxParams),
        solanaTxParams: resolveDeep(request.solanaTxParams),
        stellarTxParams: resolveDeep(request.stellarTxParams),
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
    const request = activeTab?.data as RequestItem;
    // The signer is whichever connected wallet matches this request's chain.
    const connectedAddress = request ? signerAddressFor(request, currentWallet) : null;

    const [isLoading, setIsLoading] = useState(false);
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [isNetworkSwitchOpen, setIsNetworkSwitchOpen] = useState(false);
    const [isMainnetWarningOpen, setIsMainnetWarningOpen] = useState(false);
    const [isExecuteMode, setIsExecuteMode] = useState(false);
    const [pendingNetwork, setPendingNetwork] = useState<Network | null>(null);
    const [testResults, setTestResults] = useState<AssertionResult[]>([]);
    const [outcome, setOutcome] = useState<RequestOutcome | null>(null);
    const [txProgress, setTxProgress] = useState<TxProgress | null>(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTestResults([]);
        setOutcome(null);
        setTxProgress(null);
    }, [activeTabId]);

    useEffect(() => {
        if (
            activeTabId &&
            request &&
            request.network !== network
        ) {
            appStore.finalizeRequest(
                activeTabId,
                'rpc',
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

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMainnetWarningOpen(false);
    }, [network, connectedAddress]);

    const handleRequestChange = (updatedReq: RequestItem) => {
        if (activeTabId) {
            appStore.finalizeRequest(activeTabId, 'rpc', updatedReq);
        }
    };

    const handleSend = async () => {
        if (!request) return;
        await executeCall();
    };

    const executeCall = async () => {
        if (!request) {
            return;
        }

        setIsLoading(true);
        setTxProgress(null);
        setOutcome(null);

        await runHooks(request.hooks, 'pre', network);

        const activeEnvVars = appStore.getSnapshot().envVariables.filter(
            v => v.enabled && (!v.network || v.network === 'all' || v.network === network)
        );
        const resolved = resolveRequestVars(request, activeEnvVars);

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
                    ? `txio ${getTxChain(resolved)} simulate ${describeTransaction(resolved).target}`
                    : `txio ${resolved.rpcParams.chain ?? 'sui'} call --method ${resolved.rpcParams.method}${
                          resolved.rpcParams.params?.length
                              ? ` --params ${JSON.stringify(resolved.rpcParams.params)}`
                              : ''
                      }`;

        ensureTerminalOpen();

        try {
            let res;

            if (resolved.type === RequestType.TRANSACTION) {
                res = await simulateTransaction(resolved, {
                    network,
                    wallet: currentWallet
                });
            } else if (
                resolved.rpcParams.chain === 'solana' &&
                resolved.solanaTxParams
            ) {
                if (!currentWallet || currentWallet.family !== 'solana') {
                    throw new Error('Connect a Solana wallet to sign this transaction.');
                }

                const startTime = performance.now();
                const rpcUrl = resolveChainRpcUrl('solana', network);
                const { signature } = await sendSolanaTransaction({
                    walletId: currentWallet.id,
                    rpcUrl,
                    programId: resolved.solanaTxParams.programId,
                    accounts: resolved.solanaTxParams.accounts,
                    data: resolved.solanaTxParams.data,
                    dataEncoding: resolved.solanaTxParams.dataEncoding
                });
                const duration = Math.round(performance.now() - startTime);

                res = { result: { signature }, duration, status: 200 };
            } else {
                res =
                    await executeChainRpc(
                        resolved.rpcParams.chain ?? 'sui',
                        network,
                        resolved.rpcParams.method,
                        resolved.rpcParams.params,
                        resolved.rpcParams.evmChainId
                    );
            }

            const { result, duration, status } = res;

            await runHooks(request.hooks, 'post', network, result);

            appStore.addToHistory(request, status, duration, result);

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

            setOutcome({ status, duration, timestamp: Date.now(), result });

            const results = evaluateAssertions(request.tests, {
                requestType: resolved.type,
                httpStatus: status,
                duration,
                result,
                sender: connectedAddress ?? undefined
            });
            setTestResults(results);
            logAssertionResults(results, network);
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
                rpcError?.duration ?? 0,
                (error as { result?: unknown })?.result
            );

            logCommandToTerminal({
                command: commandLine,
                network,
                error: message,
                status: rpcError?.status ?? 500,
                duration: rpcError?.duration
            });

            setOutcome({
                status: rpcError?.status ?? 500,
                duration: rpcError?.duration ?? 0,
                timestamp: Date.now(),
                error: message
            });

            const results = evaluateAssertions(request.tests, {
                requestType: resolved.type,
                httpStatus: rpcError?.status ?? 500,
                duration: rpcError?.duration,
                error: message,
                sender: connectedAddress ?? undefined
            });
            setTestResults(results);
            logAssertionResults(results, network);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReviewSimulation = () => {
        setIsSignModalOpen(false);
        void executeCall();
    };

    const handleExecuteTransaction = async () => {
        if (!request || !connectedAddress) return;
        if (isLoading || isMainnetWarningOpen) return;

        // Spending real funds — confirm first.
        if (isMainnetExecution(request, network)) {
            setIsMainnetWarningOpen(true);
            return;
        }

        await executeRealTransaction();
    };

    const executeRealTransaction = async () => {
        if (!request || !connectedAddress) return;

        setIsLoading(true);
        setIsMainnetWarningOpen(false);
        setOutcome(null);
        setTxProgress({ stage: 'awaiting-signature' });

        await runHooks(request.hooks, 'pre', network);

        const activeEnvVars = appStore.getSnapshot().envVariables.filter(
            v => v.enabled && (!v.network || v.network === 'all' || v.network === network)
        );
        const resolved = resolveRequestVars(request, activeEnvVars);

        const commandLine = `txio ${getTxChain(resolved)} execute ${describeTransaction(resolved).target}`;

        ensureTerminalOpen();

        try {
            let res;

            if (resolved.type !== RequestType.TRANSACTION) {
                throw new Error('Only transaction requests can be signed and executed.');
            }
            res = await executeTransaction(resolved, {
                network,
                wallet: currentWallet,
                suiSignAndExecute: signAndExecuteTransaction,
                onProgress: setTxProgress
            });

            const { result, duration, status } = res;

            await runHooks(request.hooks, 'post', network, result);

            appStore.addToHistory(request, status, duration, result);

            logCommandToTerminal({
                command: commandLine,
                network,
                body: result,
                status,
                duration,
                successLabel: 'executed',
                isExecution: true
            });

            setOutcome({ status, duration, timestamp: Date.now(), result });

            const results = evaluateAssertions(request.tests, {
                requestType: resolved.type,
                httpStatus: status,
                duration,
                result,
                sender: connectedAddress ?? undefined
            });
            setTestResults(results);
            logAssertionResults(results, network);
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

            setTxProgress((prev) => ({ ...(prev ?? {}), stage: 'failed' }));

            appStore.addToHistory(
                request,
                rpcError?.status ?? 500,
                rpcError?.duration ?? 0,
                (error as { result?: unknown })?.result
            );

            logCommandToTerminal({
                command: commandLine,
                network,
                error: message,
                status: rpcError?.status ?? 500,
                duration: rpcError?.duration
            });

            setOutcome({
                status: rpcError?.status ?? 500,
                duration: rpcError?.duration ?? 0,
                timestamp: Date.now(),
                error: message,
                result: (error as { result?: unknown })?.result
            });

            const results = evaluateAssertions(request.tests, {
                requestType: resolved.type,
                httpStatus: rpcError?.status ?? 500,
                duration: rpcError?.duration,
                error: message,
                sender: connectedAddress ?? undefined
            });
            setTestResults(results);
            logAssertionResults(results, network);
        } finally {
            setIsLoading(false);
        }
    };

    if (!request) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col h-full overflow-hidden bg-white dark:bg-near-black"
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
                    testResults={testResults}
                    outcome={outcome}
                    txProgress={txProgress}
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

            <MainnetExecutionWarningModal
                isOpen={isMainnetWarningOpen}
                onClose={() => setIsMainnetWarningOpen(false)}
                onConfirm={executeRealTransaction}
            />
        </motion.div>
    );
};
