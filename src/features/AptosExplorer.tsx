'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Network } from '@/types';
import {
    formatOctas,
    getAptosAccount,
    getAptosLatestTransactions,
    getAptosTransaction,
    resolveAptosQuery,
    type AptosExplorerTarget,
    type AptosTransactionSummary,
} from '@/services/aptosExplorer';

const short = (value: string, head = 10, tail = 6) =>
    value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
const formatTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

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
const Link: React.FC<{ onOpen: (id: string) => void; id: string; children: React.ReactNode }> = ({ onOpen, id, children }) => (
    <button type="button" onClick={() => onOpen(id)} className="font-mono text-xs text-fg hover:underline">
        {children}
    </button>
);
const Muted = ({ children }: { children: React.ReactNode }) => <div className="text-xs text-fg-subtle">{children}</div>;
const ErrorText = ({ message }: { message: string }) => <div className="text-xs text-red-500">{message}</div>;
const Loading = () => (
    <div className="flex items-center gap-2 text-xs text-fg-subtle">
        <Loader2 size={14} className="animate-spin" /> Loading…
    </div>
);

const TxList: React.FC<{ txs: AptosTransactionSummary[]; onOpen: (id: string) => void }> = ({ txs, onOpen }) => {
    if (txs.length === 0) return <Muted>No transactions.</Muted>;
    return (
        <ul className="divide-y divide-line">
            {txs.map((t) => (
                <li key={t.hash} className="flex items-center justify-between gap-3 py-2">
                    <Link id={t.hash} onOpen={onOpen}>{short(t.hash, 14, 8)}</Link>
                    <span className="truncate text-xs text-fg-muted">{t.functionName ? t.functionName.split('::').slice(-2).join('::') : t.type ?? '—'}</span>
                    <span className="text-xs text-fg-subtle">{formatTime(t.timestamp)}</span>
                </li>
            ))}
        </ul>
    );
};

const TxView: React.FC<{ network: Network; hash: string; onOpen: (id: string) => void }> = ({ network, hash, onOpen }) => {
    const query = useQuery({ queryKey: ['aptos-explorer-tx', network, hash], queryFn: () => getAptosTransaction(network, hash) });
    if (query.isLoading) return <Loading />;
    if (query.error) return <ErrorText message={(query.error as Error).message} />;
    const tx = query.data;
    if (!tx) return <Muted>Transaction not found on this network.</Muted>;
    return (
        <div className="space-y-4">
            <Panel title="Transaction">
                <Field label="Hash" value={tx.hash} />
                <Field label="Version" value={tx.version ?? '—'} />
                <Field label="Type" value={tx.type ?? '—'} />
                <Field label="Status" value={tx.success === null ? '—' : tx.success ? 'success' : 'failed'} />
                <Field label="VM status" value={tx.vmStatus ?? '—'} />
                <Field label="Time" value={formatTime(tx.timestamp)} />
                <Field label="Sender" value={tx.sender ? <Link id={tx.sender} onOpen={onOpen}>{tx.sender}</Link> : '—'} />
                <Field label="Function" value={tx.functionName ?? '—'} />
                <Field label="Fee (APT)" value={tx.feeOctas ? formatOctas(tx.feeOctas) : '—'} />
            </Panel>
        </div>
    );
};

const AccountView: React.FC<{ network: Network; address: string; onOpen: (id: string) => void }> = ({ network, address, onOpen }) => {
    const query = useQuery({ queryKey: ['aptos-explorer-account', network, address], queryFn: () => getAptosAccount(network, address) });
    if (query.isLoading) return <Loading />;
    if (query.error) return <ErrorText message={(query.error as Error).message} />;
    const account = query.data;
    if (!account) return <Muted>Account not found on this network.</Muted>;
    return (
        <div className="space-y-4">
            <Panel title="Account">
                <Field label="Address" value={account.address} />
                <Field label="APT balance" value={account.aptBalanceOctas === null ? '—' : `${formatOctas(account.aptBalanceOctas)} APT`} />
                <Field label="Sequence number" value={account.sequenceNumber ?? '—'} />
                <Field label="Authentication key" value={account.authenticationKey ?? '—'} />
            </Panel>
            <Panel title="Recent transactions">
                <TxList txs={account.transactions} onOpen={onOpen} />
            </Panel>
        </div>
    );
};

export const AptosExplorerFeature: React.FC<{ initialQuery?: string }> = ({ initialQuery = '' }) => {
    const { network } = useAppStore();
    const net = network as Network;
    const [input, setInput] = useState(initialQuery);
    const [submitted, setSubmitted] = useState<AptosExplorerTarget | null>(null);
    const [invalid, setInvalid] = useState(false);

    const resolved = useQuery({
        queryKey: ['aptos-explorer-resolve', net, initialQuery],
        enabled: Boolean(initialQuery) && submitted === null,
        queryFn: () => resolveAptosQuery(net, initialQuery),
    });
    const latest = useQuery({
        queryKey: ['aptos-explorer-latest', net],
        enabled: !initialQuery && submitted === null && !invalid,
        queryFn: () => getAptosLatestTransactions(net),
        refetchInterval: 15000,
    });

    const open = async (id: string) => {
        setInput(id);
        const target = await resolveAptosQuery(net, id);
        setInvalid(!target);
        setSubmitted(target);
    };

    const current: AptosExplorerTarget | null = submitted ?? (initialQuery ? resolved.data ?? null : null);

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-5 custom-scrollbar">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void open(input);
                }}
                className="flex items-center gap-2"
            >
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Transaction hash or account address (0x…)"
                        className="w-full rounded-card border border-line bg-sunken py-2 pl-9 pr-3 font-mono text-xs text-fg outline-none focus:border-fg-subtle"
                        aria-label="Aptos search"
                    />
                </div>
                <button type="submit" className="rounded-card border border-line px-4 py-2 text-xs font-semibold text-fg hover:bg-hover">
                    Search
                </button>
            </form>

            {invalid && <ErrorText message="Enter a 0x… hash or address (1-64 hex characters)." />}

            {!current && !invalid && !initialQuery && (
                latest.isLoading ? <Loading /> : latest.error ? <ErrorText message={(latest.error as Error).message} /> : (
                    <Panel title="Latest transactions">
                        <TxList txs={latest.data ?? []} onOpen={(id) => void open(id)} />
                    </Panel>
                )
            )}

            {current?.kind === 'tx' && <TxView network={net} hash={current.id} onOpen={(id) => void open(id)} />}
            {current?.kind === 'address' && <AccountView network={net} address={current.id} onOpen={(id) => void open(id)} />}
            {!current && initialQuery && resolved.isLoading && <Loading />}
        </div>
    );
};
