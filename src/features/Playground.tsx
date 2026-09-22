import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Zap, Terminal, Globe, Cpu, Database, 
    Play, Shield, Search, Plus, Trash2, 
    RefreshCcw, Code2, Layers, Sparkles, Loader2
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface ChainDef {
    id: string;
    name: string;
    color: string;
    gasUnit: string;
    defaultScript: string;
    snippets: { name: string; time: string; content: string }[];
}

const CHAINS: ChainDef[] = [
    {
        id: 'sui',
        name: 'Sui',
        color: '#6fbcf0',
        gasUnit: 'SUI / op',
        defaultScript: `const supply = await sui.getTotalSupply();\nconst events = await sui.queryEvents({ limit: 10 });\nconsole.log(\`Current Supply: \${supply}\`);`,
        snippets: [
            { name: 'Fetch Objects', time: '2m ago', content: 'const objects = await sui.getOwnedObjects();\nconsole.log(`Found ${objects.length} objects`);' },
            { name: 'Batch Transfer', time: '1h ago', content: 'const txb = new TransactionBlock();\ntxb.transferObjects([coin], recipient);\nconst res = await sui.signAndExecuteTransactionBlock({ transactionBlock: txb });' },
            { name: 'Verify Proof', time: '3h ago', content: 'const isValid = await zk.verifyZkLogin(proof, maxEpoch);\nconsole.log(`Proof valid: ${isValid}`);' }
        ]
    },
    {
        id: 'solana',
        name: 'Solana',
        color: '#14f195',
        gasUnit: 'SOL / op',
        defaultScript: `const supply = await connection.getSupply();\nconst sigs = await connection.getSignaturesForAddress(programId, { limit: 10 });\nconsole.log(\`Current Supply: \${supply.value.total}\`);`,
        snippets: [
            { name: 'Fetch Accounts', time: '2m ago', content: 'const accounts = await connection.getProgramAccounts(programId);\nconsole.log(`Found ${accounts.length} accounts`);' },
            { name: 'Batch Transfer', time: '1h ago', content: 'const tx = new Transaction().add(\n  SystemProgram.transfer({ fromPubkey, toPubkey, lamports })\n);\nconst sig = await sendAndConfirmTransaction(connection, tx, [payer]);' },
            { name: 'Verify Signature', time: '3h ago', content: 'const isValid = nacl.sign.detached.verify(message, signature, publicKey.toBytes());\nconsole.log(`Signature valid: ${isValid}`);' }
        ]
    },
    {
        id: 'evm',
        name: 'Ethereum',
        color: '#a5a8f7',
        gasUnit: 'ETH / op',
        defaultScript: `const supply = await contract.totalSupply();\nconst events = await contract.queryFilter(contract.filters.Transfer(), -10);\nconsole.log(\`Current Supply: \${supply}\`);`,
        snippets: [
            { name: 'Fetch Balance', time: '2m ago', content: 'const balance = await provider.getBalance(address);\nconsole.log(`Balance: ${formatEther(balance)} ETH`);' },
            { name: 'Batch Transfer', time: '1h ago', content: 'const tx = await wallet.sendTransaction({ to: recipient, value: parseEther("0.1") });\nconst receipt = await tx.wait();' },
            { name: 'Verify Signature', time: '3h ago', content: 'const signer = ethers.verifyMessage(message, signature);\nconsole.log(`Recovered signer: ${signer}`);' }
        ]
    },
    {
        id: 'aptos',
        name: 'Aptos',
        color: '#2ed3b7',
        gasUnit: 'APT / op',
        defaultScript: `const supply = await aptos.getAccountResource({ resourceType: "0x1::coin::CoinInfo" });\nconst events = await aptos.getEvents({ limit: 10 });\nconsole.log(\`Current Supply: \${supply.data.supply}\`);`,
        snippets: [
            { name: 'Fetch Resources', time: '2m ago', content: 'const resources = await aptos.getAccountResources({ accountAddress: address });\nconsole.log(`Found ${resources.length} resources`);' },
            { name: 'Batch Transfer', time: '1h ago', content: 'const tx = await aptos.transaction.build.simple({\n  sender: account.accountAddress,\n  data: { function: "0x1::coin::transfer", functionArguments: [recipient, amount] }\n});' },
            { name: 'Verify Proof', time: '3h ago', content: 'const isValid = await aptos.verifySignature({ message, signature, publicKey });\nconsole.log(`Proof valid: ${isValid}`);' }
        ]
    }
];

