import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
    Mail, Lock, User, ArrowRight, Github, Twitter, Sparkles, ArrowLeft, Rocket, Globe, Zap
} from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { API_BASE } from '@/services/api';
import logoDark from '../assets/txio2.png';

export const GetStartedPage: React.FC = () => {
    const { theme } = useAppStore();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await appStore.signup(
                formData.name,
                formData.email,
                formData.password
            );
            router.replace('/workspace');
        } catch (error) {
            console.error(error);
            appStore.showToast(
                "Signup didn't go through. Try again?",
                'error'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = (provider: string) => {
        setSocialLoading(provider);
        appStore.showToast(`Connecting to ${provider}...`, 'info');
        
        if (provider === 'Google') {
            window.location.href = `${API_BASE}/auth/google/login`;
        } else {
            setTimeout(() => {
                appStore.showToast(
                    `${provider} login is not connected yet`,
                    'info'
                );
                setSocialLoading(null);
            }, 2000);
        }
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
                        onClick={() => {
                            appStore.setViewMode('landing');
                            router.push('/');
                        }}
                    >
                        <img src={logoDark.src} alt="txio" className="h-10 w-auto" />
                        <span className="text-2xl font-bold tracking-tighter text-white">txio</span>
                    </div>

                    <div className="space-y-6">
                        <h1 className="text-6xl font-bold tracking-tight text-white leading-[1.1]">
                            One signup. <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-violet to-soft-purple">Every chain.</span>
                        </h1>
                        <p className="text-lg text-slate-400 max-w-md leading-relaxed">
                            You&apos;re a few fields away from a working multi-chain workspace. No card, no upgrade pitch.
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
                    onClick={() => {
                        appStore.setViewMode('landing');
                        router.push('/');
                    }}
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
                        <h2 className="text-3xl font-bold tracking-tight mb-2">Let&apos;s get you set up</h2>
                        <p className="text-sm text-slate-500">Takes about thirty seconds.</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                            <div className="relative">
                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input 
                                    type="text" 
                                    required
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData((current) => ({
                                            ...current,
                                            name: e.target.value
                                        }))
                                    }
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
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData((current) => ({
                                            ...current,
                                            email: e.target.value
                                        }))
                                    }
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
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData((current) => ({
                                            ...current,
                                            password: e.target.value
                                        }))
                                    }
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

                    <div className="mt-8 space-y-3">
                        <div className="relative flex items-center justify-center mb-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-white/5"></div></div>
                            <span className={`relative px-4 text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'bg-[#0a0a0a] text-slate-600' : 'bg-white text-slate-400'}`}>Or continue with</span>
                        </div>
                        <button 
                            type="button"
                            disabled={socialLoading !== null}
                            onClick={() => handleSocialLogin('Google')}
                            className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl border transition-all ${theme === 'dark' ? 'border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50' : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm disabled:opacity-50'}`}>
                            {socialLoading === 'Google' ? <div className="w-5 h-5 border-2 border-slate-500 border-t-electric-violet rounded-full animate-spin"></div> : (
                            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            )}
                            <span className="text-sm font-bold">{socialLoading === 'Google' ? 'Connecting...' : 'Continue with Google'}</span>
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                type="button"
                                disabled={socialLoading !== null}
                                onClick={() => handleSocialLogin('GitHub')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${theme === 'dark' ? 'border-white/5 bg-white/5 hover:bg-white/10 disabled:opacity-50' : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm disabled:opacity-50'}`}>
                                {socialLoading === 'GitHub' ? <div className="w-4 h-4 border-2 border-slate-500 border-t-electric-violet rounded-full animate-spin"></div> : <Github size={16} />}
                                <span className="text-sm font-bold">GitHub</span>
                            </button>
                            <button 
                                type="button"
                                disabled={socialLoading !== null}
                                onClick={() => handleSocialLogin('Twitter')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${theme === 'dark' ? 'border-white/5 bg-white/5 hover:bg-white/10 disabled:opacity-50' : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm disabled:opacity-50'}`}>
                                {socialLoading === 'Twitter' ? <div className="w-4 h-4 border-2 border-slate-500 border-t-electric-violet rounded-full animate-spin"></div> : <Twitter size={16} className="text-sky-400" />}
                                <span className="text-sm font-bold">Twitter</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => {
                                appStore.setViewMode('signin');
                                router.push('/signin');
                            }}
                            className="text-sm font-medium text-slate-500 hover:text-white transition-colors"
                        >
                            Already have an account? <span className="text-electric-violet font-bold">Sign In</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
