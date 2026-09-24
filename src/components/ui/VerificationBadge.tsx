import React, { useEffect, useState } from 'react';
import { AlertOctagon, HelpCircle, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';

import { ChainId } from '@/types';
import { checkAddress, VerificationResult } from '@/services/verification';

interface VerificationBadgeProps {
    chain: ChainId;
    address: string;
    evmChainId?: number;
    className?: string;
}

const LEVEL_STYLE: Record<VerificationResult['level'], string> = {
    verified: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    unverified: 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10',
    'seen-before': 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    unknown: 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10',
    blocked: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
};

const LEVEL_ICON: Record<VerificationResult['level'], React.ElementType> = {
    verified: ShieldCheck,
    unverified: ShieldAlert,
    'seen-before': ShieldAlert,
    unknown: HelpCircle,
    blocked: AlertOctagon
};

/**
 * Verification-status pill for a contract/address, shown before every send.
 * Only EVM addresses get a real source-verification check (Sourcify) — other
 * chains show "no verification data" honestly rather than a fabricated
 * guarantee. A locally-flagged (blocked) address always takes priority.
 */
export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ chain, address, evmChainId, className }) => {
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!address.trim()) {
            queueMicrotask(() => setResult(null));
            return;
        }

        let cancelled = false;
        const controller = new AbortController();
        queueMicrotask(() => setLoading(true));

        checkAddress(chain, address, { evmChainId, signal: controller.signal })
            .then((res) => {
                if (!cancelled) setResult(res);
            })
            .catch(() => {
                if (!cancelled) setResult({ level: 'unknown', label: 'Unknown', detail: 'Verification check failed.' });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [chain, address, evmChainId]);

    if (!address.trim()) return null;

    if (loading && !result) {
        return (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10 ${className ?? ''}`}>
                <Loader2 size={11} className="animate-spin" /> Checking
            </span>
        );
    }

    if (!result) return null;

    const Icon = LEVEL_ICON[result.level];

    return (
        <span
            title={result.detail}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${LEVEL_STYLE[result.level]} ${className ?? ''}`}
        >
            <Icon size={11} /> {result.label}
        </span>
    );
};
