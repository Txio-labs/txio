import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Code2, Box, Cpu, Zap, Shield, Play, Save, Share2, 
    ChevronRight, Search, Plus, Terminal, Layers, Database
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

export const MoveBuilder: React.FC = () => {
    const { theme } = useAppStore();
    const [activeModule, setActiveModule] = useState('core');

    const modules = [
        { id: 'core', name: 'Standard Assets', icon: Box },
        { id: 'defi', name: 'DeFi Primitives', icon: Zap },
        { id: 'identity', name: 'Identity & Auth', icon: Shield },
        { id: 'social', name: 'Social Graph', icon: Share2 }
    ];

    return (
        <div className="h-full flex bg-[#001B2E] text-slate-300 font-sans overflow-hidden">
            {/* Module Sidebar */}
            <aside className="w-64 border-r border-white/5 flex flex-col bg-[#003152]">
                <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-2">Contract Templates</div>
                        <div className="space-y-1">
                            {modules.map(mod => (
                                <button 
                                    key={mod.id}
                                    onClick={() => setActiveModule(mod.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                                        activeModule === mod.id 
                                        ? 'bg-electric-violet text-white shadow-lg' 
                                        : 'text-slate-500 hover:bg-white/5'
                                    }`}
                                >
                                    <mod.icon size={16} />
                                    <span>{mod.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-2">Your Modules</div>
                        <div className="p-4 rounded-xl border border-dashed border-white/10 text-center space-y-2 group cursor-pointer hover:border-electric-violet/30 transition-all">
                            <Plus size={16} className="mx-auto text-slate-600 group-hover:text-electric-violet" />
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">New Move Module</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/5 bg-black/20">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-600">
                        <span>Move Compiler v1.1.2</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                </div>
            </aside>

            {/* Visual Canvas */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Canvas Background Grid */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]" />
                
                {/* Header */}
                <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-electric-violet" />
                            <span className="text-sm font-black text-white">Untitled_Contract.move</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-black text-slate-500 uppercase tracking-widest">Modified 2m ago</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition-all">
                            <Save size={14} /> Save
                        </button>
                        <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-electric-violet text-white text-xs font-bold shadow-lg shadow-electric-violet/20 hover:bg-soft-purple transition-all">
                            <Play size={14} /> Deploy to Devnet
                        </button>
                    </div>
                </header>

                {/* Canvas Content */}
                <div className="flex-1 p-12 relative z-10 overflow-y-auto custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-12">
                        {/* Entry Point Card */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-8 rounded-[2.5rem] bg-[#003152] border border-white/10 shadow-2xl relative group"
                        >
                            <div className="absolute top-0 right-0 p-6 text-slate-800"><Code2 size={64} /></div>
                            <div className="space-y-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="px-3 py-1 rounded-full bg-electric-violet/10 border border-electric-violet/20 text-[10px] font-black text-electric-violet uppercase tracking-widest">Entry Function</div>
                                    <h2 className="text-2xl font-black text-white">initialize_market</h2>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                                        <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Parameters</div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-slate-400">admin:</span>
                                            <span className="text-emerald-400 font-mono">address</span>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                                        <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Visibility</div>
                                        <div className="text-sm font-bold text-sky-400">Public Entry</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Connection Line */}
                        <div className="w-px h-12 bg-gradient-to-b from-electric-violet/50 to-transparent mx-auto" />

                        {/* Logic Step Card */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="p-8 rounded-[2.5rem] bg-[#003152] border border-white/10 shadow-2xl relative"
                        >
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest">Resource Logic</div>
                                    <h2 className="text-2xl font-black text-white">mint_collection_token</h2>
                                </div>
                                <div className="p-6 rounded-2xl bg-black/40 border border-white/5 font-mono text-sm text-slate-500">
                                    <div>let <span className="text-white">token</span> = coin::mint_balance(amount, treasury_cap);</div>
                                    <div className="mt-1 text-slate-600">{/* Validate treasury ownership... */}</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </main>

            {/* Inspector */}
            <aside className="w-80 border-l border-white/5 bg-[#003152] p-6 space-y-8">
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Properties</h3>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-600 uppercase">Contract Name</label>
                            <input 
                                type="text" 
                                value="AssetBridge" 
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold focus:border-electric-violet/40 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-600 uppercase">Move Edition</label>
                            <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold outline-none">
                                <option>2024 (Beta)</option>
                                <option>Legacy</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Resource Leak Check</h3>
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3">
                        <Shield size={16} className="text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-500">No dangling resources detected.</span>
                    </div>
                </div>
            </aside>
        </div>
    );
};
