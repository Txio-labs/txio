import React from 'react';
import { motion } from 'framer-motion';
import { 
    Zap, Shield, Globe, Cpu, Layers, Terminal, 
    Database, Activity, Lock, ArrowRight, CheckCircle2,
    BarChart3, MousePointer2, Share2, Rocket
} from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import logoDark from '../assets/txio2.png';
import logoLight from '../assets/txio3.png';

interface FeaturesPageProps {
    embedded?: boolean;
}

export const FeaturesPage: React.FC<
    FeaturesPageProps
> = ({ embedded = false }) => {
    const { theme } = useAppStore();
    const logo = theme === 'dark' ? logoDark : logoLight;

    const navigateTo = (
        target:
            | 'landing'
            | 'ecosystem'
            | 'docs'
            | 'app'
    ) => {
        if (embedded) {
            if (target === 'landing') {
                appStore.setActiveTab(null);
                return;
            }

            if (target === 'app') {
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

    const mainFeatures = [
        {
            title: "RPC Builder",
            desc: "Write and run JSON-RPC calls on any chain we support. Autocomplete catches the method names, schema validation catches the rest before you hit send.",
            icon: Terminal,
            color: "text-electric-violet",
            bg: "bg-electric-violet/10"
        },
        {
            title: "Dry-run first",
            desc: "See gas, state changes, and where the transaction would blow up — without spending a cent on the live network.",
            icon: Cpu,
            color: "text-emerald-400",
            bg: "bg-emerald-400/10"
        },
        {
            title: "Always-on connections",
            desc: "Persistent WebSockets to fullnodes around the world. Events stream in, blocks confirm without you refreshing anything.",
            icon: Zap,
            color: "text-amber-400",
            bg: "bg-amber-400/10"
        }
    ];

    const gridFeatures = [
        { title: "Object Explorer", desc: "Inspect on-chain state and ownership as it changes.", icon: Database },
        { title: "Privacy Proxy", desc: "IP masking for the RPC providers that don't need to know who you are.", icon: Lock },
        { title: "Atomic Batching", desc: "Compose multiple operations into one transaction.", icon: Layers },
        { title: "Team Sync", desc: "Shared workspaces and collections — your team works on one source of truth.", icon: Share2 },
        { title: "Live Metrics", desc: "Node health and throughput, updating in real time.", icon: Activity },
        { title: "Multi-Chain IDE", desc: "Sui, Solana, EVM — one click between them.", icon: Globe }
    ];

    return (
        <div className={`${embedded ? 'h-full overflow-y-auto custom-scrollbar' : 'min-h-screen'} font-sans selection:bg-electric-violet/30 overflow-x-hidden ${
            theme === 'dark' ? 'bg-[#050505] text-white' : 'bg-slate-50 text-slate-900'
        }`}>
            {/* Nav */}
            <nav className={`${embedded ? 'sticky top-0' : 'fixed top-0 left-0 right-0'} h-20 border-b z-50 px-6 md:px-12 flex items-center justify-between backdrop-blur-xl ${
                theme === 'dark' ? 'bg-black/50 border-white/5' : 'bg-white/50 border-slate-200'
            }`}>
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('landing')}>
                        <img src={logo.src} alt="txio" className="h-7 w-auto" />
                        <span className="font-black tracking-tighter text-lg">features</span>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        <button onClick={() => navigateTo('ecosystem')} className="hover:text-electric-violet transition-colors">Ecosystem</button>
                        <button onClick={() => navigateTo('docs')} className="hover:text-electric-violet transition-colors">Documentation</button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigateTo('app')}
                        className="px-6 py-2.5 bg-electric-violet text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-soft-purple transition-all shadow-xl active:scale-95"
                    >
                        {embedded ? 'New Request' : 'Get Started'}
                    </button>
                </div>
            </nav>

            {/* Hero */}
            <section className={`relative ${embedded ? 'pt-28' : 'pt-48'} pb-32 px-6 overflow-hidden`}>
                <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-electric-violet/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-soft-purple/10 blur-[120px] rounded-full" />

                <div className="max-w-7xl mx-auto text-center relative z-10 space-y-12">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-electric-violet">Built for shipping</span>
                            <div className="w-1 h-1 rounded-full bg-slate-700" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">v2.4.0</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] text-white">
                            Tools that <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-violet via-soft-purple to-indigo-400 italic">don't get in the way.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                            One workspace for protocol engineers, DevOps, and the infra folks who keep it all running.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Main Features */}
            <section className="py-24 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {mainFeatures.map((f, i) => (
                        <motion.div 
                            key={f.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-1 rounded-[3rem] bg-gradient-to-br from-white/10 to-transparent hover:from-electric-violet/20 transition-all group"
                        >
                            <div className="p-10 rounded-[2.8rem] bg-[#0a0a0c] h-full flex flex-col space-y-8">
                                <div className={`w-16 h-16 rounded-2xl ${f.bg} flex items-center justify-center ${f.color} shadow-2xl`}>
                                    <f.icon size={32} />
                                </div>
                                <div className="space-y-4 flex-1">
                                    <h3 className="text-2xl font-black tracking-tight">{f.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                                </div>
                                <div className="pt-6 border-t border-white/5 flex items-center justify-between group-hover:text-white transition-colors">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-400 transition-colors">Learn More</span>
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-32 px-6 bg-[#08080a]">
                <div className="max-w-7xl mx-auto space-y-20">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Everything in one place.</h2>
                        <p className="text-slate-500 font-bold">No tab juggling. No half-broken tooling. Just the toolchain.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
                        {gridFeatures.map((f, i) => (
                            <motion.div 
                                key={f.title}
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex gap-6 items-start"
                            >
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-electric-violet">
                                    <f.icon size={20} />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-bold text-lg">{f.title}</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Showcase Section */}
            <section className="py-40 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                    <div className="space-y-10">
                        <h2 className="text-5xl font-black tracking-tighter leading-tight">Workspaces that <br /> get out of the way.</h2>
                        <div className="space-y-6">
                            {[
                                "Native Move support for Sui and Aptos.",
                                "PDA and instruction inspection for Solana.",
                                "Trace and debug on every EVM chain.",
                                "Secrets in a vault — not your dotfiles."
                            ].map(t => (
                                <div key={t} className="flex items-center gap-4 group">
                                    <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <span className="text-slate-400 font-medium group-hover:text-white transition-colors">{t}</span>
                                </div>
                            ))}
                        </div>
                        <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95">
                            Read the Whitepaper
                        </button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 bg-electric-violet/20 blur-[100px] rounded-full animate-pulse" />
                        <div className="relative p-10 rounded-[4rem] bg-[#0c0c0e] border border-white/10 shadow-2xl overflow-hidden">
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Terminal Execution</span>
                                </div>
                                <div className="font-mono text-sm space-y-2">
                                    <div className="text-slate-500"># Validating Sui transaction block...</div>
                                    <div className="text-emerald-400">SUCCESS: Transaction verified at checkpoint 29081</div>
                                    <div className="text-white">Gas Used: 0.021 SUI</div>
                                    <div className="mt-4 text-slate-500"># Inspecting objects...</div>
                                    <div className="text-sky-400">Object: 0x8a92... Type: 0x2::coin::Coin&lt;0x2::sui::SUI&gt;</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-32 px-6 border-t border-white/5 text-center space-y-12">
                <div className="max-w-4xl mx-auto space-y-6">
                    <img src={logoDark.src} alt="txio" className="h-10 w-auto mx-auto" />
                    <h3 className="text-3xl font-black tracking-tighter">Ready to ship?</h3>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => navigateTo('app')} className="px-10 py-4 bg-electric-violet text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-soft-purple transition-all shadow-2xl active:scale-95">
                            {embedded ? 'New Request' : 'Get Started Free'}
                        </button>
                        <button onClick={() => navigateTo('docs')} className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                            Documentation
                        </button>
                    </div>
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-700">
                    © 2026 txio labs • all rights reserved
                </div>
            </footer>
        </div>
    );
};
