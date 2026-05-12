import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Mail, Lock, User, ArrowRight, Github, Twitter, Code2, Sparkles, 
    ChevronRight, ShieldCheck, Zap, Globe, ArrowLeft
} from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import logoDark from '../assets/txio2.png';
import logoLight from '../assets/txio3.png';

export const AuthPage: React.FC = () => {
    const { theme } = useAppStore();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const logo = theme === 'dark' ? logoDark : logoLight;

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Mock authentication delay
        setTimeout(() => {
            appStore.setViewMode('otp');
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className={`min-h-screen flex selection:bg-electric-violet/30 ${
            theme === 'dark' ? 'bg-near-black text-white' : 'bg-slate-50 text-slate-900'
        }`}>
            {/* Left Side: Branding & Info */}
            <div className="hidden lg:flex flex-1 relative overflow-hidden bg-near-black border-r border-white/5">
                {/* Background Ambient Glows */}
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-electric-violet/20 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-soft-purple/10 blur-[100px] rounded-full"></div>
                
                <div className="relative z-10 w-full flex flex-col p-16 justify-between">
                    <div>
                        <div 
                            className="flex items-center gap-3 mb-12 cursor-pointer"
                            onClick={() => appStore.setViewMode('landing')}
                        >
                            <img src={logoDark} alt="txio" className="h-10 w-auto" />
                            <span className="text-2xl font-bold tracking-tighter text-white">txio</span>
                        </div>

                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-6 max-w-lg"
                        >
                            <h1 className="text-5xl font-bold tracking-tight leading-[1.1] text-white">
                                Build the next era of <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-violet to-soft-purple">Web3 Infrastructure.</span>
                            </h1>
                            <p className="text-lg text-slate-400 leading-relaxed">
                                Join thousands of elite engineers building, debugging, and scaling decentralized protocols with txio.
                            </p>
                        </motion.div>
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="grid grid-cols-2 gap-8"
                    >
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-electric-violet">
                                <Zap size={18} />
                                <span className="font-bold text-sm uppercase tracking-widest">Speed</span>
                            </div>
                            <p className="text-xs text-slate-500">Sub-millisecond network latency and optimized execution.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-soft-purple">
                                <ShieldCheck size={18} />
                                <span className="font-bold text-sm uppercase tracking-widest">Secure</span>
                            </div>
                            <p className="text-xs text-slate-500">Enterprise-grade encryption for all workspace secrets.</p>
                        </div>
                    </motion.div>
                </div>

                {/* Animated Grid lines */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
                    backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }}></div>
            </div>

            {/* Right Side: Auth Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 md:p-16 relative">
                <button 
                    onClick={() => appStore.setViewMode('landing')}
                    className={`absolute top-8 left-8 flex items-center gap-2 text-sm font-medium transition-colors ${
                        theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'
                    }`}
                >
                    <ArrowLeft size={16} />
                    Back
                </button>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`w-full max-w-md p-10 rounded-[2.5rem] border shadow-2xl ${
                        theme === 'dark' 
                        ? 'bg-white/[0.04] border-white/20' 
                        : 'bg-white border-slate-200'
                    }`}
                >
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-electric-violet/10 mb-6">
                            <Sparkles className="text-electric-violet" size={32} />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight mb-2">
                            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                        </h2>
                        <p className={`text-sm ${
                            theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                        }`}>
                            {mode === 'login' 
                                ? 'Sign in to access your workspace' 
                                : 'Get started with the most powerful Web3 IDE'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        {mode === 'signup' && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="John Doe"
                                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all ${
                                            theme === 'dark' 
                                            ? 'bg-near-black border-white/5 focus:border-electric-violet/50' 
                                            : 'bg-slate-50 border-slate-200 focus:border-electric-violet/30'
                                        }`}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="email" 
                                    required
                                    placeholder="name@company.com"
                                    className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all ${
                                        theme === 'dark' 
                                        ? 'bg-near-black border-white/5 focus:border-electric-violet/50' 
                                        : 'bg-slate-50 border-slate-200 focus:border-electric-violet/30'
                                    }`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Password</label>
                                {mode === 'login' && (
                                    <button type="button" className="text-[10px] font-bold text-electric-violet hover:text-soft-purple">Forgot?</button>
                                )}
                            </div>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="password" 
                                    required
                                    placeholder="••••••••"
                                    className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all ${
                                        theme === 'dark' 
                                        ? 'bg-near-black border-white/5 focus:border-electric-violet/50' 
                                        : 'bg-slate-50 border-slate-200 focus:border-electric-violet/30'
                                    }`}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-electric-violet text-white rounded-2xl font-bold text-lg hover:bg-soft-purple transition-all shadow-[0_0_20px_rgba(123,63,242,0.3)] flex items-center justify-center gap-2 group disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8">
                        <div className="relative flex items-center justify-center mb-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-white/5"></div>
                            </div>
                            <span className={`relative px-4 text-[10px] font-bold uppercase tracking-widest ${
                                theme === 'dark' ? 'bg-near-black text-slate-500' : 'bg-white text-slate-400'
                            }`}>Or continue with</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                                theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}>
                                <Github size={18} />
                                <span className="text-sm font-bold">GitHub</span>
                            </button>
                            <button className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                                theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}>
                                <Twitter size={18} className="text-sky-400" />
                                <span className="text-sm font-bold">Twitter</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-10 text-center">
                        <button 
                            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                            className={`text-sm font-medium ${
                                theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            {mode === 'login' 
                                ? "Don't have an account? Sign up" 
                                : "Already have an account? Sign in"}
                        </button>
                    </div>
                </motion.div>

                <footer className={`mt-12 text-[10px] font-bold uppercase tracking-[0.4em] ${
                    theme === 'dark' ? 'text-slate-700' : 'text-slate-400'
                }`}>
                    Secure & Encrypted Workspace
                </footer>
            </div>
        </div>
    );
};
