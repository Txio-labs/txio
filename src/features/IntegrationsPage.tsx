import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { ThemeToggle } from '@/components/ThemeToggle';

interface IntegrationsPageProps {
    embedded?: boolean;
}

type Support = 'yes' | 'no' | 'partial';

interface ChainInfo {
    id: string;
    name: string;
    dot: string;
    status: 'live' | 'partial';
    rpc: Support;
    rpcLabel: string;
    names: Support;
    namesLabel: string;
    gas: Support;
    gasLabel: string;
    desc: string;
    features: { label: string; support: Support }[];
    cmd: string;
}

const CHAINS: ChainInfo[] = [
    {
        id: 'sui', name: 'Sui', dot: '#6fbcf0', status: 'live',
        rpc: 'yes', rpcLabel: 'full', names: 'yes', namesLabel: 'SuiNS', gas: 'yes', gasLabel: 'yes',
        desc: "The most complete integration. Name resolution runs a recursive scan across the whole request body, so .sui names are caught even nested inside Move type tags.",
        features: [
            { label: 'Balance & RPC passthrough', support: 'yes' },
            { label: 'SuiNS name resolution', support: 'yes' },
            { label: 'Gas estimation', support: 'yes' },
            { label: 'PTB simulation', support: 'yes' },
        ],
        cmd: 'txio sui balance aliphatic.sui',
    },
    {
        id: 'eth', name: 'Ethereum', dot: '#a5a8f7', status: 'partial',
        rpc: 'yes', rpcLabel: 'full', names: 'no', namesLabel: 'ENS planned', gas: 'yes', gasLabel: 'yes',
        desc: 'Full RPC passthrough and gas estimation today. ENS resolution for .eth names is on the roadmap but not wired up yet — raw addresses only for now.',
        features: [
            { label: 'Balance & RPC passthrough', support: 'yes' },
            { label: 'ENS resolution (planned)', support: 'no' },
            { label: 'Gas estimation', support: 'yes' },
        ],
        cmd: 'txio --network testnet eth balance 0x1a2...9f',
    },
    {
        id: 'sol', name: 'Solana', dot: '#14f195', status: 'partial',
        rpc: 'yes', rpcLabel: 'full', names: 'no', namesLabel: 'planned', gas: 'yes', gasLabel: 'yes',
        desc: 'Full RPC passthrough on mainnet, testnet, and devnet. No name-service integration yet.',
        features: [
            { label: 'Balance & RPC passthrough', support: 'yes' },
            { label: 'Name resolution (planned)', support: 'no' },
            { label: 'Gas estimation', support: 'yes' },
        ],
        cmd: 'txio --network devnet solana balance 8kd...a1',
    },
    {
        id: 'apt', name: 'Aptos', dot: '#2ed3b7', status: 'partial',
        rpc: 'yes', rpcLabel: 'full', names: 'no', namesLabel: 'planned', gas: 'partial', gasLabel: 'estimate only',
        desc: "Balance and RPC calls work; gas is estimated rather than simulated. Name resolution is scoped for a future release alongside Soroban's.",
        features: [
            { label: 'Balance & RPC passthrough', support: 'yes' },
            { label: 'Name resolution (planned)', support: 'no' },
            { label: 'Gas estimate only', support: 'partial' },
        ],
        cmd: 'txio aptos balance 0x9f3...2c',
    },
    {
        id: 'xlm', name: 'Soroban', dot: '#f5d060', status: 'partial',
        rpc: 'yes', rpcLabel: 'full', names: 'no', namesLabel: 'planned', gas: 'partial', gasLabel: 'estimate only',
        desc: "Stellar's smart contract platform. Same command shape as the other four — balance and RPC passthrough are live today.",
        features: [
            { label: 'Balance & RPC passthrough', support: 'yes' },
            { label: 'Name resolution (planned)', support: 'no' },
            { label: 'Gas estimate only', support: 'partial' },
        ],
        cmd: 'txio soroban balance GABC...XY7',
    },
];

const SUPPORT_STYLE: Record<Support, string> = {
    yes: 'text-green-400',
    no: 'text-slate-600',
    partial: 'text-yellow-400',
};

const SUPPORT_TICK: Record<Support, string> = { yes: '✓', no: '–', partial: '~' };

function StatusChip({ status }: { status: 'live' | 'partial' }) {
    return status === 'live' ? (
        <span className="font-mono text-[10.5px] px-2.5 py-1 rounded-full border border-green-400/35 bg-green-400/10 text-green-400">live</span>
    ) : (
        <span className="font-mono text-[10.5px] px-2.5 py-1 rounded-full border border-yellow-400/35 bg-yellow-400/10 text-yellow-400">partial</span>
    );
}

