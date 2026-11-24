'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { SUI_GRAPHQL_URLS, formatRawAmount, SUI_NATIVE_COIN_TYPE } from '@/services/suiGraphql';
import { SuiAccountView } from './SuiAccount';
import {
    getSuiCheckpoint,
    getSuiCheckpoints,
    getSuiCoin,
    getSuiEvents,
    getSuiObject,
    getSuiPackage,
    getSuiTransaction,
    parseSuiExplorerQuery,
    type SuiCheckpointDetail,
    type SuiCheckpointSummary,
    type SuiCoinDetail,
    type SuiEventSummary,
    type SuiExplorerTarget,
    type SuiObjectDetail,
    type SuiPackageDetail,
    type SuiTransactionDetail
} from '@/services/suiExplorer';

type Resolved =
    | { kind: 'tx'; tx: SuiTransactionDetail | null }
    | { kind: 'object'; object: SuiObjectDetail | null }
    | { kind: 'package'; pkg: SuiPackageDetail }
    | { kind: 'checkpoint'; checkpoint: SuiCheckpointDetail | null }
    | { kind: 'coin'; coin: SuiCoinDetail | null }
    | { kind: 'address'; address: string };

type Network = 'mainnet' | 'testnet' | 'devnet';

const short = (value: string, head = 10, tail = 6) =>
    value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;

const coinLabel = (coinType: string) => (coinType === SUI_NATIVE_COIN_TYPE ? 'SUI' : coinType.split('::').pop() ?? coinType);

const formatCoin = (amount: string, coinType: string) => {
    const decimals = coinType === SUI_NATIVE_COIN_TYPE ? 9 : 0;
    const negative = amount.startsWith('-');
    const raw = negative ? amount.slice(1) : amount;
    return `${negative ? '-' : ''}${formatRawAmount(raw, decimals)} ${coinLabel(coinType)}`;
};

const formatTimestamp = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

/** Resolves a search target. Packages are checked before plain objects for an id. */
const resolveTarget = async (network: Network, target: SuiExplorerTarget): Promise<Resolved> => {
    switch (target.kind) {
        case 'tx':
            return { kind: 'tx', tx: await getSuiTransaction(network, target.id) };
        case 'checkpoint':
            return { kind: 'checkpoint', checkpoint: await getSuiCheckpoint(network, target.id) };
        case 'coin':
            return { kind: 'coin', coin: await getSuiCoin(network, target.id) };
        case 'address':
            return { kind: 'address', address: target.id };
        case 'package': {
            const pkg = await getSuiPackage(network, target.id);
            if (pkg) return { kind: 'package', pkg };
            return { kind: 'object', object: await getSuiObject(network, target.id) };
        }
        default: {
            const pkg = await getSuiPackage(network, target.id);
            if (pkg) return { kind: 'package', pkg };
            return { kind: 'object', object: await getSuiObject(network, target.id) };
        }
    }
};

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="rounded-card border border-line bg-sunken p-4">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle">{title}</h3>
        {children}
    </section>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
        <span className="shrink-0 text-fg-subtle">{label}</span>
        <span className="min-w-0 break-all text-right font-mono text-xs text-fg">{value}</span>
    </div>
);

/** A row-sized button that opens another explorer target in this view. */
const LinkButton: React.FC<{ onOpen: (id: string) => void; id: string; children: React.ReactNode }> = ({ onOpen, id, children }) => (
    <button type="button" onClick={() => onOpen(id)} className="font-mono text-xs text-fg hover:underline">
        {children}
    </button>
);

