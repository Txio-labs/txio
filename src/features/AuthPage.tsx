import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, Lock, User, ArrowRight, Code2, Sparkles,
    ChevronRight, ShieldCheck, Zap, Globe, ArrowLeft
} from 'lucide-react';
import { Github, Twitter } from '@/components/icons/BrandIcons';
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
        <div className={`min-h-screen flex selection:bg-active ${
            theme === 'dark' ? 'bg-canvas text-fg' : 'bg-canvas text-fg'
        }`}>
            {/* Left Side: Branding & Info */}
            <div className="hidden lg:flex flex-1 relative overflow-hidden bg-canvas border-r border-line">
                {/* Background Ambient Glows */}
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-active blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-soft-purple/10 blur-[100px] rounded-full"></div>
                
                <div className="relative z-10 w-full flex flex-col p-16 justify-between">
                    <div>
                        <button 
                            className="flex items-center gap-3 mb-12 cursor-pointer"
                            onClick={() => appStore.setViewMode('landing')}
                        >
                            <img src={logoDark.src} alt="txio" className="h-10 w-auto" />
                            <span className="text-2xl font-semibold tracking-tighter text-white">txio</span>
                        </button>

                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-6 max-w-lg"
                        >
                            <h1 className="text-5xl font-semibold tracking-tight leading-[1.1] text-white">
                                One workspace. <br />
                                <span className="text-fg">Every chain.</span>
                            </h1>
                            <p className="text-sm text-fg-subtle leading-relaxed">
                                Thousands of devs already build, debug, and ship on txio. You&apos;re a signup away from joining them.
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
                            <div className="flex items-center gap-2 text-fg">
                                <Zap size={18} />
                                <span className="font-semibold text-sm">Speed</span>
                            </div>
                            <p className="text-xs text-fg-subtle">Sub-millisecond latency. Connections stay warm.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-soft-purple">
                                <ShieldCheck size={18} />
                                <span className="font-semibold text-sm">Secure</span>
                            </div>
                            <p className="text-xs text-fg-subtle">Secrets encrypted before they leave your machine.</p>
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
                        theme === 'dark' ? 'text-fg-subtle hover:text-fg' : 'text-fg-subtle hover:text-fg'
                    }`}
                >
                    <ArrowLeft size={16} />
                    Back
                </button>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`w-full max-w-md p-10 rounded-[2.5rem] border shadow-pop ${
                        theme === 'dark' 
                        ? 'bg-hover border-line-strong' 
                        : 'bg-surface border-line'
                    }`}
                >
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-panel bg-hover mb-6">
                            <Sparkles className="text-fg" size={32} />
                        </div>
                        <h2 className="text-3xl font-semibold tracking-tight mb-2">
                            {mode === 'login' ? 'Welcome back' : 'Create your account'}
                        </h2>
                        <p className={`text-sm ${
                            theme === 'dark' ? 'text-fg-subtle' : 'text-fg-subtle'
                        }`}>
                            {mode === 'login'
                                ? 'Sign in and pick up where you left off.'
                                : 'Takes about thirty seconds. Email is all we need.'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        {mode === 'signup' && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-fg-muted">Full Name</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
                                    <input 
                                        type="text" 
                                        placeholder="John Doe"
                                        className={`w-full pl-12 pr-4 py-4 rounded-card border outline-none transition-all ${
                                            theme === 'dark' 
                                            ? 'bg-canvas border-line focus:border-line-strong' 
                                            : 'bg-sunken border-line focus:border-line-strong'
                                        }`}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-fg-muted">Email Address</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
                                <input 
                                    type="email" 
                                    required
                                    placeholder="name@company.com"
                                    className={`w-full pl-12 pr-4 py-4 rounded-card border outline-none transition-all ${
                                        theme === 'dark' 
                                        ? 'bg-canvas border-line focus:border-line-strong' 
                                        : 'bg-sunken border-line focus:border-line-strong'
                                    }`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-xs font-medium text-fg-muted">Password</label>
                                {mode === 'login' && (
                                    <button type="button" className="text-[12px] font-semibold text-fg hover:text-soft-purple">Forgot?</button>
                                )}
                            </div>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
                                <input 
                                    type="password" 
                                    required
                                    placeholder="••••••••"
                                    className={`w-full pl-12 pr-4 py-4 rounded-card border outline-none transition-all ${
                                        theme === 'dark' 
                                        ? 'bg-canvas border-line focus:border-line-strong' 
                                        : 'bg-sunken border-line focus:border-line-strong'
                                    }`}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-11 bg-inverse text-on-inverse rounded-[10px] font-semibold text-sm hover:bg-soft-purple transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8">
                        <div className="relative flex items-center justify-center mb-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-line"></div>
                            </div>
                            <span className={`relative px-4 text-[12px] font-semibold ${
                                theme === 'dark' ? 'bg-canvas text-fg-subtle' : 'bg-surface text-fg-subtle'
                            }`}>Or continue with</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button className={`flex items-center justify-center gap-2 h-10 rounded-[10px] border transition-all ${
                                theme === 'dark' ? 'bg-hover border-line hover:bg-active' : 'bg-sunken border-line hover:bg-hover'
                            }`}>
                                <Github size={18} />
                                <span className="text-[14px] font-medium">GitHub</span>
                            </button>
                            <button className={`flex items-center justify-center gap-2 h-10 rounded-[10px] border transition-all ${
                                theme === 'dark' ? 'bg-hover border-line hover:bg-active' : 'bg-sunken border-line hover:bg-hover'
                            }`}>
                                <Twitter size={18} className="text-fg-muted" />
                                <span className="text-sm font-semibold">Twitter</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-10 text-center">
                        <button 
                            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                            className={`text-sm font-medium ${
                                theme === 'dark' ? 'text-fg-subtle hover:text-fg' : 'text-fg-subtle hover:text-fg'
                            }`}
                        >
                            {mode === 'login' 
                                ? "Don't have an account? Sign up" 
                                : "Already have an account? Sign in"}
                        </button>
                    </div>
                </motion.div>

                <footer className={`mt-12 text-[12px] font-semibold ${
                    theme === 'dark' ? 'text-fg-muted' : 'text-fg-subtle'
                }`}>
                    Secure & Encrypted Workspace
                </footer>
            </div>
        </div>
    );
};
