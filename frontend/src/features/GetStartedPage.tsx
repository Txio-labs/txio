import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Mail, Lock, User, ArrowRight, Github, Twitter, Sparkles, ArrowLeft, Rocket, Globe, Zap
} from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import logoDark from '../assets/txio2.png';

export const GetStartedPage: React.FC = () => {
    const { theme } = useAppStore();
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            appStore.setViewMode('otp');
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className={`min-h-screen flex selection:bg-electric-violet/30 ${
            theme === 'dark' ? 'bg-near-black text-white' : 'bg-slate-50 text-slate-900'
        }`}>
            {/* Left Wing */}
            <div className="hidden lg:flex flex-1 relative bg-near-black border-r border-white/5 p-16 flex-col justify-between overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-30" style={{ 
                    backgroundImage: 'linear-gradient(rgba(123, 63, 242, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(123, 63, 242, 0.05) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }}></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-electric-violet/10 blur-[120px] rounded-full"></div>
                
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
                            The standard for <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-violet to-soft-purple">Protocol Engineering.</span>
                        </h1>
                        <p className="text-lg text-slate-400 max-w-md leading-relaxed">
                            Join the elite circle of infrastructure builders. Scale your chain with txio's advanced toolkit.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 grid grid-cols-3 gap-8">
                    <div className="space-y-2 text-center">
                        <div className="w-10 h-10 mx-auto rounded-xl bg-white/5 flex items-center justify-center text-electric-violet"><Rocket size={20}/></div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Deploy</div>
                    </div>
                    <div className="space-y-2 text-center">
                        <div className="w-10 h-10 mx-auto rounded-xl bg-white/5 flex items-center justify-center text-soft-purple"><Globe size={20}/></div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Connect</div>
                    </div>
                    <div className="space-y-2 text-center">
                        <div className="w-10 h-10 mx-auto rounded-xl bg-white/5 flex items-center justify-center text-amber-400"><Zap size={20}/></div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Scale</div>
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
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`w-full max-w-md p-10 rounded-[2.5rem] border shadow-2xl ${
                        theme === 'dark' ? 'bg-white/[0.04] border-white/20' : 'bg-white border-slate-200'
                    }`}
                >
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-electric-violet/10 mb-6">
                            <Sparkles className="text-electric-violet" size={32} />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight mb-2">Get Started</h2>
                        <p className="text-sm text-slate-500">Create your txio account to begin building.</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                            <div className="relative">
                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input 
                                    type="text" 
                                    required
                                    placeholder="John Doe"
                                    className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border outline-none transition-all ${
                                        theme === 'dark' ? 'bg-near-black border-white/5 focus:border-electric-violet/50' : 'bg-slate-50 border-slate-200'
                                    }`}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input 
                                    type="email" 
                                    required
                                    placeholder="name@company.com"
                                    className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border outline-none transition-all ${
                                        theme === 'dark' ? 'bg-near-black border-white/5 focus:border-electric-violet/50' : 'bg-slate-50 border-slate-200'
                                    }`}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input 
                                    type="password" 
                                    required
                                    placeholder="••••••••"
                                    className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border outline-none transition-all ${
                                        theme === 'dark' ? 'bg-near-black border-white/5 focus:border-electric-violet/50' : 'bg-slate-50 border-slate-200'
                                    }`}
                                />
                            </div>
                        </div>

                        <button 
                            disabled={isLoading}
                            className="w-full mt-4 py-4 bg-electric-violet text-white rounded-2xl font-bold text-lg hover:bg-soft-purple transition-all flex items-center justify-center gap-2 group shadow-xl"
                        >
                            {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Create Account <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/></>}
                        </button>
                    </form>

                    <div className="mt-8">
                        <div className="grid grid-cols-2 gap-4">
                            <button className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all font-medium text-xs"><Github size={16} /> GitHub</button>
                            <button className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all font-medium text-xs"><Twitter size={16} className="text-sky-400" /> Twitter</button>
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <button onClick={() => appStore.setViewMode('signin')} className="text-sm font-medium text-slate-500 hover:text-white transition-colors">
                            Already have an account? <span className="text-electric-violet font-bold">Sign In</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
