import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Blocks, Cpu, Database, Globe, Zap, Handshake, Star } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { ThemeToggle } from '@/components/ThemeToggle';
import gsap from 'gsap';

interface PartnersPageProps {
    embedded?: boolean;
}

export const PartnersPage: React.FC<
    PartnersPageProps
> = ({ embedded = false }) => {
    const { theme } = useAppStore();
    const router = useRouter();

    const navigateTo = (
        target:
            | 'app'
            | 'ecosystem'
    ) => {
        if (embedded) {
            if (target === 'app') {
                appStore.openTab(
                    'new_request'
                );
                return;
            }

            appStore.openTab(target);
            return;
        }

        const modeToPath: Record<string, string> = {
            ecosystem: '/ecosystem',
            app: '/signup'
        };

        const path = modeToPath[target];
        if (path) {
            router.push(path);
        }
    };

    React.useEffect(() => {
        if (embedded) {
            return;
        }

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
    }, [embedded]);

    const partners = [
        { name: 'Mysten Labs', role: 'Infrastructure', desc: 'The team building Sui. We work with them on high-throughput RPC infrastructure.', logo: <Blocks size={40} /> },
        { name: 'Jump Crypto', role: 'Validation', desc: 'Joint work on validator performance and MEV-aware tooling.', logo: <Cpu size={40} /> },
        { name: 'Coinbase Cloud', role: 'Custody', desc: 'Institutional custody and staking, wired directly into the workspace.', logo: <Database size={40} /> },
        { name: 'Circle', role: 'Liquidity', desc: 'Stablecoin settlement for multi-chain dApps, without the usual bridging headaches.', logo: <Globe size={40} /> },
        { name: 'Alchemy', role: 'Node ops', desc: 'Extra edge nodes, extra coverage. Their global footprint plus ours.', logo: <Zap size={40} /> },
        { name: 'Chainlink', role: 'Oracles', desc: 'Oracle feeds plugged straight into txio — no separate integration step.', logo: <Star size={40} /> }
    ];

    return (
        <div className={`${embedded ? 'h-full overflow-y-auto custom-scrollbar' : 'min-h-screen'} font-sans selection:bg-electric-violet/30 ${
            theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-slate-50 text-slate-900'
        }`}>
            {/* Nav */}
            <nav className={`${embedded ? 'sticky top-0' : 'fixed top-0 left-0 right-0'} h-20 border-b z-50 px-6 md:px-12 flex items-center justify-between backdrop-blur-xl ${
                theme === 'dark' ? 'bg-black/50 border-white/5' : 'bg-white/50 border-slate-200'
            }`}>
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() =>
                            navigateTo(
                                'ecosystem'
                            )
                        }
                        className={`flex items-center gap-2 text-sm font-bold transition-all group ${
                            theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Ecosystem</span>
                    </button>
                    <div className={`h-6 w-px ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-3">
                        <span className="font-black tracking-tighter text-lg">Partners</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <button
                        onClick={() =>
                            navigateTo('app')
                        }
                        className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-near-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-[0_10px_20px_-5px_rgba(163,163,163,0.4)] active:scale-95"
                    >
                        {embedded
                            ? 'New Request'
                            : 'Launch'}
                    </button>
                </div>
            </nav>

            <section className={`relative ${embedded ? 'pt-28' : 'pt-48'} pb-32 px-6 md:px-12`}>
                <div className="max-w-7xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-32 space-y-8 partner-hero"
                    >
                        <div className={`inline-flex items-center gap-3 px-6 py-2 rounded-full border ${
                            theme === 'dark' ? 'bg-white/[0.03] border-white/10' : 'bg-slate-900/[0.03] border-slate-200'
                        }`}>
                            <Handshake size={16} className="text-electric-violet" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Who we work with</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-tight">
                            Stronger <br />
                            <span className="text-electric-violet">together.</span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium">
                            We work alongside the foundations, labs, and protocols already doing the heavy lifting — so you don&apos;t have to integrate them yourself.
                        </p>
                    </motion.div>

                    <div className={`rounded-[2rem] border overflow-hidden partner-card ${
                        theme === 'dark' ? 'bg-[#18181b] border-white/5' : 'bg-white border-slate-200 shadow-lg'
                    }`}>
                        {partners.map((p, i) => (
                            <motion.div
                                key={p.name}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className={`group flex flex-col sm:flex-row sm:items-center gap-6 px-8 py-8 transition-colors ${
                                    i !== 0 ? (theme === 'dark' ? 'border-t border-white/5' : 'border-t border-slate-200') : ''
                                } ${theme === 'dark' ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}
                            >
                                <div className={`shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl text-electric-violet border transition-colors ${
                                    theme === 'dark' ? 'border-white/5 group-hover:border-electric-violet/30' : 'border-slate-200 group-hover:border-electric-violet/40'
                                }`}>{p.logo}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-3">
                                        <h3 className="text-xl font-black">{p.name}</h3>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-electric-violet">{p.role}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed font-medium mt-1 max-w-2xl">
                                        {p.desc}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Joint Efforts Section */}
                    <div className="mt-40 text-center">
                        <h2 className="text-3xl font-black mb-12">And a few others.</h2>
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