const TxView: React.FC<{ tx: SuiTransactionDetail; onOpen: (id: string) => void }> = ({ tx, onOpen }) => (
    <div className="space-y-4">
        <Panel title="Overview">
            <Field label="Digest" value={tx.digest} />
            <Field label="Status" value={tx.status} />
            <Field label="Time" value={formatTimestamp(tx.timestamp)} />
            <Field label="Sender" value={tx.sender ?? '—'} />
            <Field label="Kind" value={tx.kind ?? '—'} />
            <Field label="Checkpoint" value={tx.checkpoint ? <LinkButton id={tx.checkpoint} onOpen={onOpen}>{tx.checkpoint}</LinkButton> : '—'} />
            <Field label="Epoch" value={tx.epoch ?? '—'} />
        </Panel>
        <Panel title="Gas">
            <Field label="Computation" value={formatCoin(tx.gas.computation, SUI_NATIVE_COIN_TYPE)} />
            <Field label="Storage" value={formatCoin(tx.gas.storage, SUI_NATIVE_COIN_TYPE)} />
            <Field label="Storage rebate" value={formatCoin(tx.gas.rebate, SUI_NATIVE_COIN_TYPE)} />
            <Field label="Gas price (MIST)" value={tx.gas.price ?? '—'} />
            <Field label="Gas budget (MIST)" value={tx.gas.budget ?? '—'} />
        </Panel>
        <Panel title={`Balance changes (${tx.balanceChanges.length})`}>
            {tx.balanceChanges.length === 0 ? (
                <div className="text-xs text-fg-subtle">No balance changes.</div>
            ) : (
                <ul className="divide-y divide-line">
                    {tx.balanceChanges.map((c, i) => (
                        <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                            <span className="font-mono text-xs text-fg-muted">{c.owner ? short(c.owner) : '—'}</span>
                            <span className="font-mono text-fg">{formatCoin(c.amount, c.coinType)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
        <Panel title={`Events (${tx.events.length})`}>
            {tx.events.length === 0 ? (
                <div className="text-xs text-fg-subtle">No events.</div>
            ) : (
                <ul className="space-y-3">
                    {tx.events.map((e, i) => (
                        <li key={i} className="rounded-md border border-line p-3">
                            <div className="font-mono text-xs text-fg">{e.type}</div>
                            {e.json != null && (
                                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-[11px] text-fg-muted">
                                    {JSON.stringify(e.json, null, 2)}
                                </pre>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    </div>
);

const ObjectView: React.FC<{ object: SuiObjectDetail; onOpen: (id: string) => void }> = ({ object, onOpen }) => {
    const owner =
        object.owner.kind === 'address'
            ? `Address ${object.owner.address}`
            : object.owner.kind === 'shared'
                ? `Shared (initial version ${object.owner.initialSharedVersion ?? '—'})`
                : object.owner.kind === 'immutable'
                    ? 'Immutable'
                    : 'Unknown';
    return (
        <div className="space-y-4">
            <Panel title="Object">
                <Field label="Object ID" value={object.objectId} />
                <Field label="Version" value={object.version ?? '—'} />
                <Field label="Digest" value={object.digest ?? '—'} />
                <Field label="Owner" value={owner} />
                <Field label="Type" value={object.type ?? '—'} />
                <Field
                    label="Previous transaction"
                    value={
                        object.previousTransactionDigest ? (
                            <LinkButton id={object.previousTransactionDigest} onOpen={onOpen}>
                                {short(object.previousTransactionDigest, 14, 8)}
                            </LinkButton>
                        ) : (
                            '—'
                        )
                    }
                />
            </Panel>
            <Panel title="Fields">
                {object.fields == null ? (
                    <div className="text-xs text-fg-subtle">Not a Move object, or no readable fields.</div>
                ) : (
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all text-[11px] text-fg-muted">
                        {JSON.stringify(object.fields, null, 2)}
                    </pre>
                )}
            </Panel>
        </div>
    );
};

const PackageView: React.FC<{ pkg: SuiPackageDetail }> = ({ pkg }) => (
    <div className="space-y-4">
        <Panel title="Package">
            <Field label="Package ID" value={pkg.packageId} />
            <Field label="Version" value={pkg.version ?? '—'} />
            <Field label="Modules" value={pkg.modules.length} />
        </Panel>
        <Panel title="Modules">
            {pkg.modules.length === 0 ? (
                <div className="text-xs text-fg-subtle">No modules.</div>
            ) : (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {pkg.modules.map((m) => (
                        <li key={m} className="rounded-md border border-line px-3 py-2 font-mono text-xs text-fg">
                            {m}
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    </div>
);

const CheckpointView: React.FC<{ checkpoint: SuiCheckpointDetail; onOpen: (id: string) => void }> = ({ checkpoint, onOpen }) => (
    <div className="space-y-4">
        <Panel title="Checkpoint">
            <Field label="Sequence" value={checkpoint.sequenceNumber} />
            <Field label="Digest" value={checkpoint.digest ?? '—'} />
            <Field label="Previous digest" value={checkpoint.previousDigest ?? '—'} />
            <Field label="Time" value={formatTimestamp(checkpoint.timestamp)} />
            <Field label="Epoch" value={checkpoint.epoch ?? '—'} />
            <Field label="Network total transactions" value={checkpoint.networkTotalTransactions ?? '—'} />
        </Panel>
        <Panel title={`Transactions (${checkpoint.transactions.length})`}>
            {checkpoint.transactions.length === 0 ? (
                <div className="text-xs text-fg-subtle">No transactions in this view.</div>
            ) : (
                <ul className="divide-y divide-line">
                    {checkpoint.transactions.map((t) => (
                        <li key={t.digest} className="flex items-center justify-between gap-3 py-2">
                            <LinkButton id={t.digest} onOpen={onOpen}>{short(t.digest, 14, 8)}</LinkButton>
                            <span className="text-xs text-fg-muted">{t.status}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    </div>
);

const CoinView: React.FC<{ coin: SuiCoinDetail | null; coinType: string }> = ({ coin, coinType }) => {
    if (!coin) return <div className="text-xs text-fg-subtle">No coin metadata registered for {coinType}.</div>;
    return (
        <div className="space-y-4">
            <Panel title="Coin">
                <Field label="Symbol" value={coin.symbol ?? '—'} />
                <Field label="Name" value={coin.name ?? '—'} />
                <Field label="Decimals" value={coin.decimals ?? '—'} />
                <Field label="Coin type" value={coin.coinType} />
                <Field label="Metadata object" value={coin.address ?? '—'} />
            </Panel>
            {coin.description && (
                <Panel title="Description">
                    <p className="text-sm text-fg-muted">{coin.description}</p>
                </Panel>
            )}
        </div>
    );
};

/** Landing page: the newest checkpoints and events on the network. */
const FeedView: React.FC<{ network: Network; onOpen: (id: string) => void }> = ({ network, onOpen }) => {
    const feed = useQuery({
        queryKey: ['sui-explorer-feed', network],
        queryFn: async () => {
            const [checkpoints, events] = await Promise.all([getSuiCheckpoints(network, 15), getSuiEvents(network, 15)]);
            return { checkpoints, events };
        },
        refetchInterval: 15000,
    });

    if (feed.isLoading) {
        return (
            <div className="flex items-center gap-2 text-xs text-fg-subtle">
                <Loader2 size={14} className="animate-spin" /> Loading latest activity…
            </div>
        );
    }
    if (feed.error) return <div className="text-xs text-red-500">{(feed.error as Error).message}</div>;
    if (!feed.data) return null;

    const checkpoints: SuiCheckpointSummary[] = feed.data.checkpoints;
    const events: SuiEventSummary[] = feed.data.events;
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Latest checkpoints">
                <ul className="divide-y divide-line">
                    {checkpoints.map((c) => (
                        <li key={c.sequenceNumber} className="flex items-center justify-between gap-3 py-2">
                            <LinkButton id={c.sequenceNumber} onOpen={onOpen}>#{c.sequenceNumber}</LinkButton>
                            <span className="text-xs text-fg-muted">epoch {c.epoch ?? '—'}</span>
                            <span className="text-xs text-fg-subtle">{formatTimestamp(c.timestamp)}</span>
                        </li>
                    ))}
                </ul>
            </Panel>
            <Panel title="Recent events">
                <ul className="divide-y divide-line">
                    {events.map((e, i) => (
                        <li key={i} className="py-2">
                            <div className="truncate font-mono text-xs text-fg">{e.eventType}</div>
                            <div className="flex items-center justify-between gap-3 text-xs text-fg-subtle">
                                <span>{e.moduleName ?? '—'}</span>
                                {e.transactionDigest ? (
                                    <LinkButton id={e.transactionDigest} onOpen={onOpen}>{short(e.transactionDigest, 10, 6)}</LinkButton>
                                ) : (
                                    <span>—</span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </Panel>
        </div>
    );
};

export const SuiExplorerFeature: React.FC<{ initialQuery?: string }> = ({ initialQuery = '' }) => {
    const { network } = useAppStore();
    const [input, setInput] = useState(initialQuery);
    const [submitted, setSubmitted] = useState<SuiExplorerTarget | null>(() => parseSuiExplorerQuery(initialQuery));
    const [invalid, setInvalid] = useState(false);
    const supported = network === 'mainnet' || network === 'testnet' || network === 'devnet';

    const query = useQuery({
        queryKey: ['sui-explorer', network, submitted?.kind, submitted?.id],
        enabled: supported && submitted !== null,
        queryFn: () => resolveTarget(network as Network, submitted!),
    });

    const open = (id: string) => {
        const target = parseSuiExplorerQuery(id);
        setInput(id);
        setInvalid(!target);
        setSubmitted(target);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        open(input);
    };

    const showFeed = submitted === null && !invalid;

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-5 custom-scrollbar">
            <form onSubmit={submit} className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Digest, object/package ID, checkpoint number or coin type"
                        className="w-full rounded-card border border-line bg-sunken py-2 pl-9 pr-3 font-mono text-xs text-fg outline-none focus:border-fg-subtle"
                        aria-label="Sui search"
                    />
                </div>
                <button type="submit" className="rounded-card border border-line px-4 py-2 text-xs font-semibold text-fg hover:bg-hover">
                    Search
                </button>
            </form>

            {invalid && (
                <div className="text-xs text-red-500">
                    Enter a transaction digest, an object or package ID (0x…), a checkpoint number, or a coin type (0x…::module::NAME).
                </div>
            )}

            {!supported && <div className="text-xs text-fg-subtle">The Sui explorer needs mainnet, testnet or devnet.</div>}

            {supported && showFeed && <FeedView network={network as Network} onOpen={open} />}

            {query.isFetching && (
                <div className="flex items-center gap-2 text-xs text-fg-subtle">
                    <Loader2 size={14} className="animate-spin" /> Loading…
                </div>
            )}

            {query.error && <div className="text-xs text-red-500">{(query.error as Error).message}</div>}

            {query.data && query.data.kind === 'tx' && !query.data.tx && <div className="text-xs text-fg-subtle">Transaction not found.</div>}
            {query.data && query.data.kind === 'object' && !query.data.object && <div className="text-xs text-fg-subtle">Object not found.</div>}
            {query.data && query.data.kind === 'checkpoint' && !query.data.checkpoint && <div className="text-xs text-fg-subtle">Checkpoint not found.</div>}
            {query.data && query.data.kind === 'tx' && query.data.tx && <TxView tx={query.data.tx} onOpen={open} />}
            {query.data && query.data.kind === 'object' && query.data.object && <ObjectView object={query.data.object} onOpen={open} />}
            {query.data && query.data.kind === 'package' && <PackageView pkg={query.data.pkg} />}
            {query.data && query.data.kind === 'checkpoint' && query.data.checkpoint && (
                <CheckpointView checkpoint={query.data.checkpoint} onOpen={open} />
            )}
            {query.data && query.data.kind === 'coin' && <CoinView coin={query.data.coin} coinType={submitted?.id ?? ''} />}
            {query.data && query.data.kind === 'address' && (
                <SuiAccountView network={network as Network} address={query.data.address} onOpen={open} />
            )}
        </div>
    );
};
