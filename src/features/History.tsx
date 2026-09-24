
import React, { useState, useMemo } from 'react';
import { Clock, CheckCircle2, XCircle, Search, Trash2, Terminal, Layers, Calendar, ArrowRight, LayoutList, ExternalLink, Download, AlertTriangle, RotateCw } from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { ChainId, HistoryItem, RequestType } from '../types';
import { RPC_CHAINS } from '@/lib/constants';
import { exportHistory } from '@/lib/exportHistory';
import { isSwapResumable, SwapResumeModal } from '@/components/SwapResumeModal';

type HistoryFilter = 'ALL' | 'RPC' | 'TRANSACTION' | 'ERROR';

// The backend caps stored history at 500 entries per user — if a filtered
// view still hits this, older entries may already be pruned rather than
// simply hidden by the current filters, which matters for an accounting
// export.
const HISTORY_CAP = 500;

export const HistoryFeature: React.FC = () => {
    const { history, currentWorkspaceId } = useAppStore();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<HistoryFilter>('ALL');
    const [chainFilter, setChainFilter] = useState<ChainId | 'all'>('all');
    const [walletFilter, setWalletFilter] = useState<string | 'all'>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [confirmClear, setConfirmClear] = useState(false);
    const [resumeItem, setResumeItem] = useState<HistoryItem | null>(null);

    const knownWallets = useMemo(() => {
        const seen = new Map<string, { address: string; family?: string }>();
        for (const item of history ?? []) {
            if (item?.walletAddress && !seen.has(item.walletAddress)) {
                seen.set(item.walletAddress, { address: item.walletAddress, family: item.walletFamily });
            }
        }
        return Array.from(seen.values());
    }, [history]);

    const filteredHistory = useMemo(() => {
        if (!history) return [];
        const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
        // Include the entire "to" day, not just its midnight instant.
        const toMs = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

        return history.slice().reverse().filter((item): item is HistoryItem => {
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

            if (chainFilter !== 'all' && item.rpcParams?.chain !== chainFilter) return false;
            if (walletFilter !== 'all' && item.walletAddress !== walletFilter) return false;

            if (fromMs !== null && (!item.timestamp || item.timestamp < fromMs)) return false;
            if (toMs !== null && (!item.timestamp || item.timestamp > toMs)) return false;

            return true;
        });
    }, [history, search, filter, chainFilter, walletFilter, dateFrom, dateTo, currentWorkspaceId]);

    const handleReplay = (item: HistoryItem) => {
        const type = 'rpc';
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

    const renderDetails = (item: HistoryItem) => {
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

    const explorerUrlFor = (item: HistoryItem): string | undefined => {
        const result = item.executionResult;
        return result && typeof result === 'object'
            ? (result as { explorerUrl?: string }).explorerUrl
            : undefined;
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
        <div className="flex flex-col h-full bg-white dark:bg-near-black font-sans">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-dark-indigo-glow/50 shrink-0">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                            <Clock size={24} className="text-slate-400" />
                            Request History
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">Full audit log of executions in this workspace.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {filteredHistory.length > 0 && (
                            <div className="flex bg-white dark:bg-near-black p-1 rounded-lg border border-slate-200 dark:border-white/5">
                                <button
                                    onClick={() => exportHistory(filteredHistory, 'csv')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                    title="Export the filtered list as CSV"
                                >
                                    <Download size={12} /> CSV
                                </button>
                                <button
                                    onClick={() => exportHistory(filteredHistory, 'json')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                    title="Export the filtered list as JSON"
                                >
                                    <Download size={12} /> JSON
                                </button>
                            </div>
                        )}
                        {filteredHistory.length > 0 && (
                            <button
                                onClick={handleClear}
                                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    confirmClear
                                    ? 'bg-red-600 text-white shadow-lg'
                                    : 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                                }`}
                            >
                                <Trash2 size={14} /> {confirmClear ? 'Confirm Clear' : 'Clear Log'}
                            </button>
                        )}
                    </div>
                </div>

                {filteredHistory.length >= HISTORY_CAP && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                        <AlertTriangle size={13} className="shrink-0" />
                        Showing the most recent {HISTORY_CAP} entries — older history may not be included in this view or export.
                    </div>
                )}

                <div className="flex gap-4 items-center flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-md group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-electric-violet transition-colors" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white dark:bg-near-black border border-slate-200 dark:border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-electric-violet outline-none transition-all"
                            placeholder="Filter history..."
                        />
                    </div>

                    <div className="flex bg-white dark:bg-near-black p-1 rounded-lg border border-slate-200 dark:border-white/5">
                        {(['ALL', 'RPC', 'TRANSACTION', 'ERROR'] as HistoryFilter[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    filter === f
                                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                {f === 'TRANSACTION' ? 'TX' : f}
                            </button>
                        ))}
                    </div>

                    <select
                        value={chainFilter}
                        onChange={(e) => setChainFilter(e.target.value as ChainId | 'all')}
                        className="h-9 rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-near-black px-3 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-electric-violet"
                    >
                        <option value="all">All chains</option>
                        {RPC_CHAINS.map((c) => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                    </select>

                    {knownWallets.length > 0 && (
                        <select
                            value={walletFilter}
                            onChange={(e) => setWalletFilter(e.target.value)}
                            className="h-9 rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-near-black px-3 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-electric-violet max-w-[160px]"
                        >
                            <option value="all">All wallets</option>
                            {knownWallets.map((w) => (
                                <option key={w.address} value={w.address}>
                                    {w.family ? `${w.family} · ` : ''}{w.address.slice(0, 6)}...{w.address.slice(-4)}
                                </option>
                            ))}
                        </select>
                    )}

                    <div className="flex items-center gap-1.5">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="h-9 rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-near-black px-2 text-xs text-slate-600 dark:text-slate-300 outline-none focus:border-electric-violet"
                        />
                        <span className="text-xs text-slate-400">–</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="h-9 rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-near-black px-2 text-xs text-slate-600 dark:text-slate-300 outline-none focus:border-electric-violet"
                        />
                        {(dateFrom || dateTo) && (
                            <button
                                onClick={() => { setDateFrom(''); setDateTo(''); }}
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-near-black relative">
                {filteredHistory.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-dark-indigo-glow rounded-2xl flex items-center justify-center mb-4 border border-slate-200 dark:border-white/5">
                            <LayoutList size={24} className="opacity-50" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">No requests found</p>
                        <p className="text-xs opacity-60 mt-1">Requests you execute in this workspace will appear here.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800/50">
                        {filteredHistory.map((item, index) => (
                            <div key={item.id || index} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-dark-indigo-glow/40 items-center group transition-colors">
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
                                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{item.name || 'Untitled Request'}</div>
                                    </div>
                                    {renderDetails(item)}
                                </div>

                                {/* Type Badge */}
                                <div className="col-span-2">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                                        item.type === RequestType.RPC
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50'
                                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                                    }`}>
                                        {item.type === RequestType.RPC ? <Terminal size={10} /> : <Layers size={10} />}
                                        {item.type === RequestType.RPC ? 'JSON-RPC' : 'Transaction'}
                                    </span>
                                </div>

                                {/* Duration & Network */}
                                <div className="col-span-2">
                                    <div className="flex flex-col">
                                        <span className={`text-xs font-mono font-bold ${item.duration && item.duration > 1000 ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {item.duration || 0}ms
                                        </span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-600 uppercase font-bold">{item.network || 'Unknown'}</span>
                                    </div>
                                </div>

                                {/* Time */}
                                <div className="col-span-1">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{formatTime(item.timestamp || 0)}</div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-600 flex items-center gap-1">
                                        <Calendar size={10} /> {formatDate(item.timestamp || 0)}
                                    </div>
                                </div>

                                {/* Explorer + Resume + Replay */}
                                <div className="col-span-1 text-right flex items-center justify-end gap-1">
                                    {item.type === RequestType.SWAP && isSwapResumable(item) && (
                                        <button
                                            onClick={() => setResumeItem(item)}
                                            className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-lg transition-all"
                                            title="Resume stuck swap"
                                        >
                                            <RotateCw size={16} />
                                        </button>
                                    )}
                                    {explorerUrlFor(item) && (
                                        <a
                                            href={explorerUrlFor(item)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 text-slate-500 hover:text-electric-violet hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="View on explorer"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleReplay(item)}
                                        className="p-2 text-slate-500 hover:text-electric-violet hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
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

            <SwapResumeModal
                isOpen={Boolean(resumeItem)}
                item={resumeItem}
                onClose={() => setResumeItem(null)}
            />
        </div>
    );
};
