'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getEvmChain } from '@/lib/constants';
import {
    evmExplorerSupported,
    evmNativeSymbol,
    formatEvmAmount,
    getEvmAddress,
    getEvmLatestTransactions,
    getEvmTransaction,
    parseEvmExplorerQuery,
    type EvmExplorerTarget,
    type EvmListedTransaction,
} from '@/services/evmExplorer';

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

interface ViewProps {
    chainId: number;
    onOpen: (id: string) => void;
}

const TxView: React.FC<ViewProps & { hash: string }> = ({ chainId, onOpen, hash }) => {
    const native = evmNativeSymbol(chainId);
    const query = useQuery({
        queryKey: ['evm-explorer-tx', chainId, hash],
        queryFn: () => getEvmTransaction(chainId, hash),
    });
    if (query.isLoading) return <Loading />;
    if (query.error) return <ErrorText message={(query.error as Error).message} />;
    if (!query.data) return <Muted>Transaction not found on this chain. Very recent transactions can take a few minutes to appear.</Muted>;
    const { tx, tokenTransfers } = query.data;
    return (
        <div className="space-y-4">
            <Panel title="Overview">
                <Field label="Hash" value={tx.hash} />
                <Field label="Status" value={tx.status} />
                <Field label="Block" value={tx.blockNumber ?? '—'} />
                <Field label="Time" value={formatTime(tx.timestamp)} />
                <Field label="From" value={tx.from ? <Link id={tx.from} onOpen={onOpen}>{tx.from}</Link> : '—'} />
                <Field label="To" value={tx.to ? <Link id={tx.to} onOpen={onOpen}>{tx.to}</Link> : tx.createdContract ?? '—'} />
                <Field label="Value" value={`${formatEvmAmount(tx.valueWei, 18)} ${native}`} />
                <Field label="Method" value={tx.method ?? '—'} />
                {tx.revertReason && <Field label="Revert reason" value={tx.revertReason} />}
            </Panel>
            <Panel title="Gas">
                <Field label="Gas used" value={tx.gasUsed ?? '—'} />
                <Field label="Gas price (wei)" value={tx.gasPriceWei ?? '—'} />
                <Field label="Fee" value={tx.feeWei ? `${formatEvmAmount(tx.feeWei, 18)} ${native}` : '—'} />
            </Panel>
            <Panel title={`Token transfers (${tokenTransfers.length})`}>
                {tokenTransfers.length === 0 ? (
                    <Muted>No token transfers.</Muted>
                ) : (
                    <ul className="divide-y divide-line">
                        {tokenTransfers.map((t, i) => (
                            <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                                <span className="min-w-0 truncate font-mono text-xs text-fg-muted">
                                    {t.from ? short(t.from) : '—'} → {t.to ? short(t.to) : '—'}
                                </span>
                                <span className="shrink-0 font-mono text-fg">
                                    {formatEvmAmount(t.value, t.decimals)} {t.symbol ?? ''}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
        </div>
    );
};

const AddressView: React.FC<ViewProps & { address: string }> = ({ chainId, onOpen, address }) => {
    const native = evmNativeSymbol(chainId);
    const query = useQuery({
        queryKey: ['evm-explorer-address', chainId, address],
        queryFn: () => getEvmAddress(chainId, address),
    });
    if (query.isLoading) return <Loading />;
    if (query.error) return <ErrorText message={(query.error as Error).message} />;
    if (!query.data) return <Muted>Address not found on this chain.</Muted>;
    const { address: detail, tokens, tokensError, transactions, transactionsError } = query.data;
    return (
        <div className="space-y-4">
            <Panel title="Address">
                <Field label="Address" value={detail.address} />
                <Field label="Balance" value={`${formatEvmAmount(detail.coinBalanceWei, 18)} ${native}`} />
                <Field label="Type" value={detail.isContract ? 'Contract' : 'Account'} />
                <Field label="ENS" value={detail.ensName ?? '—'} />
            </Panel>
            <Panel title={`Tokens (${tokens.length})`}>
                {tokensError ? (
                    <ErrorText message={`Token balances unavailable: ${tokensError}`} />
                ) : tokens.length === 0 ? (
                    <Muted>No token balances.</Muted>
                ) : (
                    <ul className="divide-y divide-line">
                        {tokens.map((t) => (
                            <li key={t.tokenAddress} className="flex items-center justify-between gap-3 py-2 text-sm">
                                <span className="min-w-0 truncate text-fg">{t.symbol ?? t.name ?? short(t.tokenAddress)}</span>
                                <span className="shrink-0 font-mono text-fg">{formatEvmAmount(t.valueRaw, t.decimals)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
            <Panel title="Recent transactions">
                {transactionsError ? <ErrorText message={`Transactions unavailable: ${transactionsError}`} /> : <TxList txs={transactions} onOpen={onOpen} />}
            </Panel>
        </div>
    );
};

const TxList: React.FC<{ txs: EvmListedTransaction[]; onOpen: (id: string) => void }> = ({ txs, onOpen }) => {
    if (txs.length === 0) return <Muted>No transactions.</Muted>;
    return (
        <ul className="divide-y divide-line">
            {txs.map((t) => (
                <li key={t.hash} className="flex items-center justify-between gap-3 py-2">
                    <Link id={t.hash} onOpen={onOpen}>{short(t.hash, 14, 8)}</Link>
                    <span className="text-xs text-fg-muted">{t.method ?? (t.status === 'failed' ? 'failed' : 'transfer')}</span>
                    <span className="text-xs text-fg-subtle">{formatTime(t.timestamp)}</span>
                </li>
            ))}
        </ul>
    );
};

const Loading = () => (
    <div className="flex items-center gap-2 text-xs text-fg-subtle">
        <Loader2 size={14} className="animate-spin" /> Loading…
    </div>
);
const ErrorText = ({ message }: { message: string }) => <div className="text-xs text-red-500">{message}</div>;
const Muted = ({ children }: { children: React.ReactNode }) => <div className="text-xs text-fg-subtle">{children}</div>;

/** Chain used when the tab does not name one: mainnet → Ethereum, otherwise Sepolia. */
const defaultChainId = (network: string) => (network === 'mainnet' ? 1 : 11155111);

export const EvmExplorerFeature: React.FC<{ initialQuery?: string; chainId?: number }> = ({ initialQuery = '', chainId }) => {
    const { network } = useAppStore();
    const resolvedChain = chainId ?? defaultChainId(network);
    const [input, setInput] = useState(initialQuery);
    const [submitted, setSubmitted] = useState<EvmExplorerTarget | null>(() => parseEvmExplorerQuery(initialQuery));
    const [invalid, setInvalid] = useState(false);
    const supported = evmExplorerSupported(resolvedChain);

    const latest = useQuery({
        queryKey: ['evm-explorer-latest', resolvedChain],
        enabled: supported && submitted === null && !invalid,
        queryFn: () => getEvmLatestTransactions(resolvedChain),
        refetchInterval: 15000,
    });

    const open = (id: string) => {
        const target = parseEvmExplorerQuery(id);
        setInput(id);
        setInvalid(!target);
        setSubmitted(target);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        open(input);
    };

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-5 custom-scrollbar">
            <div className="text-xs text-fg-subtle">
                {getEvmChain(resolvedChain).name} · {evmNativeSymbol(resolvedChain)}
            </div>
            <form onSubmit={submit} className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Transaction hash (0x + 64) or address (0x + 40)"
                        className="w-full rounded-card border border-line bg-sunken py-2 pl-9 pr-3 font-mono text-xs text-fg outline-none focus:border-fg-subtle"
                        aria-label="EVM search"
                    />
                </div>
                <button type="submit" className="rounded-card border border-line px-4 py-2 text-xs font-semibold text-fg hover:bg-hover">
                    Search
                </button>
            </form>

            {invalid && <ErrorText message="Enter a transaction hash (0x + 64 hex characters) or an address (0x + 40 hex characters)." />}
            {!supported && <Muted>No explorer data is configured for {getEvmChain(resolvedChain).name} yet.</Muted>}

            {supported && submitted === null && !invalid && (
                <Panel title="Latest transactions">
                    {latest.isLoading ? <Loading /> : latest.error ? <ErrorText message={(latest.error as Error).message} /> : <TxList txs={latest.data ?? []} onOpen={open} />}
                </Panel>
            )}

            {supported && submitted?.kind === 'tx' && <TxView chainId={resolvedChain} hash={submitted.id} onOpen={open} />}
            {supported && submitted?.kind === 'address' && <AddressView chainId={resolvedChain} address={submitted.id} onOpen={open} />}
        </div>
    );
};
