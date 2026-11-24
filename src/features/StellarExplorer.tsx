'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StellarContractView } from './StellarContract';
import { Loader2, Search } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Network } from '@/types';
import { apiService } from '@/services/api';
import {
    getStellarAccount,
    getStellarAccountCreatedAt,
    getStellarAccountPayments,
    getStellarAccountTransactions,
    getStellarTransaction,
    parseStellarExplorerQuery,
    stroopsToXlm,
    type StellarExplorerTarget,
} from '@/services/stellarExplorer';

const short = (value: string, head = 10, tail = 6) =>
    value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;

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

const TABS = ['Summary', 'Balances', 'Payments', 'Transactions'] as const;
type AccountTab = (typeof TABS)[number];

const AccountView: React.FC<{ network: Network; address: string; onOpen: (id: string) => void }> = ({ network, address, onOpen }) => {
    const [tab, setTab] = useState<AccountTab>('Summary');
    const account = useQuery({
        queryKey: ['stellar-explorer-account', network, address],
        queryFn: () => getStellarAccount(network, address),
    });
    const created = useQuery({
        queryKey: ['stellar-explorer-created', network, address],
        queryFn: () => getStellarAccountCreatedAt(network, address),
    });
    const payments = useQuery({
        queryKey: ['stellar-explorer-payments', network, address],
        enabled: tab === 'Payments',
        queryFn: () => getStellarAccountPayments(network, address),
    });
    const transactions = useQuery({
        queryKey: ['stellar-explorer-txs', network, address],
        enabled: tab === 'Transactions',
        queryFn: () => getStellarAccountTransactions(network, address),
    });
    const tokens = useQuery({
        queryKey: ['stellar-explorer-tokens', network, address],
        enabled: tab === 'Balances',
        queryFn: () => apiService.getStellarTokenBalances(address, network).then((r) => r.tokens),
    });

    if (account.isLoading) return <Loading />;
    if (account.error) return <ErrorText message={(account.error as Error).message} />;
    const acc = account.data;
    if (!acc) return <Muted>Account not funded on this network yet (no ledger entry).</Muted>;

    const xlm = acc.balances.find((b) => b.assetType === 'native');
    const assets = acc.balances.filter((b) => b.assetType !== 'native');

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-1 border-b border-line">
                {TABS.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`px-3 py-2 text-xs font-medium ${tab === t ? 'border-b-2 border-fg text-fg' : 'text-fg-subtle hover:text-fg'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {tab === 'Summary' && (
                <>
                    <Panel title="Account">
                        <Field label="Public key" value={acc.id} />
                        <Field label="Created" value={created.isLoading ? '…' : created.data ?? '—'} />
                        <Field label="Sequence" value={acc.sequence} />
                        <Field label="Home domain" value={acc.homeDomain ?? '—'} />
                        <Field label="Subentries" value={acc.subentryCount} />
                        <Field label="Sponsoring / sponsored" value={`${acc.sponsoringCount} / ${acc.sponsoredCount}`} />
                        <Field label="Last modified ledger" value={acc.lastModifiedLedger} />
                    </Panel>
                    <Panel title="XLM">
                        <Field label="Balance" value={xlm ? `${xlm.balance} XLM` : '0 XLM'} />
                        <Field label="Buying liabilities" value={xlm?.buyingLiabilities ?? '0'} />
                        <Field label="Selling liabilities" value={xlm?.sellingLiabilities ?? '0'} />
                    </Panel>
                    <Panel title="Flags">
                        <Field label="Auth required" value={String(acc.flags.authRequired)} />
                        <Field label="Auth revocable" value={String(acc.flags.authRevocable)} />
                        <Field label="Auth immutable" value={String(acc.flags.authImmutable)} />
                        <Field label="Clawback enabled" value={String(acc.flags.authClawbackEnabled)} />
                    </Panel>
                    <Panel title="Signing thresholds">
                        <Field label="Low / medium / high" value={`${acc.thresholds.low} / ${acc.thresholds.medium} / ${acc.thresholds.high}`} />
                    </Panel>
                    <Panel title={`Signers (${acc.signers.length})`}>
                        <ul className="divide-y divide-line">
                            {acc.signers.map((s) => (
                                <li key={s.key} className="flex items-center justify-between gap-4 py-1.5 text-xs">
                                    <span className="font-mono text-fg">{short(s.key, 12, 8)}</span>
                                    <span className="text-fg-subtle">weight {s.weight} · {s.type}</span>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                </>
            )}

            {tab === 'Balances' && (
                <>
                    <Panel title="Trustline balances">
                        {assets.length === 0 ? (
                            <Muted>No asset trustlines.</Muted>
                        ) : (
                            <ul className="divide-y divide-line">
                                {assets.map((b) => (
                                    <li key={`${b.code}:${b.issuer}`} className="py-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-fg">{b.code}</span>
                                            <span className="font-mono text-xs text-fg">{b.balance}</span>
                                        </div>
                                        <Muted>issuer {short(b.issuer ?? '', 10, 6)} · limit {b.limit ?? '—'}</Muted>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                    <Panel title="Indexed contract token balances (SEP-41)">
                        {tokens.isLoading ? (
                            <Loading />
                        ) : tokens.error ? (
                            <ErrorText message={(tokens.error as Error).message} />
                        ) : !tokens.data?.length ? (
                            <Muted>No indexed token balances.</Muted>
                        ) : (
                            <ul className="divide-y divide-line">
                                {tokens.data.map((t) => (
                                    <li key={t.tokenContract} className="flex justify-between gap-4 py-1.5 text-xs">
                                        <span className="font-mono text-fg">{short(t.tokenContract, 10, 6)}</span>
                                        <span className="font-mono text-fg">{t.balance}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </>
            )}

            {tab === 'Payments' && (
                <Panel title="Recent payments">
                    {payments.isLoading ? (
                        <Loading />
                    ) : payments.error ? (
                        <ErrorText message={(payments.error as Error).message} />
                    ) : !payments.data?.length ? (
                        <Muted>No payments.</Muted>
                    ) : (
                        <ul className="divide-y divide-line">
                            {payments.data.map((p) => (
                                <li key={p.id} className="flex flex-col gap-0.5 py-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className={p.direction === 'in' ? 'text-green-600' : p.direction === 'out' ? 'text-red-500' : 'text-fg-subtle'}>
                                            {p.direction === 'in' ? 'Received' : p.direction === 'out' ? 'Sent' : p.type}
                                        </span>
                                        <span className="font-mono text-fg">{p.amount} {p.assetCode}</span>
                                    </div>
                                    <div className="flex justify-between text-fg-subtle">
                                        <Link id={p.direction === 'in' ? p.from : p.to} onOpen={onOpen}>
                                            {p.direction === 'in' ? `from ${short(p.from)}` : `to ${short(p.to)}`}
                                        </Link>
                                        <span>{new Date(p.createdAt).toLocaleString()}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            )}

            {tab === 'Transactions' && (
                <Panel title="Recent transactions">
                    {transactions.isLoading ? (
                        <Loading />
                    ) : transactions.error ? (
                        <ErrorText message={(transactions.error as Error).message} />
                    ) : !transactions.data?.length ? (
                        <Muted>No transactions.</Muted>
                    ) : (
                        <ul className="divide-y divide-line">
                            {transactions.data.map((t) => (
                                <li key={t.hash} className="flex items-center justify-between gap-4 py-2 text-xs">
                                    <Link id={t.hash} onOpen={onOpen}>{short(t.hash, 12, 8)}</Link>
                                    <span className={t.successful ? 'text-fg-subtle' : 'text-red-500'}>
                                        {t.successful ? 'success' : 'failed'} · {t.operationCount} ops · {new Date(t.createdAt).toLocaleString()}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            )}
        </div>
    );
};

const TxView: React.FC<{ network: Network; hash: string; onOpen: (id: string) => void }> = ({ network, hash, onOpen }) => {
    const query = useQuery({
        queryKey: ['stellar-explorer-tx', network, hash],
        queryFn: () => getStellarTransaction(network, hash),
    });
    if (query.isLoading) return <Loading />;
    if (query.error) return <ErrorText message={(query.error as Error).message} />;
    const tx = query.data;
    if (!tx) return <Muted>Transaction not found on this network.</Muted>;
    return (
        <div className="flex flex-col gap-4">
            <Panel title="Transaction">
                <Field label="Hash" value={tx.hash} />
                <Field label="Status" value={tx.successful ? 'Success' : 'Failed'} />
                <Field label="Ledger" value={tx.ledger} />
                <Field label="Time" value={new Date(tx.createdAt).toLocaleString()} />
                <Field label="Source" value={<Link id={tx.sourceAccount} onOpen={onOpen}>{tx.sourceAccount}</Link>} />
                <Field label="Fee (XLM)" value={stroopsToXlm(tx.feeCharged)} />
                <Field label="Operations" value={tx.operationCount} />
                <Field label="Memo" value={`${tx.memoType}${tx.memo ? `: ${tx.memo}` : ''}`} />
            </Panel>
            <Panel title={`Operations (${tx.operations.length})`}>
                <ul className="divide-y divide-line">
                    {tx.operations.map((op) => (
                        <li key={op.id} className="flex flex-col gap-0.5 py-2 text-xs">
                            <span className="text-fg">{op.type}</span>
                            <span className="text-fg-subtle">{op.summary}</span>
                        </li>
                    ))}
                </ul>
            </Panel>
            <Panel title="XDR">
                <Field label="Envelope" value={short(tx.envelopeXdr, 24, 12)} />
                <Field label="Result" value={short(tx.resultXdr, 24, 12)} />
                <Field label="Result meta" value={short(tx.resultMetaXdr, 24, 12)} />
            </Panel>
        </div>
    );
};

export const StellarExplorerFeature: React.FC<{ initialQuery?: string }> = ({ initialQuery = '' }) => {
    const { network } = useAppStore();
    const net = network as Network;
    const [input, setInput] = useState(initialQuery);
    const [submitted, setSubmitted] = useState<StellarExplorerTarget | null>(null);
    const [invalid, setInvalid] = useState(false);

    const open = (id: string) => {
        const target = parseStellarExplorerQuery(id);
        setInput(id);
        setInvalid(!target);
        setSubmitted(target);
    };

    const initial = !submitted && initialQuery ? parseStellarExplorerQuery(initialQuery) : null;
    const current = submitted ?? initial;

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-5 custom-scrollbar">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    open(input);
                }}
                className="flex items-center gap-2"
            >
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Account address (G… or C…) or transaction hash"
                        className="w-full rounded-card border border-line bg-sunken py-2 pl-9 pr-3 font-mono text-xs text-fg outline-none focus:border-fg-subtle"
                        aria-label="Stellar search"
                    />
                </div>
                <button type="submit" className="rounded-card border border-line px-4 py-2 text-xs font-semibold text-fg hover:bg-hover">
                    Search
                </button>
            </form>

            {invalid && <ErrorText message="Enter a G… or C… address, or a 64-character transaction hash." />}
            {!current && !invalid && <Muted>Search an account or transaction to begin.</Muted>}

            {current?.kind === 'tx' && <TxView network={net} hash={current.id} onOpen={open} />}
            {current?.kind === 'address' && current.id.startsWith('C') && <StellarContractView network={net} contractId={current.id} />}
            {current?.kind === 'address' && !current.id.startsWith('C') && <AccountView network={net} address={current.id} onOpen={open} />}
        </div>
    );
};
