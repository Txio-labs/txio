import React, { useMemo, useState } from 'react';
import {
    Zap,
    FolderPlus,
    Wallet,
    Globe2,
    Users,
    ArrowRight,
    Layers,
    Plus,
    Activity,
    CornerDownLeft,
} from 'lucide-react';
import { describeTransaction } from '@/services/transactionService';
import { useAppStore, appStore } from '@/lib/store';
import { useWallet } from '@/wallet';
import { RequestType, HistoryItem, ChainId, ALL_NETWORKS } from '@/types';
import { resolveChainRpcUrl } from '@/services/suiService';
import { DEFAULT_MOVE_CALL, RPC_CHAINS } from '@/lib/constants';
import { NetworkStatusWidget } from '@/components/NetworkStatusWidget';
import { TransactionHistoryList } from '@/components/wallet/TransactionHistoryList';
import { ChainIcon } from '@/components/ui/ChainIcon';
import { PromptModal } from '@/components/PromptModal';
import {
    Badge,
    Button,
    Card,
    CardHeader,
    EmptyState,
    Kbd,
    Page,
    Segmented,
    StatusDot,
    cx,
} from '@/components/ui/primitives';

const timeAgo = (ts: number) => {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

const openChainRequest = (chain: ChainId) => {
    appStore.openTab('rpc', {
        id: `rpc-${Date.now()}`,
        name: 'New Request',
        type: RequestType.RPC,
        network: appStore.getSnapshot().network,
        rpcParams: { method: '', params: [], chain },
        moveParams: { ...DEFAULT_MOVE_CALL },
    });
};

export const Dashboard: React.FC = () => {
    const { history, currentWorkspaceId, user, activityLogs, collections, network } = useAppStore();
    const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
    const [feed, setFeed] = useState<'requests' | 'transactions'>('requests');
    const { openModal, currentWallet } = useWallet();

    const firstName = useMemo(() => {
        if (!user?.name) return 'there';
        const first = user.name.trim().split(/\s+/)[0];
        // Usernames/emails (no spaces) aren't a first name: capitalize so it reads like one.
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

    const requests = useMemo(() => workspaceHistory.filter((i) => i.type === RequestType.RPC), [workspaceHistory]);
    const transactions = useMemo(() => workspaceHistory.filter((i) => i.type === RequestType.TRANSACTION), [workspaceHistory]);
    const successRate = useMemo(() => {
        if (workspaceHistory.length === 0) return null;
        const ok = workspaceHistory.filter((i) => i.status < 400).length;
        return Math.round((ok / workspaceHistory.length) * 100);
    }, [workspaceHistory]);

    const stats = [
        { label: 'Requests', value: requests.length.toLocaleString(), hint: 'Sent from this workspace' },
        { label: 'Transactions', value: transactions.length.toLocaleString(), hint: 'Simulated or executed' },
        { label: 'Success rate', value: successRate === null ? '—' : `${successRate}%`, hint: 'Across all calls' },
        { label: 'Collections', value: collections.length.toLocaleString(), hint: `${RPC_CHAINS.length} chains available` },
    ];

    const starts = [
        {
            title: 'New RPC call',
            body: 'Query any chain with method autocomplete and templates.',
            icon: Zap,
            action: () => appStore.openTab('new_request'),
        },
        {
            title: 'New transaction',
            body: 'Build, simulate and sign a call on the chain you pick.',
            icon: Layers,
            action: () => appStore.openTab('new_request'),
        },
        {
            title: 'New collection',
            body: 'Group requests and run them in order as one suite.',
            icon: FolderPlus,
            action: () => appStore.openTab('new_collection'),
        },
    ];

    return (
        <Page width="wide">
            <PromptModal
                isOpen={isCreateWsOpen}
                onClose={() => setIsCreateWsOpen(false)}
                title="Create workspace"
                description="Workspaces hold collections, environments and history."
                label="Workspace name"
                placeholder="e.g. Protocol team"
                confirmLabel="Create workspace"
                icon={Users}
                onSubmit={(name) => {
                    setIsCreateWsOpen(false);
                    void appStore.createWorkspace(name);
                }}
            />

            {/* Hero */}
            <section data-enter className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-xs text-fg-subtle mb-3">
                        <StatusDot tone="success" pulse />
                        <span className="capitalize">{network}</span>
                        <span className="text-fg-subtle/60">·</span>
                        <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <h1 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.035em] leading-[1.05] text-fg">
                        {greeting}, {firstName}.
                    </h1>
                    <p className="mt-2 text-sm text-fg-muted">Pick up where you left off, or start something new on any chain.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" icon={<Wallet size={14} />} onClick={() => openModal()}>
                        {currentWallet ? 'Wallets' : 'Connect wallet'}
                    </Button>
                    <Button variant="secondary" icon={<Users size={14} />} onClick={() => setIsCreateWsOpen(true)}>
                        New workspace
                    </Button>
                    <Button variant="primary" icon={<Plus size={14} />} onClick={() => appStore.openTab('new_request')}>
                        New request
                    </Button>
                </div>
            </section>

            {/* Stats */}
            <Card data-enter className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-line mb-8 overflow-hidden">
                {stats.map((s) => (
                    <div key={s.label} className="p-4 md:p-5">
                        <div className="text-xs text-fg-subtle">{s.label}</div>
                        <div className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-fg tabular leading-none">{s.value}</div>
                        <div className="mt-2 text-[12px] text-fg-subtle">{s.hint}</div>
                    </div>
                ))}
            </Card>

            {/* Start */}
            <div data-enter className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
                {starts.map((s) => (
                    <Card key={s.title} as="button" interactive onClick={s.action} className="group p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="h-8 w-8 rounded-[8px] border border-line bg-sunken flex items-center justify-center text-fg-muted group-hover:text-fg transition-colors">
                                <s.icon size={15} />
                            </span>
                            <ArrowRight size={14} className="text-fg-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </div>
                        <div>
                            <div className="text-[14px] font-semibold text-fg">{s.title}</div>
                            <div className="mt-0.5 text-xs text-fg-subtle leading-relaxed">{s.body}</div>
                        </div>
                    </Card>
                ))}
            </div>

            <div data-enter className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {/* Recent */}
                <div className="xl:col-span-2 space-y-5">
                    <Card className="overflow-hidden">
                        <CardHeader
                            title="Recent activity"
                            description="Your latest calls in this workspace"
                            actions={
                                <>
                                    <Segmented<'requests' | 'transactions'>
                                        size="sm"
                                        value={feed}
                                        onChange={setFeed}
                                        options={[
                                            { value: 'requests', label: `Requests` },
                                            { value: 'transactions', label: `Transactions` },
                                        ]}
                                    />
                                    <Button variant="ghost" size="sm" trailing={<ArrowRight size={12} />} onClick={() => appStore.openTab('history')}>
                                        History
                                    </Button>
                                </>
                            }
                        />
                        {feed === 'requests' ? <RequestsTable requests={requests.slice(0, 6)} /> : <TransactionsTable transactions={transactions.slice(0, 6)} />}
                    </Card>

                    {currentWallet && (
                        <Card className="overflow-hidden">
                            <CardHeader title="Wallet transactions" description="Recent on-chain history for the connected wallet" />
                            <TransactionHistoryList wallet={currentWallet} />
                        </Card>
                    )}

                    <NetworkStatusWidget />
                </div>

                {/* Side */}
                <div className="space-y-5">
                    <Card className="overflow-hidden">
                        <CardHeader
                            title="Chains"
                            description="Open a request on a chain"
                            actions={
                                <Button variant="ghost" size="sm" onClick={() => appStore.openTab('infrastructure')}>
                                    Networks
                                </Button>
                            }
                        />
                        <div className="p-1.5">
                            {RPC_CHAINS.map((chain) => (
                                <button
                                    key={chain.id}
                                    onClick={() => openChainRequest(chain.id as ChainId)}
                                    className="group w-full flex items-center gap-3 px-2.5 h-11 rounded-[8px] hover:bg-hover transition-colors text-left"
                                >
                                    <ChainIcon chain={chain.id as ChainId} size={28} />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[14px] font-medium text-fg truncate">{chain.label}</div>
                                    </div>
                                    <span className="text-[12px] text-fg-subtle group-hover:hidden">{ALL_NETWORKS.length} networks</span>
                                    <span className="hidden group-hover:flex items-center gap-1 text-[12px] text-fg-muted">
                                        Open <CornerDownLeft size={11} />
                                    </span>
                                </button>
                            ))}
                        </div>
                    </Card>

                    <Card className="overflow-hidden">
                        <CardHeader
                            title="Team activity"
                            icon={<Activity size={14} />}
                            actions={
                                <Button variant="ghost" size="sm" onClick={() => appStore.openTab('workspace_overview')}>
                                    Workspace
                                </Button>
                            }
                        />
                        {activityLogs.length === 0 ? (
                            <div className="p-6 text-center text-xs text-fg-subtle">No activity yet. Actions your team takes show up here.</div>
                        ) : (
                            <ol className="p-3 space-y-3">
                                {activityLogs.slice(0, 6).map((log) => (
                                    <li key={log.id} className="flex items-start gap-2.5">
                                        <span className="mt-0.5 h-6 w-6 rounded-full bg-active text-fg-muted flex items-center justify-center text-[12px] font-semibold shrink-0">
                                            {log.userName
                                                .split(' ')
                                                .map((n) => n[0])
                                                .join('')
                                                .slice(0, 2)
                                                .toUpperCase()}
                                        </span>
                                        <div className="min-w-0 flex-1 text-xs leading-relaxed">
                                            <span className="font-medium text-fg">{log.userName}</span>{' '}
                                            <span className="text-fg-muted">{log.action}</span>{' '}
                                            <span className="font-mono text-[12px] text-fg-subtle break-all">{log.target}</span>
                                            <div className="text-[12px] text-fg-subtle mt-0.5">{timeAgo(log.timestamp)}</div>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Card>

                    <Card className="p-4">
                        <div className="text-[14px] font-semibold text-fg">Keyboard first</div>
                        <p className="mt-1 text-xs text-fg-subtle leading-relaxed">Everything in Txio is one search away.</p>
                        <div className="mt-3 space-y-2 text-xs">
                            {[
                                ['Command menu', ['⌘', 'K']],
                                ['Send request', ['⌘', '↵']],
                                ['Close all tabs', ['Ctrl', 'K', 'W']],
                            ].map(([label, keys]) => (
                                <div key={label as string} className="flex items-center justify-between text-fg-muted">
                                    <span>{label as string}</span>
                                    <span className="flex gap-0.5">
                                        {(keys as string[]).map((k) => (
                                            <Kbd key={k}>{k}</Kbd>
                                        ))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </Page>
    );
};

const th = 'px-3 h-9 font-medium text-[12px] text-fg-subtle text-left';

const RequestsTable: React.FC<{ requests: HistoryItem[] }> = ({ requests }) =>
    requests.length === 0 ? (
        <div className="p-5">
            <EmptyState
                compact
                icon={<Zap size={16} />}
                title="No requests yet"
                description="Send your first RPC call and it shows up here with its status and timing."
                action={
                    <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => appStore.openTab('new_request')}>
                        New request
                    </Button>
                }
            />
        </div>
    ) : (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead className="border-b border-line">
                    <tr>
                        <th className={cx(th, 'pl-4')}>Method</th>
                        <th className={th}>Network</th>
                        <th className={cx(th, 'hidden md:table-cell')}>Endpoint</th>
                        <th className={th}>Status</th>
                        <th className={cx(th, 'text-right')}>Latency</th>
                        <th className={cx(th, 'pr-4 text-right')}>When</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {requests.map((item, idx) => {
                        const chain = item.rpcParams.chain ?? 'sui';
                        const endpoint = resolveChainRpcUrl(chain, item.network);
                        return (
                            <tr key={idx} className="cursor-pointer hover:bg-hover transition-colors" onClick={() => appStore.openTab('rpc', item)}>
                                <td className="pl-4 pr-3 h-10">
                                    <span className="font-mono text-[13px] text-fg">{item.rpcParams.method || '—'}</span>
                                </td>
                                <td className="px-3 text-fg-muted capitalize">{item.network}</td>
                                <td className="px-3 text-fg-subtle font-mono truncate max-w-[180px] hidden md:table-cell" title={endpoint}>
                                    {endpoint}
                                </td>
                                <td className="px-3">
                                    <Badge tone={item.status < 400 ? 'success' : 'danger'} dot mono>
                                        {item.status}
                                    </Badge>
                                </td>
                                <td className="px-3 text-right text-fg-muted font-mono tabular">{item.duration}ms</td>
                                <td className="pl-3 pr-4 text-right text-fg-subtle whitespace-nowrap">{timeAgo(item.timestamp)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

const TransactionsTable: React.FC<{ transactions: HistoryItem[] }> = ({ transactions }) =>
    transactions.length === 0 ? (
        <div className="p-5">
            <EmptyState
                compact
                icon={<Layers size={16} />}
                title="No transactions yet"
                description="Simulate or execute a transaction on any chain to see it here."
                action={
                    <Button size="sm" variant="secondary" icon={<Globe2 size={13} />} onClick={() => appStore.openTab('new_request')}>
                        Build a transaction
                    </Button>
                }
            />
        </div>
    ) : (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead className="border-b border-line">
                    <tr>
                        <th className={cx(th, 'pl-4')}>Chain</th>
                        <th className={th}>Call</th>
                        <th className={th}>Status</th>
                        <th className={cx(th, 'hidden md:table-cell')}>Kind</th>
                        <th className={cx(th, 'pr-4 text-right')}>When</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {transactions.map((item, idx) => {
                        const d = describeTransaction(item);
                        return (
                            <tr key={idx} className="cursor-pointer hover:bg-hover transition-colors" onClick={() => appStore.openTab('rpc', item)}>
                                <td className="pl-4 pr-3 h-10">
                                    <span className="inline-flex items-center gap-2 text-fg-muted capitalize">
                                        <ChainIcon chain={(item.rpcParams?.chain ?? 'sui') as ChainId} size={14} />
                                        {item.rpcParams?.chain ?? 'sui'}
                                    </span>
                                </td>
                                <td className="px-3 font-mono text-[13px] text-fg truncate max-w-[200px]">{d.target}</td>
                                <td className="px-3">
                                    <Badge tone={item.status < 400 ? 'success' : 'danger'} dot>
                                        {item.status < 400 ? 'Confirmed' : 'Failed'}
                                    </Badge>
                                </td>
                                <td className="px-3 text-fg-subtle hidden md:table-cell">{d.kind}</td>
                                <td className="pl-3 pr-4 text-right text-fg-subtle whitespace-nowrap">{timeAgo(item.timestamp)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
