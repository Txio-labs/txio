import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Cpu, Zap, Shield, Database, Layout, Server, Activity } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import gsap from 'gsap';

interface InfrastructurePageProps {
    embedded?: boolean;
}

export const InfrastructurePage: React.FC<
    InfrastructurePageProps
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
            gsap.from('.infra-title > *', {
                y: 50,
                opacity: 0,
                duration: 1,
                stagger: 0.2,
                ease: 'power4.out'
            });

            gsap.from('.infra-card', {
                scale: 0.8,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                delay: 0.5,
                ease: 'back.out(1.2)'
            });

            gsap.from('.stat-item', {
                y: 30,
                opacity: 0,
                duration: 0.8,
                stagger: 0.2,
                delay: 1,
                ease: 'power3.out'
            });
        });

        return () => {
            document.body.style.overflow = 'hidden';
            ctx.revert();
        };
    }, [embedded]);

    const tiers = [
        { name: 'Edge nodes', desc: 'A distributed mesh of fullnodes close to wherever you are. Less hop, less wait.', icon: <Activity size={24} />, color: 'emerald' },
        { name: 'Compute grid', desc: 'Parallel execution for the big simulations — burn-down tests, complex PTBs, you name it.', icon: <Cpu size={24} />, color: 'electric-violet' },
        { name: 'Vault layer', desc: 'HSM-backed key storage (FIPS 140-2 Level 3). For when "in a .env file" isn\'t cutting it.', icon: <Shield size={24} />, color: 'sky' },
        { name: 'Storage fabric', desc: 'Decentralized data availability for state you actually need to keep around.', icon: <Database size={24} />, color: 'amber' }
    ];

    return (
        <div className={`${embedded ? 'h-full overflow-y-auto custom-scrollbar' : 'min-h-screen'} font-sans selection:bg-electric-violet/30 ${
            theme === 'dark' ? 'bg-[#001B2E] text-white' : 'bg-slate-50 text-slate-900'
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
                    <div className="h-6 w-px bg-slate-200 dark:bg-white/10"></div>
                    <div className="flex items-center gap-3">
                        <span className="font-black tracking-tighter text-lg">Infrastructure</span>
                    </div>
                </div>

                <button 
                    onClick={() =>
                        navigateTo('app')
                    }
                    className="px-6 py-2.5 bg-electric-violet text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-soft-purple transition-all shadow-[0_10px_20px_-5px_rgba(173,223,241,0.4)] active:scale-95"
                >
                    {embedded
                        ? 'New Request'
                        : 'Launch'}
                </button>
            </nav>

            <section className={`relative ${embedded ? 'pt-28' : 'pt-48'} pb-32 px-6 md:px-12`}>
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-32">
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-8 infra-title"
                        >
                            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9]">
                                Fast where <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-electric-violet">it counts.</span>
                            </h1>
                            <p className="text-xl text-slate-400 leading-relaxed">
                                Sub-millisecond reads, key material that never leaves the HSM, and uptime you can actually run a business on. The backbone, not the bottleneck.
                            </p>
                        </motion.div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-electric-violet/10 blur-[120px] rounded-full" />
                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                {tiers.map((tier, i) => (
                                    <motion.div
                                        key={tier.name}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className={`p-10 rounded-[3rem] border infra-card ${
                                            theme === 'dark' ? 'bg-[#003152]/80 border-white/5' : 'bg-white border-slate-200 shadow-xl'
                                        }`}
                                    >
                                        <div className={`mb-6 text-emerald-400`}>{tier.icon}</div>
                                        <h3 className="text-xl font-black mb-2">{tier.name}</h3>
                                        <p className="text-xs text-slate-500 font-bold leading-relaxed">{tier.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className={`p-12 md:p-20 rounded-[5rem] border ${
                        theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-2xl'
                    }`}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                            {[
                                { label: 'Uptime', value: '99.999%', sub: 'Monitored around the clock' },
                                { label: 'Latency', value: '< 20ms', sub: 'Global average' },
                                { label: 'Peak load', value: '1.5M/s', sub: 'Requests per second' }
                            ].map((stat, i) => (
                                <div key={i} className="space-y-4 stat-item">
                                    <div className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">{stat.label}</div>
                                    <div className="text-5xl font-black text-white">{stat.value}</div>
                                    <div className="text-xs font-bold text-electric-violet">{stat.sub}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
