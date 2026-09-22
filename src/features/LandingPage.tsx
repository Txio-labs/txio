import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Zap, Shield, Cpu, Globe, ArrowRight, Layers, Terminal, Code2, Menu, X
} from 'lucide-react';
import { Github, Twitter } from '@/components/icons/BrandIcons';
import { appStore, useAppStore } from '@/lib/store';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoDark from '@/assets/txio2.png';
import logoLight from '@/assets/txio3.png';

interface Chain {
    id: string;
    label: string;
    dot: string;
    cmd: string;
    out: string;
}

const CHAINS: Chain[] = [
    { id: 'sui', label: 'Sui', dot: '#6fbcf0', cmd: 'txio sui balance aliphatic.sui', out: '→ 128.4402 SUI' },
    { id: 'ethereum', label: 'Ethereum', dot: '#a5a8f7', cmd: 'txio --network testnet eth balance 0x1a2..9f', out: '→ 2.0031 ETH' },
    { id: 'solana', label: 'Solana', dot: '#14f195', cmd: 'txio --network devnet solana balance 8kd..a1', out: '→ 44.12 SOL' },
    { id: 'aptos', label: 'Aptos', dot: '#2ed3b7', cmd: 'txio aptos balance 0x9f3..2c', out: '→ 9.80 APT' },
    { id: 'soroban', label: 'Soroban', dot: '#f5d060', cmd: 'txio soroban balance GABC..XY7', out: '→ 500.0 XLM' },
];

function useCountUp(end: number, duration = 1400) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        let raf: number;
        const start = performance.now();
        const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            setValue(Math.floor(progress * end));
            if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [end, duration]);

    return value;
}

