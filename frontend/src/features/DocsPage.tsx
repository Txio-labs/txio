import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
    Book, Code2, Cpu, Globe, Layers, Shield, Terminal, Zap, ChevronRight, Search, 
    Menu, X, Moon, Sun, ArrowLeft, ExternalLink, MessageSquare, BookOpen, Settings,
    Lock, Database, Sparkles
} from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import logoDark from '../assets/txio2.png';
import logoLight from '../assets/txio3.png';

interface DocsPageProps {
    embedded?: boolean;
}

export const DocsPage: React.FC<
    DocsPageProps
> = ({ embedded = false }) => {
    const { theme } = useAppStore();
    const [activePage, setActivePage] = useState('introduction');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const scrollRef = React.useRef<HTMLElement>(null);
    const router = useRouter();

    const navigateTo = (
        target:
            | 'landing'
            | 'signup'
    ) => {
        if (embedded) {
            if (target === 'landing') {
                appStore.setActiveTab(null);
                return;
            }

            appStore.openTab('new_request');
            return;
        }

        const modeToPath: Record<string, string> = {
            landing: '/',
            signup: '/signup'
        };

        const path = modeToPath[target];
        if (path) {
            router.push(path);
        }
    };

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, 0);
        }
    }, [activePage]);

    const logo = theme === 'dark' ? logoDark : logoLight;

    const navItems = [
        { id: 'introduction', title: 'Introduction', icon: BookOpen },
        { id: 'installation', title: 'Installation', icon: Zap },
        { id: 'cli', title: 'CLI Overview', icon: Terminal },
        { id: 'auth', title: 'Authentication', icon: Lock },
        { id: 'architecture', title: 'Architecture', icon: Cpu },
        { id: 'tx-composer', title: 'TX Composer', icon: Layers },
        { id: 'rpc-builder', title: 'RPC Builder', icon: Terminal },
        { id: 'collections', title: 'Collections', icon: Database },
        { id: 'ai-console', title: 'AI Console', icon: MessageSquare },
        { id: 'security', title: 'Security', icon: Shield },
        { id: 'api-reference', title: 'API Reference', icon: Code2 },
    ];

    const infraItems = [
        { id: 'networks', title: 'Networks' },
        { id: 'rpc-endpoints', title: 'RPC Endpoints' },
        { id: 'security-buffers', title: 'Security Buffers' },
        { id: 'cloud-sync', title: 'Cloud Sync' },
        { id: 'deployment', title: 'Deployment' },
        { id: 'extending', title: 'Extending txio' },
        { id: 'roadmap', title: 'Roadmap' },
    ];

    const renderContent = () => {
        switch (activePage) {
            case 'introduction':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-16 pb-20">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white">Introduction.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-3xl">
                                txio is one workspace for every chain you build on. It sits between you and raw JSON-RPC — handling the boring parts (names, gas, schemas) so you can focus on what you&apos;re actually shipping.
                            </p>
                        </div>

                        <div className="space-y-8">
                            <h2 className="text-2xl font-black text-white">How we think about it</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="font-bold text-electric-violet">Every chain, first-class</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        Most IDEs pick a chain and stop there. txio doesn&apos;t. Sui&apos;s object model, Solana&apos;s accounts, Ethereum&apos;s storage slots — same workflow, same shortcuts, same muscle memory.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="font-bold text-emerald-400">Multi-chain isn&apos;t optional</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        Real apps span chains now. We built the adapter layer once so you don&apos;t have to keep reinventing it per project.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8 p-10 rounded-[3rem] bg-white/[0.02] border border-white/5">
                            <h2 className="text-2xl font-black text-white">Why bother?</h2>
                            <div className="grid grid-cols-1 gap-6">
                                <p className="text-sm text-slate-400">Working across ecosystems means dealing with all of this:</p>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                    {[
                                        'A different CLI per chain',
                                        'Six flavors of JSON-RPC',
                                        'Wallet formats that don\'t talk to each other',
                                        'Tab-hopping between explorers',
                                        'Hand-rolling curl commands',
                                        'Cross-chain glue you wrote at 2am'
                                    ].map(item => (
                                        <li key={item} className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-electric-violet" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'installation':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-16 pb-20">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white">Installation.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-3xl">
                                Get your environment ready in less than 60 seconds.
                            </p>
                        </div>

                        <div className="space-y-10">
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-white">1. Global CLI</h3>
                                <p className="text-sm text-slate-500">The terminal is where txio is fastest. Install once, run anywhere.</p>
                                <div className="p-6 rounded-2xl bg-black border border-white/5 font-mono text-sm text-slate-400 flex justify-between items-center group">
                                    <span>cargo install txio-cli</span>
                                    <Terminal size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-white">2. Launch (Docker)</h3>
                                <p className="text-sm text-slate-500">Run the full backend and frontend stack locally.</p>
                                <div className="p-6 rounded-2xl bg-black border border-white/5 font-mono text-sm text-slate-400 space-y-2">
                                    <div>git clone https://github.com/Kingvic300/txio.git</div>
                                    <div className="text-electric-violet">docker-compose up -d</div>
                                </div>
                            </div>

                            <div className="p-10 rounded-[3rem] bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                                <div className="flex items-center gap-3 text-emerald-400">
                                    <Shield size={20} />
                                    <span className="font-bold text-sm uppercase tracking-widest">Security Tip</span>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Always verify the checksum of the installation script when using curl-based installers. 
                                    txio uses signed binaries for all official releases.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'cli':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-16 pb-20">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white uppercase italic">CLI Overview.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                                One CLI for every chain. No more installing a new tool every time you switch ecosystems.
                            </p>
                        </div>

                        <div className="space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-4">
                                    <h4 className="font-bold text-white uppercase tracking-widest text-xs">Unified Syntax</h4>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        txio [GLOBAL_FLAGS] &lt;CHAIN&gt; &lt;SUBCOMMAND&gt; [ARGS]
                                    </p>
                                    <div className="p-4 rounded-xl bg-black font-mono text-[10px] text-emerald-400">
                                        txio sui balance 0x123...
                                    </div>
                                </div>
                                <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-4">
                                    <h4 className="font-bold text-white uppercase tracking-widest text-xs">Fuzzy Matching</h4>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        Mistyped a chain name? txio uses Jaro-Winkler distance to suggest corrections instantly.
                                    </p>
                                    <div className="p-4 rounded-xl bg-black font-mono text-[10px] text-amber-400">
                                        $ txio ethreum balance ... <br />
                                        <span className="text-slate-500">Unknown chain. Did you mean: <span className="text-white">ethereum</span>?</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-white">Global Flags</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { flag: '--network, -n', desc: 'Target network (mainnet, testnet, devnet, localnet)' },
                                        { flag: '--rpc-url', desc: 'Override default nodes with a custom provider' },
                                        { flag: '--pretty', desc: 'Enable syntax-highlighted, human-readable output' },
                                        { flag: '--json', desc: 'Force raw JSON output for piping' }
                                    ].map(item => (
                                        <div key={item.flag} className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col gap-1">
                                            <span className="text-xs font-black font-mono text-electric-violet">{item.flag}</span>
                                            <span className="text-[11px] text-slate-500 font-medium">{item.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'auth':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-16 pb-20">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white">Authentication.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-3xl">
                                Sign in once, sign in everywhere. OTP-based, no password to lose.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-8">
                                <h3 className="text-2xl font-black text-white italic">The OTP Flow</h3>
                                <div className="space-y-6">
                                    {[
                                        { step: '1', title: 'Request', desc: 'Enter your email in the CLI or Web UI.' },
                                        { step: '2', title: 'Verify', desc: 'Receive a 6-digit OTP via email (powered by Brevo).' },
                                        { step: '3', title: 'Issue', desc: 'A JWT is generated and stored in your secure element.' }
                                    ].map(item => (
                                        <div key={item.step} className="flex gap-6">
                                            <div className="w-10 h-10 rounded-full bg-electric-violet/20 border border-electric-violet/30 flex items-center justify-center text-electric-violet font-black shrink-0">{item.step}</div>
                                            <div className="space-y-1">
                                                <div className="font-bold text-white">{item.title}</div>
                                                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 flex flex-col justify-center gap-6">
                                <div className="p-6 rounded-2xl bg-black border border-white/5 space-y-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">Terminal Login</div>
                                    <div className="font-mono text-xs text-emerald-400 italic">txio login</div>
                                    <div className="font-mono text-[10px] text-slate-500">
                                        ? Enter your email: <span className="text-white">dev@txio.io</span> <br />
                                        ? Enter 6-digit code: <span className="text-white">******</span> <br />
                                        <span className="text-emerald-400">✓ Authenticated successfully.</span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed italic text-center">
                                    Tokens are signed using RS256 and stored in the system keychain when available.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'architecture':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-20 pb-20">
                        <div className="space-y-6 text-center md:text-left">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white uppercase italic">Architecture.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                                How the cross-chain layer actually works under the hood.
                            </p>
                        </div>

                        <div className="space-y-12">
                            <h2 className="text-3xl font-black text-white border-l-4 border-electric-violet pl-6 uppercase">The Core Engine</h2>
                            <div className="p-1 rounded-[3rem] bg-gradient-to-br from-white/10 to-transparent">
                                <div className="p-12 rounded-[2.9rem] bg-[#050505] space-y-10">
                                    <div className="flex flex-col md:flex-row gap-12 items-center">
                                        <div className="flex-1 space-y-6">
                                            <h3 className="text-xl font-bold text-white">Hot connections</h3>
                                            <p className="text-slate-500 text-sm leading-relaxed">
                                                Most clients open a fresh HTTP connection per request and pay the handshake cost every time. We don&apos;t. Long-lived multiplexed streams stay open to nodes around the world, so requests start moving the moment you hit send.
                                            </p>
                                            <ul className="space-y-3">
                                                {['Multiplexed RPC Streams', 'Intelligent Request Routing', 'Automated Latency Rebalancing', 'Failover redundancy'].map(item => (
                                                    <li key={item} className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-electric-violet" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="w-full md:w-80 h-80 rounded-[2rem] bg-white/[0.02] border border-white/5 relative flex items-center justify-center overflow-hidden">
                                            <div className="absolute inset-0 bg-electric-violet/5 animate-pulse" />
                                            <div className="relative z-10 p-8 text-center space-y-4">
                                                <Zap className="mx-auto text-electric-violet" size={48} />
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Engine Status</div>
                                                <div className="text-2xl font-black text-white">CONNECTED</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <h2 className="text-3xl font-black text-white border-l-4 border-emerald-400 pl-6 uppercase">Security Hardening</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { title: 'Local Encryption', desc: 'All workspace data is encrypted at rest using AES-256-GCM.' },
                                    { title: 'Zero-Knowledge Sync', desc: 'Metadata is synced via E2EE, meaning even our servers cannot read your request data.' },
                                    { title: 'Sandbox Execution', desc: 'All simulations and dry-runs are executed in isolated V8 environments.' }
                                ].map(item => (
                                    <div key={item.title} className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4">
                                        <div className="font-bold text-white">{item.title}</div>
                                        <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                );
            case 'tx-composer':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-20 pb-20">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white">TX Composer.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                                Build multi-step transactions visually. Move calls, transfers, splits — chain them together, watch the dependencies, simulate before signing.
                            </p>
                        </div>

                        <div className="space-y-10">
                            <div className="flex items-center gap-6 p-10 rounded-[3rem] bg-white/[0.02] border border-white/5">
                                <div className="w-16 h-16 rounded-2xl bg-electric-violet/10 flex items-center justify-center text-electric-violet shrink-0"><Layers size={32} /></div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">PTBs, atomically</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">
                                        Pack multiple operations into one transaction block. Move calls, token transfers, custom logic — all batched, all atomic. Dependencies wire up as you build, so the composer catches dangling references before you do.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 px-2">Example PTB Script</h4>
                                <div className="p-8 rounded-[2.5rem] bg-black border border-white/5 font-mono text-sm leading-loose">
                                    <div className="text-slate-500">{/* 1. Split gas coin for specific amounts */}</div>
                                    <div className="text-white">const [coin1, coin2] = txb.splitCoins(txb.gas, [1000, 2000]);</div>
                                    <div className="text-slate-500 mt-4">{/* 2. Execute Move call with split coins */}</div>
                                    <div className="text-white italic">txb.moveCall(&#123;</div>
                                    <div className="text-white pl-6">target: <span className="text-emerald-400">&apos;0x2::token::transfer&apos;</span>,</div>
                                    <div className="text-white pl-6">arguments: [coin1, recipient_address]</div>
                                    <div className="text-white italic">&#125;);</div>
                                    <div className="text-slate-500 mt-4">{/* 3. Preview state changes */}</div>
                                    <div className="text-soft-purple italic">await txb.simulate(&#123; provider &#125;);</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Key Features</h3>
                                <div className="space-y-4">
                                    {[
                                        'Native Programmable Transaction Block (PTB) support',
                                        'Real-time dependency and input validation',
                                        'Interactive gas estimation and rebalancing',
                                        'Detailed simulation with state-change diffs',
                                        'Cross-account transaction signing'
                                    ].map(f => (
                                        <div key={f} className="flex items-center gap-4">
                                            <div className="w-1.5 h-1.5 rounded-full bg-electric-violet" />
                                            <span className="text-sm font-bold text-slate-400">{f}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-8 rounded-[3rem] bg-emerald-500/5 border border-emerald-500/10 flex flex-col justify-center text-center space-y-4">
                                <Shield className="mx-auto text-emerald-400" size={32} />
                                <h4 className="font-bold text-emerald-400 uppercase tracking-widest text-xs">Security Verified</h4>
                                <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black leading-relaxed">
                                    Every PTB is audited locally before execution to prevent common mistakes like gas exhaustion or invalid receiver types.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'rpc-builder':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-20 pb-20">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white">RPC Builder.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                                Write JSON-RPC calls against any chain. Autocomplete on the methods, validation on the params, results in the panel below.
                            </p>
                        </div>

                        <div className="space-y-12">
                            <h2 className="text-3xl font-black text-white border-l-4 border-electric-violet pl-6 uppercase">It actually knows the chain</h2>
                            <p className="text-slate-500 text-sm leading-relaxed max-w-3xl">
                                The builder isn&apos;t just Postman with a different skin. When you point it at an endpoint, it crawls the available methods, parameter shapes, and docs — and feeds that back into autocomplete.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 space-y-6">
                                    <div className="w-12 h-12 rounded-2xl bg-electric-violet/10 flex items-center justify-center text-electric-violet"><Zap size={24} /></div>
                                    <h4 className="text-xl font-bold text-white">Smart Autocomplete</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed">
                                        Type any character and get instant suggestions for methods, object IDs, and even common transaction flags.
                                    </p>
                                </div>
                                <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 space-y-6">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 flex items-center justify-center text-emerald-400"><Cpu size={24} /></div>
                                    <h4 className="text-xl font-bold text-white">Execution Sandbox</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed">
                                        Run requests in a sandbox. See headers, timing, and the full payload — without leaving the panel.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Supported Methods</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {['get_objects', 'call_move', 'get_total_supply', 'get_events', 'get_checkpoint', 'dry_run_transaction', 'get_balance', 'multi_get_objects'].map(m => (
                                    <div key={m} className="p-4 rounded-xl bg-black border border-white/5 font-mono text-[10px] text-slate-500 hover:text-electric-violet transition-colors cursor-pointer">
                                        {m}()
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-12 rounded-[4rem] bg-near-black border border-white/5 space-y-8">
                            <h2 className="text-3xl font-black text-white text-center">Protocol Level Support</h2>
                            <div className="flex flex-wrap justify-center gap-6">
                                {['Sui', 'Solana', 'Aptos', 'EVM', 'Starknet', 'Cosmos'].map(p => (
                                    <div key={p} className="px-8 py-3 rounded-full bg-white/[0.03] border border-white/10 text-xs font-black uppercase tracking-widest text-slate-400 italic">
                                        {p} Ready
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                );
            case 'collections':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-20 pb-20">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white">Collections.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                                Organize your blockchain research into logical, persistent units.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 space-y-6">
                                <h4 className="text-xl font-bold text-white italic">Postman for Web3</h4>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    Replace messy bash histories with structured folders. Each collection stores method parameters, 
                                    expected results, and execution history.
                                </p>
                                <ul className="space-y-3">
                                    {['Nested Folders', 'Collection-level Variables', 'Batch Execution', 'Export to JSON'].map(item => (
                                        <li key={item} className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                            <div className="w-1.5 h-1.5 rounded-full bg-electric-violet" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 space-y-6">
                                <h4 className="text-xl font-bold text-white italic">Environments</h4>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    Define variables like <span className="text-electric-violet">PACKAGE_ID</span> and reuse them across requests 
                                    using the <span className="text-electric-violet">{"{{VAR}}"}</span> syntax.
                                </p>
                                <div className="p-5 rounded-2xl bg-black border border-white/5 font-mono text-[10px] text-slate-400">
                                    &quot;params&quot;: [&quot;{"{{SUI_COIN_ID}}"}&quot;]
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'ai-console':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-16 pb-20">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white uppercase italic">AI Console.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                                Intelligence integrated directly into your infrastructure workflow.
                            </p>
                        </div>

                        <div className="p-12 rounded-[4rem] bg-electric-violet/5 border border-electric-violet/10 space-y-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 opacity-10 text-electric-violet animate-pulse"><Sparkles size={200} /></div>
                            <div className="relative z-10 space-y-8">
                                <h3 className="text-2xl font-black text-white italic">Powered by Gemini</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="font-bold text-white text-sm">Natural Language Controls</div>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Ask &quot;What&apos;s the balance of this address?&quot; and txio will programmatically generate
                                            the correct RPC tab with pre-filled parameters.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="font-bold text-white text-sm">Error Auditing</div>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Paste a complex Move abort code, and the AI will analyze the contract source 
                                            to explain exactly why the transaction failed.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'security':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-20 pb-20">
                        <div className="space-y-6">
                            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-8"><Shield size={40} /></div>
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white uppercase leading-[0.85]">Zero-Trust <br />Security.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                                We treat security as a prerequisite, not a feature. Your keys and workspace data are protected by multiple layers of institutional-grade encryption.
                            </p>
                        </div>

                        <div className="space-y-12">
                            <h2 className="text-3xl font-black text-white border-l-4 border-emerald-400 pl-6 uppercase">Encryption Architecture</h2>
                            <div className="p-12 rounded-[3rem] bg-white/[0.02] border border-white/5 space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                            <Lock size={20} className="text-emerald-400" />
                                            AES-256-GCM at Rest
                                        </h3>
                                        <p className="text-slate-500 text-sm leading-relaxed">
                                            All local workspace files, including environment variables, historical requests, and custom collection 
                                            metadata, are encrypted using a unique master key derived from your hardware&apos;s secure element.
                                        </p>
                                    </div>
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                            <Globe size={20} className="text-sky-400" />
                                            E2EE Synchronization
                                        </h3>
                                        <p className="text-slate-500 text-sm leading-relaxed">
                                            When syncing your workspace across devices, data is encrypted locally before being transmitted 
                                            via TLS 1.3. txio labs never receives or stores your decryption keys.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <h2 className="text-3xl font-black text-white border-l-4 border-amber-400 pl-6 uppercase">Key Management</h2>
                            <div className="p-12 rounded-[3rem] bg-[#0c0c0e] border border-white/10 space-y-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-20 opacity-5 scale-150 text-amber-400"><Database size={240} /></div>
                                <div className="relative z-10 max-w-2xl space-y-6">
                                    <h3 className="text-2xl font-black text-white">Local-First Storage</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">
                                        Sensitive data like private keys or API secrets are NEVER stored in the cloud. They reside 
                                        strictly within your local environment&apos;s secure store, integrated with system-level keychains
                                        (macOS Keychain, Windows Credential Manager, Linux Secret Service).
                                    </p>
                                    <div className="flex gap-4">
                                        <div className="px-6 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest">Master Password Required</div>
                                        <div className="px-6 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">Biometric Support</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'api-reference':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-20 pb-20">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white uppercase italic">API Reference.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                                Programmatic access to the txio infrastructure layer.
                            </p>
                        </div>

                        <div className="space-y-12">
                            <h2 className="text-3xl font-black text-white border-l-4 border-electric-violet pl-6 uppercase">SDK Integration</h2>
                            <p className="text-slate-500 text-sm leading-relaxed max-w-3xl">
                                The txio SDK allows you to automate your engineering workflows, from continuous deployment 
                                to automated testing and monitoring. It provides a type-safe wrapper around our core engine.
                            </p>
                            
                            <div className="space-y-6">
                                <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 px-2">Installation</div>
                                <div className="p-6 rounded-2xl bg-black border border-white/5 font-mono text-sm text-slate-400">
                                    npm install @txio/sdk-core
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 px-2">Example: Executing a Terminal Command</div>
                                <div className="p-8 rounded-[2.5rem] bg-black border border-white/5 font-mono text-sm leading-loose">
                                    <div className="text-emerald-400 italic">import &#123; txio &#125; from &apos;@txio/sdk-core&apos;;</div>
                                    <div className="mt-4 text-slate-500">{/* Initialize client with your secure workspace key */}</div>
                                    <div className="text-white">const client = txio.init(&#123; apiKey: process.env.TXIO_KEY &#125;);</div>
                                    <div className="mt-4 text-slate-500">{/* Programmatically execute a deployment */}</div>
                                    <div className="text-white italic">const result = await client.terminal.execute(&#123;</div>
                                    <div className="text-white pl-6">command: <span className="text-amber-400">&apos;txio deploy --move ./package&apos;</span>,</div>
                                    <div className="text-white pl-6">network: <span className="text-amber-400">&apos;mainnet&apos;</span></div>
                                    <div className="text-white italic">&#125;);</div>
                                    <div className="mt-4 text-soft-purple italic">console.log(`Deployment Hash: $&#123;result.digest&#125;`);</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <h2 className="text-3xl font-black text-white border-l-4 border-sky-400 pl-6 uppercase">Endpoint Documentation</h2>
                            <div className="space-y-4">
                                {[
                                    { method: 'POST', path: '/api/v1/workspace/sync', desc: 'Trigger an immediate metadata synchronization.' },
                                    { method: 'GET', path: '/api/v1/metrics/latency', desc: 'Retrieve global latency metrics for active RPCs.' },
                                    { method: 'POST', path: '/api/v1/terminal/execute', desc: 'Start a terminal execution and return an execution identifier immediately.' },
                                    { method: 'GET', path: '/api/v1/terminal/executions/:execution_id', desc: 'Poll the current state, exit code, duration, and output for a terminal execution.' },
                                    { method: 'POST', path: '/api/v1/terminal/executions/:execution_id/cancel', desc: 'Cancel a running terminal execution on the backend.' }
                                ].map(api => (
                                    <div key={api.path} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.04] transition-all">
                                        <div className="flex items-center gap-4">
                                            <span className="px-3 py-1 rounded-lg bg-sky-400/10 text-sky-400 font-black text-[10px] uppercase tracking-widest">{api.method}</span>
                                            <span className="font-mono text-sm text-white">{api.path}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 italic">{api.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                );
            case 'networks':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-20 pb-20">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white">Networks.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                                Native support for every major decentralized protocol with deep, chain-specific introspection.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-12 rounded-[3.5rem] bg-sky-400/5 border border-sky-400/10 space-y-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-10 opacity-5 scale-150 text-sky-400"><Globe size={180} /></div>
                                <h3 className="text-3xl font-black text-white">Sui Integration</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    Deep object-centric support including ownership visualization, Kiosk inspection, and full 
                                    Move capability discovery. Our Sui engine is optimized for the latest version of Move.
                                </p>
                                <ul className="space-y-2">
                                    {['Object Inspector', 'Programmable Transaction Blocks', 'Move Module Decompilation', 'Kiosk Management'].map(i => (
                                        <li key={i} className="text-xs font-bold text-sky-400/80 flex items-center gap-2">
                                            <ChevronRight size={14} /> {i}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="p-12 rounded-[3.5rem] bg-emerald-400/5 border border-emerald-400/10 space-y-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-10 opacity-5 scale-150 text-emerald-400"><Cpu size={180} /></div>
                                <h3 className="text-3xl font-black text-white">Solana Integration</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    Watch accounts in real time, simulate transactions before they hit the network. PDAs and instruction decoding work out of the box.
                                </p>
                                <ul className="space-y-2">
                                    {['PDA Derivation', 'Instruction Inspection', 'Token Program support', 'Mainnet/Devnet failover'].map(i => (
                                        <li key={i} className="text-xs font-bold text-emerald-400/80 flex items-center gap-2">
                                            <ChevronRight size={14} /> {i}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-10">
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest text-center">Upcoming Protocols</h2>
                            <div className="flex flex-wrap justify-center gap-6">
                                {['Starknet L2', 'Aptos V2', 'Monad Devnet', 'Celestia Data Layer'].map(p => (
                                    <div key={p} className="px-8 py-4 rounded-3xl bg-white/[0.02] border border-white/5 text-xs font-black uppercase tracking-widest text-slate-600 hover:text-white transition-colors group">
                                        {p} <span className="ml-2 text-electric-violet opacity-50 group-hover:opacity-100 italic font-medium">Coming Q3</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                );
            case 'rpc-endpoints':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-20 pb-20">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white uppercase leading-[0.85]">RPC <br />Management.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                                High-availability node infrastructure with intelligent routing and automated failover.
                            </p>
                        </div>

                        <div className="p-12 rounded-[4rem] bg-white/[0.02] border border-white/5 space-y-12">
                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-white italic">Intelligent Node Routing</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    txio doesn&apos;t just connect to a single endpoint. Our router maintains a global map of node health,
                                    latency, and sync status. Every request you send is automatically routed to the healthiest, 
                                    lowest-latency endpoint available in our verified pool.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-2">Primary Network</div>
                                    <div className="flex items-center justify-between p-6 rounded-2xl bg-black border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                                            <span className="font-mono text-xs text-white">rpc.txio.network</span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">32ms</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-2">Backup Provider</div>
                                    <div className="flex items-center justify-between p-6 rounded-2xl bg-black border border-white/5 opacity-50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-2 h-2 rounded-full bg-slate-500" />
                                            <span className="font-mono text-xs text-white">node.mysten.io</span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Failover ready</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <h2 className="text-3xl font-black text-white border-l-4 border-amber-400 pl-6 uppercase text-center md:text-left">Detailed Capabilities</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { title: 'Global Load Balancing', desc: 'Automatic request distribution across 12+ geographic regions.' },
                                    { title: 'Rate-Limit Masking', desc: 'Distributed routing to prevent IP-based rate limiting from public providers.' },
                                    { title: 'Health Introspection', desc: 'Real-time monitoring of block height lag and sync status.' }
                                ].map(item => (
                                    <div key={item.title} className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4">
                                        <div className="font-bold text-white text-sm">{item.title}</div>
                                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                );
            case 'security-buffers':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-20 pb-20">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white uppercase leading-[0.85]">Security <br />Buffers.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                                Predictive safety layers that catch vulnerabilities before they reach the blockchain.
                            </p>
                        </div>

                        <div className="relative p-12 md:p-24 rounded-[5rem] bg-emerald-500/5 border border-emerald-500/10 overflow-hidden text-center md:text-left">
                            <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 text-emerald-500"><Shield size={320} /></div>
                            <div className="relative z-10 space-y-10">
                                <div className="space-y-6 max-w-2xl">
                                    <h2 className="text-3xl font-black text-emerald-400">Pre-flight Validation</h2>
                                    <p className="text-slate-500 text-sm leading-relaxed font-medium">
                                        Every request, transaction, and PTB hits the local Security Buffer first. It runs static analysis and predicts state changes so the risky stuff gets flagged before it goes anywhere.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                                    <div className="p-6 rounded-3xl bg-black/40 border border-white/5 space-y-4">
                                        <h4 className="font-bold text-white text-sm">Suspicious Call Detection</h4>
                                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">Identifies calls to known blacklisted addresses or suspicious Move modules in real-time.</p>
                                    </div>
                                    <div className="p-6 rounded-3xl bg-black/40 border border-white/5 space-y-4">
                                        <h4 className="font-bold text-white text-sm">Gas Exhaustion Protection</h4>
                                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">Warns if a transaction is likely to fail due to insufficient gas or abnormal budget settings.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <h2 className="text-3xl font-black text-white border-l-4 border-white pl-6 uppercase">Buffer Configuration</h2>
                            <p className="text-slate-500 text-sm leading-relaxed max-w-3xl">
                                Strictness is per-environment. Run loose in dev, lock it down in prod — the buffer will outright block anything that doesn&apos;t clear your safety threshold.
                            </p>
                            <div className="p-8 rounded-[2.5rem] bg-black border border-white/5 font-mono text-sm leading-loose">
                                <div className="text-slate-500"># txio security policy config</div>
                                <div className="text-white">buffer_strictness: <span className="text-amber-400">HIGH</span></div>
                                <div className="text-white">auto_block_suspicious: <span className="text-emerald-400">TRUE</span></div>
                                <div className="text-white">gas_limit_threshold: <span className="text-amber-400">1.5x_ESTIMATE</span></div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'cloud-sync':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-20 pb-20 text-center md:text-left">
                        <div className="space-y-6">
                            <div className="w-24 h-24 rounded-full bg-electric-violet/10 flex items-center justify-center text-electric-violet mx-auto md:mx-0 animate-pulse"><Layers size={48} /></div>
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white uppercase italic">Cloud Sync.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                                Your workspace, everywhere you log in. Encrypted before it leaves your machine — we can&apos;t read it, and that&apos;s the point.
                            </p>
                        </div>

                        <div className="space-y-16">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { title: 'Workspace sync', desc: 'Collections, requests, and metadata stay in sync between your laptop, CI, and any server you log in from.' },
                                    { title: 'Live collab', desc: 'Share a collection. Watch teammates edit it in real time. Like a doc, but for RPC calls.' },
                                    { title: 'Conflict handling', desc: 'When two people touch the same thing, the merge is smart enough to keep both — no lost work.' }
                                ].map(item => (
                                    <div key={item.title} className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 space-y-6 hover:bg-white/[0.04] transition-all">
                                        <div className="font-bold text-white uppercase tracking-widest text-xs">{item.title}</div>
                                        <p className="text-xs text-slate-500 leading-relaxed italic">{item.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="p-12 rounded-[4rem] bg-near-black border border-white/5 space-y-10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-20 opacity-5 scale-150 text-electric-violet rotate-12"><Globe size={280} /></div>
                                <div className="relative z-10 max-w-2xl space-y-6">
                                    <h2 className="text-3xl font-black text-white leading-tight">Zero-Knowledge <br /> Metadata Syncing</h2>
                                    <p className="text-slate-500 text-sm leading-relaxed font-medium">
                                        Sync runs on a zero-knowledge model. Your data is encrypted with your master key before it ever leaves your laptop. Our servers see encrypted blobs and nothing else. Only you (and the teammates you let in) can decrypt them.
                                    </p>
                                    <div className="flex gap-4">
                                        <div className="px-6 py-2 rounded-xl bg-electric-violet/10 border border-electric-violet/20 text-electric-violet text-[10px] font-black uppercase tracking-widest italic">Privacy First</div>
                                        <div className="px-6 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest italic">Quantum Resistant</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'deployment':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-16 pb-20">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white">Deployment.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-3xl">
                                Start on your laptop. Move to a shared server when the team needs it. Same binary, same config.
                            </p>
                        </div>

                        <div className="space-y-12">
                            <div className="p-12 rounded-[3.5rem] bg-white/[0.02] border border-white/5 space-y-8">
                                <h3 className="text-2xl font-black text-white italic">Docker Orchestration</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    txio is designed to be fully self-hosted. Our multi-container architecture ensures 
                                    data persistence and high availability.
                                </p>
                                <div className="p-8 rounded-[2rem] bg-black border border-white/5 font-mono text-xs text-slate-400 leading-loose">
                                    <span className="text-slate-600"># Start the full stack</span> <br />
                                    <span className="text-emerald-400">docker-compose</span> up -d <br /><br />
                                    <span className="text-slate-600"># Services initialized:</span> <br />
                                    - <span className="text-white">txio-db</span> (MongoDB 7.0) <br />
                                    - <span className="text-white">txio-api</span> (Rust Backend) <br />
                                    - <span className="text-white">txio-frontend</span> (Vite IDE)
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/5 space-y-4">
                                    <div className="w-10 h-10 rounded-xl bg-sky-400/10 flex items-center justify-center text-sky-400"><Globe size={20} /></div>
                                    <h4 className="font-bold text-white text-sm">GitHub Actions CI</h4>
                                    <p className="text-[11px] text-slate-600 leading-relaxed">
                                        Tests run on every PR. New chain adapters can&apos;t break the existing ones — the suite catches it before merge.
                                    </p>
                                </div>
                                <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/5 space-y-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400"><Cpu size={20} /></div>
                                    <h4 className="font-bold text-white text-sm">Vercel-ready</h4>
                                    <p className="text-[11px] text-slate-600 leading-relaxed">
                                        The frontend builds for edge deployment out of the box. Push, deploy, done.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'extending':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-16 pb-20">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white">Extending.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-3xl">
                                Need a chain we don&apos;t support? Add it. It&apos;s one file and a trait impl.
                            </p>
                        </div>

                        <div className="space-y-12">
                            <h2 className="text-2xl font-black text-white italic">Writing a chain adapter</h2>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Implement the <code className="text-electric-violet">ChainAdapter</code> trait, register it, you&apos;re done. The CLI, history, and IDE pick it up automatically — you don&apos;t have to touch any of them.
                            </p>
                            <div className="p-8 rounded-[2.5rem] bg-black border border-white/5 font-mono text-sm leading-relaxed">
                                <div className="text-white">pub trait <span className="text-emerald-400">ChainAdapter</span> &#123;</div>
                                <div className="pl-6 text-slate-500">{/* Call a JSON-RPC method */}</div>
                                <div className="pl-6 text-white italic">async fn call_rpc(&amp;self, method: &amp;str, params: Value) -&gt; Result&lt;Value&gt;;</div>
                                <div className="text-white">&#125;</div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'roadmap':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-16 pb-20">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white">Roadmap.</h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-3xl">
                                What&apos;s coming. No promises on the dates, but the work is real.
                            </p>
                        </div>

                        <div className="space-y-12">
                            {[
                                { quarter: 'Q3 2026', title: 'Mobile companion', desc: 'Watch your RPC logs and fire off simple transactions from your phone. Pager-style.' },
                                { quarter: 'Q4 2026', title: 'Team workspaces', desc: 'PTBs you can edit together, in real time. Shared state, shared cursors.' },
                                { quarter: 'Q1 2027', title: 'Source-level debugger', desc: 'Step through Move and Solidity right in the IDE. Breakpoints, watches, the whole thing.' }
                            ].map(item => (
                                <div key={item.quarter} className="flex gap-8 group">
                                    <div className="w-24 shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-electric-violet transition-colors">{item.quarter}</div>
                                    <div className="space-y-2 border-l border-white/10 pl-8 pb-12 group-last:pb-0">
                                        <div className="font-bold text-white">{item.title}</div>
                                        <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                );
            default:
                return (
                    <div className="h-full flex items-center justify-center text-slate-600 font-black uppercase tracking-[0.5em] italic">
                        Select a topic to begin documentation
                    </div>
                );
        }
    };

    return (
        <div className={`${embedded ? 'h-full' : 'min-h-screen'} font-sans selection:bg-electric-violet/30 overflow-hidden ${
            theme === 'dark' ? 'bg-[#050505] text-white' : 'bg-slate-50 text-slate-900'
        }`}>
            {/* Nav */}
            <nav className={`${embedded ? 'sticky top-0' : 'fixed top-0 left-0 right-0'} h-16 border-b z-50 px-6 flex items-center justify-between backdrop-blur-xl ${
                theme === 'dark' ? 'bg-black/50 border-white/5' : 'bg-white/50 border-slate-200'
            }`}>
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() =>
                            navigateTo(
                                'landing'
                            )
                        }
                        className={`flex items-center gap-2 text-sm font-bold transition-all group ${
                            theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Home</span>
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-white/10"></div>
                    <div className="flex items-center gap-2">
                        <img src={logo.src} alt="txio" className="h-6 w-auto" />
                        <span className="font-black tracking-tighter text-lg italic">docs</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative hidden md:block w-72 group">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-electric-violet transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search Documentation..." 
                            className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-electric-violet/40 focus:bg-white/[0.05] transition-all"
                        />
                    </div>
                    <button 
                        onClick={() =>
                            navigateTo(
                                'signup'
                            )
                        }
                        className="px-5 py-2 bg-electric-violet text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-soft-purple transition-all shadow-lg active:scale-95"
                    >
                        {embedded
                            ? 'New Request'
                            : 'Launch'}
                    </button>
                </div>
            </nav>

            <div className={`flex ${embedded ? 'h-[calc(100%-4rem)]' : 'pt-16 h-screen'}`}>
                {/* Sidebar */}
                <aside className={`w-72 flex flex-col border-r h-full overflow-hidden transition-all duration-300 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } ${
                    theme === 'dark' ? 'bg-[#0a0a0c] border-white/5' : 'bg-white border-slate-100'
                }`}>
                    <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                        {/* Getting Started */}
                        <div className="space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-2">Navigation</div>
                            <div className="space-y-1">
                                {navItems.map(item => (
                                    <button 
                                        key={item.id}
                                        onClick={() => setActivePage(item.id)}
                                        className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm font-bold transition-all group ${
                                            activePage === item.id 
                                            ? 'bg-electric-violet text-white shadow-xl shadow-electric-violet/20' 
                                            : 'text-slate-500 hover:bg-white/[0.03] hover:text-slate-300'
                                        }`}
                                    >
                                        <item.icon size={18} className={activePage === item.id ? 'text-white' : 'text-slate-600 group-hover:text-electric-violet'} />
                                        <span>{item.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Infrastructure */}
                        <div className="space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-2">Infrastructure</div>
                            <div className="space-y-1">
                                {infraItems.map(item => (
                                    <button 
                                        key={item.id}
                                        onClick={() => setActivePage(item.id)}
                                        className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                            activePage === item.id 
                                            ? 'bg-white/10 text-white' 
                                            : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                    >
                                        <span>{item.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/5 bg-black/20">
                        <div className="flex items-center gap-4 text-slate-600">
                            <Settings size={16} className="hover:text-white cursor-pointer transition-colors" />
                            <MessageSquare size={16} className="hover:text-white cursor-pointer transition-colors" />
                            <div className="h-4 w-px bg-white/10" />
                            <span className="text-[9px] font-black uppercase tracking-widest">v2.4.0</span>
                        </div>
                    </div>
                </aside>

                {/* Content Area */}
                <main ref={scrollRef} className="flex-1 overflow-y-auto bg-[#050505] relative custom-scrollbar">
                    {/* Ambient Glow */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-electric-violet/5 blur-[120px] pointer-events-none rounded-full" />
                    
                    <div className="max-w-4xl mx-auto py-24 px-8 md:px-16 lg:px-24 min-h-full flex flex-col">
                        <div className="flex-1">
                            {renderContent()}
                        </div>

                        {/* Footer */}
                        <footer className="mt-32 pt-12 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-700">
                            <span>© 2026 txio documentation</span>
                            <div className="flex gap-8">
                                <a href="#" className="hover:text-electric-violet transition-colors">GitHub</a>
                                <a href="#" className="hover:text-electric-violet transition-colors">Status</a>
                            </div>
                        </footer>
                    </div>
                </main>
            </div>
        </div>
    );
};
