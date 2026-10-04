import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Code2, Box, Cpu, Zap, Shield, Play, Save, Share2, 
    ChevronRight, Search, Plus, Terminal, Layers, Database, Check, AlertTriangle
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

export const MoveBuilder: React.FC = () => {
    useAppStore();
    const [activeModule, setActiveModule] = useState('core');

    const [contractName, setContractName] = useState('AssetBridge');
    const [code, setCode] = useState(`public entry fun initialize_market(admin: address) {\n    // Initialize the market configuration\n}\n\npublic fun mint_collection_token(amount: u64, treasury_cap: &mut TreasuryCap<T>): Coin<T> {\n    let token = coin::mint_balance(amount, treasury_cap);\n    return token\n}`);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'failed'>('idle');

    const modules = [
        { id: 'core', name: 'Standard Assets', icon: Box },
        { id: 'defi', name: 'DeFi Primitives', icon: Zap },
        { id: 'identity', name: 'Identity & Auth', icon: Shield },
        { id: 'social', name: 'Social Graph', icon: Share2 }
    ];

    // Move compilation needs the Sui toolchain on a server, which does not exist
    // yet. Until it does this page is an editor with a local draft, nothing more:
    // no compile, no deploy, no made-up transaction hash.
    const handleSave = () => {
        try {
            localStorage.setItem('txio_move_builder_draft', JSON.stringify({ contractName, code }));
            setSaveStatus('success');
        } catch {
            setSaveStatus('failed');
        }
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    return (
        <div className="h-full flex bg-white dark:bg-[#0a0a0a] text-slate-700 dark:text-slate-300 font-sans overflow-hidden">
            {/* Module Sidebar */}
            <aside className="w-64 border-r border-slate-200 dark:border-white/5 flex flex-col bg-slate-50 dark:bg-[#18181b]">
                <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600 px-2">Contract Templates</div>
                        <div className="space-y-1">
                            {modules.map(mod => (
                                <button
                                    key={mod.id}
                                    onClick={() => setActiveModule(mod.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                                        activeModule === mod.id
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-near-black shadow-lg'
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <mod.icon size={16} />
                                    <span>{mod.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600 px-2">Your Modules</div>
                        <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-white/10 text-center space-y-2 group cursor-pointer hover:border-electric-violet/30 transition-all">
                            <Plus size={16} className="mx-auto text-slate-400 dark:text-slate-600 group-hover:text-electric-violet" />
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">New Move Module</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-black/20">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">
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
                <header className="h-14 border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-6 bg-slate-50 dark:bg-black/40 backdrop-blur-md relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-electric-violet" />
                            <span className="text-sm font-black text-slate-900 dark:text-white">{contractName || 'Untitled_Contract'}.move</span>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-500">Experimental</span>
                        {saveStatus === 'success' && <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Check size={12}/> Saved in this browser</span>}
                        {saveStatus === 'failed' && <span className="text-xs font-bold text-rose-500">Could not save</span>}
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all">
                            <Save size={14} /> Save draft
                        </button>
                        <button disabled title="Compiling and deploying Move is not available yet" className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black text-xs font-bold opacity-40 cursor-not-allowed">
                            <Play size={14} /> Deploy
                        </button>
                    </div>
                </header>

                {/* Canvas Content */}
                <div className="flex-1 p-12 relative z-10 overflow-y-auto custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div role="note" className="p-4 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 flex items-start gap-3 text-sm">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
                            <span>Compiling Move needs the Sui toolchain, which runs on a server. That service is not built yet, so nothing here is compiled or deployed. To publish a package today, use the Sui CLI.</span>
                        </div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-1 rounded-[1.5rem] bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-white/10 shadow-2xl relative group h-[70vh] max-h-[600px] flex flex-col"
                        >
                            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200 dark:border-white/5">
                                <Code2 size={18} className="text-slate-400 dark:text-slate-500"/>
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Contract Editor</span>
                            </div>
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                spellCheck={false}
                                className="flex-1 w-full bg-transparent text-sm font-mono text-slate-700 dark:text-slate-300 p-6 focus:outline-none resize-none custom-scrollbar"
                                placeholder="// Write your Move contract here..."
                            />
                        </motion.div>
                    </div>
                </div>
            </main>

            {/* Inspector */}
            <aside className="w-80 border-l border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#18181b] p-6 space-y-8">
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Properties</h3>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase">Contract Name</label>
                            <input
                                type="text"
                                value={contractName}
                                onChange={(e) => setContractName(e.target.value)}
                                className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm font-bold focus:border-electric-violet/40 transition-all outline-none text-slate-900 dark:text-white"
                                placeholder="Enter contract name"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase">Move Edition</label>
                            <select className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm font-bold outline-none text-slate-900 dark:text-white">
                                <option>2024 (Beta)</option>
                                <option>Legacy</option>
                            </select>
                        </div>
                    </div>
                </div>

            </aside>
        </div>
    );
};
