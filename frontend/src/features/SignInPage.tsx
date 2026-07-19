import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Mail,
    Lock,
    ArrowRight,
    Github,
    Twitter,
    ArrowLeft,
    ShieldCheck,
    Zap
} from 'lucide-react';

import { appStore, useAppStore } from '@/lib/store';
import { API_BASE, apiService } from '@/services/api';
import logoDark from '../assets/txio2.png';

export const SignInPage: React.FC = () => {
    const { theme } = useAppStore();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<string | null>(null);
    const [authChecking, setAuthChecking] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // Read token from Google callback URL
                const params = new URLSearchParams(window.location.search);
                const urlToken = params.get('token');

                // Read token from localStorage
                const storedToken = localStorage.getItem('txio_token');

                // Prefer Google callback token
                const token = urlToken || storedToken;

                // No token
                if (!token) {
                    setAuthChecking(false);
                    return;
                }

                // Save token
                localStorage.setItem('txio_token', token);

                // Set token in API service
                apiService.setToken(token);

                // IMPORTANT:
                // Switch app mode BEFORE profile request
                // prevents redirect back to landing page
                appStore.setViewMode('app');

                try {
                    const profilePromise =
                        apiService.getProfile();
                    const workspacesPromise =
                        apiService.getWorkspaces();

                    void workspacesPromise.catch(
                        () => undefined
                    );

                    // Fetch authenticated user
                    const user = await profilePromise;

                    // Save user
                    appStore.updateUser(user);

                    try {
                        const workspaces =
                            await workspacesPromise;

                        await appStore.fetchWorkspaces(
                            undefined,
                            workspaces
                        );
                    } catch (workspaceError) {
                        console.error(
                            'Workspace fetch failed:',
                            workspaceError
                        );
                    }

                    // Success toast only after OAuth redirect
                    if (urlToken) {
                        appStore.showToast(
                            'Successfully signed in with Google',
                            'success'
                        );
                    }

                    // Remove token from URL
                    if (urlToken) {
                        window.history.replaceState(
                            {},
                            '',
                            window.location.pathname
                        );
                    }

                    router.replace('/workspace');
                } catch (profileError) {
                    console.error('Profile fetch failed:', profileError);

                    // Invalid token/session cleanup
                    localStorage.removeItem('txio_token');

                    apiService.setToken(null);

                    appStore.updateUser(null);

                    appStore.setViewMode('landing');

                    appStore.showToast(
                        'Session expired. Please sign in again.',
                        'error'
                    );
                }
            } catch (error) {
                console.error('Auth initialization failed:', error);

                localStorage.removeItem('txio_token');

                apiService.setToken(null);

                appStore.updateUser(null);

                appStore.setViewMode('landing');
            } finally {
                setAuthChecking(false);
            }
        };

        initializeAuth();
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsLoading(true);

        try {
            await appStore.login(
                formData.email,
                formData.password
            );
            router.replace('/workspace');
        } catch (error) {
            console.error(error);

            appStore.showToast(
                'Login failed. Please try again.',
                'error'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = (provider: string) => {
        setSocialLoading(provider);

        appStore.showToast(
            `Connecting to ${provider}...`,
            'info'
        );

        // Google OAuth
        if (provider === 'Google') {
            window.location.href = `${API_BASE}/auth/google/login`;
            return;
        }

        setTimeout(() => {
            appStore.showToast(
                `${provider} login is not connected yet`,
                'info'
            );
            setSocialLoading(null);
        }, 2000);
    };

    // Loading screen while checking auth
    if (authChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-near-black">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-white/20 border-t-electric-violet rounded-full animate-spin"></div>

                    <p className="text-sm text-slate-400">
                        Authenticating...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`min-h-screen flex selection:bg-electric-violet/30 ${
                theme === 'dark'
                    ? 'bg-near-black text-white'
                    : 'bg-slate-50 text-slate-900'
            }`}
        >
            {/* Left Wing */}
            <div className="hidden lg:flex flex-1 relative bg-near-black border-r border-white/5 p-16 flex-col justify-between overflow-hidden">
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle at 2px 2px, #ADDFF1 1px, transparent 0)',
                        backgroundSize: '30px 30px'
                    }}
                />

                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-electric-violet/10 blur-[150px] rounded-full"></div>

                <div className="relative z-10">
                    <div
                        className="flex items-center gap-3 mb-16 cursor-pointer"
                        onClick={() => {
                            appStore.setViewMode('landing');
                            router.push('/');
                        }}
                    >
                        <img
                            src={logoDark.src}
                            alt="txio"
                            className="h-10 w-auto"
                        />

                        <span className="text-2xl font-bold tracking-tighter text-white">
                            txio
                        </span>
                    </div>

                    <div className="space-y-6">
                        <h1 className="text-6xl font-bold tracking-tight text-white leading-[1.1]">
                            Welcome back. <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-violet to-soft-purple">
                                Let&apos;s get to it.
                            </span>
                        </h1>

                        <p className="text-lg text-slate-400 max-w-md leading-relaxed">
                            Pick up where you left off. Your workspaces, collections, and history are right where you put them.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 flex gap-12">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-electric-violet">
                            <ShieldCheck size={18} />

                            <span className="font-bold text-xs uppercase tracking-widest">
                                Secure
                            </span>
                        </div>

                        <div className="text-[10px] text-slate-500">
                            AES-256 Workspace Encryption
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-soft-purple">
                            <Zap size={18} />

                            <span className="font-bold text-xs uppercase tracking-widest">
                                Fast
                            </span>
                        </div>

                        <div className="text-[10px] text-slate-500">
                            Real-time RPC Monitoring
                        </div>
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
                    <ArrowLeft size={16} />
                    Back
                </button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`w-full max-w-md p-10 rounded-[2.5rem] border shadow-2xl ${
                        theme === 'dark'
                            ? 'bg-white/[0.04] border-white/20'
                            : 'bg-white border-slate-200'
                    }`}
                >
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-electric-violet/10 mb-6">
                            <Lock
                                className="text-electric-violet"
                                size={32}
                            />
                        </div>

                        <h2 className="text-3xl font-bold tracking-tight mb-2">
                            Sign In
                        </h2>

                        <p className="text-sm text-slate-500">
                            Email and password. That&apos;s all we need.
                        </p>
                    </div>

                    <form
                        onSubmit={handleLogin}
                        className="space-y-5"
                    >
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
                                Email
                            </label>

                            <div className="relative">
                                <Mail
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />

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
                                    className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all ${
                                        theme === 'dark'
                                            ? 'bg-near-black border-white/5 focus:border-electric-violet/50'
                                            : 'bg-slate-50 border-slate-200'
                                    }`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                    Password
                                </label>

                                <button
                                    type="button"
                                    className="text-[10px] font-bold text-electric-violet"
                                >
                                    Forgot?
                                </button>
                            </div>

                            <div className="relative">
                                <Lock
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />

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
                                    className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all ${
                                        theme === 'dark'
                                            ? 'bg-near-black border-white/5 focus:border-electric-violet/50'
                                            : 'bg-slate-50 border-slate-200'
                                    }`}
                                />
                            </div>
                        </div>

                        <button
                            disabled={isLoading}
                            className="w-full py-4 bg-electric-violet text-white rounded-2xl font-bold text-lg hover:bg-soft-purple transition-all flex items-center justify-center gap-2 group shadow-xl"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Sign In

                                    <ArrowRight
                                        size={20}
                                        className="group-hover:translate-x-1 transition-transform"
                                    />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 space-y-3">
                        <div className="relative flex items-center justify-center mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-white/5"></div>
                            </div>

                            <span
                                className={`relative px-4 text-[10px] font-bold uppercase tracking-widest ${
                                    theme === 'dark'
                                        ? 'bg-[#001B2E] text-slate-600'
                                        : 'bg-white text-slate-400'
                                }`}
                            >
                                Or continue with
                            </span>
                        </div>

                        <button
                            type="button"
                            disabled={socialLoading !== null}
                            onClick={() => handleSocialLogin('Google')}
                            className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl border transition-all ${
                                theme === 'dark'
                                    ? 'border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm disabled:opacity-50'
                            }`}
                        >
                            {socialLoading === 'Google' ? (
                                <div className="w-5 h-5 border-2 border-slate-500 border-t-electric-violet rounded-full animate-spin"></div>
                            ) : (
                                <svg
                                    viewBox="0 0 24 24"
                                    width="20"
                                    height="20"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />

                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />

                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />

                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                            )}

                            <span className="text-sm font-bold">
                                {socialLoading === 'Google'
                                    ? 'Connecting...'
                                    : 'Continue with Google'}
                            </span>
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                disabled={socialLoading !== null}
                                onClick={() => handleSocialLogin('GitHub')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                                    theme === 'dark'
                                        ? 'border-white/5 bg-white/5 hover:bg-white/10 disabled:opacity-50'
                                        : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm disabled:opacity-50'
                                }`}
                            >
                                {socialLoading === 'GitHub' ? (
                                    <div className="w-4 h-4 border-2 border-slate-500 border-t-electric-violet rounded-full animate-spin"></div>
                                ) : (
                                    <Github size={18} />
                                )}

                                <span className="text-sm font-bold">
                                    GitHub
                                </span>
                            </button>

                            <button
                                type="button"
                                disabled={socialLoading !== null}
                                onClick={() => handleSocialLogin('Twitter')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                                    theme === 'dark'
                                        ? 'border-white/5 bg-white/5 hover:bg-white/10 disabled:opacity-50'
                                        : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm disabled:opacity-50'
                                }`}
                            >
                                {socialLoading === 'Twitter' ? (
                                    <div className="w-4 h-4 border-2 border-slate-500 border-t-electric-violet rounded-full animate-spin"></div>
                                ) : (
                                    <Twitter
                                        size={18}
                                        className="text-sky-400"
                                    />
                                )}

                                <span className="text-sm font-bold">
                                    Twitter
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-10 text-center">
                        <button
                            onClick={() => {
                                appStore.setViewMode('signup');
                                router.push('/signup');
                            }}
                            className="text-sm font-medium text-slate-500 hover:text-white transition-colors"
                        >
                            Don&apos;t have an account?{' '}
                            <span className="text-electric-violet font-bold">
                                Get Started
                            </span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
