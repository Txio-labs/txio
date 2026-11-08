import React from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Minus, CircleDashed } from 'lucide-react';
import { NetworkAptos, NetworkEthereum, NetworkSolana, NetworkStellar, NetworkSui } from '@web3icons/react';
import { appStore } from '@/lib/store';
import { MarketingShell, PageHero, CtaBand } from '@/components/marketing/MarketingShell';
import { cx } from '@/components/ui/primitives';

interface IntegrationsPageProps {
    embedded?: boolean;
}

type Support = 'yes' | 'no' | 'partial';

interface ChainInfo {
    id: string;
    name: string;
    Icon: React.ComponentType<{ size?: number; variant?: 'mono' | 'branded' | 'background' }>;
    status: 'live' | 'partial';
    desc: string;
    features: { label: string; support: Support }[];
    cmd: string;
}

const CHAINS: ChainInfo[] = [
    {
        id: 'sui', name: 'Sui', Icon: NetworkSui, status: 'live',
        desc: 'The most complete integration. Name resolution scans the whole request body, so .sui names are caught even nested inside Move type tags.',
        features: [
            { label: 'JSON-RPC with method autocomplete', support: 'yes' },
            { label: 'Move call and PTB builder', support: 'yes' },
            { label: 'SuiNS name resolution', support: 'yes' },
            { label: 'Dry run before signing', support: 'yes' },
        ],
        cmd: 'txio sui balance aliphatic.sui',
    },
    {
        id: 'eth', name: 'Ethereum & EVM', Icon: NetworkEthereum, status: 'live',
        desc: 'Every eth_* method on Ethereum and the major EVM mainnets. Contract calls from an ABI, a function signature or raw calldata.',
        features: [
            { label: 'JSON-RPC on 20+ EVM networks', support: 'yes' },
            { label: 'ENS name resolution', support: 'yes' },
            { label: 'eth_call and gas estimation', support: 'yes' },
            { label: 'Logs and state diff in review', support: 'no' },
        ],
        cmd: 'txio --network testnet eth balance 0x1a2...9f',
    },
    {
        id: 'sol', name: 'Solana', Icon: NetworkSolana, status: 'partial',
        desc: 'RPC on mainnet, testnet and devnet, plus an instruction builder that signs with the connected wallet.',
        features: [
            { label: 'JSON-RPC passthrough', support: 'yes' },
            { label: 'Instruction builder', support: 'yes' },
            { label: 'simulateTransaction', support: 'yes' },
            { label: 'Name resolution', support: 'no' },
        ],
        cmd: 'txio --network devnet solana balance 8kd...a1',
    },
    {
        id: 'apt', name: 'Aptos', Icon: NetworkAptos, status: 'partial',
        desc: 'REST and view calls, entry-function transactions and Aptos Names resolution. Balance changes are not shown in review yet.',
        features: [
            { label: 'REST and view functions', support: 'yes' },
            { label: 'Entry function builder', support: 'yes' },
            { label: 'Aptos Names resolution', support: 'yes' },
            { label: 'Balance diff in review', support: 'no' },
        ],
        cmd: 'txio aptos balance 0x9f3...2c',
    },
    {
        id: 'xlm', name: 'Stellar & Soroban', Icon: NetworkStellar, status: 'partial',
        desc: "Soroban RPC and contract calls with Stellar's simulation, and federation addresses resolved to accounts.",
        features: [
            { label: 'Soroban RPC passthrough', support: 'yes' },
            { label: 'Contract call builder', support: 'yes' },
            { label: 'Federation address resolution', support: 'yes' },
            { label: 'Balance diff in review', support: 'no' },
        ],
        cmd: 'txio soroban balance GABC...XY7',
    },
];

const SupportIcon: React.FC<{ s: Support }> = ({ s }) =>
    s === 'yes' ? (
        <Check size={14} className="text-emerald-500 shrink-0" />
    ) : s === 'partial' ? (
        <CircleDashed size={14} className="text-amber-500 shrink-0" />
    ) : (
        <Minus size={14} className="text-fg-subtle shrink-0" />
    );

