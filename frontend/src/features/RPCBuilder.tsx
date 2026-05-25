
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, appStore } from '@/lib/store';
import { resolveRpcUrl } from '@/lib/appConfig';
import { useWallet } from '@/wallet';
import { RequestPanel } from '../components/RequestPanel/RequestPanel';
import { ResponsePanel } from '../components/ResponsePanel/ResponsePanel';
import { RequestItem, RequestType } from '../types';
import {
    executeSuiRpc,
    simulateMoveCall,
    SuiRpcError,
} from '../services/suiService';
import { SignTransactionModal } from '../components/SignTransactionModal';
import { GripHorizontal } from 'lucide-react';

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
        settings
    } = useAppStore();
    const { currentWallet, openModal } = useWallet();
    const activeTab = tabs.find(t => t.id === activeTabId);
    const connectedAddress = currentWallet?.family === 'sui' ? currentWallet.address : null;
    
    // Local state for the current request execution
    const [response, setResponse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);
    const [status, setStatus] = useState<number | undefined>(undefined);
    const [duration, setDuration] = useState<number | undefined>(undefined);
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);

    // Layout State
    const [responseHeight, setResponseHeight] = useState(250);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    // Synchronize tab data with the panel
    const request = activeTab?.data as RequestItem;
    const endpoint = resolveRpcUrl(
        network,
        settings
    );

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

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newHeight = containerRect.bottom - e.clientY;
            
            // Constraints
            const maxHeight = containerRect.height - 100; // Leave space for request
            const minHeight = 48; // Collapsed state (header only approx)
            
            setResponseHeight(Math.max(minHeight, Math.min(newHeight, maxHeight)));
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const startDragging = () => {
        isDragging.current = true;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    };

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
        setError(undefined);
        setResponse(null);
        setStatus(undefined);
        setDuration(undefined);
        // Expand response panel if it's too small when sending
        if (responseHeight < 100) setResponseHeight(250);

        const resolved = resolveRequestVars(request, envVariables);

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

            const {
                result,
                duration,
                status
            } = res;

            setResponse(result);
            setDuration(duration);
            setStatus(status);

            appStore.addToHistory(
                request,
                status,
                duration
            );
            appStore.pushLog(
                `${request.type === RequestType.RPC ? 'Executed' : 'Simulated'} ${request.name}`,
                network,
                'request'
            );
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

            setError(message);
            setStatus(
                rpcError?.status ?? 500
            );
            setDuration(
                rpcError?.duration
            );

            appStore.addToHistory(
                request,
                rpcError?.status ?? 500,
                rpcError?.duration ?? 0
            );
            appStore.pushLog(
                `Failed ${request.type === RequestType.RPC ? 'RPC' : 'simulation'} ${request.name}: ${message}`,
                network,
                'error'
            );
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

    if (!request) return null;

    const hasResponsePanelContent =
        isLoading ||
        response !== null && response !== undefined ||
        !!error;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            ref={containerRef} 
            className="flex flex-col h-full overflow-hidden bg-near-black"
        >
            {/* Top half: Request Configuration */}
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

            {hasResponsePanelContent && (
                <>
                    {/* Drag Handle */}
                    <div 
                        onMouseDown={startDragging}
                        className="h-1.5 bg-near-black hover:bg-electric-violet/50 cursor-row-resize transition-colors z-20 shrink-0 border-t border-b border-white/5 flex items-center justify-center group"
                    >
                        <div className="w-12 h-0.5 bg-slate-800 group-hover:bg-soft-purple rounded-full transition-all duration-300 group-hover:w-24" />
                    </div>

                    {/* Bottom half: Response Inspection */}
                    <motion.div 
                        animate={{ height: responseHeight }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                        className="min-h-0 shrink-0 flex flex-col shadow-[0_-8px_20px_rgba(0,0,0,0.4)] z-10 bg-dark-indigo-glow"
                    >
                        <ResponsePanel 
                            requestId={activeTabId || undefined}
                            request={request}
                            response={response}
                            isLoading={isLoading}
                            error={error}
                            status={status}
                            duration={duration}
                            endpoint={endpoint}
                        />
                    </motion.div>
                </>
            )}

            <SignTransactionModal 
                isOpen={isSignModalOpen}
                onClose={() => setIsSignModalOpen(false)}
                onConfirm={handleReviewSimulation}
                wallet={currentWallet}
                onRequestConnect={openModal}
                request={request}
            />
        </motion.div>
    );
};
