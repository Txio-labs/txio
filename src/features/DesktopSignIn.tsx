'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Check, Copy, Globe } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { appStore } from '@/lib/store';
import { apiService } from '@/services/api';
import {
    clearDesktopSignIn,
    consumeDesktopCodeFragment,
    isBase64Url,
    pendingVerifier,
    SITE_URL,
    startDesktopSignIn
} from '@/lib/desktopAuth';

type Phase = { name: 'idle' } | { name: 'waiting'; url: string } | { name: 'finishing' };

/**
 * Txio Desktop's only signed-out screen. Sign-in happens on the website in the
 * system browser; the website hands the session back through a
 * `txio-desktop://` link, or a code the user pastes here.
 */
export function DesktopSignIn() {
    const router = useRouter();
    const [phase, setPhase] = useState<Phase>({ name: 'idle' });
    const [error, setError] = useState<string | null>(null);
    const [pasted, setPasted] = useState('');
    const [copied, setCopied] = useState(false);
    const handled = useRef(false);

    const finish = async (code: string, verifier: string | null) => {
        if (!verifier) {
            setError('This sign-in was started from another window or has expired. Click "Sign in with browser" again.');
            setPhase({ name: 'idle' });
            return;
        }
        setPhase({ name: 'finishing' });
        setError(null);
        try {
            await apiService.exchangeDesktopSignInCode(code, verifier);
            clearDesktopSignIn();
            apiService.setSessionHint(true);
            await appStore.initialize();
            appStore.setViewMode('app');
            appStore.showToast('Signed in.', 'success');
            router.replace('/workspace');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Sign-in failed. Try again.');
            setPhase({ name: 'idle' });
        }
    };

    // The shell opens /signin#desktop_code=…&state=… when the browser hands the sign-in back.
    useEffect(() => {
        if (handled.current) return;
        const back = consumeDesktopCodeFragment();
        if (!back) return;
        handled.current = true;
        void Promise.resolve().then(() => finish(back.code, pendingVerifier(back.state)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const onHash = () => {
            const back = consumeDesktopCodeFragment();
            if (back) void finish(back.code, pendingVerifier(back.state));
        };
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const start = async () => {
        setError(null);
        const url = await startDesktopSignIn();
        // The shell opens /desktop-auth on the website in the system browser.
        window.open(url, '_blank');
        setPhase({ name: 'waiting', url });
    };

    const copyLink = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            setError('Could not copy. Select the link and copy it by hand.');
        }
    };

    const submitPasted = (e: React.FormEvent) => {
        e.preventDefault();
        const code = pasted.trim();
        if (!isBase64Url(code, 43, 43)) {
            setError('That code does not look right. Copy it again from the browser.');
            return;
        }
        void finish(code, pendingVerifier());
    };

    return (
        <AuthLayout
            panelTitle={<>Sign in once.<br /><span className="text-fg-subtle">Work from your desktop.</span></>}
            panelBody="Txio Desktop signs in through your browser, so your password, passkeys and social logins stay where they already are."
        >
            <div className="mb-8">
                <h2 className="text-[28px] font-semibold tracking-[-0.035em] mb-1.5">Get started</h2>
                <p className="text-sm text-fg-subtle">Sign in or create an account in your browser. Txio Desktop opens again when you&apos;re done.</p>
            </div>

            {error && (
                <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}

            <button
                type="button"
                onClick={start}
                disabled={phase.name === 'finishing'}
                className="w-full h-11 rounded-[10px] font-medium text-sm transition-all flex items-center justify-center gap-2 bg-inverse text-on-inverse hover:opacity-90 disabled:opacity-50"
            >
                {phase.name === 'finishing' ? (
                    <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : (
                    <>
                        <Globe size={16} /> {phase.name === 'waiting' ? 'Open the browser again' : 'Sign in with browser'}
                    </>
                )}
            </button>

            {phase.name === 'waiting' && (
                <div className="mt-6 space-y-5">
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-fg-muted">Browser didn&apos;t open? Copy this link into it:</p>
                        <div className="flex gap-2">
                            <input
                                readOnly
                                value={phase.url}
                                onFocus={(e) => e.currentTarget.select()}
                                className="min-w-0 flex-1 px-3 h-10 rounded-[10px] border bg-surface border-line text-fg text-xs font-mono outline-none focus:border-line-strong"
                            />
                            <button
                                type="button"
                                onClick={() => copyLink(phase.url)}
                                aria-label="Copy sign-in link"
                                className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-line bg-surface hover:bg-hover transition-colors"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>

                    <form onSubmit={submitPasted} className="space-y-2">
                        <label htmlFor="desktop-code" className="text-xs font-medium text-fg-muted">
                            Or paste the code the browser shows you:
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="desktop-code"
                                value={pasted}
                                onChange={(e) => setPasted(e.target.value)}
                                autoComplete="off"
                                spellCheck={false}
                                placeholder="Sign-in code"
                                className="min-w-0 flex-1 px-3 h-10 rounded-[10px] border bg-surface border-line text-fg text-sm font-mono placeholder:text-fg-subtle outline-none focus:border-line-strong focus:ring-4 focus:ring-[var(--hover)]"
                            />
                            <button
                                type="submit"
                                disabled={!pasted.trim()}
                                className="h-10 px-4 shrink-0 rounded-[10px] border border-line bg-surface hover:bg-hover text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                Continue
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <p className="mt-8 text-xs text-fg-subtle flex items-center gap-1">
                Opens <span className="font-mono">{new URL(SITE_URL).host}</span> in your default browser <ArrowUpRight size={12} />
            </p>
        </AuthLayout>
    );
}
