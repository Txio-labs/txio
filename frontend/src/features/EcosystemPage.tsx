import React from 'react';
import { motion } from 'framer-motion';
import { 
    Globe, Layers, Zap, Shield, Cpu, Code2, ArrowLeft, ExternalLink, 
    Blocks, Network, Cpu as Chip, Database
} from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import logoDark from '../assets/txio2.png';
import logoLight from '../assets/txio3.png';

interface EcosystemPageProps {
    embedded?: boolean;
}

export const EcosystemPage: React.FC<
    EcosystemPageProps
> = ({ embedded = false }) => {
    const { theme } = useAppStore();
    const logo = theme === 'dark' ? logoDark : logoLight;

    const navigateTo = (
        target:
            | 'landing'
            | 'integrations'
            | 'infrastructure'
            | 'partners'
            | 'signup'
            | 'docs'
    ) => {
        if (embedded) {
            if (target === 'landing') {
                appStore.setActiveTab(null);
                return;
            }

            if (target === 'signup') {
                appStore.openTab(
                    'new_request'
                );
                return;
            }

            appStore.openTab(target);
            return;
        }

        appStore.setViewMode(target);
    };

    React.useEffect(() => {
        if (embedded) {
            return;
        }

        document.body.style.overflow = 'auto';
        document.body.style.overflowX = 'hidden';
        return () => {
            document.body.style.overflow = 'hidden';
        };
    }, [embedded]);

    const chains = [
        { name: 'Sui', desc: 'Object-centric L1. Move-native. Fast.', color: '#38bdf8', tps: '297k', latency: '390ms', status: 'Optimal' },
        { name: 'Solana', desc: 'Parallel execution. Sub-second confirmations.', color: '#14f195', tps: '65k', latency: '400ms', status: 'Optimal' },
        { name: 'Ethereum', desc: 'Where most of DeFi still lives. Slower, but it works.', color: '#6366f1', tps: '15', latency: '12s', status: 'Congested' },
        { name: 'Aptos', desc: 'Move-based L1, designed to be upgradeable.', color: '#2dd4bf', tps: '160k', latency: '450ms', status: 'Optimal' },
        { name: 'Starknet', desc: 'Ethereum L2 with ZK proofs instead of optimistic challenges.', color: '#ef4444', tps: '1.2k', latency: '1.5s', status: 'Optimal' },
        { name: 'Arbitrum', desc: 'Optimistic rollup. EVM-compatible. Most apps run unchanged.', color: '#2b58de', tps: '4.5k', latency: '2s', status: 'Optimal' }
    ];

    const partners = [
        { name: 'Mysten Labs', role: 'Infrastructure', logo: <Blocks size={20} /> },
        { name: 'Jump Crypto', role: 'Validator', logo: <Cpu size={20} /> },
        { name: 'Coinbase', role: 'Custody', logo: <Database size={20} /> },
        { name: 'Circle', role: 'Liquidity', logo: <Globe size={20} /> }
    ];

    return (
        <div className={`${embedded ? 'h-full overflow-y-auto custom-scrollbar' : 'min-h-screen'} font-sans selection:bg-electric-violet/30 ${
            theme === 'dark' ? 'bg-[#050505] text-white' : 'bg-slate-50 text-slate-900'
        }`}>
            {/* Nav */}
            <nav className={`${embedded ? 'sticky top-0' : 'fixed top-0 left-0 right-0'} h-20 border-b z-50 px-6 md:px-12 flex items-center justify-between backdrop-blur-xl ${
                theme === 'dark' ? 'bg-black/50 border-white/5' : 'bg-white/50 border-slate-200'
            }`}>
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() =>
                            navigateTo('landing')
                        }
                        className={`flex items-center gap-2 text-sm font-bold transition-all group ${
                            theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Back</span>
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-white/10"></div>
                    <div className="flex items-center gap-3">
                        <img src={logo.src} alt="txio" className="h-7 w-auto" />
                        <span className="font-black tracking-tighter text-lg">ecosystem</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        <span onClick={() => navigateTo('integrations')} className="hover:text-electric-violet transition-colors cursor-pointer">Integrations</span>
                        <span onClick={() => navigateTo('infrastructure')} className="hover:text-electric-violet transition-colors cursor-pointer">Infrastructure</span>
                        <span onClick={() => navigateTo('partners')} className="hover:text-electric-violet transition-colors cursor-pointer">Partners</span>
                    </div>
                    <button 
                        onClick={() =>
                            navigateTo('signup')
                        }
                        className="px-6 py-2.5 bg-electric-violet text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-soft-purple transition-all shadow-[0_10px_20px_-5px_rgba(123,63,242,0.4)] active:scale-95"
                    >
                        {embedded ? 'New Request' : 'Launch'}
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className={`relative ${embedded ? 'pt-28' : 'pt-48'} pb-32 px-6 md:px-12 overflow-hidden`}>
                {/* Background Ambient Glows */}
                <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-electric-violet/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-soft-purple/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-8"
                    >
                        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">All systems operational</span>
                        </div>

                        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] text-white">
                            The chains, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-violet via-soft-purple to-indigo-400">all in one place.</span>
                        </h1>

                        <p className={`text-lg md:text-xl max-w-3xl mx-auto leading-relaxed ${
                            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                            Build, test, and scale across every major protocol from one environment. Same workflow, every chain.
                        </p>

                        <div className="flex items-center justify-center gap-4 pt-4">
                            <div className="flex -space-x-3">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-[#050505] bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                                        {i === 4 ? '+50' : <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-600 to-slate-800" />}
                                    </div>
                                ))}
                            </div>
                            <span className="text-xs font-bold text-slate-500">50+ teams already shipping on it</span>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Integrations Grid */}
            <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
                <div className="flex items-end justify-between mb-16 px-4">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black tracking-tight">Live integrations</h2>
                        <p className="text-slate-500 font-bold text-sm">Real connections to real chains. Status updates live.</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-electric-violet" />
                        Live Metrics
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {chains.map((chain, i) => (
                        <motion.div 
                            key={chain.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`p-1 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent hover:from-electric-violet/20 transition-all group`}
                        >
                            <div className={`p-8 rounded-[2.3rem] h-full flex flex-col ${
                                theme === 'dark' ? 'bg-[#0a0a0c]' : 'bg-white'
                            }`}>
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
                                    <p className={`text-sm leading-relaxed ${
                                        theme === 'dark' ? 'text-slate-500 font-medium' : 'text-slate-500'
                                    }`}>{chain.desc}</p>
                                </div>

                                <div className="mt-10 grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Peak Tps</div>
                                        <div className="text-lg font-black text-white">{chain.tps}</div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Latency</div>
                                        <div className="text-lg font-black text-white">{chain.latency}</div>
                                    </div>
                                </div>

                                <button className="mt-8 flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10 active:scale-95">
                                    Explorer <ExternalLink size={14} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Strategic Partners */}
            <section className="py-32 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="space-y-10">
                        <div className="space-y-4">
                            <h2 className="text-5xl font-black tracking-tighter leading-tight">Who we <br /> work with.</h2>
                            <p className={`text-lg leading-relaxed max-w-md ${
                                theme === 'dark' ? 'text-slate-400 font-medium' : 'text-slate-500'
                            }`}>
                                We talk to the core devs and foundations directly. That&apos;s how the integrations stay deep instead of skin-deep.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            {partners.map(p => (
                                <motion.div 
                                    key={p.name} 
                                    whileHover={{ x: 5 }}
                                    className={`p-6 rounded-3xl border transition-all ${
                                        theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' : 'bg-white border-slate-200'
                                    }`}
                                >
                                    <div className="mb-4 text-electric-violet">{p.logo}</div>
                                    <div className="text-sm font-black text-white mb-1">{p.name}</div>
                                    <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{p.role}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 bg-electric-violet/20 blur-[120px] rounded-full animate-pulse" />
                        <div className={`relative p-8 md:p-16 rounded-[4rem] border backdrop-blur-3xl aspect-square flex items-center justify-center overflow-hidden ${
                            theme === 'dark' ? 'bg-[#0a0a0c]/80 border-white/10' : 'bg-white/80 border-slate-200 shadow-2xl'
                        }`}>
                            {/* Abstract Connection Visualization */}
                            <div className="relative w-full h-full flex items-center justify-center">
                                <div className="absolute inset-0 border-[40px] border-white/[0.02] rounded-full animate-[spin_20s_linear_infinite]" />
                                <div className="absolute inset-20 border-[2px] border-dashed border-white/5 rounded-full animate-[spin_10s_linear_infinite_reverse]" />
                                <motion.div 
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className="w-32 h-32 rounded-[2.5rem] bg-electric-violet shadow-[0_0_50px_rgba(123,63,242,0.4)] flex items-center justify-center z-10"
                                >
                                    <img src={logoDark.src} alt="txio" className="h-10 w-auto mx-auto" />
                                </motion.div>
                                
                                {/* Orbiting Icons */}
                                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl bg-[#050505] border border-white/10 flex items-center justify-center"><Network size={20} className="text-emerald-400" /></div>
                                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl bg-[#050505] border border-white/10 flex items-center justify-center"><Cpu size={20} className="text-sky-400" /></div>
                                <div className="absolute left-10 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-[#050505] border border-white/10 flex items-center justify-center"><Database size={20} className="text-amber-400" /></div>
                                <div className="absolute right-10 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-[#050505] border border-white/10 flex items-center justify-center"><Zap size={20} className="text-indigo-400" /></div>
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
                    className={`max-w-6xl mx-auto p-16 md:p-24 rounded-[5rem] relative overflow-hidden text-center border ${
                        theme === 'dark' ? 'bg-electric-violet border-white/10' : 'bg-slate-900 border-transparent text-white'
                    }`}
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
                    <div className="absolute top-0 right-0 p-12 opacity-5 scale-150"><Globe size={240} /></div>
                    
                    <div className="relative z-10 space-y-12">
                        <h3 className="text-4xl md:text-7xl font-black tracking-tighter leading-tight">
                            Go build <br /> something good.
                        </h3>
                        <div className="flex flex-col md:flex-row justify-center gap-6 items-center">
                            <button className="w-full md:w-auto px-10 py-5 bg-white text-near-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 shadow-2xl">
                                Request Access
                            </button>
                            <button className="w-full md:w-auto px-10 py-5 bg-near-black/20 text-white border border-white/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                                Read the docs
                            </button>
                        </div>
                        <div className="pt-8 text-[10px] font-black uppercase tracking-[0.5em] text-white/40">
                            txio • v2.4.0
                        </div>
                    </div>
                </motion.div>
            </section>

            <footer className="py-20 px-6 md:px-12 max-w-7xl mx-auto border-t border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
                    <div className="max-w-xs">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-xl font-black tracking-tighter">txio</span>
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed font-medium">
                            Tools for the people building the chains.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
                        <div className="space-y-4">
                            <div className="text-[11px] font-black uppercase tracking-widest text-slate-200">Ecosystem</div>
                            <ul className="space-y-3 text-sm text-slate-500 font-bold">
                                <li><span onClick={() => appStore.setViewMode('integrations')} className="hover:text-white transition-colors cursor-pointer">Integrations</span></li>
                                <li><span onClick={() => appStore.setViewMode('infrastructure')} className="hover:text-white transition-colors cursor-pointer">Infrastructure</span></li>
                                <li><span onClick={() => appStore.setViewMode('partners')} className="hover:text-white transition-colors cursor-pointer">Partners</span></li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <div className="text-[11px] font-black uppercase tracking-widest text-slate-200">Resources</div>
                            <ul className="space-y-3 text-sm text-slate-500 font-bold">
                                <li><span onClick={() => appStore.setViewMode('docs')} className="hover:text-white transition-colors cursor-pointer">Documentation</span></li>
                                <li><span onClick={() => appStore.setViewMode('signup')} className="hover:text-white transition-colors cursor-pointer">Launch App</span></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-white/5 text-[10px] uppercase font-black tracking-[0.4em] text-slate-700">
                    <span>© 2026 txio labs • universal infrastructure</span>
                    <span className="mt-4 md:mt-0">v2.4.0 stable</span>
                </div>
            </footer>
        </div>
    );
};
