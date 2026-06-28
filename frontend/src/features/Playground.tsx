import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Zap, Terminal, Globe, Cpu, Database, 
    Play, Shield, Search, Plus, Trash2, 
    RefreshCcw, Code2, Layers, Sparkles
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

export const Playground: React.FC = () => {
    const { theme } = useAppStore();
    const [selectedChain, setSelectedChain] = useState('sui');

    const chains = [
        { id: 'sui', name: 'Sui', color: 'text-[#38bdf8]' },
        { id: 'solana', name: 'Solana', color: 'text-[#14f195]' },
        { id: 'evm', name: 'Ethereum', color: 'text-[#6366f1]' },
        { id: 'aptos', name: 'Aptos', color: 'text-[#2dd4bf]' }
    ];

    return (
        <div className="h-full flex flex-col bg-[#050505] text-slate-300 font-sans overflow-hidden">
            {/* Toolbar */}
            <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0c] relative z-10">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-electric-violet/10 flex items-center justify-center text-electric-violet">
                            <Sparkles size={18} />
                        </div>
                        <span className="text-sm font-black text-white uppercase tracking-widest">Protocol Playground</span>
                    </div>
                    
                    <div className="h-6 w-px bg-white/10" />
                    
                    <div className="flex items-center gap-2">
                        {chains.map(chain => (
                            <button 
                                key={chain.id}
                                onClick={() => setSelectedChain(chain.id)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                    selectedChain === chain.id 
                                    ? 'bg-white/10 text-white border border-white/10' 
                                    : 'text-slate-600 hover:text-slate-400'
                                }`}
                            >
                                {chain.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="p-2 rounded-lg hover:bg-white/5 text-slate-500 transition-colors">
                        <RefreshCcw size={16} />
                    </button>
                    <button className="flex items-center gap-2 px-6 py-1.5 rounded-xl bg-electric-violet text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-electric-violet/20 hover:bg-soft-purple transition-all">
                        <Play size={14} /> Execute Snippet
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Sandbox */}
                <main className="flex-1 flex flex-col border-r border-white/5 bg-[#050505]">
                    {/* Editor Mock */}
                    <div className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
                        <div className="p-8 rounded-[2.5rem] bg-[#0c0c0e] border border-white/10 relative group">
                            <div className="absolute top-0 right-0 p-6 opacity-5"><Terminal size={80} /></div>
                            <div className="space-y-4 relative z-10">
                                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Active Script</div>
                                <div className="font-mono text-sm leading-relaxed">
                                    <div className="text-slate-500">{/* 1. Fetching total supply of SUI */}</div>
                                    <div className="text-white">const <span className="text-emerald-400">supply</span> = await sui.getTotalSupply();</div>
                                    <div className="mt-4 text-slate-500">{/* 2. Querying recent move calls */}</div>
                                    <div className="text-white">const <span className="text-sky-400">events</span> = await sui.queryEvents(&#123; limit: 10 &#125;);</div>
                                    <div className="mt-4 text-slate-500">{/* 3. Output to playground terminal */}</div>
                                    <div className="text-soft-purple">console.log(`Current Supply: $&#123;supply&#125;`);</div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Widgets */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">State Watcher</div>
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">TPS</span>
                                        <span className="text-white font-bold">297,102</span>
                                    </div>
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="w-3/4 h-full bg-electric-violet" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Gas Meter</div>
                                <div className="flex items-end gap-2">
                                    <div className="text-2xl font-black text-white">0.00042</div>
                                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">SUI / Op</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Right Sidebar - Toolbox */}
                <aside className="w-80 bg-[#0a0a0c] p-6 space-y-8 flex flex-col">
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">Snippet Library</h3>
                        <div className="space-y-2">
                            {[
                                { name: 'Fetch Objects', time: '2m ago' },
                                { name: 'Batch Transfer', time: '1h ago' },
                                { name: 'Verify Proof', time: '3h ago' }
                            ].map(s => (
                                <div key={s.name} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer group">
                                    <div className="text-xs font-bold text-white mb-1 group-hover:text-electric-violet transition-colors">{s.name}</div>
                                    <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{s.time}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1" />

                    <div className="p-6 rounded-3xl bg-electric-violet/5 border border-electric-violet/10 space-y-4">
                        <div className="w-10 h-10 rounded-xl bg-electric-violet/20 flex items-center justify-center text-electric-violet">
                            <Zap size={20} />
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs font-black text-white">Advanced Simulation</div>
                            <p className="text-[10px] leading-relaxed text-slate-500">Run this snippet in a dedicated fork to prevent state contamination.</p>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};