export const LandingPage: React.FC = () => {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const logo = isDark ? logoDark : logoLight;

    const [activeChainIdx, setActiveChainIdx] = useState(0);
    const [typedCmd, setTypedCmd] = useState('');
    const [cmdDone, setCmdDone] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const activeChain = CHAINS[activeChainIdx];
    const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Enable scrolling on the body for the landing page
        document.body.style.overflow = 'auto';
        document.body.style.overflowX = 'hidden';

        return () => {
            // Restore overflow hidden when leaving for the IDE
            document.body.style.overflow = 'hidden';
        };
    }, []);

    // Type out the active chain's demo command, character by character
    useEffect(() => {
        // Resetting here (not deriving from render) is intentional: the typed
        // text must restart from empty every time the active chain changes,
        // driven by this effect's own interval below.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTypedCmd('');
        setCmdDone(false);
        let i = 0;
        const cmd = activeChain.cmd;
        const typeIv = setInterval(() => {
            i += 1;
            setTypedCmd(cmd.slice(0, i));
            if (i >= cmd.length) {
                clearInterval(typeIv);
                setCmdDone(true);
            }
        }, 22);
        return () => clearInterval(typeIv);
    }, [activeChainIdx, activeChain.cmd]);

    // Auto-advance through chains; any manual selection restarts this timer
    useEffect(() => {
        cycleRef.current = setInterval(() => {
            setActiveChainIdx((prev) => (prev + 1) % CHAINS.length);
        }, 6000);
        return () => {
            if (cycleRef.current) clearInterval(cycleRef.current);
        };
    }, [activeChainIdx]);

    const requestsCount = useCountUp(1247000, 1400);
    const latencyCount = useCountUp(42, 1400);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: 'spring' as const, damping: 25, stiffness: 200 }
        }
    };

    const features = [
        { title: 'Every chain, one interface', desc: 'Hit any JSON-RPC chain from the same shape of command. No SDK roulette, no copy-pasting between five sets of docs.', icon: Globe, big: true },
        { title: 'Transactions, visualized', desc: 'Compose transactions and watch dependencies resolve before you sign. Simulate first, send second.', icon: Layers },
        { title: 'Secrets stay secret', desc: 'API keys and signing keys live in a vault — not your dotfiles, not your git history.', icon: Shield },
        { title: 'Real-time everything', desc: 'Sub-millisecond latency tracking, streamed live. Watch the network breathe.', icon: Zap },
        { title: 'AI that actually helps', desc: 'Plain-English error explanations and contract audits — the kind you wish Stack Overflow gave you.', icon: Cpu },
        { title: 'A terminal that talks back', desc: 'Web and shell, same workflow. Run a command, see the result in either place.', icon: Terminal },
    ];

    return (
        <div className={`min-h-screen font-sans selection:bg-electric-violet/30 overflow-x-hidden ${
            isDark ? 'bg-near-black text-white' : 'bg-slate-50 text-slate-900'
        }`}>
            {/* Navigation */}
            <nav className={`fixed top-0 left-0 right-0 h-20 border-b backdrop-blur-xl z-50 px-6 md:px-12 flex items-center justify-between ${
                isDark ? 'border-white/5 bg-near-black/50' : 'border-slate-200 bg-slate-50/70'
            }`}>
                <button
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-electric-violet/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <img src={logo.src} alt="txio" className="h-8 w-auto relative z-10 transition-transform group-hover:scale-110" />
                    </div>
                    <span className="text-xl font-bold tracking-tighter">txio</span>
                </button>

                <div className={`hidden md:flex items-center gap-8 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <button
                        onClick={() => appStore.setViewMode('features')}
                        className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}
                    >
                        Features
                    </button>
                    <button
                        onClick={() => appStore.setViewMode('integrations')}
                        className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}
                    >
                        Integrations
                    </button>
                    <button
                        onClick={() => appStore.setViewMode('infrastructure')}
                        className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}
                    >
                        Infrastructure
                    </button>
                    <button
                        onClick={() => appStore.setViewMode('partners')}
                        className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}
                    >
                        Partners
                    </button>
                    <button
                        onClick={() => appStore.setViewMode('ecosystem')}
                        className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}
                    >
                        Ecosystem
                    </button>
                    <button
                        onClick={() => appStore.setViewMode('docs')}
                        className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}
                    >
                        Docs
                    </button>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <ThemeToggle />
                    <button
                        onClick={() => appStore.setViewMode('signin')}
                        className={`hidden sm:inline text-sm font-bold transition-colors ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => appStore.setViewMode('signup')}
                        className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-electric-violet hover:text-white transition-all duration-300 active:scale-95 ${
                            isDark
                                ? 'bg-white text-near-black shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                                : 'bg-slate-900 text-white shadow-[0_4px_16px_rgba(15,23,42,0.15)]'
                        }`}
                    >
                        Get Started
                    </button>
                    <button
                        onClick={() => setMobileMenuOpen((v) => !v)}
                        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={mobileMenuOpen}
                        className={`md:hidden flex items-center justify-center w-10 h-10 rounded-xl border transition-colors ${
                            isDark ? 'border-white/10 text-slate-300 hover:text-white' : 'border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </nav>

            {/* Mobile Nav Drawer */}
            {mobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className={`fixed top-20 left-0 right-0 z-40 md:hidden border-b backdrop-blur-xl px-6 py-6 flex flex-col gap-1 text-sm font-medium ${
                        isDark ? 'border-white/5 bg-near-black/95 text-slate-300' : 'border-slate-200 bg-slate-50/95 text-slate-600'
                    }`}
                >
                    {(
                        [
                            { label: 'Features', mode: 'features' },
                            { label: 'Integrations', mode: 'integrations' },
                            { label: 'Infrastructure', mode: 'infrastructure' },
                            { label: 'Partners', mode: 'partners' },
                            { label: 'Ecosystem', mode: 'ecosystem' },
                            { label: 'Docs', mode: 'docs' },
                        ] as const
                    ).map((item) => (
                        <button
                            key={item.mode}
                            onClick={() => {
                                appStore.setViewMode(item.mode);
                                setMobileMenuOpen(false);
                            }}
                            className={`text-left py-3 border-b transition-colors ${
                                isDark ? 'border-white/5 hover:text-white' : 'border-slate-200/70 hover:text-slate-900'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                    <button
                        onClick={() => {
                            appStore.setViewMode('signin');
                            setMobileMenuOpen(false);
                        }}
                        className={`text-left py-3 font-bold transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}
                    >
                        Sign In
                    </button>
                </motion.div>
            )}

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
                    <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-electric-violet/10 blur-[150px] rounded-full"></div>
                    <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-electric-violet/5 blur-[120px] rounded-full animate-pulse"></div>
                </div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="text-center relative z-10"
                >
                    {/* Chain tabs — swap the live demo across every supported chain */}
                    <motion.div variants={itemVariants} className={`inline-flex flex-wrap justify-center gap-1.5 p-1.5 rounded-full border mb-10 backdrop-blur-md ${
                        isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                        {CHAINS.map((chain, i) => (
                            <button
                                key={chain.id}
                                onClick={() => setActiveChainIdx(i)}
                                className={`font-mono text-xs px-3.5 py-2 rounded-full flex items-center gap-2 transition-all duration-300 cursor-pointer ${
                                    i === activeChainIdx
                                        ? isDark
                                            ? 'bg-electric-violet/25 border border-electric-violet/40 text-white'
                                            : 'bg-violet-50 border border-violet-300 text-violet-700'
                                        : isDark
                                            ? 'border border-transparent text-slate-400 hover:text-white'
                                            : 'border border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: chain.dot }} />
                                {chain.label}
                            </button>
                        ))}
                    </motion.div>

                    <motion.h1
                        variants={itemVariants}
                        className="font-mono font-bold tracking-tight leading-[1.2] mb-8 text-4xl sm:text-5xl md:text-7xl min-h-[100px] md:min-h-[170px]"
                    >
                        <span className={`font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>$ txio ship --chain=</span>
                        <span className={isDark ? 'text-electric-violet' : 'text-violet-600'}>{activeChain.id}</span>
                        <span className={`inline-block w-2.5 md:w-3 h-9 md:h-14 align-middle ml-1 animate-pulse ${isDark ? 'bg-electric-violet' : 'bg-violet-600'}`} />
                    </motion.h1>

                    <motion.p variants={itemVariants} className={`text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Execute, debug, and trace smart contracts across every major chain — without keeping six tabs of docs open. One CLI, one dashboard, one workflow.
                    </motion.p>

                    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button
                            onClick={() => appStore.setViewMode('signup')}
                            className={`group relative px-10 py-5 rounded-2xl font-bold text-lg hover:bg-electric-violet hover:text-white transition-all duration-500 active:scale-95 ${
                                isDark
                                    ? 'bg-white text-near-black hover:shadow-[0_0_50px_rgba(163,163,163,0.4)]'
                                    : 'bg-slate-900 text-white hover:shadow-[0_0_50px_rgba(124,58,237,0.25)]'
                            }`}
                        >
                            <span className="flex items-center gap-3">
                                Start Building
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                        <button
                            onClick={() => window.open("https://github.com/Kingvic300/txio/", "_blank", "noopener,noreferrer")}
                            className={`px-10 py-5 border rounded-2xl font-bold text-lg transition-all flex items-center gap-3 group ${
                                isDark
                                    ? 'bg-near-black border-white/10 hover:border-white/20'
                                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                            }`}
                            >
                            <Github
                                size={20}
                                className={isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'}
                            />
                            View on GitHub
                        </button>
                    </motion.div>
                </motion.div>

                {/* Dashboard Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="mt-32 relative group"
                >
                    {/* Ambient Glow */}
                    <div
                        className="absolute -inset-20 rounded-full opacity-40 group-hover:opacity-70 blur-[120px] transition-opacity duration-700"
                        style={{ background: `radial-gradient(circle, ${activeChain.dot}55, transparent 70%)` }}
                    ></div>

                    {/* Follows site theme: this is page chrome mocking the IDE, not a fixed product screenshot */}
                    <div className={`relative border rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden sm:aspect-[16/9] ring-1 ${
                        isDark
                            ? 'bg-[#0a0a0a] border-white/5 ring-white/10 shadow-[0_0_80px_rgba(163,163,163,0.15)]'
                            : 'bg-white border-slate-200 ring-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.12)]'
                    }`}>
                        {/* Mock IDE UI */}
                        <div className="flex flex-col h-auto sm:h-full">
                            {/* Window Header */}
                            <div className={`h-12 border-b flex items-center px-4 sm:px-6 gap-4 shrink-0 ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                                    <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                                </div>
                                <div className="flex-1 flex justify-center">
                                    <span className={`font-mono text-[10px] sm:text-[11px] truncate ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>txio — {activeChain.label} session</span>
                                </div>
                                <div className="w-[52px] hidden sm:block" />
                            </div>

                            <div className="flex-1 flex flex-col sm:flex-row min-h-0">
                                {/* Sidebar */}
                                <div className={`sm:w-16 w-full border-b sm:border-b-0 sm:border-r flex flex-row sm:flex-col items-center justify-center sm:justify-start py-3 sm:py-6 gap-4 sm:gap-6 shrink-0 ${isDark ? 'border-white/5 bg-white/[0.01]' : 'border-slate-200 bg-slate-50/60'}`}>
                                    <div
                                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border transition-colors duration-500"
                                        style={{ backgroundColor: `${activeChain.dot}1a`, borderColor: `${activeChain.dot}40`, color: activeChain.dot }}
                                    >
                                        <Code2 size={18} />
                                    </div>
                                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center ${isDark ? 'bg-white/5 border-white/10 text-slate-600' : 'bg-white border-slate-200 text-slate-400'}`}>
                                        <Layers size={16} />
                                    </div>
                                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center ${isDark ? 'bg-white/5 border-white/10 text-slate-600' : 'bg-white border-slate-200 text-slate-400'}`}>
                                        <Globe size={16} />
                                    </div>
                                </div>

                                <div className="flex-1 p-4 sm:p-8 flex flex-col gap-4 sm:gap-6 min-h-0">
                                    {/* Omnibar */}
                                    <div className={`flex items-center gap-3 h-10 px-4 border rounded-xl shrink-0 ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                        <Terminal size={14} className={`shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                                        <span className={`font-mono text-xs truncate ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                            {activeChain.cmd}
                                        </span>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-3 gap-2 sm:gap-4 shrink-0">
                                        {[
                                            { label: 'Requests', value: '1.2M', color: '#4ade80' },
                                            { label: 'Latency', value: '42ms', color: '#facc15' },
                                            { label: 'Chains', value: '18', color: activeChain.dot },
                                        ].map((item, i) => (
                                            <div
                                                key={i}
                                                className={`rounded-xl sm:rounded-2xl border p-3 sm:p-5 flex flex-col justify-between transition-colors ${
                                                    isDark
                                                        ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                                                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className={`text-[8px] sm:text-[10px] font-semibold uppercase tracking-widest truncate ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                                        {item.label}
                                                    </span>
                                                    <div
                                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}` }}
                                                    />
                                                </div>
                                                <div className={`text-base sm:text-2xl font-bold tracking-tight mt-2 sm:mt-4 tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                    {item.value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Terminal Panel: follows site theme */}
                                    <div className={`flex-1 min-h-[140px] sm:min-h-0 rounded-xl sm:rounded-2xl border overflow-hidden flex flex-col ${
                                        isDark ? 'bg-[#050505] border-white/5' : 'bg-white border-slate-200'
                                    }`}>
                                        <div className={`flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 border-b shrink-0 ${
                                            isDark ? 'border-white/5 bg-white/[0.015]' : 'border-slate-200 bg-slate-50'
                                        }`}>
                                            <span className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                txio terminal
                                            </span>
                                            <div className="flex items-center gap-1.5 text-green-500 text-[10px] sm:text-[11px] font-mono">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                Connected
                                            </div>
                                        </div>
                                        <div className="p-4 sm:p-5 font-mono text-xs sm:text-sm space-y-2 sm:space-y-2.5 flex-1 overflow-hidden">
                                            <div className={`truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                <span style={{ color: activeChain.dot }}>$</span>{' '}
                                                <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{typedCmd}</span>
                                                <span style={{ color: activeChain.dot }}>{!cmdDone && '_'}</span>
                                            </div>
                                            {cmdDone && (
                                                <>
                                                    <div className="text-green-500">✓ Simulation successful</div>
                                                    <div style={{ color: activeChain.dot }} className="font-semibold">{activeChain.out}</div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Live Network Status */}
            <section className={`border-t border-b ${isDark ? 'border-white/5 bg-white/[0.015]' : 'border-slate-200 bg-white'}`}>
                <div className="max-w-7xl mx-auto py-20 px-6 md:px-12">
                    <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
                        <div className={`font-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)] animate-pulse" />
                            Live network status
                        </div>
                        <div className={`font-mono text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>updated moments ago</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className={`border rounded-2xl p-6 transition-colors ${isDark ? 'bg-white/[0.02] border-white/5 hover:border-white/10' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">Requests / 24h</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
                            </div>
                            <div className="font-mono text-3xl font-bold tabular-nums">{requestsCount.toLocaleString()}</div>
                            <div className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>across {CHAINS.length} chains</div>
                        </div>
                        <div className={`border rounded-2xl p-6 transition-colors ${isDark ? 'bg-white/[0.02] border-white/5 hover:border-white/10' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">P50 latency</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]" />
                            </div>
                            <div className="font-mono text-3xl font-bold tabular-nums">{latencyCount}<span className={`text-base ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>ms</span></div>
                            <div className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{activeChain.label} node running warm</div>
                        </div>
                        <div className={`border rounded-2xl p-6 transition-colors ${isDark ? 'bg-white/[0.02] border-white/5 hover:border-white/10' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">Chains connected</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
                            </div>
                            <div className="font-mono text-3xl font-bold tabular-nums">{CHAINS.length}<span className={isDark ? 'text-base text-slate-600' : 'text-base text-slate-400'}> / {CHAINS.length}</span></div>
                            <div className="text-xs mt-2 flex items-center gap-1.5">
                                {CHAINS.map((c, i) => (
                                    <span
                                        key={c.id}
                                        className="w-1.5 h-1.5 rounded-full transition-transform"
                                        style={{ backgroundColor: c.dot, transform: i === activeChainIdx ? 'scale(1.6)' : 'scale(1)' }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Terminal-style output block; follows the site theme (this is page chrome, not a fixed IDE screenshot) */}
                    <div className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-[#050505] border-white/5' : 'bg-white border-slate-200'}`}>
                        <div className={`flex items-center gap-1.5 px-4 py-3 border-b ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                            <span className={`ml-2 font-mono text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>txio · terminal</span>
                            <span className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-green-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Connected
                            </span>
                        </div>
                        <div className={`p-5 font-mono text-sm space-y-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            <div>
                                <span style={{ color: activeChain.dot }}>$</span>{' '}
                                <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{typedCmd}</span>
                                <span style={{ color: activeChain.dot }}>{!cmdDone && '_'}</span>
                            </div>
                            {cmdDone && (
                                <>
                                    <div className="text-green-500">✓ Simulation successful</div>
                                    <div style={{ color: activeChain.dot }} className="font-semibold">{activeChain.out}</div>
                                    <div className={isDark ? 'text-slate-600' : 'text-slate-400'}>Response received in {latencyCount}ms</div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-32 px-6 md:px-12 max-w-7xl mx-auto relative">
                <div className="text-center mb-24">
                    <h2 className={`text-sm font-bold uppercase tracking-[0.4em] mb-4 ${isDark ? 'text-electric-violet' : 'text-violet-600'}`}>Made for engineers</h2>
                    <h3 className="text-4xl md:text-5xl font-bold tracking-tight">What you actually need.</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] lg:grid-rows-2 gap-6">
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ y: -10 }}
                            className={`p-8 rounded-[2.5rem] border transition-all group ${
                                feature.big ? 'lg:row-span-2 flex flex-col justify-between' : ''
                            } ${
                                isDark
                                    ? 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10'
                                    : 'border-slate-200 bg-white hover:shadow-lg hover:border-slate-300'
                            }`}
                        >
                            <div>
                                <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-colors mb-6 group-hover:scale-110 transition-transform ${
                                    isDark
                                        ? 'bg-near-black border-white/5 text-slate-400 group-hover:text-electric-violet'
                                        : 'bg-slate-50 border-slate-200 text-slate-500 group-hover:text-violet-600'
                                }`}>
                                    <feature.icon size={28} />
                                </div>
                                <h4 className={`font-bold mb-4 ${feature.big ? 'text-2xl' : 'text-xl'}`}>{feature.title}</h4>
                                <p className={`leading-relaxed ${feature.big ? 'text-base' : 'text-sm'} ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{feature.desc}</p>
                            </div>
                            {feature.big && (
                                <div className="flex flex-wrap gap-2 mt-8">
                                    {CHAINS.map((chain) => (
                                        <span key={chain.id} className={`font-mono text-[11px] px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
                                            isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
                                        }`}>
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: chain.dot }} />
                                            {chain.id}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className={`border-t ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                <div className="pt-32 pb-12 px-6 md:px-12 max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-20">
                        <div className="max-w-xs">
                            <div className="flex items-center gap-3 mb-6">
                                <Code2 size={24} className={isDark ? 'text-electric-violet' : 'text-violet-600'} />
                                <span className="text-xl font-bold tracking-tighter">txio</span>
                            </div>
                            <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                Tools for the people building the chains.
                            </p>
                            <div className="flex items-center gap-1.5">
                                {CHAINS.map((chain) => (
                                    <span key={chain.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: chain.dot }} />
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
                            <div className="space-y-4">
                                <div className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Platform</div>
                                <ul className={`space-y-3 text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                    <li><button onClick={() => appStore.setViewMode('app')} className={`transition-colors cursor-pointer ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>Workspace</button></li>
                                    <li><button onClick={() => appStore.setViewMode('integrations')} className={`transition-colors cursor-pointer ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>Integrations</button></li>
                                    <li><button onClick={() => appStore.setViewMode('infrastructure')} className={`transition-colors cursor-pointer ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>Infrastructure</button></li>
                                    <li><button onClick={() => appStore.setViewMode('partners')} className={`transition-colors cursor-pointer ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>Partners</button></li>
                                    <li><button onClick={() => appStore.setViewMode('docs')} className={`transition-colors cursor-pointer ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>Documentation</button></li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <div className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Community</div>
                                <ul className={`space-y-3 text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                    <li><a href="#" className={`transition-colors flex items-center gap-2 ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}><Twitter size={14} /> Twitter</a></li>
                                    <li><a href="#" className={`transition-colors flex items-center gap-2 ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}><Github size={14} /> GitHub</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className={`flex flex-col md:flex-row justify-between items-center pt-12 border-t text-[10px] uppercase font-bold tracking-[0.4em] ${
                        isDark ? 'border-white/5 text-slate-700' : 'border-slate-200 text-slate-400'
                    }`}>
                        <span>© 2026 txio infrastructure</span>
                        <span className={`mt-4 md:mt-0 font-mono normal-case tracking-normal rounded px-2 py-1 ${
                            isDark ? 'text-green-400 bg-white/5 border border-white/10' : 'text-green-600 bg-green-50 border border-green-200'
                        }`}>v2.4.0 stable</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};
