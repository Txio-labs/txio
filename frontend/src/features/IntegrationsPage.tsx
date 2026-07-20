import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Globe, Network, Shield, Zap, Cpu, Database, Blocks, ExternalLink } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import gsap from 'gsap';

interface IntegrationsPageProps {
    embedded?: boolean;
}

export const IntegrationsPage: React.FC<
    IntegrationsPageProps
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
        const ctx = gsap.context(() => {
            gsap.from('.integration-card', {
                y: 50,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: 'power3.out',
                delay: 0.2
            });

            gsap.from('.header-content > *', {
                x: -30,
                opacity: 0,
                duration: 1,
                stagger: 0.2,
                ease: 'power4.out'
            });
        });

        return () => ctx.revert();
    }, []);

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

    const integrations = [
        { name: 'Sui', type: 'Layer 1', desc: 'Object-centric chain built for low-latency, high-throughput apps. Move-native.', status: 'Mainnet Live', color: '#38bdf8' },
        { name: 'Solana', type: 'Layer 1', desc: 'Parallel execution. Sub-second confirmations. The fast chain.', status: 'Mainnet Live', color: '#14f195' },
        { name: 'Ethereum', type: 'Layer 1', desc: 'The original smart contract platform. Where most of DeFi still lives.', status: 'Mainnet Live', color: '#6366f1' },
        { name: 'Aptos', type: 'Layer 1', desc: 'Move-based chain, designed to be upgradeable without breaking what shipped.', status: 'Mainnet Live', color: '#2dd4bf' },
        { name: 'Starknet', type: 'Layer 2', desc: 'Validity rollup on Ethereum. ZK proofs, not optimistic challenges.', status: 'Mainnet Live', color: '#ef4444' },
        { name: 'Arbitrum', type: 'Layer 2', desc: 'Optimistic rollup. EVM-compatible. Most Ethereum dApps run here unchanged.', status: 'Mainnet Live', color: '#2b58de' },
        { name: 'Base', type: 'Layer 2', desc: 'Coinbase\'s L2. Cheap, fast, and friendly to builders.', status: 'Mainnet Live', color: '#0052ff' },
        { name: 'Optimism', type: 'Layer 2', desc: 'Ethereum L2 with a public-goods bent. OP Stack-everything.', status: 'Mainnet Live', color: '#ff0420' }
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
                        <span className="font-black tracking-tighter text-lg">Integrations</span>
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

            <section className={`relative ${embedded ? 'pt-28' : 'pt-48'} pb-24 px-6 md:px-12`}>
                <div className="max-w-7xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-20 space-y-6 header-content"
                    >
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight">
                            Every chain we <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-violet to-soft-purple">actually speak.</span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl leading-relaxed">
                            Direct connections to every major chain — not just an RPC URL. Schema, names, gas estimation, the whole thing.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {integrations.map((int, i) => (
                            <motion.div
                                key={int.name}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className={`p-8 rounded-[2.5rem] border group transition-all cursor-pointer integration-card ${
                                    theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' : 'bg-white border-slate-200 shadow-sm hover:shadow-xl'
                                }`}
                            >
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-transform duration-500" style={{ backgroundColor: `${int.color}15`, color: int.color }}>
                                    <Network size={28} />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black">{int.name}</h3>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{int.type}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                        {int.desc}
                                    </p>
                                    <div className="pt-4 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">{int.status}</span>
                                        <ExternalLink size={14} className="text-slate-600 group-hover:text-white transition-colors" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};
