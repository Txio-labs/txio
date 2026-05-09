
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore, appStore } from '@/lib/store';
import { RequestPanel } from '../components/RequestPanel/RequestPanel';
import { ResponsePanel } from '../components/ResponsePanel/ResponsePanel';
import { RequestItem, RequestType } from '../types';
import { executeSuiRpc, simulateMoveCall } from '../services/suiService';
import { SignTransactionModal } from '../components/SignTransactionModal';
import { GripHorizontal } from 'lucide-react';
import { NETWORKS } from '@/lib/constants';

export const RPCBuilder: React.FC = () => {
    const { tabs, activeTabId, network, connectedAddress, envVariables } = useAppStore();
    const activeTab = tabs.find(t => t.id === activeTabId);
    
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
    const endpoint = NETWORKS[network];

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
        executeCall();
    };

    const executeCall = async () => {
        setIsLoading(true);
        setError(undefined);
        setResponse(null);
        // Expand response panel if it's too small when sending
        if (responseHeight < 100) setResponseHeight(250);

        let res;
        
        if (request.type === RequestType.TRANSACTION) {
             const sender = connectedAddress || "0x0000000000000000000000000000000000000000000000000000000000000000";
             const { packageId, module, function: func, typeArguments, arguments: args } = request.moveParams;
             res = await simulateMoveCall(network, sender, packageId, module, func, typeArguments, args);
        } else {
             res = await executeSuiRpc(
                network,
                request.rpcParams.method,
                request.rpcParams.params
            );
        }

        const { result, duration, status } = res;

        setResponse(result);
        setDuration(duration);
        setStatus(status);
        setIsLoading(false);

        // Record in history
        if (request) {
            appStore.addToHistory(request, status, duration);
        }
    };

    const handleSignAndSend = (signer: string) => {
        setIsSignModalOpen(false);
        // In a real app, this would sign and submit to the wallet provider. For now, we simulate.
        executeCall();
    };

    if (!request) return null;

    return (
        <div ref={containerRef} className="flex flex-col h-full overflow-hidden bg-slate-950">
            {/* Top half: Request Configuration */}
            <div className="flex-1 flex flex-col min-h-0">
                <RequestPanel 
                    request={request}
                    network={network}
                    onChange={handleRequestChange}
                    onSend={handleSend}
                    onExecute={() => setIsSignModalOpen(true)}
                    activeAddress={connectedAddress}
                    envVars={envVariables}
                />
            </div>

            {/* Drag Handle */}
            <div 
                onMouseDown={startDragging}
                className="h-1.5 bg-slate-950 hover:bg-sui-600 cursor-row-resize transition-colors z-20 shrink-0 border-t border-b border-slate-800 flex items-center justify-center group"
            >
                <div className="w-8 h-0.5 bg-slate-700 group-hover:bg-white rounded-full transition-colors" />
            </div>

            {/* Bottom half: Response Inspection */}
            <div 
                style={{ height: responseHeight }}
                className="min-h-0 shrink-0 flex flex-col shadow-[0_-4px_12px_rgba(0,0,0,0.3)] z-10"
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
            </div>

            <SignTransactionModal 
                isOpen={isSignModalOpen}
                onClose={() => setIsSignModalOpen(false)}
                onConfirm={handleSignAndSend}
                walletAddress={connectedAddress}
                request={request}
            />
        </div>
    );
};
