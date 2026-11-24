'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { Network } from '@/types';
import { formatRawAmount } from '@/services/suiGraphql';
import { getSuiAccountSummary, getSuiAccountTransactions } from '@/services/suiAccount';

const short = (value: string, head = 10, tail = 6) =>
    value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="rounded-card border border-line bg-sunken p-4">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle">{title}</h3>
        {children}
    </section>
);
const Loading = () => (
    <div className="flex items-center gap-2 text-xs text-fg-subtle">
        <Loader2 size={14} className="animate-spin" /> Loading…
    </div>
);
const Muted = ({ children }: { children: React.ReactNode }) => <div className="text-xs text-fg-subtle">{children}</div>;
const ErrorText = ({ message }: { message: string }) => <div className="text-xs text-red-500">{message}</div>;

const TABS = ['Sent', 'Affected'] as const;
type TxTab = (typeof TABS)[number];

/** Account view for a Sui address: SUI balance, owned objects, and transactions. */
export const SuiAccountView: React.FC<{ network: Network; address: string; onOpen: (id: string) => void }> = ({
    network,
    address,
    onOpen,
}) => {
    const [tab, setTab] = useState<TxTab>('Sent');
    const summary = useQuery({
        queryKey: ['sui-account-summary', network, address],
        queryFn: () => getSuiAccountSummary(network, address, 20),
    });
    const txs = useQuery({
        queryKey: ['sui-account-txs', network, address, tab],
        queryFn: () => getSuiAccountTransactions(network, address, tab === 'Sent' ? 'SENT' : 'AFFECTED', 20),
    });

    return (
        <div className="flex flex-col gap-4">
            <Panel title="Account">
                <div className="break-all font-mono text-xs text-fg">{address}</div>
                {summary.isLoading ? (
                    <Loading />
                ) : summary.error ? (
                    <ErrorText message={(summary.error as Error).message} />
                ) : summary.data ? (
                    <div className="mt-2 text-sm text-fg">
                        {formatRawAmount(summary.data.suiBalanceMist, 9)} SUI
                    </div>
                ) : (
                    <Muted>Account not found.</Muted>
                )}
            </Panel>

            {summary.data && (
                <Panel title={`Owned objects (${summary.data.objects.length} shown)`}>
                    {summary.data.objects.length === 0 ? (
                        <Muted>No owned objects.</Muted>
                    ) : (
                        <ul className="divide-y divide-line">
                            {summary.data.objects.map((o) => (
                                <li key={o.address} className="flex items-center justify-between gap-4 py-1.5 text-xs">
                                    <button type="button" onClick={() => onOpen(o.address)} className="font-mono text-fg hover:underline">
                                        {short(o.address)}
                                    </button>
                                    <span className="text-fg-subtle">v{o.version}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            )}

            <Panel title="Transactions">
                <div className="mb-3 flex gap-1 border-b border-line">
                    {TABS.map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={`px-3 py-1.5 text-xs font-medium ${tab === t ? 'border-b-2 border-fg text-fg' : 'text-fg-subtle hover:text-fg'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                {txs.isLoading ? (
                    <Loading />
                ) : txs.error ? (
                    <ErrorText message={(txs.error as Error).message} />
                ) : !txs.data?.length ? (
                    <Muted>No {tab.toLowerCase()} transactions.</Muted>
                ) : (
                    <ul className="divide-y divide-line">
                        {txs.data.map((t) => (
                            <li key={t.digest} className="flex flex-col gap-0.5 py-2 text-xs">
                                <div className="flex justify-between gap-4">
                                    <button type="button" onClick={() => onOpen(t.digest)} className="font-mono text-fg hover:underline">
                                        {short(t.digest, 12, 8)}
                                    </button>
                                    <span className={t.success === false ? 'text-red-500' : 'text-fg-subtle'}>
                                        {t.success === null ? 'unknown' : t.success ? 'success' : 'failed'}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-4 text-fg-subtle">
                                    <span>{t.timestamp ? new Date(t.timestamp).toLocaleString() : '—'}</span>
                                    <span>{t.feeMist === null ? 'fee —' : `fee ${formatRawAmount(t.feeMist, 9, 6)} SUI`}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
        </div>
    );
};
