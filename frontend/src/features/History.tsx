
import React, { useState, useMemo } from 'react';
import { Clock, CheckCircle2, XCircle, Search, Filter, Trash2, Terminal, Layers, Calendar, ArrowRight, LayoutList } from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { RequestType } from '../types';

type HistoryFilter = 'ALL' | 'RPC' | 'TRANSACTION' | 'ERROR';

export const HistoryFeature: React.FC = () => {
    const { history, currentWorkspaceId } = useAppStore();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<HistoryFilter>('ALL');
    const [confirmClear, setConfirmClear] = useState(false);

    const filteredHistory = useMemo(() => {
        if (!history) return [];
        return history.slice().reverse().filter(item => {
            if (!item) return false;
            
            // Filter by Workspace
            if (item.workspaceId && item.workspaceId !== currentWorkspaceId) return false;

            const searchLower = search.toLowerCase();
            const name = item.name || '';
            const method = item.type === RequestType.RPC 
                ? (item.rpcParams?.method || '')
                : (item.txType || '');
            
            const matchesSearch = name.toLowerCase().includes(searchLower) || method.toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;

            if (filter === 'RPC' && item.type !== RequestType.RPC) return false;
            if (filter === 'TRANSACTION' && item.type !== RequestType.TRANSACTION) return false;
            if (filter === 'ERROR' && (item.status && item.status < 400)) return false;

            return true;
        });
    }, [history, search, filter, currentWorkspaceId]);

    const handleReplay = (item: any) => {
        const type = item.type === RequestType.RPC ? 'rpc' : 'ptb';
        appStore.openTab(type, {
            ...item,
            id: undefined, // Create new ID for replay
            name: item.name
        });
    };

    const formatTime = (timestamp: number) => {
        if (!timestamp) return '-';
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(new Date(timestamp));
    };

    const formatDate = (timestamp: number) => {
        if (!timestamp) return '-';
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric'
        }).format(new Date(timestamp));
    };

    const renderDetails = (item: any) => {
        if (item.type === RequestType.RPC) {
            const paramsStr = JSON.stringify(item.rpcParams?.params || []);
            const truncatedParams = paramsStr.length > 80 ? paramsStr.substring(0, 80) + '...' : paramsStr;
            return (
                <div className="text-xs font-mono mt-1 flex items-center gap-2 overflow-hidden text-slate-500">
                    <span className="text-blue-400 font-bold shrink-0">{item.rpcParams?.method || 'Unknown Method'}</span>
                    <span className="truncate opacity-70" title={paramsStr}>{truncatedParams}</span>
                </div>
            );
        } else {
            const target = item.txType === 'MoveCall' 
                ? `${item.moveParams?.packageId?.slice(0,6)}...::${item.moveParams?.module}::${item.moveParams?.function}`
                : item.txType;
            return (
                <div className="text-xs font-mono mt-1 flex items-center gap-2 overflow-hidden text-slate-500">
                     <span className="text-amber-400 font-bold shrink-0">{target}</span>
                </div>
            );
        }
    };

    const handleClear = () => {
        if (confirmClear) {
            appStore.clearHistory();
            setConfirmClear(false);
        } else {
            setConfirmClear(true);
            setTimeout(() => setConfirmClear(false), 3000);
        }
    };

    return (
        <div className="flex flex-col h-full bg-near-black font-sans">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/5 bg-dark-indigo-glow/50 shrink-0">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-3">
                            <Clock size={24} className="text-slate-400" /> 
                            Request History
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">Full audit log of executions in this workspace.</p>
                    </div>
                    {filteredHistory.length > 0 && (
                        <button 
                            onClick={handleClear}
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                confirmClear 
                                ? 'bg-red-600 text-white shadow-lg' 
                                : 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
                            }`}
                        >
                            <Trash2 size={14} /> {confirmClear ? 'Confirm Clear' : 'Clear Log'}
                        </button>
                    )}
                </div>

                <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-electric-violet transition-colors" />
                        <input 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-near-black border border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-600 focus:border-electric-violet outline-none transition-all" 
                            placeholder="Filter history..." 
                        />
                    </div>
                    
                    <div className="flex bg-near-black p-1 rounded-lg border border-white/5">
                        {(['ALL', 'RPC', 'TRANSACTION', 'ERROR'] as HistoryFilter[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    filter === f 
                                    ? 'bg-slate-800 text-white shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {f === 'TRANSACTION' ? 'PTB' : f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-near-black relative">
                {filteredHistory.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                        <div className="w-16 h-16 bg-dark-indigo-glow rounded-2xl flex items-center justify-center mb-4 border border-white/5">
                            <LayoutList size={24} className="opacity-50" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">No requests found</p>
                        <p className="text-xs opacity-60 mt-1">Requests you execute in this workspace will appear here.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800/50">
                        {filteredHistory.map((item, index) => (
                            <div key={item.id || index} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-dark-indigo-glow/40 items-center group transition-colors">
                                {/* Status Icon */}
                                <div className="col-span-1">
                                    {item.status && item.status < 400 ? (
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                            <CheckCircle2 size={16} />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                                            <XCircle size={16} />
                                        </div>
                                    )}
                                </div>

                                {/* Request Info */}
                                <div className="col-span-5 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold text-slate-200 truncate">{item.name || 'Untitled Request'}</div>
                                    </div>
                                    {renderDetails(item)}
                                </div>

                                {/* Type Badge */}
                                <div className="col-span-2">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                                        item.type === RequestType.RPC 
                                        ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' 
                                        : 'bg-amber-900/20 text-amber-400 border-amber-900/50'
                                    }`}>
                                        {item.type === RequestType.RPC ? <Terminal size={10} /> : <Layers size={10} />}
                                        {item.type === RequestType.RPC ? 'JSON-RPC' : 'Transaction'}
                                    </span>
                                </div>

                                {/* Duration & Network */}
                                <div className="col-span-2">
                                    <div className="flex flex-col">
                                        <span className={`text-xs font-mono font-bold ${item.duration && item.duration > 1000 ? 'text-amber-500' : 'text-slate-400'}`}>
                                            {item.duration || 0}ms
                                        </span>
                                        <span className="text-[10px] text-slate-600 uppercase font-bold">{item.network || 'Unknown'}</span>
                                    </div>
                                </div>

                                {/* Time */}
                                <div className="col-span-1">
                                    <div className="text-xs text-slate-400 font-mono">{formatTime(item.timestamp || 0)}</div>
                                    <div className="text-[10px] text-slate-600 flex items-center gap-1">
                                        <Calendar size={10} /> {formatDate(item.timestamp || 0)}
                                    </div>
                                </div>

                                {/* Replay Button */}
                                <div className="col-span-1 text-right">
                                    <button 
                                        onClick={() => handleReplay(item)}
                                        className="p-2 text-slate-500 hover:text-electric-violet hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Replay Request"
                                    >
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
