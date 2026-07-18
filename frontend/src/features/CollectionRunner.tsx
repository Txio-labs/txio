
import React, { useState, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, XCircle, Clock, AlertTriangle, FileText, ArrowRight, Square } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { CollectionNode, RequestItem, RequestType } from '../types';
import { executeSuiRpc, simulateMoveCall, SuiRpcError } from '../services/suiService';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

const resolveVariables = (raw: string, vars: { key: string; value: string }[]): string =>
    vars.reduce((str, v) => str.replaceAll(`{{${v.key}}}`, v.value), raw);

const resolveRequestVars = (request: RequestItem, vars: { key: string; value: string }[]): RequestItem => {
    if (!vars.length) return request;
    try {
        if (request.type === RequestType.RPC) {
            const raw = JSON.stringify(request.rpcParams.params);
            const resolved = resolveVariables(raw, vars);
            return {
                ...request,
                rpcParams: {
                    ...request.rpcParams,
                    method: resolveVariables(request.rpcParams.method, vars),
                    params: JSON.parse(resolved),
                },
            };
        }
        const mp = request.moveParams;
        return {
            ...request,
            moveParams: {
                ...mp,
                packageId: resolveVariables(mp.packageId, vars),
                module: resolveVariables(mp.module, vars),
                function: resolveVariables(mp.function, vars),
                typeArguments: mp.typeArguments.map((t: string) => resolveVariables(t, vars)),
                arguments: mp.arguments.map((a) => ({
                    ...a,
                    value: resolveVariables(String(a.value), vars),
                })),
            },
        };
    } catch {
        return request;
    }
};

interface CollectionRunnerProps {
    collectionId?: string;
}

