
import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, XCircle, Clock, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { CollectionNode } from '../types';

interface CollectionRunnerProps {
    collectionId?: string;
}

export const CollectionRunner: React.FC<CollectionRunnerProps> = ({ collectionId }) => {
    const { collections, currentWorkspaceId } = useAppStore();
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentReqIndex, setCurrentReqIndex] = useState(-1);
    
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
    const [runList, setRunList] = useState<any[]>([]);

    // Initialize run list when collection changes
    useEffect(() => {
        if (targetCollection) {
            setRunList(getRequests(targetCollection));
        } else if (!collectionId && workspaceCollections.length > 0) {
             // Default to first collection if none specified
             setRunList(getRequests(workspaceCollections[0]));
        } else {
            setRunList([]);
        }
    }, [collectionId, workspaceCollections, targetCollection]);

    const handleRun = () => {
        setIsRunning(true);
        setProgress(0);
        setCurrentReqIndex(0);
        
        let idx = 0;
        const interval = setInterval(() => {
            // Update current item to success
            setRunList(prev => prev.map((req, i) => {
                if (i === idx) return { ...req, status: 'success', duration: Math.floor(Math.random() * 200) + 50 };
                return req;
            }));
            
            idx++;
            setCurrentReqIndex(idx);
            setProgress((idx / runList.length) * 100);

            if (idx >= runList.length) {
                clearInterval(interval);
                setIsRunning(false);
                setCurrentReqIndex(-1);
            }
        }, 800); // Simulate execution time
    };
    
    const handleReset = () => {
        setRunList(prev => prev.map(r => ({ ...r, status: 'pending', duration: 0 })));
        setProgress(0);
        setCurrentReqIndex(-1);
    };

    if (!targetCollection && !collectionId && workspaceCollections.length === 0) {
         return <div className="p-10 text-slate-500">No collections found in this workspace. Create one in the sidebar to start running.</div>;
    }

    const collectionName = targetCollection ? targetCollection.name : (workspaceCollections[0]?.name || "Collection");

    return (
        <div className="h-full bg-slate-950 flex flex-col font-sans">
             {/* Header */}
            <div className="border-b border-slate-800 bg-slate-900/50 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                             <Play size={20} className="text-sui-400"/> Collection Runner
                        </h1>
                        <p className="text-xs text-slate-400">Executing sequence: <span className="text-white font-bold">{collectionName}</span></p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleReset} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded flex items-center gap-2 transition-colors">
                            <RotateCcw size={14}/> Reset
                        </button>
                        <button 
                            onClick={handleRun}
                            disabled={isRunning || runList.length === 0}
                            className={`px-6 py-2 bg-sui-600 hover:bg-sui-500 text-white text-xs font-bold rounded shadow-lg shadow-sui-900/20 flex items-center gap-2 transition-all ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isRunning ? <Pause size={14}/> : <Play size={14}/>} 
                            {isRunning ? 'Running...' : 'Run Collection'}
                        </button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div 
                        className="h-full bg-sui-500 transition-all duration-300 ease-out relative"
                        style={{ width: `${progress}%` }}
                    >
                         <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 animate-pulse"></div>
                    </div>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>{runList.filter(r => r.status === 'success').length} / {runList.length} Completed</span>
                    <span>{Math.round(progress)}%</span>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="border border-slate-800 rounded-xl bg-slate-900 overflow-hidden shadow-xl">
                    <table className="w-full text-left">
                        <thead className="bg-slate-950 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800">
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
                                <tr key={i} className={`transition-colors ${i === currentReqIndex ? 'bg-sui-900/10' : 'hover:bg-slate-800/30'}`}>
                                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{i + 1}</td>
                                    <td className="px-6 py-4 font-bold text-slate-300 flex items-center gap-2">
                                        {req.name}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{req.rpcParams?.method || req.txType || 'Transaction'}</td>
                                    <td className="px-6 py-4">
                                        {req.status === 'success' ? (
                                            <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-900/10 px-2 py-1 rounded border border-emerald-900/20">
                                                <CheckCircle2 size={14}/> 200 OK
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
                            Empty collection. Add requests to "{collectionName}" to see them here.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
