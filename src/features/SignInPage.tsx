import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useRouter } from 'next/navigation';
import {
    Mail,
    Lock,
    ArrowRight,
    ArrowLeft,
    ShieldCheck,
    Zap,
    Eye,
    EyeOff
} from 'lucide-react';
import { Github, XLogo } from '@/components/icons/BrandIcons';

import { appStore, useAppStore } from '@/lib/store';
import { API_BASE, apiService } from '@/services/api';
import { useOAuthProviders } from '@/lib/useOAuthProviders';
import logoDark from '../assets/txio2.png';


// The OAuth callback sets the HttpOnly session cookie on its own redirect
// response and returns here with `#oauth=success`. There is no token in the
// URL. Read the marker once and strip it from the address bar.
function consumeOAuthSuccess(): boolean {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash;
    if (!/(?:^#|&)oauth=success/.test(hash)) return false;
    const remainingHash = hash.replace(/(?:^#|&)oauth=success/, '').replace(/^#&/, '#');
    const url = new URL(window.location.href);
    url.hash = remainingHash === '#' ? '' : remainingHash;
    window.history.replaceState({}, '', url.toString());
    return true;
}

export const SignInPage: React.FC = () => {
    const { theme } = useAppStore();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<string | null>(null);
    const oauthProviders = useOAuthProviders();
    const [authChecking, setAuthChecking] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [forgotPasswordStep, setForgotPasswordStep] = useState<'none' | 'email' | 'otp'>('none');
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
    const [forgotPasswordOtp, setForgotPasswordOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const oauthSucceeded = consumeOAuthSuccess();

                // No session hint and no OAuth handoff: nothing to restore.
                if (!oauthSucceeded && !apiService.hasSessionHint()) {
                    setAuthChecking(false);
                    return;
                }

                apiService.setSessionHint(true);

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

                    // Success toast only after OAuth redirect (token arrived via fragment)
                    if (oauthSucceeded) {
                        appStore.showToast(
                            'Signed in successfully',
                            'success'
                        );
                    }

                    router.replace('/workspace');
                } catch (profileError) {
                    console.error('Profile fetch failed:', profileError);

                    // Invalid token/session cleanup
                    apiService.setSessionHint(false);

                    appStore.updateUser(null);

                    appStore.setViewMode('landing');

                    appStore.showToast(
                        'Session expired. Please sign in again.',
                        'error'
                    );
                }
            } catch (error) {
                console.error('Auth initialization failed:', error);

                apiService.setSessionHint(false);

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

            const message = error instanceof Error ? error.message : 'Login failed. Please try again.';
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

    const handleForgotPasswordEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await apiService.forgotPassword(forgotPasswordEmail);
            appStore.showToast('Verification code sent.', 'success');
            setForgotPasswordStep('otp');
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Failed to send verification code.';
            appStore.showToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPasswordResetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpCode = forgotPasswordOtp.join('');
        if (otpCode.length < 6) {
            appStore.showToast('Enter the full 6 digits.', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            appStore.showToast('Passwords do not match.', 'error');
            return;
        }
        if (newPassword.length < 8) {
            appStore.showToast('Password must be at least 8 characters.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            await apiService.resetPassword(forgotPasswordEmail, otpCode, newPassword);
            appStore.showToast('Password reset successfully. Please sign in.', 'success');
            setFormData(prev => ({ ...prev, email: forgotPasswordEmail, password: '' }));
            setForgotPasswordStep('none');
            setForgotPasswordOtp(['', '', '', '', '', '']);
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Failed to reset password.';
            appStore.showToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...forgotPasswordOtp];
        newOtp[index] = value.slice(-1);
        setForgotPasswordOtp(newOtp);
        if (value && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !forgotPasswordOtp[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (!/^\d+$/.test(pastedData)) return;

        const newOtp = [...forgotPasswordOtp];
        pastedData.split('').forEach((char, i) => {
            if (i < 6) newOtp[i] = char;
        });
        setForgotPasswordOtp(newOtp);
        otpInputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    };

    // Loading screen while checking auth
    if (authChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-canvas">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-line-strong border-t-electric-violet rounded-full animate-spin"></div>

                    <p className="text-sm text-fg-subtle">
                        Authenticating...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <AuthLayout
            onBack={() => {
                if (forgotPasswordStep !== 'none') {
                    setForgotPasswordStep('none');
                } else {
                    appStore.setViewMode('landing');
                    router.push('/');
                }
            }}
            panelTitle={<>Welcome back.<br /><span className="text-fg-subtle">Pick up where you left off.</span></>}
            panelBody="Your workspaces, collections and history are right where you put them, on every chain you work with."
            points={['Collections and environments synced to your account', 'History of every call, with status and timing', 'Same account on web, desktop and CLI']}
        >
                    {forgotPasswordStep === 'none' && (
                        <>
                            <div className="mb-8">
<h2 className="text-[28px] font-semibold tracking-[-0.035em] mb-1.5">
                                    Sign In
                                </h2>

                                <p className="text-sm text-fg-subtle">
                                    Email and password. That&apos;s all we need.
                                </p>
                            </div>

                            <form
                                onSubmit={handleLogin}
                                className="space-y-4 sm:space-y-5"
                            >
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-fg-muted">
                                        Email
                                    </label>

                                    <div className="relative">
                                        <Mail size={16}
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle"
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
                                            className="w-full pl-10 pr-4 h-11 rounded-[10px] border bg-surface border-line text-fg placeholder:text-fg-subtle outline-none focus:border-line-strong focus:ring-4 focus:ring-[var(--hover)] transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-xs font-medium text-fg-muted">
                                            Password
                                        </label>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setForgotPasswordEmail(formData.email);
                                                setForgotPasswordStep('email');
                                            }}
                                            className="text-[12px] font-semibold text-fg"
                                        >
                                            Forgot?
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <Lock size={16}
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle"
                                        />

                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={formData.password}
                                            onChange={(e) =>
                                                setFormData((current) => ({
                                                    ...current,
                                                    password: e.target.value
                                                }))
                                            }
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-12 h-11 rounded-[10px] border bg-surface border-line text-fg placeholder:text-fg-subtle outline-none focus:border-line-strong focus:ring-4 focus:ring-[var(--hover)] transition-all"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((current) => !current)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg transition-colors"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    disabled={isLoading || !formData.email || !formData.password}
                                    className={`w-full h-11 rounded-[10px] font-medium text-sm transition-all flex items-center justify-center gap-2 group ${
                                        formData.email && formData.password
                                            ? `bg-inverse text-on-inverse hover:opacity-90`
                                            : `${theme === 'dark' ? 'bg-active text-fg-subtle' : 'bg-active text-fg-subtle'} cursor-not-allowed`
                                    }`}
                                >
                                    {isLoading ? (
                                        <div className="w-6 h-6 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            Sign In

                                            <ArrowRight size={16}
                                                className="group-hover:translate-x-1 transition-transform"
                                            />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 space-y-3">
                                <div className="relative flex items-center justify-center mb-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-line"></div>
                                    </div>

                                    <span
                                        className={`relative px-4 text-[12px] font-semibold ${
                                            theme === 'dark'
                                                ? 'bg-surface text-fg-muted'
                                                : 'bg-surface text-fg-subtle'
                                        }`}
                                    >
                                        Or continue with
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    disabled={socialLoading !== null}
                                    onClick={() => handleSocialLogin('Google')}
                                    className={`w-full flex items-center justify-center gap-3 h-10 rounded-[10px] border transition-all ${
                                        theme === 'dark'
                                            ? 'border-line bg-hover hover:bg-active disabled:opacity-50'
                                            : 'border-line bg-surface hover:bg-hover disabled:opacity-50'
                                    }`}
                                >
                                    {socialLoading === 'Google' ? (
                                        <div className="w-5 h-5 border-2 border-line-strong border-t-fg rounded-full animate-spin"></div>
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

                                    <span className="text-sm font-semibold">
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
                                        className={`flex items-center justify-center gap-2 h-10 rounded-[10px] border transition-all ${
                                            theme === 'dark'
                                                ? 'border-line bg-hover hover:bg-active disabled:opacity-50'
                                                : 'border-line bg-surface hover:bg-hover disabled:opacity-50'
                                        }`}
                                    >
                                        {socialLoading === 'GitHub' ? (
                                            <div className="w-4 h-4 border-2 border-line-strong border-t-fg rounded-full animate-spin"></div>
                                        ) : (
                                            <Github size={18} />
                                        )}

                                        <span className="text-sm font-semibold">
                                            GitHub
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={socialLoading !== null}
                                        onClick={() => handleSocialLogin('X')}
                                        className={`flex items-center justify-center gap-2 h-10 rounded-[10px] border transition-all ${
                                            theme === 'dark'
                                                ? 'border-line bg-hover hover:bg-active disabled:opacity-50'
                                                : 'border-line bg-surface hover:bg-hover disabled:opacity-50'
                                        }`}
                                    >
                                        {socialLoading === 'X' ? (
                                            <div className="w-4 h-4 border-2 border-line-strong border-t-fg rounded-full animate-spin"></div>
                                        ) : (
                                            <XLogo
                                                size={18}
                                                className="text-fg-muted"
                                            />
                                        )}

                                        <span className="text-sm font-semibold">
                                            X
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {forgotPasswordStep === 'email' && (
                        <>
                            <div className="mb-8">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] border border-line bg-sunken mb-5">
                                    <Mail
                                        className="text-fg"
                                        size={18}
                                    />
                                </div>

                                <h2 className="text-[28px] font-semibold tracking-[-0.035em] mb-1.5">
                                    Forgot Password
                                </h2>

                                <p className="text-sm text-fg-subtle">
                                    Enter your email to receive a recovery code.
                                </p>
                            </div>

                            <form onSubmit={handleForgotPasswordEmailSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-fg-muted">
                                        Email
                                    </label>

                                    <div className="relative">
                                        <Mail size={16}
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle"
                                        />

                                        <input
                                            type="email"
                                            required
                                            value={forgotPasswordEmail}
                                            onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                            placeholder="name@company.com"
                                            className="w-full pl-10 pr-4 h-11 rounded-[10px] border bg-surface border-line text-fg placeholder:text-fg-subtle outline-none focus:border-line-strong focus:ring-4 focus:ring-[var(--hover)] transition-all"
                                        />
                                    </div>
                                </div>

                                <button
                                    disabled={isLoading}
                                    className="w-full h-11 bg-inverse text-on-inverse rounded-[10px] font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 group shadow-card"
                                >
                                    {isLoading ? (
                                        <div className="w-6 h-6 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            Send Code
                                            <ArrowRight size={16}
                                                className="group-hover:translate-x-1 transition-transform"
                                            />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    )}

                    {forgotPasswordStep === 'otp' && (
                        <>
                            <div className="mb-8">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] border border-line bg-sunken mb-5">
                                    <ShieldCheck
                                        className="text-fg"
                                        size={18}
                                    />
                                </div>

                                <h2 className="text-[28px] font-semibold tracking-[-0.035em] mb-1.5">
                                    Check your inbox
                                </h2>

                                <p className="text-sm text-fg-subtle">
                                    We sent a 6-digit code to <span className="font-medium text-fg">{forgotPasswordEmail}</span>
                                </p>
                            </div>

                            <form onSubmit={handleForgotPasswordResetSubmit} className="space-y-6">
                                <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                                    {forgotPasswordOtp.map((digit, index) => (
                                        <div key={index} className="flex-1">
                                            <input
                                                ref={(el) => { otpInputRefs.current[index] = el; }}
                                                type="text"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                className={`w-full aspect-square text-center text-xl font-semibold rounded-[10px] border outline-none transition-all duration-300 ${
                                                    digit
                                                        ? 'border-fg/40 bg-hover'
                                                        : theme === 'dark'
                                                            ? 'bg-hover border-line focus:border-line-strong'
                                                            : 'bg-sunken border-line focus:border-line-strong'
                                                }`}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-fg-muted">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
                                            <input
                                                type={showNewPassword ? 'text' : 'password'}
                                                required
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className={`w-full h-11 pl-10 pr-11 rounded-[10px] border text-sm outline-none transition-all ${
                                                    theme === 'dark'
                                                        ? 'bg-canvas border-line focus:border-line-strong'
                                                        : 'bg-sunken border-line'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword((current) => !current)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg transition-colors"
                                                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-fg-muted">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className={`w-full h-11 pl-10 pr-11 rounded-[10px] border text-sm outline-none transition-all ${
                                                    theme === 'dark'
                                                        ? 'bg-canvas border-line focus:border-line-strong'
                                                        : 'bg-sunken border-line'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword((current) => !current)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg transition-colors"
                                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    disabled={isLoading}
                                    className="w-full h-11 bg-inverse text-on-inverse rounded-[10px] font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 group shadow-card"
                                >
                                    {isLoading ? (
                                        <div className="w-6 h-6 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            Reset Password
                                            <ArrowRight size={16}
                                                className="group-hover:translate-x-1 transition-transform"
                                            />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    )}

                    <div className="mt-10 text-center">
                        <button
                            onClick={() => {
                                appStore.setViewMode('signup');
                                router.push('/signup');
                            }}
                            className={`text-sm font-medium transition-colors ${
                                theme === 'dark' ? 'text-fg-subtle hover:text-fg' : 'text-fg-subtle hover:text-fg'
                            }`}
                        >
                            Don&apos;t have an account?{' '}
                            <span className={theme === 'dark' ? 'text-fg font-semibold' : 'text-fg font-semibold'}>
                                Get Started
                            </span>
                        </button>
                    </div>
        </AuthLayout>
    );
};
