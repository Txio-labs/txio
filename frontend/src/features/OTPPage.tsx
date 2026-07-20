import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShieldCheck, ArrowLeft, RefreshCw, CheckCircle2, 
    Smartphone, Mail, Lock, Sparkles
} from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import logoDark from '../assets/txio2.png';
import gsap from 'gsap';

export const OTPPage: React.FC = () => {
    const { theme } = useAppStore();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [timer, setTimer] = useState(59);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length < 6) {
            appStore.showToast('Enter the full 6 digits.', 'error');
            return;
        }

        setIsLoading(true);
        // Mock verification
        setTimeout(() => {
            setIsLoading(false);
            setIsVerified(true);
            appStore.showToast('Authentication Successful!', 'success');
            setTimeout(() => {
                appStore.setViewMode('landing');
            }, 1500);
        }, 2000);
    };

    const handleResend = () => {
        if (timer > 0) return;
        setTimer(59);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        appStore.showToast('New code on the way.', 'info');
    };

    return (
        <div className={`min-h-screen flex selection:bg-electric-violet/30 ${
            theme === 'dark' ? 'bg-near-black text-white' : 'bg-slate-50 text-slate-900'
        }`}>
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-electric-violet/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-soft-purple/5 blur-[100px] rounded-full"></div>
                <div className="absolute inset-0 opacity-[0.03]" style={{ 
                    backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)',
                    backgroundSize: '32px 32px'
                }}></div>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-10">
                {/* Back Button */}
                <button 
                    onClick={() => appStore.setViewMode('auth')}
                    className={`absolute top-8 left-8 flex items-center gap-2 text-sm font-medium transition-colors ${
                        theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'
                    }`}
                >
                    <ArrowLeft size={18} />
                    Back to Sign In
                </button>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`w-full max-w-xl p-12 rounded-[3rem] border shadow-2xl relative overflow-hidden ${
                        theme === 'dark' 
                        ? 'bg-white/[0.04] border-white/20 backdrop-blur-xl' 
                        : 'bg-white border-slate-200'
                    }`}
                >
                    {/* Header Decoration */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-electric-violet to-transparent opacity-50"></div>

                    <div className="text-center mb-12 otp-header">
                        <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 12 }}
                            className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-electric-violet/10 mb-8 relative"
                        >
                            <div className="absolute inset-0 bg-electric-violet/20 blur-2xl rounded-full animate-pulse"></div>
                            {isVerified ? (
                                <CheckCircle2 className="text-emerald-400 relative z-10" size={40} />
                            ) : (
                                <ShieldCheck className="text-electric-violet relative z-10" size={40} />
                            )}
                        </motion.div>
                        
                        <h2 className="text-4xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                            Check your inbox.
                        </h2>
                        <p className={`text-base max-w-sm mx-auto leading-relaxed ${
                            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                            We sent a 6-digit code to <span className="text-white font-medium">v***@t***.io</span>. Drop it in below.
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
                                        className={`w-full aspect-square text-center text-3xl font-bold rounded-2xl border-2 outline-none transition-all duration-300 ${
                                            digit 
                                                ? 'border-electric-violet bg-electric-violet/5 shadow-[0_0_20px_rgba(173,223,241,0.2)]' 
                                                : theme === 'dark'
                                                    ? 'bg-white/[0.03] border-white/10 focus:border-electric-violet/50'
                                                    : 'bg-slate-50 border-slate-200 focus:border-electric-violet/30'
                                        }`}
                                    />
                                </motion.div>
                            ))}
                        </div>

                        <div className="space-y-6">
                            <button 
                                type="submit"
                                disabled={isLoading || isVerified}
                                className="w-full py-5 bg-electric-violet text-white rounded-2xl font-bold text-xl hover:bg-soft-purple transition-all shadow-[0_0_30px_rgba(173,223,241,0.3)] flex items-center justify-center gap-3 group disabled:opacity-50 relative overflow-hidden"
                            >
                                <AnimatePresence mode="wait">
                                    {isLoading ? (
                                        <motion.div 
                                            key="loading"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="w-7 h-7 border-3 border-white/30 border-t-white rounded-full animate-spin"
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
                                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                                }`}>
                                    Code didn&apos;t show up?
                                </p>
                                <button 
                                    type="button"
                                    onClick={handleResend}
                                    disabled={timer > 0 || isLoading}
                                    className={`flex items-center gap-2 text-sm font-bold transition-all px-6 py-2 rounded-full border ${
                                        timer > 0 
                                            ? 'text-slate-600 border-white/5 cursor-not-allowed' 
                                            : 'text-electric-violet border-electric-violet/20 hover:bg-electric-violet/10'
                                    }`}
                                >
                                    <RefreshCw size={16} className={timer === 0 ? 'animate-spin-slow' : ''} />
                                    {timer > 0 ? `Resend in ${timer}s` : 'Send a new one'}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Footer Info */}
                    <div className="mt-12 flex justify-center gap-8 border-t border-white/5 pt-8">
                        <div className="flex items-center gap-2 text-slate-500 otp-footer-item">
                            <Smartphone size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Mobile Push</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 otp-footer-item">
                            <Mail size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Email Alert</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 otp-footer-item">
                            <Lock size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">End-to-End</span>
                        </div>
                    </div>
                </motion.div>

                <footer className={`mt-12 text-[10px] font-bold uppercase tracking-[0.5em] text-center ${
                    theme === 'dark' ? 'text-slate-700' : 'text-slate-400'
                }`}>
                    txio · sign-in flow
                </footer>
            </div>
        </div>
    );
};