export const IntegrationsPage: React.FC<IntegrationsPageProps> = ({ embedded = false }) => {
    return (
        <MarketingShell embedded={embedded}>
            <PageHero
                eyebrow="Integrations"
                title="Five chain families. One shape of request."
                body="What works on each chain today, without the marketing gloss. Gaps are listed as gaps."
                actions={
                    embedded ? (
                        <button
                            onClick={() => appStore.openTab('new_request')}
                            className="h-10 px-4 inline-flex items-center gap-2 rounded-[10px] bg-inverse text-on-inverse text-sm font-medium hover:opacity-90"
                        >
                            New request <ArrowRight size={14} />
                        </button>
                    ) : (
                        <Link href="/signup" className="h-10 px-4 inline-flex items-center gap-2 rounded-[10px] bg-inverse text-on-inverse text-sm font-medium hover:opacity-90">
                            Start building <ArrowRight size={14} />
                        </Link>
                    )
                }
            >
                <div className="mt-10 flex flex-wrap gap-2">
                    {CHAINS.map((c) => (
                        <a
                            key={c.id}
                            href={`#${c.id}`}
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(c.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="h-9 pl-2 pr-3 inline-flex items-center gap-2 rounded-[9px] border border-line bg-surface text-[14px] text-fg hover:border-line-strong transition-colors"
                        >
                            <span className={`inline-flex ${c.Icon === NetworkAptos || c.Icon === NetworkStellar ? "dark:invert" : ""}`}><c.Icon size={18} variant="branded" /></span>
                            {c.name}
                        </a>
                    ))}
                </div>
            </PageHero>

            <section data-reveal-group className="w-full px-5 md:px-10 2xl:px-16 space-y-3">
                {CHAINS.map((c) => (
                    <article key={c.id} id={c.id} className="scroll-mt-24 rounded-[16px] border border-line bg-surface grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] overflow-hidden">
                        <div className="p-6 md:p-8">
                            <div className="flex items-center gap-3">
                                <span className="h-11 w-11 rounded-[11px] border border-line bg-sunken flex items-center justify-center">
                                    <span className={`inline-flex ${c.Icon === NetworkAptos || c.Icon === NetworkStellar ? "dark:invert" : ""}`}><c.Icon size={24} variant="branded" /></span>
                                </span>
                                <div>
                                    <h2 className="text-xl font-semibold tracking-[-0.02em]">{c.name}</h2>
                                    <span
                                        className={cx(
                                            'mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium',
                                            c.status === 'live' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                                        )}
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                        {c.status === 'live' ? 'Full support' : 'Core support'}
                                    </span>
                                </div>
                            </div>
                            <p className="mt-5 text-[15px] text-fg-muted leading-relaxed max-w-lg">{c.desc}</p>
                            <div className="mt-6 rounded-[9px] border border-line bg-sunken px-3 h-10 flex items-center font-mono text-xs text-fg-muted overflow-x-auto no-scrollbar whitespace-nowrap">
                                <span className="text-fg-subtle mr-2">$</span>
                                {c.cmd}
                            </div>
                        </div>
                        <ul className="border-t lg:border-t-0 lg:border-l border-line divide-y divide-line">
                            {c.features.map((f) => (
                                <li key={f.label} className="flex items-center gap-3 px-6 md:px-8 h-14 text-[14px]">
                                    <SupportIcon s={f.support} />
                                    <span className={f.support === 'no' ? 'text-fg-subtle' : 'text-fg'}>{f.label}</span>
                                    {f.support === 'no' && <span className="ml-auto text-[12px] text-fg-subtle">Not yet</span>}
                                </li>
                            ))}
                        </ul>
                    </article>
                ))}
            </section>

            <CtaBand embedded={embedded} />
        </MarketingShell>
    );
};
