
import React, { useState, useMemo } from 'react';
import { Select } from '@/components/Select';
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
                <div className="text-xs mt-1 flex items-center gap-2 overflow-hidden text-fg-muted">
                    <span className="font-mono text-fg shrink-0">{item.rpcParams?.method || 'Unknown Method'}</span>
                    <span className="truncate font-mono text-[13px]" title={paramsStr}>{truncatedParams}</span>
                </div>
            );
        } else {
            const target = item.txType === 'MoveCall' 
                ? `${item.moveParams?.packageId?.slice(0,6)}...::${item.moveParams?.module}::${item.moveParams?.function}`
                : item.txType;
            return (
                <div className="text-xs mt-1 flex items-center gap-2 overflow-hidden text-fg-muted">
                     <span className="font-mono text-fg shrink-0">{target}</span>
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
        <div className="flex flex-col h-full bg-surface font-sans">
            {/* Header */}
            <div className="px-6 md:px-8 pt-7 pb-5 border-b border-line shrink-0">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-fg flex items-center gap-3">
<span className="h-9 w-9 rounded-[9px] border border-line bg-surface shadow-card flex items-center justify-center text-fg-muted shrink-0"><Clock size={16} /></span>
Request History
                        </h1>
                        <p className="text-[14px] text-fg-muted mt-1.5">Full audit log of executions in this workspace.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {filteredHistory.length > 0 && (
                            <div className="inline-flex bg-hover p-0.5 rounded-[9px] border border-line gap-0.5">
                                <button
                                    onClick={() => exportHistory(filteredHistory, 'csv')}
                                    className="flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium rounded-[7px] text-fg-muted hover:text-fg transition-colors"
                                    title="Export the filtered list as CSV"
                                >
                                    <Download size={12} /> CSV
                                </button>
                                <button
                                    onClick={() => exportHistory(filteredHistory, 'json')}
                                    className="flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium rounded-[7px] text-fg-muted hover:text-fg transition-colors"
                                    title="Export the filtered list as JSON"
                                >
                                    <Download size={12} /> JSON
                                </button>
                            </div>
                        )}
                        {filteredHistory.length > 0 && (
                            <button
                                onClick={handleClear}
                                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                    confirmClear
                                    ? 'bg-red-600 text-white shadow-pop'
                                    : 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                                }`}
                            >
                                <Trash2 size={14} /> {confirmClear ? 'Confirm Clear' : 'Clear Log'}
                            </button>
                        )}
                    </div>
                </div>

                {filteredHistory.length >= HISTORY_CAP && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400">
                        <AlertTriangle size={13} className="shrink-0" />
                        Showing the most recent {HISTORY_CAP} entries — older history may not be included in this view or export.
                    </div>
                )}

                <div className="flex gap-4 items-center flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-md group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle group-focus-within:text-fg transition-colors" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-surface border border-line rounded-lg pl-9 pr-4 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-line-strong outline-none transition-all"
                            placeholder="Filter history..."
                        />
                    </div>

                    <div className="inline-flex bg-hover p-0.5 rounded-[9px] border border-line gap-0.5">
                        {(['ALL', 'RPC', 'TRANSACTION', 'ERROR'] as HistoryFilter[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-2.5 h-7 rounded-[7px] text-xs font-medium transition-colors border ${
                                    filter === f
                                    ? 'bg-surface text-fg border-line shadow-[0_1px_2px_rgba(0,0,0,0.12)]'
                                    : 'border-transparent text-fg-subtle hover:text-fg'
                                }`}
                            >
                                {f === 'TRANSACTION' ? 'TX' : f}
                            </button>
                        ))}
                    </div>

                    <div className="w-40">
                        <Select
                            value={chainFilter}
                            options={[{ label: 'All chains', value: 'all' }, ...RPC_CHAINS.map((c) => ({ label: c.label, value: c.id }))]}
                            onChange={(v) => setChainFilter(v as ChainId | 'all')}
                            fullWidth
                        />
                    </div>

                    {knownWallets.length > 0 && (
                        <div className="w-44">
                            <Select
                                value={walletFilter}
                                options={[
                                    { label: 'All wallets', value: 'all' },
                                    ...knownWallets.map((w) => ({
                                        label: `${w.family ? `${w.family} · ` : ''}${w.address.slice(0, 6)}...${w.address.slice(-4)}`,
                                        value: w.address
                                    }))
                                ]}
                                onChange={setWalletFilter}
                                fullWidth
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-1.5">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="h-9 rounded-lg border border-line bg-surface px-2 text-xs text-fg-muted outline-none focus:border-line-strong"
                        />
                        <span className="text-xs text-fg-subtle">–</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="h-9 rounded-lg border border-line bg-surface px-2 text-xs text-fg-muted outline-none focus:border-line-strong"
                        />
                        {(dateFrom || dateTo) && (
                            <button
                                onClick={() => { setDateFrom(''); setDateTo(''); }}
                                className="text-[12px] font-semibold text-fg-subtle hover:text-fg"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-surface relative">
                {filteredHistory.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-fg-muted">
                        <div className="w-16 h-16 bg-hover rounded-card flex items-center justify-center mb-4 border border-line">
                            <LayoutList size={24} className="opacity-50" />
                        </div>
                        <p className="text-sm font-medium text-fg-subtle">No requests found</p>
                        <p className="text-xs opacity-60 mt-1">Requests you execute in this workspace will appear here.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-line">
                        {filteredHistory.map((item, index) => (
                            <div key={item.id || index} className="grid grid-cols-12 gap-4 px-6 md:px-8 py-3.5 hover:bg-hover items-center group transition-colors">
                                {/* Status Icon */}
                                <div className="col-span-1">
                                    {item.status && item.status < 400 ? (
                                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 size={15} />
                                        </div>
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                                            <XCircle size={15} />
                                        </div>
                                    )}
                                </div>

                                {/* Request Info */}
                                <div className="col-span-5 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[14px] font-medium text-fg truncate">{item.name || 'Untitled Request'}</div>
                                    </div>
                                    {renderDetails(item)}
                                </div>

                                {/* Type Badge */}
                                <div className="col-span-2">
                                    <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-xs font-medium border border-line bg-sunken text-fg">
                                        {item.type === RequestType.RPC ? <Terminal size={10} /> : <Layers size={10} />}
                                        {item.type === RequestType.RPC ? 'JSON-RPC' : 'Transaction'}
                                    </span>
                                </div>

                                {/* Duration & Network */}
                                <div className="col-span-2">
                                    <div className="flex flex-col">
                                        <span className={`text-xs font-mono tabular ${item.duration && item.duration > 1000 ? 'text-amber-600 dark:text-amber-400' : 'text-fg'}`}>
                                            {item.duration || 0}ms
                                        </span>
                                        <span className="text-xs text-fg-muted capitalize">{item.network || 'Unknown'}</span>
                                    </div>
                                </div>

                                {/* Time */}
                                <div className="col-span-1">
                                    <div className="text-xs text-fg font-mono tabular">{formatTime(item.timestamp || 0)}</div>
                                    <div className="text-[12px] text-fg-subtle flex items-center gap-1">
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
                                            className="p-2 text-fg-subtle hover:text-fg hover:bg-hover rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="View on explorer"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleReplay(item)}
                                        className="p-2 text-fg-subtle hover:text-fg hover:bg-hover rounded-lg transition-all opacity-0 group-hover:opacity-100"
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
