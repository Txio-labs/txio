import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Zap,
    FolderPlus,
    Wallet,
    Globe2,
    Users,
    ArrowUpRight,
    ArrowRight,
    Repeat,
    Clock
} from 'lucide-react';
import { describeTransaction } from '@/services/transactionService';
import { useAppStore, appStore } from '@/lib/store';
import { useWallet } from '@/wallet';
import { RequestType, HistoryItem, ChainId } from '@/types';
import { resolveChainRpcUrl } from '@/services/suiService';
import { RPC_CHAINS } from '@/lib/constants';
import { NetworkStatusWidget } from '@/components/NetworkStatusWidget';
import { TransactionHistoryList } from '@/components/wallet/TransactionHistoryList';

// Chains this build actually has RPC config + health checks for (see
// lib/constants.ts NETWORKS/EVM_NETWORKS/STELLAR_NETWORKS/SOLANA_NETWORKS and
// services/suiService.ts getChainRpcHealth). Bitcoin/Aptos use REST APIs,
// not JSON-RPC, so they aren't wired up yet — surfaced as "coming soon"
// rather than fabricated.
const SUPPORTED_CHAINS: { id: ChainId; label: string; networkCount: number }[] = [
    { id: 'sui', label: 'Sui', networkCount: 4 },
    { id: 'evm', label: 'Ethereum', networkCount: 4 },
    { id: 'solana', label: 'Solana', networkCount: 4 },
    { id: 'stellar', label: 'Stellar', networkCount: 4 },
];

const METHOD_TONE: Record<string, string> = {
    get: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    default: 'bg-electric-violet/10 text-electric-violet border-electric-violet/20',
};

const methodTone = (method: string) =>
    method.toLowerCase().includes('get') ? METHOD_TONE.get : METHOD_TONE.default;

