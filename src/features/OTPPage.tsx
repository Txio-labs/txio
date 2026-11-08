import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useRouter } from 'next/navigation';
import {
    ShieldCheck, ArrowLeft, RefreshCw, CheckCircle2,
    Smartphone, Mail, Lock, Sparkles
} from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { apiService } from '@/services/api';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoDark from '../assets/txio2.png';
import gsap from 'gsap';

const maskEmail = (email: string): string => {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    const maskedLocal = local[0] + '*'.repeat(Math.max(local.length - 1, 1));
    const domainParts = domain.split('.');
    const maskedDomain = domainParts
        .map((part, i) =>
            i === domainParts.length - 1
                ? part
                : part[0] + '*'.repeat(Math.max(part.length - 1, 1))
        )
        .join('.');
    return `${maskedLocal}@${maskedDomain}`;
};

export const OTPPage: React.FC = () => {
    const { theme, pendingSignup } = useAppStore();
    const router = useRouter();
    const isDark = theme === 'dark';
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [timer, setTimer] = useState(59);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!pendingSignup) {
            router.replace('/signup');
        }
    }, [pendingSignup, router]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        // GSAP Entrance Animation
        const ctx = gsap.context(() => {
            gsap.from('.otp-header > *', {
                y: 30,
                opacity: 0,
                duration: 0.8,
                stagger: 0.2,
                ease: 'power4.out'
            });

            gsap.from('.otp-input-field', {
                scale: 0.5,
                opacity: 0,
                duration: 0.6,
                stagger: 0.1,
                delay: 0.4,
                ease: 'back.out(1.7)'
            });

            gsap.from('.otp-footer-item', {
                y: 20,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                delay: 1,
                ease: 'power3.out'
            });
        });

        return () => {
            clearInterval(interval);
            ctx.revert();
        };
    }, []);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (!/^\d+$/.test(pastedData)) return;

        const newOtp = [...otp];
        pastedData.split('').forEach((char, index) => {
            if (index < 6) newOtp[index] = char;
        });
        setOtp(newOtp);
        inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length < 6) {
            appStore.showToast('Enter the full 6 digits.', 'error');
            return;
        }

        if (!pendingSignup) {
            router.replace('/signup');
            return;
        }

        setIsLoading(true);
        try {
            await appStore.completeSignup(code);
            setIsVerified(true);
            appStore.showToast('Authentication Successful!', 'success');
            setTimeout(() => {
                router.replace('/workspace');
            }, 1500);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to verify OTP';
            appStore.showToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0 || !pendingSignup) return;
        try {
            await apiService.requestOtp(pendingSignup.email);
            setTimer(59);
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
            appStore.showToast('New code on the way.', 'info');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to resend code';
            appStore.showToast(message, 'error');
        }
    };

    return (
        <AuthLayout
            onBack={() => {
                appStore.setPendingSignup(null);
                router.push('/signup');
            }}
            panelTitle={<>Check your inbox.<br /><span className="text-fg-subtle">One code and you&apos;re in.</span></>}
            panelBody="We emailed you a 6-digit code to confirm the address belongs to you. It expires shortly, so use it soon."
        >
                    {/* Header Decoration */}
                    

                    <div className="mb-8 otp-header">
                        <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 12 }}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] border border-line bg-sunken mb-5 relative"
                        >
                            
                            {isVerified ? (
                                <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 relative z-10" size={18} />
                            ) : (
                                <ShieldCheck className="text-fg relative z-10" size={18} />
                            )}
                        </motion.div>
                        
                        <h2 className="text-[28px] font-semibold tracking-[-0.035em] mb-1.5 text-fg">
                            Check your inbox.
                        </h2>
                        <p className={`text-base max-w-sm mx-auto leading-relaxed ${
                            theme === 'dark' ? 'text-fg-subtle' : 'text-fg-subtle'
                        }`}>
                            We sent a 6-digit code to <span className={`font-medium text-fg`}>{pendingSignup ? maskEmail(pendingSignup.email) : 'your email'}</span>. Drop it in below.
                        </p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-10">
                        <div className="flex justify-between gap-3 md:gap-4" onPaste={handlePaste}>
                            {otp.map((digit, index) => (
                                <motion.div 
                                    key={index}
                                    className="flex-1 otp-input-field"
                                >
                                    <input
                                        ref={(el) => { inputRefs.current[index] = el; }}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        className={`w-full aspect-square text-center text-3xl font-semibold rounded-card border-2 outline-none transition-all duration-300 ${
                                            digit 
                                                ? 'border-fg/40 bg-hover shadow-[0_0_20px_rgba(163,163,163,0.2)]' 
                                                : theme === 'dark'
                                                    ? 'bg-hover border-line focus:border-line-strong'
                                                    : 'bg-sunken border-line focus:border-line-strong'
                                        }`}
                                    />
                                </motion.div>
                            ))}
                        </div>

                        <div className="space-y-6">
                            <button 
                                type="submit"
                                disabled={isLoading || isVerified}
                                className="w-full py-5 bg-inverse text-on-inverse rounded-[10px] font-semibold text-xl hover:opacity-90 transition-all flex items-center justify-center gap-3 group disabled:opacity-50 relative overflow-hidden"
                            >
                                <AnimatePresence mode="wait">
                                    {isLoading ? (
                                        <motion.div 
                                            key="loading"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="w-7 h-7 border-3 border-current/30 border-t-current rounded-full animate-spin"
                                        />
                                    ) : isVerified ? (
                                        <motion.div 
                                            key="verified"
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            className="flex items-center gap-2"
                                        >
                                            You&apos;re in.
                                        </motion.div>
                                    ) : (
                                        <motion.div 
                                            key="default"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex items-center gap-2"
                                        >
                                            Verify
                                            <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </button>

                            <div className="flex flex-col items-center gap-4">
                                <p className={`text-sm font-medium ${
                                    theme === 'dark' ? 'text-fg-subtle' : 'text-fg-subtle'
                                }`}>
                                    Code didn&apos;t show up?
                                </p>
                                <button 
                                    type="button"
                                    onClick={handleResend}
                                    disabled={timer > 0 || isLoading}
                                    className={`flex items-center gap-2 text-sm font-semibold transition-all px-6 py-2 rounded-full border ${
                                        timer > 0
                                            ? `text-fg-muted cursor-not-allowed ${isDark ? 'border-line' : 'border-line'}`
                                            : 'text-fg border-line hover:bg-hover'
                                    }`}
                                >
                                    <RefreshCw size={16} className={timer === 0 ? 'animate-spin-slow' : ''} />
                                    {timer > 0 ? `Resend in ${timer}s` : 'Send a new one'}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Footer Info */}
                    <div className={`mt-12 flex justify-center gap-8 pt-8 border-t ${isDark ? 'border-line' : 'border-line'}`}>
                        <div className="flex items-center gap-2 text-fg-subtle otp-footer-item">
                            <Smartphone size={16} />
                            <span className="text-[12px] font-semibold">Mobile Push</span>
                        </div>
                        <div className="flex items-center gap-2 text-fg-subtle otp-footer-item">
                            <Mail size={16} />
                            <span className="text-[12px] font-semibold">Email Alert</span>
                        </div>
                        <div className="flex items-center gap-2 text-fg-subtle otp-footer-item">
                            <Lock size={16} />
                            <span className="text-[12px] font-semibold">End-to-End</span>
                        </div>
                    </div>
        </AuthLayout>
    );
};