export const IntegrationsPage: React.FC<IntegrationsPageProps> = ({ embedded = false }) => {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const router = useRouter();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const navigateTo = (target: 'ecosystem' | 'app') => {
        if (embedded) {
            appStore.openTab(target === 'app' ? 'new_request' : target);
            return;
        }
        router.push(target === 'app' ? '/signup' : '/ecosystem');
    };

    const scrollToChain = (id: string) => {
        setMobileNavOpen(false);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    React.useEffect(() => {
        if (embedded) return;
        document.body.style.overflow = 'auto';
        document.body.style.overflowX = 'hidden';
        return () => {
            document.body.style.overflow = 'hidden';
        };
    }, [embedded]);

    return (
        <div className={`${embedded ? 'h-full' : 'min-h-screen'} font-sans selection:bg-electric-violet/25 ${
            isDark ? 'bg-[#0a0c10] text-[#e6e8eb]' : 'bg-slate-50 text-slate-900'
        }`}>
            {/* Docs-style header */}
            <div className={`${embedded ? 'sticky top-0' : 'fixed left-0 right-0 top-0'} z-50 flex h-14 items-center gap-4 border-b px-4 backdrop-blur-md md:px-6 ${
                isDark ? 'border-white/10 bg-[#0a0c10]/90' : 'border-slate-200 bg-white/90'
            }`}>
                <button
                    type="button"
                    onClick={() => navigateTo('ecosystem')}
                    className={`flex shrink-0 items-center gap-2 text-sm font-bold transition-colors ${
                        isDark ? 'text-[#8b93a1] hover:text-white' : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <ArrowLeft size={16} />
                    <span className="hidden sm:inline">Ecosystem</span>
                </button>
                <div className={`h-5 w-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                <div className="flex shrink-0 items-center gap-2 font-mono text-[15px] font-semibold">
                    <span className="h-2 w-2 rounded-full bg-electric-violet shadow-[0_0_8px_#a3a3a3]" />
                    <span>txio</span>
                    <span className={isDark ? 'text-[#5c6472]' : 'text-slate-400'}>/ integrations</span>
                </div>

                <nav className={`ml-auto hidden items-center gap-5 text-[13px] lg:flex ${isDark ? 'text-[#8b93a1]' : 'text-slate-500'}`}>
                    {CHAINS.map((chain) => (
                        <button
                            key={chain.id}
                            type="button"
                            onClick={() => scrollToChain(chain.id)}
                            className="flex items-center gap-1.5 hover:text-electric-violet"
                        >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: chain.dot }} />
                            {chain.name}
                        </button>
                    ))}
                </nav>

                <ThemeToggle />

                <button
                    type="button"
                    onClick={() => setMobileNavOpen((v) => !v)}
                    className={`lg:hidden ${isDark ? 'text-[#8b93a1] hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                <button
                    type="button"
                    onClick={() => navigateTo('app')}
                    className={`hidden shrink-0 rounded-md px-4 py-1.5 text-[11px] font-black uppercase tracking-widest shadow-lg transition-all hover:bg-electric-violet hover:text-white active:scale-95 sm:block ${
                        isDark ? 'bg-white text-near-black' : 'bg-slate-900 text-white'
                    }`}
                >
                    {embedded ? 'New request' : 'Launch'}
                </button>
            </div>

            {mobileNavOpen && (
                <div className={`fixed inset-0 z-40 pt-14 lg:hidden ${isDark ? 'bg-[#0a0c10]/95' : 'bg-white/95'}`}>
                    <div className="h-full overflow-y-auto px-6 py-8 space-y-1">
                        {CHAINS.map((chain) => (
                            <button
                                key={chain.id}
                                type="button"
                                onClick={() => scrollToChain(chain.id)}
                                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-left text-[14px] ${
                                    isDark ? 'text-[#c4c9d1] hover:bg-white/[0.03]' : 'text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chain.dot }} />
                                {chain.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <main className={`mx-auto max-w-7xl px-6 md:px-12 xl:px-16 ${embedded ? 'pt-24' : 'pt-28'} pb-24`}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-electric-violet">Chain support</div>
                    <h1 className="mb-5 max-w-2xl text-4xl md:text-[52px] font-bold leading-[1.1] tracking-tight">
                        Every chain we <span className={isDark ? 'text-[#5c6472]' : 'text-slate-400'}>actually</span> speak.
                    </h1>
                    <p className={`mb-10 max-w-xl text-[16.5px] leading-relaxed ${isDark ? 'text-[#8b93a1]' : 'text-slate-500'}`}>
                        Direct connections to every major chain — not just an RPC URL. Schema, names, gas estimation, the whole thing. Here&apos;s exactly what&apos;s live and what&apos;s still on the way.
                    </p>

                    {/* Quick jump chips */}
                    <div className="mb-16 flex flex-wrap gap-2">
                        {CHAINS.map((chain) => (
                            <button
                                key={chain.id}
                                type="button"
                                onClick={() => scrollToChain(chain.id)}
                                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-xs transition-colors ${
                                    isDark ? 'border-white/10 text-[#8b93a1] hover:border-white/25 hover:text-white' : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-900'
                                }`}
                            >
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: chain.dot }} />
                                {chain.name}
                            </button>
                        ))}
                    </div>

                    {/* Capability matrix */}
                    <div className="mb-20 overflow-x-auto">
                        <table className="w-full min-w-[560px] border-collapse text-[13.5px]">
                            <thead>
                                <tr>
                                    {['Chain', 'RPC passthrough', 'Name resolution', 'Gas estimation', 'Status'].map((h) => (
                                        <th key={h} className={`border-b px-3.5 py-2.5 text-left font-mono text-[10.5px] uppercase tracking-wider ${
                                            isDark ? 'border-white/10 text-[#5c6472]' : 'border-slate-200 text-slate-400'
                                        }`}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {CHAINS.map((chain) => (
                                    <tr key={chain.id}>
                                        <td className={`border-b px-3.5 py-3.5 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                            <div className="flex items-center gap-2.5 font-semibold">
                                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: chain.dot }} />
                                                {chain.name}
                                            </div>
                                        </td>
                                        <td className={`border-b px-3.5 py-3.5 ${isDark ? 'border-white/10' : 'border-slate-200'} ${SUPPORT_STYLE[chain.rpc]}`}>{SUPPORT_TICK[chain.rpc]} {chain.rpcLabel}</td>
                                        <td className={`border-b px-3.5 py-3.5 ${isDark ? 'border-white/10' : 'border-slate-200'} ${SUPPORT_STYLE[chain.names]}`}>{SUPPORT_TICK[chain.names]} {chain.namesLabel}</td>
                                        <td className={`border-b px-3.5 py-3.5 ${isDark ? 'border-white/10' : 'border-slate-200'} ${SUPPORT_STYLE[chain.gas]}`}>{SUPPORT_TICK[chain.gas]} {chain.gasLabel}</td>
                                        <td className={`border-b px-3.5 py-3.5 ${isDark ? 'border-white/10' : 'border-slate-200'}`}><StatusChip status={chain.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* By chain */}
                    <h2 className="mb-2 text-[22px] font-bold">By chain</h2>
                    <p className={`mb-8 text-sm ${isDark ? 'text-[#8b93a1]' : 'text-slate-500'}`}>
                        Every card below is what today&apos;s <code className={`rounded px-1.5 py-0.5 text-electric-violet font-mono text-[12.5px] ${isDark ? 'bg-[#12151b]' : 'bg-slate-100'}`}>txio &lt;chain&gt;</code> commands actually do — not a roadmap.
                    </p>

                    <div className="space-y-4 mb-16">
                        {CHAINS.map((chain) => (
                            <div key={chain.id} id={chain.id} className={`scroll-mt-20 rounded-xl border p-7 ${
                                isDark ? 'border-white/10 bg-[#12151b]' : 'border-slate-200 bg-white shadow-sm'
                            }`}>
                                <div className="mb-1.5 flex items-center gap-3">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chain.dot }} />
                                    <h3 className="text-lg font-bold">{chain.name}</h3>
                                </div>
                                <p className={`mb-5 max-w-xl text-sm leading-relaxed ${isDark ? 'text-[#8b93a1]' : 'text-slate-500'}`}>{chain.desc}</p>
                                <div className="mb-5 flex flex-wrap gap-x-6 gap-y-2.5">
                                    {chain.features.map((f) => (
                                        <div key={f.label} className={`flex items-center gap-1.5 text-[13px] ${isDark ? 'text-[#8b93a1]' : 'text-slate-500'}`}>
                                            <span className={`font-mono font-bold ${SUPPORT_STYLE[f.support]}`}>{SUPPORT_TICK[f.support]}</span>
                                            {f.label}
                                        </div>
                                    ))}
                                </div>
                                <div className={`rounded-lg border px-4 py-3 font-mono text-[13px] ${
                                    isDark ? 'border-white/10 bg-[#0a0c10] text-[#8b93a1]' : 'border-slate-200 bg-slate-50 text-slate-500'
                                }`}>
                                    <span className="text-green-400">$</span> <span className={isDark ? 'text-[#e6e8eb]' : 'text-slate-900'}>{chain.cmd}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Extend CTA */}
                    <div className={`flex flex-wrap items-center justify-between gap-6 rounded-2xl border p-9 ${
                        isDark ? 'border-white/10 bg-[#12151b]' : 'border-slate-200 bg-white shadow-sm'
                    }`}>
                        <div>
                            <h3 className="mb-1.5 text-lg font-bold">Don&apos;t see your chain?</h3>
                            <p className={`max-w-md text-sm ${isDark ? 'text-[#8b93a1]' : 'text-slate-500'}`}>
                                Adding one means implementing <code className={`rounded px-1.5 py-0.5 text-electric-violet font-mono text-[12.5px] ${isDark ? 'bg-[#0a0c10]' : 'bg-slate-100'}`}>ChainAdapter</code> in a single file — no changes to the parser or the other five integrations.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigateTo('app')}
                            className={`whitespace-nowrap rounded-lg px-5 py-3 text-sm font-bold transition-all hover:bg-electric-violet hover:text-white active:scale-95 ${
                                isDark ? 'bg-white text-near-black' : 'bg-slate-900 text-white'
                            }`}
                        >
                            View adapter docs →
                        </button>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};
