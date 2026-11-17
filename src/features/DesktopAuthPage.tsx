'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Monitor } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { appStore, useAppStore } from '@/lib/store';
import { apiService } from '@/services/api';
import {
    clearParkedDesktopAuthRequest,
    desktopAppLink,
    parkDesktopAuthRequest,
    parkedDesktopAuthRequest,
    readDesktopAuthRequest,
    type DesktopAuthRequest
} from '@/lib/desktopAuth';

type Phase = { name: 'confirm' } | { name: 'sending' } | { name: 'done'; code: string };

/**
 * Website page that Txio Desktop opens in the browser. Signed out, it sends the
 * user to sign in and comes back here. Signed in, it asks the user to confirm,
 * then hands a one-time code to the desktop app.
 */
export function DesktopAuthPage() {
    const router = useRouter();
    const { user } = useAppStore();
    const [request, setRequest] = useState<DesktopAuthRequest | null | undefined>(undefined);
    const [ready, setReady] = useState(false);
    const [phase, setPhase] = useState<Phase>({ name: 'confirm' });
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const req = readDesktopAuthRequest(window.location.search) ?? parkedDesktopAuthRequest();
        if (req) parkDesktopAuthRequest(req);
        appStore.initialize().finally(() => {
            setRequest(req);
            setReady(true);
        });
    }, []);

    const approve = async () => {
        if (!request) return;
        setPhase({ name: 'sending' });
        setError(null);
        try {
            const code = await apiService.createDesktopSignInCode(request.challenge);
            clearParkedDesktopAuthRequest();
            setPhase({ name: 'done', code });
            window.location.href = desktopAppLink(code, request.state);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not create a sign-in code.');
            setPhase({ name: 'confirm' });
        }
    };

    const copy = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            setError('Could not copy. Select the code and copy it by hand.');
        }
    };

    const panel = {
        panelTitle: <>Txio Desktop.<br /><span className="text-fg-subtle">Signed in from your browser.</span></>,
        panelBody: 'Your desktop app gets its own session. You can end it any time under Settings, Sessions.'
    };

    let body: React.ReactNode;
    if (request === undefined || !ready) {
        body = <div className="w-6 h-6 border-2 border-current/30 border-t-current rounded-full animate-spin" />;
    } else if (!request) {
        body = (
            <>
                <h2 className="text-[28px] font-semibold tracking-[-0.035em] mb-1.5">Link expired</h2>
                <p className="text-sm text-fg-subtle">This sign-in link is incomplete or too old. Open Txio Desktop and click &quot;Sign in with browser&quot; again.</p>
            </>
        );
    } else if (!user) {
        body = (
            <>
                <h2 className="text-[28px] font-semibold tracking-[-0.035em] mb-1.5">Sign in to continue</h2>
                <p className="text-sm text-fg-subtle mb-8">Sign in or create an account. You&apos;ll come back here to finish connecting Txio Desktop.</p>
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => router.push('/signin')}
                        className="w-full h-11 rounded-[10px] font-medium text-sm bg-inverse text-on-inverse hover:opacity-90 transition-all"
                    >
                        Sign in
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/signup')}
                        className="w-full h-11 rounded-[10px] font-medium text-sm border border-line bg-surface hover:bg-hover transition-colors"
                    >
                        Create an account
                    </button>
                </div>
            </>
        );
    } else if (phase.name === 'done') {
        body = (
            <>
                <h2 className="text-[28px] font-semibold tracking-[-0.035em] mb-1.5">Back to Txio Desktop</h2>
                <p className="text-sm text-fg-subtle mb-6">Txio Desktop should open and sign you in. If your browser asks, allow it to open the app.</p>
                <p className="text-xs font-medium text-fg-muted mb-2">Didn&apos;t open? Paste this code into Txio Desktop. It works once, for 5 minutes.</p>
                <div className="flex gap-2">
                    <input
                        readOnly
                        value={phase.code}
                        onFocus={(e) => e.currentTarget.select()}
                        className="min-w-0 flex-1 px-3 h-10 rounded-[10px] border bg-surface border-line text-fg text-xs font-mono outline-none focus:border-line-strong"
                    />
                    <button
                        type="button"
                        onClick={() => copy(phase.code)}
                        aria-label="Copy sign-in code"
                        className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-line bg-surface hover:bg-hover transition-colors"
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                </div>
                <p className="mt-6 text-xs text-fg-subtle">Never share this code. Txio will not ask you for it.</p>
            </>
        );
    } else {
        body = (
            <>
                <h2 className="text-[28px] font-semibold tracking-[-0.035em] mb-1.5">Sign in to Txio Desktop?</h2>
                <p className="text-sm text-fg-subtle mb-8">
                    Txio Desktop on this computer will be signed in as <span className="text-fg font-medium">{user.email}</span>. Only continue if you just clicked &quot;Sign in with browser&quot; in the app.
                </p>
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={approve}
                        disabled={phase.name === 'sending'}
                        className="w-full h-11 rounded-[10px] font-medium text-sm transition-all flex items-center justify-center gap-2 bg-inverse text-on-inverse hover:opacity-90 disabled:opacity-50"
                    >
                        {phase.name === 'sending' ? (
                            <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        ) : (
                            <>
                                <Monitor size={16} /> Open Txio Desktop
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            clearParkedDesktopAuthRequest();
                            router.push('/workspace');
                        }}
                        className="w-full h-11 rounded-[10px] font-medium text-sm border border-line bg-surface hover:bg-hover transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </>
        );
    }

    return (
        <AuthLayout {...panel}>
            {error && (
                <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}
            {body}
        </AuthLayout>
    );
}