export const CollectionRunner: React.FC<CollectionRunnerProps> = ({ collectionId }) => {
    const { collections, currentWorkspaceId, network, envVariables } = useAppStore();
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentReqIndex, setCurrentReqIndex] = useState(-1);
    const abortRef = useRef(false);
    
    // Filter collections by current workspace
    const workspaceCollections = useMemo(() => {
        return collections.filter(c => !c.workspaceId || c.workspaceId === currentWorkspaceId);
    }, [collections, currentWorkspaceId]);

    // Helper to find collection by ID recursively within filtered list
    const findCollection = (nodes: CollectionNode[], id: string): CollectionNode | null => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findCollection(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    // Flatten requests from collection hierarchy
    const getRequests = (node: CollectionNode): any[] => {
        let reqs: any[] = [];
        if (node.type === 'request' && node.requestData) {
             reqs.push({ ...node.requestData, status: 'pending', duration: 0 });
        }
        if (node.children) {
            node.children.forEach(c => reqs = [...reqs, ...getRequests(c)]);
        }
        return reqs;
    };

    const targetCollection = collectionId ? findCollection(workspaceCollections, collectionId) : null;
    // Default to first collection if none specified
    const runSource = targetCollection || (!collectionId && workspaceCollections.length > 0 ? workspaceCollections[0] : null);

    const [runList, setRunList] = useState<any[]>(runSource ? getRequests(runSource) : []);
    const [prevRunSource, setPrevRunSource] = useState(runSource);

    // Re-initialize the run list whenever the targeted collection changes
    if (runSource !== prevRunSource) {
        setPrevRunSource(runSource);
        setRunList(runSource ? getRequests(runSource) : []);
    }

    const handleRun = async () => {
        abortRef.current = false;
        setIsRunning(true);
        setProgress(0);
        setCurrentReqIndex(0);

        // Snapshot the run list at start so mutations don't shift indices
        const snapshot = [...runList];

        for (let idx = 0; idx < snapshot.length; idx++) {
            if (abortRef.current) break;

            setCurrentReqIndex(idx);

            const req = snapshot[idx] as RequestItem;
            const resolved = resolveRequestVars(req, envVariables);
            const startTime = performance.now();

            try {
                if (resolved.type === RequestType.TRANSACTION) {
                    const { packageId, module, function: func, typeArguments, arguments: args } = resolved.moveParams;
                    const { status, duration } = await simulateMoveCall(
                        network,
                        ZERO_ADDRESS,
                        packageId,
                        module,
                        func,
                        typeArguments,
                        args,
                    );
                    setRunList((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, status: 'success' as const, duration, httpStatus: status } : r)),
                    );
                } else {
                    const { result, status, duration } = await executeSuiRpc(
                        network,
                        resolved.rpcParams.method,
                        resolved.rpcParams.params,
                    );
                    setRunList((prev) =>
                        prev.map((r, i) =>
                            i === idx ? { ...r, status: 'success' as const, duration, httpStatus: status, response: result } : r,
                        ),
                    );
                }
            } catch (error) {
                const duration = Math.round(performance.now() - startTime);
                const rpcError = error instanceof SuiRpcError ? error : null;
                const errorMessage = error instanceof Error && error.message.trim() ? error.message : 'Request failed';
                setRunList((prev) =>
                    prev.map((r, i) =>
                        i === idx
                            ? {
                                  ...r,
                                  status: 'error' as const,
                                  duration,
                                  httpStatus: rpcError?.status ?? 0,
                                  errorMessage,
                              }
                            : r,
                    ),
                );
            }

            setProgress(((idx + 1) / snapshot.length) * 100);
        }

        setIsRunning(false);
        setCurrentReqIndex(-1);
    };

    const handleStop = () => {
        abortRef.current = true;
    };

    const handleReset = () => {
        abortRef.current = true;
        setRunList((prev) => prev.map((r) => ({ ...r, status: 'pending', duration: 0 })));
        setProgress(0);
        setCurrentReqIndex(-1);
    };

    if (!targetCollection && !collectionId && workspaceCollections.length === 0) {
         return <div className="p-10 text-slate-500">No collections found in this workspace. Create one in the sidebar to start running.</div>;
    }

    const collectionName = targetCollection ? targetCollection.name : (workspaceCollections[0]?.name || "Collection");

    return (
        <div className="h-full bg-near-black flex flex-col font-sans">
             {/* Header */}
            <div className="border-b border-white/5 bg-dark-indigo-glow/50 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                             <Play size={20} className="text-electric-violet"/> Collection Runner
                        </h1>
                        <p className="text-xs text-slate-400">Executing sequence: <span className="text-white font-bold">{collectionName}</span></p>
                    </div>
                    <div className="flex gap-3">
                        {isRunning && (
                            <button onClick={handleStop} className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs font-bold rounded flex items-center gap-2 transition-colors border border-red-900/30">
                                <Square size={14}/> Stop
                            </button>
                        )}
                        <button onClick={handleReset} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded flex items-center gap-2 transition-colors">
                            <RotateCcw size={14}/> Reset
                        </button>
                        <button 
                            onClick={handleRun}
                            disabled={isRunning || runList.length === 0}
                            className={`px-6 py-2 bg-electric-violet hover:bg-electric-violet text-white text-xs font-bold rounded shadow-lg shadow-sui-900/20 flex items-center gap-2 transition-all ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isRunning ? <Pause size={14}/> : <Play size={14}/>} 
                            {isRunning ? 'Running...' : 'Run Collection'}
                        </button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div 
                        className="h-full bg-electric-violet transition-all duration-300 ease-out relative"
                        style={{ width: `${progress}%` }}
                    >
                         <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 animate-pulse"></div>
                    </div>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>
                        {runList.filter(r => r.status === 'success').length} / {runList.length} Completed
                        {runList.some(r => r.status === 'error') && (
                            <span className="text-red-400 ml-2">· {runList.filter(r => r.status === 'error').length} Failed</span>
                        )}
                    </span>
                    <span>{Math.round(progress)}%</span>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="border border-white/5 rounded-xl bg-dark-indigo-glow overflow-hidden shadow-xl">
                    <table className="w-full text-left">
                        <thead className="bg-near-black text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">
                            <tr>
                                <th className="px-6 py-3 w-12">#</th>
                                <th className="px-6 py-3">Request Name</th>
                                <th className="px-6 py-3">Method</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                            {runList.map((req, i) => (
                                <tr key={i} className={`transition-colors ${i === currentReqIndex ? 'bg-sui-900/10' : 'hover:bg-white/5/30'}`}>
                                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{i + 1}</td>
                                    <td className="px-6 py-4 font-bold text-slate-300 flex items-center gap-2">
                                        {req.name}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{req.rpcParams?.method || req.txType || 'Transaction'}</td>
                                    <td className="px-6 py-4">
                                        {req.status === 'error' ? (
                                            <span className="inline-flex items-center gap-1.5 text-red-400 text-xs font-bold bg-red-900/10 px-2 py-1 rounded border border-red-900/20" title={req.errorMessage}>
                                                <XCircle size={14}/> {req.httpStatus || 'ERR'}
                                            </span>
                                        ) : req.status === 'success' ? (
                                            <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-900/10 px-2 py-1 rounded border border-emerald-900/20">
                                                <CheckCircle2 size={14}/> {req.httpStatus || 200} OK
                                            </span>
                                        ) : i === currentReqIndex ? (
                                            <span className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-bold bg-amber-900/10 px-2 py-1 rounded border border-amber-900/20">
                                                <Clock size={14} className="animate-spin"/> Running
                                            </span>
                                        ) : (
                                            <span className="text-slate-600 text-xs italic flex items-center gap-1"><Clock size={12}/> Pending</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                                        {req.duration > 0 ? `${req.duration}ms` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {runList.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm italic">
                            Empty collection. Add requests to &quot;{collectionName}&quot; to see them here.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
