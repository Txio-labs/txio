/**
 * A chain workspace's home page: what this chain's endpoint reports right
 * now, the ways to start work on this chain, and this chain's recent
 * requests and collections. Every number on it comes from the RPC endpoint
 * or from the user's own saved data.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FolderPlus, Layers, Plus, Search, Zap } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { useWallet } from '@/wallet';
import { getChainRpcHealth } from '@/services/suiService';
import { withTxChain } from '@/services/transactionService';
import { TRANSACTION_OPTIONS } from '@/features/NewRequestPage';
import { RequestsTable, TransactionsTable } from '@/features/Dashboard';
import { TransactionHistoryList } from '@/components/wallet/TransactionHistoryList';
import { ChainIcon } from '@/components/ui/ChainIcon';
import { Badge, Button, Card, CardHeader, EmptyState, Page, Segmented, StatusDot, networkTone } from '@/components/ui/primitives';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { RequestType, type ChainId, type RequestItem } from '@/types';
import { CHAIN_WORKSPACES } from './registry';
import { useChainScope } from './useChainScope';

const newRequest = (chain: ChainId, kind: 'rpc' | 'transaction') => {
    const isTx = kind === 'transaction';
    const id = `rpc-${Date.now()}`;
    const base: RequestItem = {
        id,
        name: isTx ? `Untitled ${TRANSACTION_OPTIONS[chain]?.title ?? 'transaction'}` : `Untitled ${CHAIN_WORKSPACES[chain].name} request`,
        type: isTx ? RequestType.TRANSACTION : RequestType.RPC,
        network: appStore.getSnapshot().network,
        rpcParams: { method: '', params: [], chain },
        moveParams: { ...DEFAULT_MOVE_CALL },
        localVars: [],
    };
    appStore.openTab('rpc', isTx ? withTxChain(base, chain) : base);
};

function EndpointStatus({ chain }: { chain: ChainId }) {
    const { network } = useAppStore();
    const health = useQuery({
        queryKey: ['chain-home-health', chain, network],
        queryFn: () => getChainRpcHealth(chain, network),
        refetchInterval: 20000,
        retry: false,
    });
    const metric = health.data;
    const tone = health.isError || metric?.status === 'down' ? 'danger' : metric?.status === 'degraded' ? 'warning' : metric ? 'success' : 'neutral';
    const label = health.isLoading ? 'Checking…' : health.isError ? 'Unreachable' : metric?.status === 'down' ? 'Down' : metric?.status === 'degraded' ? 'Slow' : 'Reachable';
    // A chain whose health call has no block height (Solana getHealth, Stellar getHealth) reports 0; show nothing rather than a fake 0.
    const height = metric && metric.blockHeight > 0 ? metric.blockHeight.toLocaleString() : null;

    return (
        <Card className="p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-fg-subtle">Endpoint</div>
                <Badge>{network}</Badge>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[15px] font-semibold text-fg">
                <StatusDot tone={tone} pulse={tone === 'success'} />
                {label}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <dt className="text-fg-subtle">Latency</dt>
                <dd className="text-right font-mono text-fg tabular">{metric ? `${metric.latency[metric.latency.length - 1]} ms` : '—'}</dd>
                <dt className="text-fg-subtle">Latest block</dt>
                <dd className="text-right font-mono text-fg tabular">{height ?? '—'}</dd>
            </dl>
            <div className="mt-3 truncate font-mono text-[11px] text-fg-subtle" title={metric?.endpoint}>
                {metric?.endpoint ?? ''}
            </div>
            <Button variant="ghost" size="sm" className="mt-2 -ml-2" trailing={<ArrowRight size={12} />} onClick={() => appStore.openTab('infrastructure')}>
                Endpoints
            </Button>
        </Card>
    );
}

export function ChainHome({ chain }: { chain: ChainId }) {
    const def = CHAIN_WORKSPACES[chain];
    const { currentWorkspaceId, network } = useAppStore();
    const { history, collections } = useChainScope();
    const { linkedWallets } = useWallet();
    const [feed, setFeed] = useState<'requests' | 'transactions'>('requests');

    const workspaceHistory = useMemo(
        () => history.filter((i) => !i.workspaceId || i.workspaceId === currentWorkspaceId).slice().reverse(),
        [history, currentWorkspaceId]
    );
    const requests = workspaceHistory.filter((i) => i.type === RequestType.RPC);
    const transactions = workspaceHistory.filter((i) => i.type === RequestType.TRANSACTION);
    const txOption = TRANSACTION_OPTIONS[chain];
    const walletOnChain = linkedWallets[chain] ?? null;

    const starts = [
        { title: `New ${def.name} RPC call`, body: 'Pick a method, fill its template and send it.', icon: Zap, action: () => newRequest(chain, 'rpc') },
        ...(txOption ? [{ title: txOption.title, body: txOption.subtitle, icon: Layers, action: () => newRequest(chain, 'transaction') }] : []),
        ...(def.explorer
            ? [{ title: 'Explorer', body: `Look up ${def.name} transactions and addresses.`, icon: Search, action: () => appStore.openTab(def.explorer!) }]
            : []),
        { title: 'New collection', body: 'Group requests and run them in order.', icon: FolderPlus, action: () => appStore.openTab('new_collection') },
    ];

    return (
        <Page width="wide">
            <section data-enter className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
                <div className="flex items-start gap-4">
                    <ChainIcon chain={chain} size={48} />
                    <div>
                        <div className="flex items-center gap-2 text-xs text-fg-subtle mb-1.5">
                            <StatusDot tone={networkTone(network)} />
                            <span className="capitalize">{network}</span>
                        </div>
                        <h1 className="text-[26px] md:text-[30px] font-semibold tracking-[-0.03em] leading-[1.1] text-fg">{def.name}</h1>
                        <p className="mt-1.5 text-sm text-fg-muted max-w-xl">{def.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {def.stack.map((s) => (
                                <Badge key={s}>{s}</Badge>
                            ))}
                        </div>
                    </div>
                </div>
                <Button variant="primary" icon={<Plus size={14} />} onClick={() => appStore.openTab('new_request', { rpcParams: { method: '', params: [], chain } })}>
                    New request
                </Button>
            </section>

            <div data-enter className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
                {starts.map((s) => (
                    <Card key={s.title} as="button" interactive onClick={s.action} className="group p-4 flex flex-col gap-3 text-left">
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
                <div className="xl:col-span-2 space-y-5">
                    <Card className="overflow-hidden">
                        <CardHeader
                            title="Recent activity"
                            description={`Your latest ${def.name} calls in this workspace`}
                            actions={
                                <>
                                    <Segmented<'requests' | 'transactions'>
                                        size="sm"
                                        value={feed}
                                        onChange={setFeed}
                                        options={[
                                            { value: 'requests', label: `Requests (${requests.length})` },
                                            { value: 'transactions', label: `Transactions (${transactions.length})` },
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

                    {walletOnChain && (
                        <Card className="overflow-hidden">
                            <CardHeader title="Wallet transactions" description={`Recent on-chain history for your ${def.name} wallet`} />
                            <TransactionHistoryList wallet={walletOnChain} />
                        </Card>
                    )}
                </div>

                <div className="space-y-5">
                    <EndpointStatus chain={chain} />
                    <Card className="overflow-hidden">
                        <CardHeader
                            title="Collections"
                            description={`${collections.length} with ${def.name} requests or still empty`}
                            actions={
                                <Button variant="ghost" size="sm" onClick={() => appStore.openTab('collections')}>
                                    All
                                </Button>
                            }
                        />
                        {collections.length === 0 ? (
                            <EmptyState
                                icon={<FolderPlus size={16} />}
                                title="No collections yet"
                                description={`Save ${def.name} requests to a collection to run them together.`}
                            />
                        ) : (
                            <ul className="p-1.5">
                                {collections.slice(0, 6).map((c) => (
                                    <li key={c.id}>
                                        <button
                                            onClick={() => appStore.openTab('collections')}
                                            className="w-full flex items-center gap-2 h-9 px-2.5 rounded-[7px] text-left hover:bg-hover transition-colors"
                                        >
                                            <span className="flex-1 truncate text-[14px] text-fg">{c.name}</span>
                                            <span className="text-[12px] text-fg-subtle tabular">{countRequests(c)}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
            </div>
        </Page>
    );
}

const countRequests = (node: { type: string; children?: { type: string; children?: unknown[] }[] }): number =>
    node.type === 'request' ? 1 : (node.children ?? []).reduce((n, c) => n + countRequests(c as never), 0);
