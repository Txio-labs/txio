import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Mail, Lock, ArrowRight, Github, Twitter, Sparkles, ArrowLeft, ShieldCheck, Zap
} from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import logoDark from '../assets/txio2.png';

export const SignInPage: React.FC = () => {
    const { theme } = useAppStore();
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            appStore.setViewMode('app');
            setIsLoading(false);
        }, 1200);
    };

    return (
        <div className={`min-h-screen flex selection:bg-electric-violet/30 ${
            theme === 'dark' ? 'bg-near-black text-white' : 'bg-slate-50 text-slate-900'
        }`}>
            {/* Left Wing */}
            <div className="hidden lg:flex flex-1 relative bg-near-black border-r border-white/5 p-16 flex-col justify-between overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ 
                    backgroundImage: 'radial-gradient(circle at 2px 2px, #7b3ff2 1px, transparent 0)',
                    backgroundSize: '30px 30px'
                }}></div>
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-electric-violet/10 blur-[150px] rounded-full"></div>
                
                <div className="relative z-10">
                    <div 
                        className="flex items-center gap-3 mb-16 cursor-pointer"
                        onClick={() => appStore.setViewMode('landing')}
                    >
                        <img src={logoDark} alt="txio" className="h-10 w-auto" />
                        <span className="text-2xl font-bold tracking-tighter text-white">txio</span>
                    </div>

                    <div className="space-y-6">
                        <h1 className="text-6xl font-bold tracking-tight text-white leading-[1.1]">
                            Welcome back to the <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-violet to-soft-purple">Future of Dev.</span>
                        </h1>
                        <p className="text-lg text-slate-400 max-w-md leading-relaxed">
                            Sign in to continue building your infrastructure on the most advanced Web3 IDE.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 flex gap-12">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-electric-violet">
                            <ShieldCheck size={18} />
                            <span className="font-bold text-xs uppercase tracking-widest">Secure</span>
                        </div>
                        <div className="text-[10px] text-slate-500">AES-256 Workspace Encryption</div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-soft-purple">
                            <Zap size={18} />
                            <span className="font-bold text-xs uppercase tracking-widest">Fast</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Real-time RPC Monitoring</div>
                    </div>
                </div>
            </div>

            {/* Right Wing */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 md:p-16 relative">
                <button 
                    onClick={() => appStore.setViewMode('landing')}
                    className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`w-full max-w-md p-10 rounded-[2.5rem] border shadow-2xl ${
                        theme === 'dark' ? 'bg-white/[0.04] border-white/20' : 'bg-white border-slate-200'
                    }`}
                >
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-electric-violet/10 mb-6">
                            <Lock className="text-electric-violet" size={32} />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight mb-2">Sign In</h2>
                        <p className="text-sm text-slate-500">Enter your credentials to access your workspace.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Email</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="email" 
                                    required
                                    placeholder="name@company.com"
                                    className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all ${
                                        theme === 'dark' ? 'bg-near-black border-white/5 focus:border-electric-violet/50' : 'bg-slate-50 border-slate-200'
                                    }`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Password</label>
                                <button type="button" className="text-[10px] font-bold text-electric-violet">Forgot?</button>
                            </div>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="password" 
                                    required
                                    placeholder="••••••••"
                                    className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all ${
                                        theme === 'dark' ? 'bg-near-black border-white/5 focus:border-electric-violet/50' : 'bg-slate-50 border-slate-200'
                                    }`}
                                />
                            </div>
                        </div>

                        <button 
                            disabled={isLoading}
                            className="w-full py-4 bg-electric-violet text-white rounded-2xl font-bold text-lg hover:bg-soft-purple transition-all flex items-center justify-center gap-2 group shadow-xl"
                        >
                            {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Sign In <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/></>}
                        </button>
                    </form>

                    <div className="mt-8">
                        <div className="relative flex items-center justify-center mb-8">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-white/5"></div></div>
                            <span className={`relative px-4 text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'bg-[#0a0a0a] text-slate-600' : 'bg-white text-slate-400'}`}>Or continue with</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all"><Github size={18} /> <span className="text-sm font-bold">GitHub</span></button>
                            <button className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all"><Twitter size={18} className="text-sky-400" /> <span className="text-sm font-bold">Twitter</span></button>
                        </div>
                    </div>

                    <div className="mt-10 text-center">
                        <button onClick={() => appStore.setViewMode('signup')} className="text-sm font-medium text-slate-500 hover:text-white transition-colors">
                            Don't have an account? <span className="text-electric-violet font-bold">Get Started</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
