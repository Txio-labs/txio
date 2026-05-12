import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Blocks, Cpu, Database, Globe, Zap, Handshake, Star } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import gsap from 'gsap';

export const PartnersPage: React.FC = () => {
    const { theme } = useAppStore();

    React.useEffect(() => {
        document.body.style.overflow = 'auto';
        document.body.style.overflowX = 'hidden';

        const ctx = gsap.context(() => {
            gsap.from('.partner-hero > *', {
                y: 60,
                opacity: 0,
                duration: 1.2,
                stagger: 0.3,
                ease: 'power4.out'
            });

            gsap.from('.partner-card', {
                y: 100,
                opacity: 0,
                duration: 1,
                stagger: 0.15,
                delay: 0.5,
                ease: 'power3.out'
            });

            gsap.from('.collab-logo', {
                scale: 0,
                opacity: 0,
                duration: 1,
                stagger: 0.1,
                delay: 1.5,
                ease: 'elastic.out(1, 0.5)'
            });
        });

        return () => {
            document.body.style.overflow = 'hidden';
            ctx.revert();
        };
    }, []);

    const partners = [
        { name: 'Mysten Labs', role: 'Infrastructure Partner', desc: 'Core contributors to the Sui network, collaborating on high-throughput RPC infrastructure.', logo: <Blocks size={40} /> },
        { name: 'Jump Crypto', role: 'Validation Strategy', desc: 'Strategic alliance focused on validator performance and MEV optimization frameworks.', logo: <Cpu size={40} /> },
        { name: 'Coinbase Cloud', role: 'Custody Integration', desc: 'Deep integration with institutional-grade custody and staking solutions.', logo: <Database size={40} /> },
        { name: 'Circle', role: 'Liquidity Layer', desc: 'Working together to provide seamless stablecoin settlement for multi-chain dApps.', logo: <Globe size={40} /> },
        { name: 'Alchemy', role: 'Node Operations', desc: 'Expanding the global reach of our edge node network through combined infrastructure.', logo: <Zap size={40} /> },
        { name: 'Chainlink', role: 'Oracle Framework', desc: 'Integrating industry-leading oracle services directly into the Txio development environment.', logo: <Star size={40} /> }
    ];

    return (
        <div className={`min-h-screen font-sans selection:bg-electric-violet/30 ${
            theme === 'dark' ? 'bg-[#050505] text-white' : 'bg-slate-50 text-slate-900'
        }`}>
            {/* Nav */}
            <nav className={`fixed top-0 left-0 right-0 h-20 border-b z-50 px-6 md:px-12 flex items-center justify-between backdrop-blur-xl ${
                theme === 'dark' ? 'bg-black/50 border-white/5' : 'bg-white/50 border-slate-200'
            }`}>
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => appStore.setViewMode('ecosystem')}
                        className={`flex items-center gap-2 text-sm font-bold transition-all group ${
                            theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Ecosystem</span>
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-white/10"></div>
                    <div className="flex items-center gap-3">
                        <span className="font-black tracking-tighter text-lg">Partners</span>
                    </div>
                </div>

                <button 
                    onClick={() => appStore.setViewMode('app')}
                    className="px-6 py-2.5 bg-electric-violet text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-soft-purple transition-all shadow-[0_10px_20px_-5px_rgba(123,63,242,0.4)] active:scale-95"
                >
                    Launch
                </button>
            </nav>

            <section className="relative pt-48 pb-32 px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-32 space-y-8 partner-hero"
                    >
                        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/[0.03] border border-white/10">
                            <Handshake size={16} className="text-electric-violet" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Strategic Alliance Network</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-tight">
                            Stronger <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-violet via-soft-purple to-indigo-400">Together.</span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium">
                            We partner with the world's leading foundations, laboratories, and protocols to build a more robust and interconnected decentralized ecosystem.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {partners.map((p, i) => (
                            <motion.div
                                key={p.name}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ y: -10 }}
                                className={`p-12 rounded-[4rem] border group transition-all partner-card ${
                                    theme === 'dark' ? 'bg-[#0a0a0c] border-white/5 hover:border-electric-violet/30' : 'bg-white border-slate-200 shadow-lg'
                                }`}
                            >
                                <div className="mb-10 text-electric-violet group-hover:scale-110 transition-transform duration-500">{p.logo}</div>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-2xl font-black text-white">{p.name}</h3>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-electric-violet mt-1">{p.role}</div>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                        {p.desc}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Joint Efforts Section */}
                    <div className="mt-40 text-center">
                        <h2 className="text-3xl font-black mb-12">Global Collaboration</h2>
                        <div className="flex flex-wrap justify-center gap-x-20 gap-y-10 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
                             {/* Small Logo Grid placeholder text for "Elite Teams" */}
                             {['Foundation', 'Venture', 'Protocol', 'Infrastructure', 'Security'].map(label => (
                                 <span key={label} className="text-2xl font-black tracking-widest uppercase collab-logo">{label}</span>
                             ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
