import React from 'react';
import { motion } from 'framer-motion';
import {
    Globe, Zap, Cpu, ArrowLeft, ExternalLink, Plus, Menu, X,
    Blocks, Network, Database
} from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoDark from '../assets/txio2.png';

interface EcosystemPageProps {
    embedded?: boolean;
}

const SUBNAV: Array<{ id: 'integrations' | 'infrastructure' | 'partners'; label: string }> = [
    { id: 'integrations', label: 'Integrations' },
    { id: 'infrastructure', label: 'Infrastructure' },
    { id: 'partners', label: 'Partners' },
];

const EXPLORER_URLS: Record<string, string> = {
    Sui: 'https://suiexplorer.com',
    Ethereum: 'https://etherscan.io',
    Solana: 'https://explorer.solana.com',
    Aptos: 'https://explorer.aptoslabs.com',
    Soroban: 'https://stellar.expert/explorer/public',
};

const CHAINS = [
    { name: 'Sui', desc: 'Object-centric L1. Move-native. Fast.', color: '#6fbcf0', tps: '297k', latency: '390ms', status: 'Optimal' },
    { name: 'Ethereum', desc: 'Where most of DeFi still lives. Slower, but it works.', color: '#a5a8f7', tps: '15', latency: '12s', status: 'Congested' },
    { name: 'Solana', desc: 'Parallel execution. Sub-second confirmations.', color: '#14f195', tps: '65k', latency: '400ms', status: 'Optimal' },
    { name: 'Aptos', desc: 'Move-based L1, designed to be upgradeable.', color: '#2ed3b7', tps: '160k', latency: '450ms', status: 'Optimal' },
    { name: 'Soroban', desc: "Stellar's smart contract platform. Fast finality.", color: '#f5d060', tps: '4.5k', latency: '5s', status: 'Optimal' },
];

const PARTNERS = [
    { name: 'Mysten Labs', role: 'Infrastructure', logo: <Blocks size={20} /> },
    { name: 'Jump Crypto', role: 'Validator', logo: <Cpu size={20} /> },
    { name: 'Coinbase', role: 'Custody', logo: <Database size={20} /> },
    { name: 'Circle', role: 'Liquidity', logo: <Globe size={20} /> },
];