export const Playground: React.FC = () => {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const [selectedChainId, setSelectedChainId] = useState('sui');
    const selectedChain = CHAINS.find((c) => c.id === selectedChainId) ?? CHAINS[0];

    const [script, setScript] = useState(selectedChain.defaultScript);
    const [isExecuting, setIsExecuting] = useState(false);
    const [tps, setTps] = useState('297,102');
    const [gas, setGas] = useState('0.00042');
    const [output, setOutput] = useState('Playground terminal ready.');

    const handleSelectChain = (chain: ChainDef) => {
        setSelectedChainId(chain.id);
        setScript(chain.defaultScript);
        setOutput('Playground terminal ready.');
        setTps('0');
        setGas('0.00000');
    };

    const handleExecute = () => {
        setIsExecuting(true);
        setOutput('Executing script...');
        // Simulated: real SDK execution or a WebWorker sandbox runs here per selected chain.
        setTimeout(() => {
            setIsExecuting(false);
            setTps(Math.floor(Math.random() * 50000 + 250000).toLocaleString());
            setGas((Math.random() * 0.001).toFixed(5));
            setOutput(`[Success] Execution completed in 125ms on ${selectedChain.name}.\nResult: {\n  status: "success",\n  gasUsed: ${Math.floor(Math.random() * 1000)}\n}`);
        }, 1500);
    };

    const handleRefresh = () => {
        setScript('');
        setOutput('Playground terminal ready.');
        setTps('0');
        setGas('0.00000');
    };

    return (
        <div className={`h-full flex flex-col font-sans overflow-hidden ${isDark ? 'bg-[#0a0a0a] text-slate-300' : 'bg-white text-slate-700'}`}>
            {/* Toolbar */}
            <header className={`h-14 border-b flex items-center justify-between px-6 relative z-10 ${isDark ? 'border-white/5 bg-[#18181b]' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-electric-violet/10 flex items-center justify-center text-electric-violet">
                            <Sparkles size={18} />
                        </div>
                        <span className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>Protocol Playground</span>
                    </div>

                    <div className={`h-6 w-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

                    <div className="flex items-center gap-2">
                        {CHAINS.map((chain) => (
                            <button
                                key={chain.id}
                                onClick={() => handleSelectChain(chain)}
                                className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border"
                                style={
                                    selectedChain.id === chain.id
                                        ? { backgroundColor: `${chain.color}1a`, borderColor: `${chain.color}55`, color: chain.color }
                                        : { borderColor: 'transparent', color: isDark ? '#71717a' : '#94a3b8' }
                                }
                            >
                                {chain.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={handleRefresh} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/5 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
                        <RefreshCcw size={16} />
                    </button>
                    <button onClick={handleExecute} disabled={isExecuting || !script.trim()} className="flex items-center gap-2 px-6 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-near-black text-[10px] font-black uppercase tracking-widest shadow-lg shadow-electric-violet/20 hover:opacity-90 transition-all disabled:opacity-50">
                        {isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Execute Snippet
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Sandbox */}
                <main className={`flex-1 flex flex-col border-r ${isDark ? 'border-white/5 bg-[#0a0a0a]' : 'border-slate-200 bg-white'}`}>
                    {/* Editor */}
                    <div className="flex-1 p-8 flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
                        <div className={`flex-1 rounded-[1.5rem] border relative group flex flex-col min-h-[300px] ${isDark ? 'bg-[#18181b] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                                <div className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Active Script</div>
                            </div>
                            <textarea
                                value={script}
                                onChange={(e) => setScript(e.target.value)}
                                spellCheck={false}
                                className={`flex-1 w-full bg-transparent text-sm font-mono p-6 focus:outline-none resize-none custom-scrollbar ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                                placeholder="// Write your SDK snippet here..."
                            />
                        </div>

                        {/* Interactive Widgets */}
                        <div className="grid grid-cols-2 gap-6 shrink-0">
                            <div className={`p-6 rounded-3xl border space-y-4 ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center justify-between">
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>State Watcher</div>
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">TPS</span>
                                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{tps}</span>
                                    </div>
                                    <div className={`w-full h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-200'}`}>
                                        <div className="w-3/4 h-full" style={{ backgroundColor: selectedChain.color }} />
                                    </div>
                                </div>
                            </div>
                            <div className={`p-6 rounded-3xl border space-y-4 ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                <div className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Gas Meter</div>
                                <div className="flex items-end gap-2">
                                    <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{gas}</div>
                                    <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{selectedChain.gasUnit}</div>
                                </div>
                            </div>
                        </div>

                        {/* Terminal Output */}
                        <div className={`h-48 rounded-2xl border p-4 font-mono text-xs overflow-y-auto shrink-0 whitespace-pre-wrap ${isDark ? 'bg-[#18181b] border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                            {output}
                        </div>
                    </div>
                </main>

                {/* Right Sidebar - Toolbox */}
                <aside className={`w-80 p-6 space-y-8 flex flex-col ${isDark ? 'bg-[#18181b]' : 'bg-slate-50'}`}>
                    <div className="space-y-4">
                        <h3 className={`text-xs font-black uppercase tracking-[0.3em] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{selectedChain.name} Snippets</h3>
                        <div className="space-y-2">
                            {selectedChain.snippets.map((s) => (
                                <div
                                    key={s.name}
                                    onClick={() => setScript(s.content)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer group ${isDark ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' : 'bg-white border-slate-200 hover:bg-slate-100'}`}
                                >
                                    <div className={`text-xs font-bold mb-1 group-hover:text-electric-violet transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.name}</div>
                                    <div className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-700' : 'text-slate-400'}`}>{s.time}</div>
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
                            <div className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Advanced Simulation</div>
                            <p className="text-[10px] leading-relaxed text-slate-500">Run this snippet in a dedicated fork to prevent state contamination.</p>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};
