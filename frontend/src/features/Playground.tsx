import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Zap, Terminal, Globe, Cpu, Database, 
    Play, Shield, Search, Plus, Trash2, 
    RefreshCcw, Code2, Layers, Sparkles, Loader2
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

export const Playground: React.FC = () => {
    const { theme } = useAppStore();
    const [selectedChain, setSelectedChain] = useState('sui');

    const [script, setScript] = useState(`const supply = await sui.getTotalSupply();\nconst events = await sui.queryEvents({ limit: 10 });\nconsole.log(\`Current Supply: \${supply}\`);`);
    const [isExecuting, setIsExecuting] = useState(false);
    const [tps, setTps] = useState('297,102');
    const [gas, setGas] = useState('0.00042');
    const [output, setOutput] = useState('Playground terminal ready.');

    const chains = [
        { id: 'sui', name: 'Sui', color: 'text-[#38bdf8]' },
        { id: 'solana', name: 'Solana', color: 'text-[#14f195]' },
        { id: 'evm', name: 'Ethereum', color: 'text-[#6366f1]' },
        { id: 'aptos', name: 'Aptos', color: 'text-[#2dd4bf]' }
    ];

    const snippets = [
        { name: 'Fetch Objects', time: '2m ago', content: 'const objects = await sui.getOwnedObjects();\nconsole.log(`Found ${objects.length} objects`);' },
        { name: 'Batch Transfer', time: '1h ago', content: 'const txb = new TransactionBlock();\ntxb.transferObjects([coin], recipient);\nconst res = await sui.signAndExecuteTransactionBlock({ transactionBlock: txb });' },
        { name: 'Verify Proof', time: '3h ago', content: 'const isValid = await zk.verifyZkLogin(proof, maxEpoch);\nconsole.log(`Proof valid: ${isValid}`);' }
    ];

    const handleExecute = () => {
        setIsExecuting(true);
        setOutput('Executing script...');
        // TODO: Replace with real SDK execution or WebWorker sandbox
        setTimeout(() => {
            setIsExecuting(false);
            setTps(Math.floor(Math.random() * 50000 + 250000).toLocaleString());
            setGas((Math.random() * 0.001).toFixed(5));
            setOutput(`[Success] Execution completed in 125ms.\nResult: {\n  status: "success",\n  gasUsed: ${Math.floor(Math.random() * 1000)}\n}`);
        }, 1500);
    };

    const handleRefresh = () => {
        setScript('');
        setOutput('Playground terminal ready.');
        setTps('0');
        setGas('0.00000');
    };

    return (
        <div className="h-full flex flex-col bg-[#0a0a0a] text-slate-300 font-sans overflow-hidden">
            {/* Toolbar */}
            <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#18181b] relative z-10">
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
                    <button onClick={handleRefresh} className="p-2 rounded-lg hover:bg-white/5 text-slate-500 transition-colors">
                        <RefreshCcw size={16} />
                    </button>
                    <button onClick={handleExecute} disabled={isExecuting || !script.trim()} className="flex items-center gap-2 px-6 py-1.5 rounded-xl bg-electric-violet text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-electric-violet/20 hover:bg-soft-purple transition-all disabled:opacity-50">
                        {isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Execute Snippet
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Sandbox */}
                <main className="flex-1 flex flex-col border-r border-white/5 bg-[#0a0a0a]">
                    {/* Editor */}
                    <div className="flex-1 p-8 flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
                        <div className="flex-1 rounded-[1.5rem] bg-[#18181b] border border-white/10 relative group flex flex-col min-h-[300px]">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Active Script</div>
                            </div>
                            <textarea 
                                value={script}
                                onChange={(e) => setScript(e.target.value)}
                                spellCheck={false}
                                className="flex-1 w-full bg-transparent text-sm font-mono text-slate-300 p-6 focus:outline-none resize-none custom-scrollbar"
                                placeholder="// Write your SDK snippet here..."
                            />
                        </div>

                        {/* Interactive Widgets */}
                        <div className="grid grid-cols-2 gap-6 shrink-0">
                            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">State Watcher</div>
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">TPS</span>
                                        <span className="text-white font-bold">{tps}</span>
                                    </div>
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="w-3/4 h-full bg-electric-violet" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Gas Meter</div>
                                <div className="flex items-end gap-2">
                                    <div className="text-2xl font-black text-white">{gas}</div>
                                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">SUI / Op</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Terminal Output */}
                        <div className="h-48 rounded-2xl bg-[#18181b] border border-white/10 p-4 font-mono text-xs text-slate-400 overflow-y-auto shrink-0 whitespace-pre-wrap">
                            {output}
                        </div>
                    </div>
                </main>

                {/* Right Sidebar - Toolbox */}
                <aside className="w-80 bg-[#18181b] p-6 space-y-8 flex flex-col">
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">Snippet Library</h3>
                        <div className="space-y-2">
                            {snippets.map(s => (
                                <div key={s.name} onClick={() => setScript(s.content)} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer group">
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
