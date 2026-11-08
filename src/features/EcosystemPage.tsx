import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { NetworkAptos, NetworkEthereum, NetworkSolana, NetworkStellar, NetworkSui } from '@web3icons/react';
import { appStore, useAppStore } from '@/lib/store';
import { getChainRpcHealth } from '@/services/suiService';
import { ChainId, RPCHealthMetric } from '@/types';
import { MarketingShell, PageHero, SectionHeading, CtaBand } from '@/components/marketing/MarketingShell';
import { Badge } from '@/components/ui/primitives';

interface EcosystemPageProps {
    embedded?: boolean;
}

const CHAINS: Array<{
    id: ChainId;
    name: string;
    Icon: React.ComponentType<{ size?: number; variant?: 'mono' | 'branded' | 'background' }>;
    invert?: boolean;
    desc: string;
    vm: string;
}> = [
    { id: 'sui', name: 'Sui', Icon: NetworkSui, desc: 'Object-centric L1 with Move and programmable transaction blocks.', vm: 'Move' },
    { id: 'evm', name: 'Ethereum & EVM', Icon: NetworkEthereum, desc: 'Ethereum plus the major EVM mainnets that speak the same eth_* methods.', vm: 'EVM' },
    { id: 'solana', name: 'Solana', Icon: NetworkSolana, desc: 'Parallel execution with instruction-based transactions.', vm: 'SVM' },
    { id: 'aptos', name: 'Aptos', Icon: NetworkAptos, invert: true, desc: 'Move-based L1 with entry functions and view calls.', vm: 'Move' },
    { id: 'stellar', name: 'Stellar & Soroban', Icon: NetworkStellar, invert: true, desc: "Stellar's network with Soroban smart contracts.", vm: 'Wasm' },
];

type Health = RPCHealthMetric | 'loading' | 'error';

export const EcosystemPage: React.FC<EcosystemPageProps> = ({ embedded = false }) => {
    const { network } = useAppStore();
    const [health, setHealth] = useState<Record<string, Health>>({});

    useEffect(() => {
        let cancelled = false;
        CHAINS.forEach((c) => {
            setHealth((h) => ({ ...h, [c.id]: 'loading' }));
            getChainRpcHealth(c.id, network)
                .then((m) => !cancelled && setHealth((h) => ({ ...h, [c.id]: m })))
                .catch(() => !cancelled && setHealth((h) => ({ ...h, [c.id]: 'error' })));
        });
        return () => {
            cancelled = true;
        };
    }, [network]);

    return (
        <MarketingShell embedded={embedded}>
            <PageHero
                eyebrow="Ecosystem"
                title="The chains Txio speaks, live."
                body={
                    <>
                        Status below is checked from your browser right now against each chain&apos;s <span className="capitalize">{network}</span> RPC endpoint.
                    </>
                }
                actions={
                    embedded ? (
                        <button
                            onClick={() => appStore.openTab('new_request')}
                            className="h-10 px-4 inline-flex items-center gap-2 rounded-[10px] bg-inverse text-on-inverse text-sm font-medium hover:opacity-90"
                        >
                            New request <ArrowRight size={14} />
                        </button>
                    ) : (
                        <Link href="/integrations" className="h-10 px-4 inline-flex items-center gap-2 rounded-[10px] bg-inverse text-on-inverse text-sm font-medium hover:opacity-90">
                            What works on each chain <ArrowRight size={14} />
                        </Link>
                    )
                }
            />

            <section className="w-full px-5 md:px-10 2xl:px-16">
                <div data-reveal-group className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                    {CHAINS.map((c) => {
                        const h = health[c.id];
                        const metric = h && h !== 'loading' && h !== 'error' ? h : null;
                        const ms = metric?.latency?.[metric.latency.length - 1];
                        return (
                            <article key={c.id} className="rounded-[16px] border border-line bg-surface p-6 flex flex-col">
                                <div className="flex items-center justify-between">
                                    <span className="h-11 w-11 rounded-[11px] border border-line bg-sunken flex items-center justify-center">
                                        <span className={c.invert ? 'inline-flex dark:invert' : 'inline-flex'}>
                                            <c.Icon size={24} variant="branded" />
                                        </span>
                                    </span>
                                    <span className="font-mono text-[12px] text-fg-subtle">{c.vm}</span>
                                </div>
                                <h2 className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">{c.name}</h2>
                                <p className="mt-1.5 text-[14px] text-fg-muted leading-relaxed flex-1">{c.desc}</p>
                                <div className="mt-6 pt-4 border-t border-line flex items-center justify-between text-xs">
                                    {!h || h === 'loading' ? (
                                        <span className="text-fg-subtle">Checking…</span>
                                    ) : h === 'error' || !metric || metric.status === 'down' ? (
                                        <Badge tone="danger" dot>
                                            Unreachable
                                        </Badge>
                                    ) : metric.status === 'degraded' ? (
                                        <Badge tone="warning" dot>
                                            Slow
                                        </Badge>
                                    ) : (
                                        <Badge tone="success" dot>
                                            Healthy
                                        </Badge>
                                    )}
                                    <span className="font-mono text-fg-muted tabular">{ms !== undefined ? `${Math.round(ms)} ms` : '—'}</span>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="w-full px-5 md:px-10 2xl:px-16 mt-24 grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-1">
                    <SectionHeading eyebrow="Around the chains" title="Wallets, routes and data." />
                </div>
                <Link data-reveal href="/partners" className="group rounded-[16px] border border-line bg-surface p-6 hover:border-line-strong transition-colors">
                    <h3 className="text-[16px] font-semibold">Works with</h3>
                    <p className="mt-1.5 text-[14px] text-fg-muted leading-relaxed">Wallets on every chain, swap and bridge routing, off-ramp and verification sources.</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium">
                        See the list <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                </Link>
                <Link data-reveal href="/infrastructure" className="group rounded-[16px] border border-line bg-surface p-6 hover:border-line-strong transition-colors">
                    <h3 className="text-[16px] font-semibold">Infrastructure</h3>
                    <p className="mt-1.5 text-[14px] text-fg-muted leading-relaxed">How the web app, desktop, CLI and API fit together, and where your keys live.</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium">
                        How it&apos;s built <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                </Link>
            </section>

            <CtaBand embedded={embedded} />
        </MarketingShell>
    );
};
