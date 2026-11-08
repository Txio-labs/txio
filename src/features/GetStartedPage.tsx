import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useRouter } from 'next/navigation';
import {
    Mail, Lock, User, ArrowRight, ArrowLeft, Rocket, Globe, Zap
} from 'lucide-react';
import { Github, XLogo } from '@/components/icons/BrandIcons';
import { useOAuthProviders } from '@/lib/useOAuthProviders';
import { appStore, useAppStore } from '@/lib/store';
import { API_BASE, apiService } from '@/services/api';
import logoDark from '../assets/txio2.png';

export const GetStartedPage: React.FC = () => {
    const { theme } = useAppStore();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<string | null>(null);
    const oauthProviders = useOAuthProviders();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await apiService.requestOtp(formData.email);
            appStore.setPendingSignup({
                name: formData.name,
                email: formData.email,
                password: formData.password
            });
            router.push('/otp');
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : "Signup didn't go through. Try again?";
            appStore.showToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = (provider: string) => {
        const path = provider === 'Google' ? 'google' : provider === 'GitHub' ? 'github' : provider === 'X' ? 'x' : null;
        if (!path || !oauthProviders[path]) {
            appStore.showToast(
                path
                    ? `${provider} sign-in is not available right now`
                    : `${provider} sign-in is not available yet`,
                'info'
            );
            return;
        }

        setSocialLoading(provider);
        window.location.href = `${API_BASE}/auth/${path}/login`;
    };

    return (
        <AuthLayout
            onBack={() => {
                appStore.setViewMode('landing');
                router.push('/');
            }}
            panelTitle={<>One signup.<br /><span className="text-fg-subtle">Every chain.</span></>}
            panelBody="A few fields away from a working multi-chain workspace. No card, no upgrade pitch."
            points={['Sui, Ethereum and EVM, Solana, Aptos and Stellar', 'Simulate every transaction before you sign', 'Invite your team when you are ready']}
        >
                    <div className="mb-8">
                        <h2 className="text-3xl font-semibold tracking-tight mb-2">Let&apos;s get you set up</h2>
                        <p className="text-sm text-fg-subtle">Takes about thirty seconds.</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-semibold text-fg-subtle ml-1">Full Name</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
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
                                    className={`w-full pl-11 pr-4 py-3.5 rounded-card border outline-none transition-all ${
                                        theme === 'dark' ? 'bg-canvas border-line focus:border-line-strong' : 'bg-sunken border-line'
                                    }`}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[12px] font-semibold text-fg-subtle ml-1">Email</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
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
                                    className={`w-full pl-11 pr-4 py-3.5 rounded-card border outline-none transition-all ${
                                        theme === 'dark' ? 'bg-canvas border-line focus:border-line-strong' : 'bg-sunken border-line'
                                    }`}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[12px] font-semibold text-fg-subtle ml-1">Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
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
                                    className={`w-full pl-11 pr-4 py-3.5 rounded-card border outline-none transition-all ${
                                        theme === 'dark' ? 'bg-canvas border-line focus:border-line-strong' : 'bg-sunken border-line'
                                    }`}
                                />
                            </div>
                        </div>

                        <button 
                            disabled={isLoading}
                            className="w-full mt-4 h-11 bg-inverse text-on-inverse rounded-[10px] font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 group shadow-card"
                        >
                            {isLoading ? <div className="w-6 h-6 border-2 border-current/30 border-t-current rounded-full animate-spin"></div> : <>Create Account <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/></>}
                        </button>
                    </form>

                    <div className="mt-8 space-y-3">
                        <div className="relative flex items-center justify-center mb-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-line"></div></div>
                            <span className={`relative px-4 text-[12px] font-semibold ${theme === 'dark' ? 'bg-surface text-fg-muted' : 'bg-surface text-fg-subtle'}`}>Or continue with</span>
                        </div>
                        <button 
                            type="button"
                            disabled={socialLoading !== null}
                            onClick={() => handleSocialLogin('Google')}
                            className={`w-full flex items-center justify-center gap-3 h-10 rounded-[10px] border transition-all ${theme === 'dark' ? 'border-line bg-hover hover:bg-active disabled:opacity-50' : 'border-line bg-surface hover:bg-hover disabled:opacity-50'}`}>
                            {socialLoading === 'Google' ? <div className="w-5 h-5 border-2 border-line-strong border-t-fg rounded-full animate-spin"></div> : (
                            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            )}
                            <span className="text-sm font-semibold">{socialLoading === 'Google' ? 'Connecting...' : 'Continue with Google'}</span>
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                type="button"
                                disabled={socialLoading !== null}
                                onClick={() => handleSocialLogin('GitHub')}
                                className={`flex items-center justify-center gap-2 h-10 rounded-[10px] border transition-all ${theme === 'dark' ? 'border-line bg-hover hover:bg-active disabled:opacity-50' : 'border-line bg-surface hover:bg-hover disabled:opacity-50'}`}>
                                {socialLoading === 'GitHub' ? <div className="w-4 h-4 border-2 border-line-strong border-t-fg rounded-full animate-spin"></div> : <Github size={16} />}
                                <span className="text-[14px] font-medium">GitHub</span>
                            </button>
                            <button 
                                type="button"
                                disabled={socialLoading !== null}
                                onClick={() => handleSocialLogin('X')}
                                className={`flex items-center justify-center gap-2 h-10 rounded-[10px] border transition-all ${theme === 'dark' ? 'border-line bg-hover hover:bg-active disabled:opacity-50' : 'border-line bg-surface hover:bg-hover disabled:opacity-50'}`}>
                                {socialLoading === 'X' ? <div className="w-4 h-4 border-2 border-line-strong border-t-fg rounded-full animate-spin"></div> : <XLogo size={16} className="text-fg-muted" />}
                                <span className="text-[14px] font-medium">X</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => {
                                appStore.setViewMode('signin');
                                router.push('/signin');
                            }}
                            className="text-sm font-medium text-fg-subtle hover:text-fg transition-colors"
                        >
                            Already have an account? <span className="text-fg font-semibold">Sign In</span>
                        </button>
                    </div>
        </AuthLayout>
    );
};