const timeAgo = (ts: number) => {
    const diffMs = Date.now() - ts;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

export const Dashboard: React.FC = () => {
    const { history, currentWorkspaceId, user, activityLogs, workspaces } = useAppStore();
    const { openModal, currentWallet } = useWallet();

    const firstName = useMemo(() => {
        if (!user?.name) return 'there';
        const first = user.name.trim().split(/\s+/)[0];
        // Usernames/emails (no spaces, e.g. "oladimejivictor611") aren't a
        // "first name" — capitalize so it at least reads like a name.
        return first.charAt(0).toUpperCase() + first.slice(1);
    }, [user]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    }, []);

    const workspaceHistory = useMemo(
        () =>
            history
                .filter((item) => !item.workspaceId || item.workspaceId === currentWorkspaceId)
                .slice()
                .reverse(),
        [history, currentWorkspaceId]
    );

    const recentRequests = useMemo(
        () => workspaceHistory.filter((item) => item.type === RequestType.RPC).slice(0, 5),
        [workspaceHistory]
    );

    const recentTransactions = useMemo(
        () => workspaceHistory.filter((item) => item.type === RequestType.TRANSACTION).slice(0, 5),
        [workspaceHistory]
    );

    const totalRequests = useMemo(
        () => workspaceHistory.filter((item) => item.type === RequestType.RPC).length,
        [workspaceHistory]
    );
    const totalTransactions = useMemo(
        () => workspaceHistory.filter((item) => item.type === RequestType.TRANSACTION).length,
        [workspaceHistory]
    );

    const quickActions = [
        {
            label: 'New Request',
            icon: Zap,
            primary: true,
            action: () => appStore.openTab('new_request'),
        },
        {
            label: 'New Collection',
            icon: FolderPlus,
            action: () => appStore.openTab('new_collection'),
        },
        {
            label: 'Connect Wallet',
            icon: Wallet,
            action: () => openModal(),
        },
        {
            label: 'Add Network',
            icon: Globe2,
            // No dedicated "add network" flow exists yet — routes to Settings,
            // where custom RPC endpoints are configured per network.
            action: () => appStore.openTab('settings'),
        },
        {
            label: 'Create Workspace',
            icon: Users,
            // Mirrors the default-name quick-create pattern already used for
            // collections in Sidebar.tsx (handleAddCollection) rather than
            // opening a separate naming dialog.
            action: () => appStore.createWorkspace(`Workspace ${workspaces.length + 1}`),
        },
    ];

    const stats = [
        {
            label: 'Total Requests',
            value: totalRequests.toLocaleString(),
            delta: totalRequests > 0 ? `+${totalRequests}` : null,
            deltaLabel: 'this workspace',
            icon: Zap,
        },
        {
            label: 'Transactions',
            value: totalTransactions.toLocaleString(),
            delta: totalTransactions > 0 ? `+${totalTransactions}` : null,
            deltaLabel: 'this workspace',
            icon: Repeat,
        },
        {
            label: 'Active Networks',
            value: String(SUPPORTED_CHAINS.length),
            delta: null,
            deltaLabel: `of ${SUPPORTED_CHAINS.length} wired up`,
            icon: Globe2,
        },
        {
            label: 'Team Members',
            value: '1',
            delta: null,
            deltaLabel: 'in workspace',
            icon: Users,
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full overflow-y-auto bg-slate-50 dark:bg-near-black p-6 md:p-8 custom-scrollbar"
        >
            {/* Header */}
            <div className="mb-6">
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-electric-violet mb-2">
                    Overview
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {greeting}, {firstName}
                </h1>
                <p className="text-sm text-slate-500 mt-1.5">
                    Your blockchain development workspace is ready.
                </p>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2.5 mb-6">
                {quickActions.map((action) => (
                    <button
                        key={action.label}
                        onClick={action.action}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                            action.primary
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-near-black hover:opacity-90'
                                : 'bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.06]'
                        }`}
                    >
                        <action.icon size={14} />
                        {action.label}
                    </button>
                ))}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                    >
                        <div className="flex items-center gap-2 text-slate-500 mb-3">
                            <stat.icon size={14} />
                            <span className="text-xs font-medium">{stat.label}</span>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</span>
                            {stat.delta && (
                                <span className="flex items-center gap-0.5 text-[11px] font-bold text-emerald-500 mb-0.5">
                                    <ArrowUpRight size={11} /> {stat.delta}
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{stat.deltaLabel}</div>
                    </div>
                ))}
            </div>

            {/* Recent Requests / Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
                <RequestsTable requests={recentRequests} />
                <TransactionsTable transactions={recentTransactions} />
            </div>

            {/* Workspace Activity / Supported Blockchains */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-slate-500" />
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Workspace Activity</h2>
                        </div>
                        <button
                            onClick={() => appStore.openTab('history')}
                            className="text-[11px] font-bold text-electric-violet hover:opacity-80 flex items-center gap-1"
                        >
                            View all <ArrowRight size={11} />
                        </button>
                    </div>
                    {activityLogs.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500">No activity yet.</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {activityLogs.slice(0, 5).map((log) => (
                                <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                                    <div className="w-7 h-7 rounded-full bg-electric-violet/10 text-electric-violet flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {log.userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1 text-xs">
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{log.userName}</span>{' '}
                                        <span className="text-slate-500">{log.action}</span>{' '}
                                        <span className="font-mono text-slate-500 truncate">{log.target}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 shrink-0">{timeAgo(log.timestamp)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
                        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Supported Blockchains</h2>
                        <button
                            onClick={() => appStore.openTab('infrastructure')}
                            className="text-[11px] font-bold text-electric-violet hover:opacity-80 flex items-center gap-1"
                        >
                            View all <ArrowRight size={11} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 p-4">
                        {RPC_CHAINS.map((chain) => (
                            <button
                                key={chain.id}
                                onClick={() => appStore.openTab('rpc')}
                                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-electric-violet/30 transition-colors text-left"
                            >
                                <div className="w-8 h-8 rounded-lg bg-electric-violet/10 text-electric-violet flex items-center justify-center text-[10px] font-bold shrink-0">
                                    {chain.label.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{chain.label}</div>
                                    <div className="text-[10px] text-slate-500">4 networks</div>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="px-4 pb-4 text-[11px] text-slate-500">
                        Solana, Bitcoin, BSC, Polygon and more are on the roadmap — not wired to real RPC endpoints yet.
                    </div>
                </div>
            </div>

            {currentWallet && (
                <div className="mt-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
                        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Wallet Transaction History</h2>
                    </div>
                    <TransactionHistoryList wallet={currentWallet} />
                </div>
            )}

            <div className="mt-5">
                <NetworkStatusWidget />
            </div>
        </motion.div>
    );
};

const RequestsTable: React.FC<{ requests: HistoryItem[] }> = ({ requests }) => (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Recent Requests</h2>
            <button
                onClick={() => appStore.openTab('history')}
                className="text-[11px] font-bold text-electric-violet hover:opacity-80 flex items-center gap-1"
            >
                View all <ArrowRight size={11} />
            </button>
        </div>
        {requests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No requests sent yet.</div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-white/5">
                            <th className="px-5 py-2 font-medium">Method</th>
                            <th className="px-2 py-2 font-medium">Network</th>
                            <th className="px-2 py-2 font-medium hidden sm:table-cell">Endpoint</th>
                            <th className="px-2 py-2 font-medium">Status</th>
                            <th className="px-2 py-2 font-medium">Duration</th>
                            <th className="px-5 py-2 font-medium text-right">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {requests.map((item, idx) => {
                            const chain = item.rpcParams.chain ?? 'sui';
                            const endpoint = resolveChainRpcUrl(chain, item.network);
                            return (
                                <tr
                                    key={idx}
                                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                                    onClick={() => appStore.openTab('rpc', item)}
                                >
                                    <td className="px-5 py-2.5">
                                        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold ${methodTone(item.rpcParams.method)}`}>
                                            {item.rpcParams.method || '—'}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2.5 text-slate-500 capitalize">{item.network}</td>
                                    <td className="px-2 py-2.5 text-slate-500 font-mono truncate max-w-[140px] hidden sm:table-cell" title={endpoint}>
                                        {endpoint}
                                    </td>
                                    <td className="px-2 py-2.5">
                                        <span className={`inline-flex items-center gap-1 ${item.status < 400 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current" /> {item.status}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2.5 text-slate-500 font-mono">{item.duration}ms</td>
                                    <td className="px-5 py-2.5 text-right text-slate-500">{timeAgo(item.timestamp)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

const TransactionsTable: React.FC<{ transactions: HistoryItem[] }> = ({ transactions }) => (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Recent Transactions</h2>
            <button
                onClick={() => appStore.openTab('history')}
                className="text-[11px] font-bold text-electric-violet hover:opacity-80 flex items-center gap-1"
            >
                View all <ArrowRight size={11} />
            </button>
        </div>
        {transactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
                No transactions simulated or executed yet.
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-white/5">
                            <th className="px-5 py-2 font-medium">Chain</th>
                            <th className="px-2 py-2 font-medium">Call</th>
                            <th className="px-2 py-2 font-medium">Status</th>
                            <th className="px-2 py-2 font-medium hidden sm:table-cell">Kind</th>
                            <th className="px-5 py-2 font-medium text-right">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {transactions.map((item, idx) => (
                            <tr
                                key={idx}
                                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                                onClick={() => appStore.openTab('rpc', item)}
                            >
                                <td className="px-5 py-2.5 text-slate-500 capitalize">{item.rpcParams?.chain ?? 'sui'}</td>
                                <td className="px-2 py-2.5 font-mono text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                                    {describeTransaction(item).target}
                                </td>
                                <td className="px-2 py-2.5">
                                    <span className={`inline-flex items-center gap-1 ${item.status < 400 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current" /> {item.status < 400 ? 'Confirmed' : 'Failed'}
                                    </span>
                                </td>
                                <td className="px-2 py-2.5 text-slate-500 hidden sm:table-cell">{describeTransaction(item).kind}</td>
                                <td className="px-5 py-2.5 text-right text-slate-500">{timeAgo(item.timestamp)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);
