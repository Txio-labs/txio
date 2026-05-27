import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Terminal, Layers, Globe, Zap, Fuel, Clock, Plus, ChevronRight, Shield, Cpu, Sparkles, ZapOff
} from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { RequestType } from '@/types';
import { executeSuiRpc } from '@/services/suiService';

export const Dashboard: React.FC = () => {
    const { network, isSyncing, history, currentWorkspaceId, user } = useAppStore();
    const [gasPrice, setGasPrice] = useState<string>('—');
    const [latency, setLatency] = useState<string>('—');
    const [tps, setTps] = useState<string>('—');

    useEffect(() => {
        let cancelled = false;
        let prevCheckpoint = 0;
        let prevTime = 0;

        const fetchMetrics = async () => {
            if (isSyncing) return;
            const t0 = performance.now();
            try {
                const [gasResult, cpResult] = await Promise.all([
                    executeSuiRpc(network, 'suix_getReferenceGasPrice', []),
                    executeSuiRpc(network, 'sui_getLatestCheckpointSequenceNumber', [])
                ]);
                if (cancelled) return;

                const ping = Math.round(performance.now() - t0);
                setLatency(`${ping}ms`);

                if (gasResult.result) {
                    const mist = Number(gasResult.result);
                    setGasPrice(`${mist.toLocaleString()} MIST`);
                }

                const cp = Number(cpResult.result);
                const now = Date.now();
                if (prevCheckpoint > 0 && prevTime > 0) {
                    const deltaCp = cp - prevCheckpoint;
                    const deltaSec = (now - prevTime) / 1000;
                    if (deltaSec > 0 && deltaCp > 0) {
                        setTps(Math.round(deltaCp / deltaSec).toLocaleString());
                    }
                }
                prevCheckpoint = cp;
                prevTime = now;
            } catch {
                if (!cancelled) {
                    setGasPrice('Unavailable');
                    setLatency('Unavailable');
                }
            }
        };

        void fetchMetrics();
        const interval = setInterval(() => { void fetchMetrics(); }, 6000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [network, isSyncing]);

    const workspaceHistory = useMemo(() => {
        return history
            .filter(item => !item.workspaceId || item.workspaceId === currentWorkspaceId)
            .slice(0, 5);
    }, [history, currentWorkspaceId]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    } as const;

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: 'spring', damping: 25, stiffness: 200 }
        }
    } as const;

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="h-full overflow-y-auto bg-near-black p-6 md:p-10 custom-scrollbar relative overflow-hidden"
        >
            {/* Background Architecture */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(123, 63, 242, 0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-near-black via-transparent to-transparent"></div>
            </div>

            {/* Floating Ambient Glows */}
            <motion.div 
                animate={{ 
                    x: [0, 100, 0], 
                    y: [0, -50, 0],
                    scale: [1, 1.2, 1] 
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-electric-violet/10 blur-[150px] rounded-full pointer-events-none"
            ></motion.div>
            
            <motion.div 
                animate={{ 
                    x: [0, -150, 0], 
                    y: [0, 100, 0],
                    scale: [1, 1.3, 1] 
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[-20%] right-[5%] w-[600px] h-[600px] bg-soft-purple/5 blur-[180px] rounded-full pointer-events-none"
            ></motion.div>

            {/* Hero Section */}
            <motion.div variants={itemVariants} className="mb-16 relative">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="relative">
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-2 mb-4"
                        >
                            <div className="h-0.5 w-16 bg-gradient-to-r from-electric-violet to-transparent rounded-full"></div>
                            <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-electric-violet drop-shadow-[0_0_5px_rgba(123,63,242,0.5)]">All systems good</span>
                        </motion.div>
                        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter leading-tight">
                            Good to see <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-soft-purple/50">you again.</span>
                        </h1>
                        <p className="text-slate-400 mt-6 max-w-xl text-base md:text-lg leading-relaxed font-medium">
                            Your workspace is right where you left it. Open a tab, run a request, build something good.
                        </p>
                    </div>
                    <div className="flex flex-col items-center gap-6 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-electric-violet/30 blur-3xl rounded-full group-hover:bg-electric-violet/50 transition-all duration-700"></div>
                            <button 
                                onClick={() => appStore.openTab('new_request')}
                                className="relative flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-bold text-base hover:bg-electric-violet hover:text-white transition-all duration-500 hover:shadow-[0_0_40px_rgba(123,63,242,0.6)] active:scale-95 group"
                            >
                                <Sparkles size={20} className="text-electric-violet group-hover:text-white transition-colors" />
                                Start Building
                            </button>
                        </div>
                        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                            Connected to {network}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Metrics Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                {[
                    { label: 'Network', value: network, icon: Globe, color: 'text-blue-400', bg: 'bg-blue-400/5' },
                    { label: 'Checkpoints/s', value: tps, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/5' },
                    { label: 'Gas Price', value: gasPrice, icon: Fuel, color: 'text-emerald-400', bg: 'bg-emerald-400/5' },
                    { label: 'RPC Latency', value: latency, icon: Cpu, color: 'text-soft-purple', bg: 'bg-soft-purple/5' }
                ].map((item, i) => (
                    <motion.div 
                        key={i} 
                        whileHover={{ y: -5, scale: 1.02 }}
                        className="relative group cursor-default"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent rounded-3xl backdrop-blur-xl"></div>
                        <div className="relative p-7 border border-white/5 rounded-3xl group-hover:border-electric-violet/30 transition-all duration-500 shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <div className={`p-3 ${item.bg} rounded-2xl border border-white/5`}>
                                    <item.icon size={24} className={`${item.color}`} />
                                </div>
                                <Activity size={16} className="text-slate-800" />
                            </div>
                            <div className="text-slate-500 text-[11px] uppercase font-bold tracking-[0.2em] mb-1.5">{item.label}</div>
                            <div className="text-3xl font-mono font-bold text-white uppercase tracking-tight">{item.value}</div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start relative z-10">
                {/* Quick Tools */}
                <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-electric-violet/10 flex items-center justify-center text-electric-violet">
                            <Plus size={18} />
                        </div>
                        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-[0.2em]">Quick Launch</h2>
                    </div>
                    
                    {[
                        { title: 'RPC Builder', desc: 'Interact with fullnodes via JSON-RPC', icon: Terminal, action: () => appStore.openTab('rpc'), hotkey: '⌘R' },
                        { title: 'TX Composer', desc: 'Batch operations into single transactions', icon: Layers, action: () => appStore.openTab('ptb'), hotkey: '⌘P' },
                        { title: 'AI Debugger', desc: 'Explain transaction errors and audit code', icon: Shield, action: () => appStore.openTab('ai_chat'), hotkey: '⌘D' }
                    ].map((tool, i) => (
                        <button 
                            key={i}
                            onClick={tool.action}
                            className="w-full flex items-center gap-5 p-5 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500 group relative overflow-hidden text-left"
                        >
                            <div className="p-4 bg-near-black border border-white/5 rounded-2xl text-slate-400 group-hover:text-electric-violet transition-colors group-hover:scale-110 transition-transform duration-500">
                                <tool.icon size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <div className="text-base font-bold text-slate-200">{tool.title}</div>
                                    <span className="text-[9px] font-mono text-slate-700 group-hover:text-slate-500 transition-colors bg-white/5 px-1.5 py-0.5 rounded uppercase">{tool.hotkey}</span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1 line-clamp-1">{tool.desc}</div>
                            </div>
                            <ChevronRight size={18} className="text-slate-800 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                        </button>
                    ))}
                </motion.div>

                {/* Recent Activity */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-soft-purple/10 flex items-center justify-center text-soft-purple">
                                <Clock size={18} />
                            </div>
                            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-[0.2em]">Live Workspace</h2>
                        </div>
                        <button className="text-[11px] font-bold text-electric-violet hover:text-soft-purple transition-colors flex items-center gap-2 group">
                            Full History
                            <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                    
                    <div className="relative rounded-[2rem] border border-white/5 bg-white/[0.01] overflow-hidden backdrop-blur-sm">
                        {workspaceHistory.length === 0 ? (
                            <div className="p-24 text-center flex flex-col items-center gap-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-slate-500/20 blur-2xl rounded-full animate-pulse"></div>
                                    <div className="relative w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-700">
                                        <ZapOff size={40} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-lg font-bold text-slate-400">Terminal Quiet</div>
                                    <p className="text-sm text-slate-600 max-w-[280px] leading-relaxed">Execute your first transaction to see real-time data streaming here.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {workspaceHistory.map((item, idx) => (
                                    <motion.div 
                                        key={idx} 
                                        whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                                        className="p-5 flex items-center justify-between transition-colors cursor-pointer group"
                                        onClick={() => appStore.openTab(item.type === RequestType.RPC ? 'rpc' : 'ptb', item)}
                                    >
                                        <div className="flex items-center gap-5 min-w-0">
                                            <div className="relative">
                                                <div className={`absolute inset-0 ${item.status && item.status < 400 ? 'bg-emerald-500' : 'bg-red-500'} blur-md rounded-full opacity-0 group-hover:opacity-40 transition-opacity`}></div>
                                                <div className={`relative w-2.5 h-2.5 rounded-full ${item.status && item.status < 400 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="text-sm font-bold text-slate-200 truncate group-hover:text-electric-violet transition-colors duration-300">
                                                    {item.name}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{item.type}</span>
                                                    <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                                                    <span className="text-[10px] text-slate-500 font-mono truncate uppercase tracking-tighter">
                                                        {item.rpcParams?.method || item.txType || 'Contract Call'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8 shrink-0 ml-4">
                                            <div className="hidden sm:flex flex-col items-end">
                                                <div className="text-[11px] font-bold text-slate-400 font-mono tracking-tighter">{item.duration}ms</div>
                                                <div className="text-[9px] text-slate-700 uppercase font-bold tracking-widest">Exec</div>
                                            </div>
                                            <div className="text-[11px] text-slate-500 border border-white/5 bg-near-black px-3 py-1.5 rounded-xl font-mono group-hover:border-electric-violet/20 transition-colors">
                                                {new Date(item.timestamp || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Bottom Version Note */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                className="mt-24 text-center pb-10"
            >
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.5em]">txio infrastructure engine v2.4.0</div>
            </motion.div>
        </motion.div>
    );
};
