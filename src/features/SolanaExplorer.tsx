'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Network } from '@/types';
import {
    getSolanaAccount,
    getSolanaNetworkInfo,
    getSolanaTransaction,
    lamportsToSol,
    parseSolanaExplorerQuery,
    type SolanaExplorerTarget,
} from '@/services/solanaExplorer';

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

const TxView: React.FC<{ network: Network; signature: string; onOpen: (id: string) => void }> = ({ network, signature, onOpen }) => {
    const query = useQuery({ queryKey: ['solana-explorer-tx', network, signature], queryFn: () => getSolanaTransaction(network, signature) });
    if (query.isLoading) return <Loading />;
    if (query.error) return <ErrorText message={(query.error as Error).message} />;
    const tx = query.data;
    if (!tx) return <Muted>Transaction not found on this network.</Muted>;
    return (
        <div className="space-y-4">
            <Panel title="Overview">
                <Field label="Signature" value={tx.signature} />
                <Field label="Status" value={tx.status} />
                <Field label="Slot" value={tx.slot ?? '—'} />
                <Field label="Time" value={formatTime(tx.blockTime)} />
                <Field label="Fee" value={tx.feeLamports ? `${lamportsToSol(tx.feeLamports)} SOL` : '—'} />
                <Field label="Compute units" value={tx.computeUnits ?? '—'} />
                {tx.error && <Field label="Error" value={tx.error} />}
            </Panel>
            <Panel title={`Accounts (${tx.accounts.length})`}>
                <ul className="divide-y divide-line">
                    {tx.accounts.map((a) => (
                        <li key={a.pubkey} className="flex items-center justify-between gap-3 py-2 text-xs">
                            <Link id={a.pubkey} onOpen={onOpen}>{short(a.pubkey)}</Link>
                            <span className="text-fg-muted">{a.signer ? 'signer' : ''} {a.writable ? 'writable' : ''}</span>
                            <span className="font-mono text-fg">
                                {a.preLamports && a.postLamports ? `${lamportsToSol(a.preLamports)} → ${lamportsToSol(a.postLamports)} SOL` : '—'}
                            </span>
                        </li>
                    ))}
                </ul>
            </Panel>
            <Panel title={`Instructions (${tx.instructions.length})`}>
                <ul className="space-y-1 text-xs">
                    {tx.instructions.map((ix, i) => (
                        <li key={i} className="font-mono text-fg">
                            {ix.program ?? 'unknown program'}{ix.type ? ` · ${ix.type}` : ''}
                        </li>
                    ))}
                </ul>
            </Panel>
            {tx.logs.length > 0 && (
                <Panel title="Logs">
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-[11px] text-fg-muted">{tx.logs.join('\n')}</pre>
                </Panel>
            )}
        </div>
    );
};

const AccountView: React.FC<{ network: Network; address: string; onOpen: (id: string) => void }> = ({ network, address, onOpen }) => {
    const query = useQuery({ queryKey: ['solana-explorer-account', network, address], queryFn: () => getSolanaAccount(network, address) });
    if (query.isLoading) return <Loading />;
    if (query.error) return <ErrorText message={(query.error as Error).message} />;
    const account = query.data;
    if (!account) return <Muted>Account not found.</Muted>;
    return (
        <div className="space-y-4">
            <Panel title="Account">
                <Field label="Address" value={account.address} />
                <Field label="Balance" value={`${lamportsToSol(account.lamports)} SOL`} />
                <Field label="Owner program" value={account.owner ?? '—'} />
                <Field label="Executable" value={account.executable ? 'yes' : 'no'} />
            </Panel>
            <Panel title="Token accounts">
                {account.tokenError ? (
                    <ErrorText message={`Token balances unavailable: ${account.tokenError}. Public Solana RPCs often block this call; set a custom Solana RPC in Settings.`} />
                ) : account.tokenAccounts.length === 0 ? (
                    <Muted>No token balances.</Muted>
                ) : (
                    <ul className="divide-y divide-line">
                        {account.tokenAccounts.map((t) => (
                            <li key={t.account} className="flex items-center justify-between gap-3 py-2 text-xs">
                                <span className="font-mono text-fg-muted">{short(t.mint)}</span>
                                <span className="font-mono text-fg">{t.decimals !== null ? (Number(t.amount) / 10 ** t.decimals).toString() : t.amount}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
            <Panel title="Recent signatures">
                {account.signatures.length === 0 ? (
                    <Muted>No signatures.</Muted>
                ) : (
                    <ul className="divide-y divide-line">
                        {account.signatures.map((s) => (
                            <li key={s.signature} className="flex items-center justify-between gap-3 py-2">
                                <Link id={s.signature} onOpen={onOpen}>{short(s.signature, 14, 8)}</Link>
                                <span className="text-xs text-fg-muted">{s.failed ? 'failed' : 'success'}</span>
                                <span className="text-xs text-fg-subtle">{formatTime(s.blockTime)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
        </div>
    );
};

export const SolanaExplorerFeature: React.FC<{ initialQuery?: string }> = ({ initialQuery = '' }) => {
    const { network } = useAppStore();
    const [input, setInput] = useState(initialQuery);
    const [submitted, setSubmitted] = useState<SolanaExplorerTarget | null>(() => parseSolanaExplorerQuery(initialQuery));
    const [invalid, setInvalid] = useState(false);
    const info = useQuery({
        queryKey: ['solana-explorer-network', network],
        queryFn: () => getSolanaNetworkInfo(network),
        refetchInterval: 15000,
    });

    const open = (id: string) => {
        const target = parseSolanaExplorerQuery(id);
        setInput(id);
        setInvalid(!target);
        setSubmitted(target);
    };

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
                        placeholder="Transaction signature or account address"
                        className="w-full rounded-card border border-line bg-sunken py-2 pl-9 pr-3 font-mono text-xs text-fg outline-none focus:border-fg-subtle"
                        aria-label="Solana search"
                    />
                </div>
                <button type="submit" className="rounded-card border border-line px-4 py-2 text-xs font-semibold text-fg hover:bg-hover">
                    Search
                </button>
            </form>

            {invalid && <ErrorText message="Enter a transaction signature (base58, 87-88 characters) or an address (base58, 32-44 characters)." />}

            {!submitted && !invalid && (
                <Panel title="Network">
                    {info.isLoading ? (
                        <Loading />
                    ) : info.error ? (
                        <ErrorText message={(info.error as Error).message} />
                    ) : info.data ? (
                        <>
                            <Field label="Current slot" value={info.data.slot} />
                            <Field label="Epoch" value={info.data.epoch ?? '—'} />
                            <Field
                                label="Epoch progress"
                                value={info.data.slotIndex !== null && info.data.slotsInEpoch ? `${((info.data.slotIndex / info.data.slotsInEpoch) * 100).toFixed(1)}%` : '—'}
                            />
                        </>
                    ) : null}
                </Panel>
            )}

            {submitted?.kind === 'tx' && <TxView network={network} signature={submitted.id} onOpen={open} />}
            {submitted?.kind === 'address' && <AccountView network={network} address={submitted.id} onOpen={open} />}
        </div>
    );
};
