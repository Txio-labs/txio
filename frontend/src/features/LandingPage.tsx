import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Zap, Shield, Cpu, Globe, ArrowRight, Layers, Terminal, Sparkles, Code2, Rocket, Github, Twitter
} from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import logoDark from '@/assets/txio2.png';
import logoLight from '@/assets/txio3.png';

export const LandingPage: React.FC = () => {
    const { theme } = useAppStore();
    const logo = theme === 'dark' ? logoDark : logoLight;

    useEffect(() => {
        // Enable scrolling on the body for the landing page
        document.body.style.overflow = 'auto';
        document.body.style.overflowX = 'hidden';
        
        return () => {
            // Restore overflow hidden when leaving for the IDE
            document.body.style.overflow = 'hidden';
        };
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: 'spring' as const, damping: 25, stiffness: 200 }
        }
    };

    return (
        <div className="min-h-screen bg-near-black text-white font-sans selection:bg-electric-violet/30 overflow-x-hidden">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 h-20 border-b border-white/5 bg-near-black/50 backdrop-blur-xl z-50 px-6 md:px-12 flex items-center justify-between">
                <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-electric-violet/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <img src={logo.src} alt="txio" className="h-8 w-auto relative z-10 transition-transform group-hover:scale-110" />
                    </div>
                    <span className="text-xl font-bold tracking-tighter">txio</span>
                </div>
                
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                    <button 
                        onClick={() => appStore.setViewMode('features')}
                        className="hover:text-white transition-colors"
                    >
                        Features
                    </button>
                    <button 
                        onClick={() => appStore.setViewMode('integrations')}
                        className="hover:text-white transition-colors"
                    >
                        Integrations
                    </button>
                    <button 
                        onClick={() => appStore.setViewMode('infrastructure')}
                        className="hover:text-white transition-colors"
                    >
                        Infrastructure
                    </button>
                    <button 
                        onClick={() => appStore.setViewMode('partners')}
                        className="hover:text-white transition-colors"
                    >
                        Partners
                    </button>
                    <button 
                        onClick={() => appStore.setViewMode('ecosystem')}
                        className="hover:text-white transition-colors"
                    >
                        Ecosystem
                    </button>
                    <button 
                        onClick={() => appStore.setViewMode('docs')}
                        className="hover:text-white transition-colors"
                    >
                        Docs
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => appStore.setViewMode('signin')}
                        className="text-sm font-bold text-slate-300 hover:text-white transition-colors"
                    >
                        Sign In
                    </button>
                    <button 
                        onClick={() => appStore.setViewMode('signup')}
                        className="px-5 py-2.5 bg-white text-near-black rounded-xl font-bold text-sm hover:bg-electric-violet hover:text-white transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
                    >
                        Get Started
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
                    <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-electric-violet/10 blur-[150px] rounded-full"></div>
                    <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-soft-purple/5 blur-[120px] rounded-full animate-pulse"></div>
                </div>

                <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="text-center relative z-10"
                >
                    <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
                        <Sparkles size={16} className="text-electric-violet" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">One terminal. Every chain.</span>
                    </motion.div>

                    <motion.h1 variants={itemVariants} className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-8">
                        Stop juggling <br /> chains. <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-soft-purple/50">Just ship.</span>
                    </motion.h1>

                    <motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                        Execute, debug, and trace smart contracts across every major chain — without keeping six tabs of docs open. One CLI, one dashboard, one workflow.
                    </motion.p>

                    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button 
                            onClick={() => appStore.setViewMode('signup')}
                            className="group relative px-10 py-5 bg-white text-near-black rounded-2xl font-bold text-lg hover:bg-electric-violet hover:text-white transition-all duration-500 hover:shadow-[0_0_50px_rgba(123,63,242,0.4)] active:scale-95"
                        >
                            <span className="flex items-center gap-3">
                                Start Building
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                        <button
                            onClick={() => window.open("https://github.com/Kingvic300/txio/", "_blank")}
                            className="px-10 py-5 bg-near-black border border-white/10 rounded-2xl font-bold text-lg hover:border-white/20 transition-all flex items-center gap-3 group"
                            >
                            <Github
                                size={20}
                                className="text-slate-400 group-hover:text-white"
                            />
                            View on GitHub
                        </button>
                    </motion.div>
                </motion.div>

                {/* Dashboard Preview */}
                <motion.div 
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="mt-32 relative group"
                >
                    {/* Purple Ambient Glow */}
                    <div className="absolute -inset-20 bg-electric-violet/20 blur-[120px] rounded-full opacity-50 group-hover:opacity-80 transition-opacity"></div>
                    
                    <div className="relative bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden aspect-[16/9] shadow-[0_0_80px_rgba(123,63,242,0.15)] ring-1 ring-white/10">
                        {/* Mock IDE UI */}
                        <div className="flex flex-col h-full">
                            {/* Window Header */}
                            <div className="h-12 border-b border-white/5 flex items-center px-6 gap-2 bg-white/[0.02]">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                                    <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                                </div>
                            </div>
                            
                            <div className="flex-1 flex">
                                {/* Sidebar */}
                                <div className="w-16 border-r border-white/5 flex flex-col items-center py-6 gap-6 bg-white/[0.01]">
                                    <div className="w-9 h-9 rounded-xl bg-electric-violet/20 flex items-center justify-center text-electric-violet border border-electric-violet/20">
                                        <Code2 size={20} />
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-600">
                                        <Layers size={18} />
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-600">
                                        <Globe size={18} />
                                    </div>
                                </div>
                                
                                <div className="flex-1 p-10 flex flex-col gap-8">
                                    {/* Omnibar */}
                                    <div className="w-48 h-9 bg-white/5 border border-white/10 rounded-xl"></div>
                                    
                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-3 gap-6">
                                        {[
                                            { label: 'Requests', value: '1.2M', color: 'bg-green-400' },
                                            { label: 'Latency', value: '42ms', color: 'bg-yellow-400' },
                                            { label: 'Chains', value: '18', color: 'bg-electric-violet' },
                                        ].map((item, i) => (
                                            <div
                                                key={i}
                                                className="rounded-[2rem] bg-white/[0.03] border border-white/5 p-6 flex flex-col justify-between"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs uppercase tracking-widest text-slate-500">
                                                        {item.label}
                                                    </span>
                                                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                                                </div>
                                                <div className="text-3xl font-bold tracking-tight mt-6">
                                                    {item.value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Terminal Panel */}
                                    <div className="rounded-[2rem] bg-[#050505] border border-white/5 overflow-hidden">
                                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                                                txio terminal
                                            </span>
                                            <div className="flex items-center gap-2 text-green-400 text-xs">
                                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                                Connected
                                            </div>
                                        </div>
                                        <div className="p-6 font-mono text-sm space-y-3">
                                            <div className="text-slate-500">$ txio simulate transaction.sui</div>
                                            <div className="text-green-400">✓ Simulation successful</div>
                                            <div className="text-slate-400">Gas Estimate: 0.0021 SUI</div>
                                            <div className="text-electric-violet">Contract response received in 38ms</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-32 px-6 md:px-12 max-w-7xl mx-auto relative">
                <div className="text-center mb-24">
                    <h2 className="text-sm font-bold text-electric-violet uppercase tracking-[0.4em] mb-4">Made for engineers</h2>
                    <h3 className="text-4xl md:text-5xl font-bold tracking-tight">What you actually need.</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { title: 'Every chain, one interface', desc: 'Hit any JSON-RPC chain from one place. No SDK roulette, no copy-pasting between tabs.', icon: Globe },
                        { title: 'Transactions, visualized', desc: 'Compose transactions and watch dependencies resolve before you sign. Simulate first, send second.', icon: Layers },
                        { title: 'Secrets stay secret', desc: 'API keys and signing keys live in a vault — not your dotfiles, not your git history.', icon: Shield },
                        { title: 'Real-time everything', desc: 'Sub-millisecond latency tracking, streamed live. Watch the network breathe.', icon: Zap },
                        { title: 'AI that actually helps', desc: 'Plain-English error explanations and contract audits. The kind you wish Stack Overflow gave you.', icon: Cpu },
                        { title: 'A terminal that talks back', desc: 'Web and shell, same workflow. Run a command, see the result in either place.', icon: Terminal }
                    ].map((feature, i) => (
                        <motion.div 
                            key={i}
                            whileHover={{ y: -10 }}
                            className="p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 transition-all group"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-near-black border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-electric-violet transition-colors mb-6 group-hover:scale-110 transition-transform">
                                <feature.icon size={28} />
                            </div>
                            <h4 className="text-xl font-bold mb-4">{feature.title}</h4>
                            <p className="text-slate-500 leading-relaxed text-sm">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="pt-32 pb-12 px-6 md:px-12 max-w-7xl mx-auto border-t border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-20">
                    <div className="max-w-xs">
                        <div className="flex items-center gap-3 mb-6">
                            <Code2 size={24} className="text-electric-violet" />
                            <span className="text-xl font-bold tracking-tighter">txio</span>
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            Tools for the people building the chains.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
                        <div className="space-y-4">
                            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-200">Platform</div>
                            <ul className="space-y-3 text-sm text-slate-500">
                                <li><span onClick={() => appStore.setViewMode('app')} className="hover:text-white transition-colors cursor-pointer">Workspace</span></li>
                                <li><span onClick={() => appStore.setViewMode('integrations')} className="hover:text-white transition-colors cursor-pointer">Integrations</span></li>
                                <li><span onClick={() => appStore.setViewMode('infrastructure')} className="hover:text-white transition-colors cursor-pointer">Infrastructure</span></li>
                                <li><span onClick={() => appStore.setViewMode('partners')} className="hover:text-white transition-colors cursor-pointer">Partners</span></li>
                                <li><span onClick={() => appStore.setViewMode('docs')} className="hover:text-white transition-colors cursor-pointer">Documentation</span></li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-200">Community</div>
                            <ul className="space-y-3 text-sm text-slate-500">
                                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><Twitter size={14} /> Twitter</a></li>
                                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><Github size={14} /> GitHub</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-white/5 text-[10px] uppercase font-bold tracking-[0.4em] text-slate-700">
                    <span>© 2026 txio infrastructure</span>
                    <span className="mt-4 md:mt-0">v2.4.0 stable release</span>
                </div>
            </footer>
        </div>
    );
};