export const EcosystemPage: React.FC<EcosystemPageProps> = ({ embedded = false }) => {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

    const navigateTo = (
        target: 'landing' | 'integrations' | 'infrastructure' | 'partners' | 'signup' | 'docs'
    ) => {
        if (embedded) {
            if (target === 'landing') {
                appStore.setActiveTab(null);
                return;
            }
            if (target === 'signup') {
                appStore.openTab('new_request');
                return;
            }
            appStore.openTab(target);
            return;
        }
        appStore.setViewMode(target);
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
        <div className={`${embedded ? 'h-full overflow-y-auto custom-scrollbar' : 'min-h-screen'} font-sans selection:bg-electric-violet/25 ${
            isDark ? 'bg-[#0a0c10] text-white' : 'bg-slate-50 text-slate-900'
        }`}>
            {/* Docs-style header */}
            <div className={`${embedded ? 'sticky top-0' : 'fixed left-0 right-0 top-0'} z-50 flex h-14 items-center gap-4 border-b px-4 backdrop-blur-md md:px-6 ${
                isDark ? 'border-white/10 bg-[#0a0c10]/90' : 'border-slate-200 bg-white/90'
            }`}>
                <button
                    type="button"
                    onClick={() => navigateTo('landing')}
                    className={`flex shrink-0 items-center gap-2 text-sm font-bold transition-colors ${
                        isDark ? 'text-[#8b93a1] hover:text-white' : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <ArrowLeft size={16} />
                    <span className="hidden sm:inline">Home</span>
                </button>
                <div className={`h-5 w-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                <div className="flex min-w-0 items-center gap-2 font-mono text-[15px] font-semibold">
                    <span className="h-2 w-2 rounded-full bg-electric-violet shadow-[0_0_8px_#a3a3a3]" />
                    <span className="shrink-0">txio</span>
                    <span className={`hidden truncate sm:inline ${isDark ? 'text-[#5c6472]' : 'text-slate-400'}`}>/ ecosystem</span>
                </div>

                <nav className={`ml-auto hidden items-center gap-5 text-[13px] lg:flex ${isDark ? 'text-[#8b93a1]' : 'text-slate-500'}`}>
                    {SUBNAV.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => navigateTo(item.id)}
                            className="hover:text-electric-violet"
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                <ThemeToggle />

                <button
                    type="button"
                    onClick={() => setMobileNavOpen((v) => !v)}
                    aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
                    aria-expanded={mobileNavOpen}
                    className={`lg:hidden ${isDark ? 'text-[#8b93a1] hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                <button
                    type="button"
                    onClick={() => navigateTo('signup')}
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
                        {SUBNAV.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    setMobileNavOpen(false);
                                    navigateTo(item.id);
                                }}
                                className={`flex w-full items-center rounded-md px-2.5 py-2.5 text-left text-[14px] ${
                                    isDark ? 'text-[#c4c9d1] hover:bg-white/[0.03]' : 'text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                setMobileNavOpen(false);
                                navigateTo('signup');
                            }}
                            className={`mt-4 flex w-full items-center rounded-md px-2.5 py-3 text-left text-[14px] font-black uppercase tracking-widest transition-colors ${
                                isDark
                                    ? 'bg-white text-near-black hover:bg-slate-200'
                                    : 'bg-slate-900 text-white hover:bg-slate-700'
                            }`}
                        >
                            {embedded ? 'New request' : 'Launch'}
                        </button>
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <section className={`relative ${embedded ? 'pt-24' : 'pt-28'} pb-32 px-6 md:px-12 overflow-hidden`}>
                <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-electric-violet/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-electric-violet/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-8"
                    >
                        <h1 className={`text-6xl md:text-8xl font-black tracking-tight leading-[0.9] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            The chains, <br />
                            <span className="text-electric-violet">all in one place.</span>
                        </h1>

                        <p className={`text-lg md:text-xl max-w-3xl mx-auto leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Build, test, and scale across every major protocol from one environment. Same workflow, every chain.
                        </p>

                        <div className="flex items-center justify-center gap-4 pt-4">
                            <div className="flex -space-x-3">
                                {[
                                    { i: 'SN', c: '#6fbcf0' },
                                    { i: 'JC', c: '#a5a8f7' },
                                    { i: 'MT', c: '#14f195' },
                                ].map((a) => (
                                    <div
                                        key={a.i}
                                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[10px] font-black text-near-black ${isDark ? 'border-[#0a0c10]' : 'border-white'}`}
                                        style={{ backgroundColor: a.c }}
                                    >
                                        {a.i}
                                    </div>
                                ))}
                                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                                    isDark ? 'border-[#0a0c10] bg-white/10 text-slate-300' : 'border-white bg-slate-200 text-slate-600'
                                }`}>
                                    +50
                                </div>
                            </div>
                            <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>50+ teams already shipping on it</span>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Integrations Grid */}
            <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
                <div className="flex items-end justify-between mb-16 px-4 flex-wrap gap-4">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black tracking-tight">Live integrations</h2>
                        <p className={`font-bold text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Real connections to real chains. Status updates live.</p>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
                        isDark ? 'bg-white/[0.02] border-white/5 text-slate-500' : 'bg-slate-900/[0.02] border-slate-200 text-slate-400'
                    }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
                        Live Metrics
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {CHAINS.map((chain, i) => (
                        <motion.div
                            key={chain.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`p-1 rounded-[2.5rem] bg-gradient-to-br to-transparent hover:from-electric-violet/20 transition-all group ${
                                isDark ? 'from-white/10' : 'from-slate-900/10'
                            }`}
                        >
                            <div className={`p-8 rounded-[2.3rem] h-full flex flex-col ${isDark ? 'bg-[#0a0a0c]' : 'bg-white'}`}>
                                <div className="flex justify-between items-start mb-8">
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 duration-500" style={{ backgroundColor: `${chain.color}15`, color: chain.color }}>
                                        <Network size={32} />
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                        chain.status === 'Optimal'
                                            ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5'
                                            : 'border-amber-500/20 text-amber-400 bg-amber-500/5'
                                    }`}>
                                        {chain.status}
                                    </div>
                                </div>

                                <div className="space-y-4 flex-1">
                                    <h3 className="text-2xl font-black tracking-tight">{chain.name}</h3>
                                    <p className={`text-sm leading-relaxed font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{chain.desc}</p>
                                </div>

                                <div className="mt-10 grid grid-cols-2 gap-4">
                                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Peak Tps</div>
                                        <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{chain.tps}</div>
                                    </div>
                                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Latency</div>
                                        <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{chain.latency}</div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => window.open(EXPLORER_URLS[chain.name], '_blank', 'noopener,noreferrer')}
                                    className={`mt-8 flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-transparent active:scale-95 ${
                                        isDark
                                            ? 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white hover:border-white/10'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'
                                    }`}
                                >
                                    Explorer <ExternalLink size={14} />
                                </button>
                            </div>
                        </motion.div>
                    ))}

                    {/* Add a chain */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: CHAINS.length * 0.1 }}
                        className={`rounded-[2.5rem] border border-dashed transition-colors ${
                            isDark ? 'border-white/10 hover:border-white/20' : 'border-slate-300 hover:border-slate-400'
                        }`}
                    >
                        <button
                            type="button"
                            onClick={() => navigateTo('integrations')}
                            className="p-8 h-full w-full flex flex-col items-center justify-center text-center gap-3"
                        >
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/[0.03] text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                <Plus size={28} />
                            </div>
                            <h3 className="text-lg font-black">Add a chain</h3>
                            <p className={`text-sm max-w-[220px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                One <code className="text-electric-violet font-mono">ChainAdapter</code> file. No core changes.
                            </p>
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* Strategic Partners */}
            <section className="py-32 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="space-y-10">
                        <div className="space-y-4">
                            <h2 className="text-5xl font-black tracking-tighter leading-tight">Who we <br /> work with.</h2>
                            <p className={`text-lg leading-relaxed max-w-md font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                We talk to the core devs and foundations directly. That&apos;s how the integrations stay deep instead of skin-deep.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {PARTNERS.map((p) => (
                                <motion.div
                                    key={p.name}
                                    whileHover={{ x: 5 }}
                                    className={`p-6 rounded-3xl border transition-all ${
                                        isDark ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                                    }`}
                                >
                                    <div className="mb-4 text-electric-violet">{p.logo}</div>
                                    <div className={`text-sm font-black mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.name}</div>
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{p.role}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 bg-electric-violet/20 blur-[120px] rounded-full animate-pulse" />
                        <div className={`relative p-8 md:p-16 rounded-[4rem] border backdrop-blur-3xl aspect-square flex items-center justify-center overflow-hidden ${
                            isDark ? 'bg-[#0a0a0c]/80 border-white/10' : 'bg-white/80 border-slate-200'
                        }`}>
                            <div className="relative w-full h-full flex items-center justify-center">
                                <div className={`absolute inset-0 border-[40px] rounded-full animate-[spin_20s_linear_infinite] ${isDark ? 'border-white/[0.02]' : 'border-slate-900/[0.02]'}`} />
                                <div className={`absolute inset-20 border-[2px] border-dashed rounded-full animate-[spin_10s_linear_infinite_reverse] ${isDark ? 'border-white/5' : 'border-slate-200'}`} />
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className="w-32 h-32 rounded-[2.5rem] bg-electric-violet shadow-[0_0_50px_rgba(163,163,163,0.4)] flex items-center justify-center z-10"
                                >
                                    <img src={logoDark.src} alt="txio" className="h-10 w-auto mx-auto" />
                                </motion.div>

                                <div className={`absolute top-10 left-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl border flex items-center justify-center ${isDark ? 'bg-[#050505] border-white/10' : 'bg-white border-slate-200'}`}><Network size={20} className="text-emerald-400" /></div>
                                <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl border flex items-center justify-center ${isDark ? 'bg-[#050505] border-white/10' : 'bg-white border-slate-200'}`}><Cpu size={20} className="text-sky-400" /></div>
                                <div className={`absolute left-10 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl border flex items-center justify-center ${isDark ? 'bg-[#050505] border-white/10' : 'bg-white border-slate-200'}`}><Database size={20} className="text-amber-400" /></div>
                                <div className={`absolute right-10 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl border flex items-center justify-center ${isDark ? 'bg-[#050505] border-white/10' : 'bg-white border-slate-200'}`}><Zap size={20} className="text-electric-violet" /></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Unified CTA */}
            <section className="py-32 px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    className="max-w-6xl mx-auto p-16 md:p-24 rounded-[5rem] relative overflow-hidden text-center border bg-electric-violet border-white/10"
                >
                    <div className="absolute top-0 right-0 p-12 opacity-5 scale-150"><Globe size={240} /></div>

                    <div className="relative z-10 space-y-12">
                        <h3 className="text-4xl md:text-7xl font-black tracking-tighter leading-tight">
                            Go build <br /> something good.
                        </h3>
                        <div className="flex flex-col md:flex-row justify-center gap-6 items-center">
                            <button onClick={() => navigateTo('signup')} className="w-full md:w-auto px-10 py-5 bg-white text-near-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 shadow-2xl">
                                Request Access
                            </button>
                            <button onClick={() => navigateTo('docs')} className="w-full md:w-auto px-10 py-5 bg-black/20 text-white border border-white/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                                Read the docs
                            </button>
                        </div>
                        <div className="pt-8 text-[10px] font-black uppercase tracking-[0.5em] text-white/40">
                            txio • v2.4.0
                        </div>
                    </div>
                </motion.div>
            </section>

            <footer className={`py-20 px-6 md:px-12 max-w-7xl mx-auto border-t ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
                    <div className="max-w-xs">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-xl font-black tracking-tighter">txio</span>
                        </div>
                        <p className={`text-sm leading-relaxed font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            Tools for the people building the chains.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
                        <div className="space-y-4">
                            <div className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Ecosystem</div>
                            <ul className={`space-y-3 text-sm font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                <li><button onClick={() => appStore.setViewMode('integrations')} className={`transition-colors cursor-pointer ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>Integrations</button></li>
                                <li><button onClick={() => appStore.setViewMode('infrastructure')} className={`transition-colors cursor-pointer ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>Infrastructure</button></li>
                                <li><button onClick={() => appStore.setViewMode('partners')} className={`transition-colors cursor-pointer ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>Partners</button></li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <div className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Resources</div>
                            <ul className={`space-y-3 text-sm font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                <li><button onClick={() => appStore.setViewMode('docs')} className={`transition-colors cursor-pointer ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>Documentation</button></li>
                                <li><button onClick={() => appStore.setViewMode('signup')} className={`transition-colors cursor-pointer ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>Launch App</button></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className={`flex flex-col md:flex-row justify-between items-center pt-12 border-t text-[10px] uppercase font-black tracking-[0.4em] ${
                    isDark ? 'border-white/5 text-slate-700' : 'border-slate-200 text-slate-400'
                }`}>
                    <span>© 2026 txio labs • universal infrastructure</span>
                </div>
            </footer>
        </div>
    );
};
