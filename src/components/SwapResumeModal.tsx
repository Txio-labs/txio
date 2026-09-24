import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, X } from 'lucide-react';

import { appStore } from '@/lib/store';
import { HistoryItem } from '../types';
import { getStatus, LifiStatus } from '@/lib/lifi';
import { executeTransaction } from '@/services/transactionService';
import { useWallet } from '@/wallet';

interface SwapLeg {
    chain: string;
    tool: string;
    hash?: string;
    explorerUrl?: string;
    status: 'pending' | 'done' | 'failed';
}

interface SwapResumeModalProps {
    isOpen: boolean;
    item: HistoryItem | null;
    onClose: () => void;
}

const legsOf = (item: HistoryItem | null): SwapLeg[] => {
    const result = item?.executionResult;
    if (result && typeof result === 'object' && 'legs' in result && Array.isArray((result as { legs?: unknown }).legs)) {
        return (result as { legs: SwapLeg[] }).legs;
    }
    return [];
};

/** A swap history entry counts as resumable when its last leg has a hash but isn't confirmed done. */
export const isSwapResumable = (item: HistoryItem): boolean => {
    const legs = legsOf(item);
    const last = legs[legs.length - 1];
    return Boolean(last && last.hash && last.status !== 'done');
};

export const SwapResumeModal: React.FC<SwapResumeModalProps> = ({ isOpen, item, onClose }) => {
    const { currentWallet } = useWallet();
    const [checking, setChecking] = useState(false);
    const [status, setStatus] = useState<LifiStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [resubmitting, setResubmitting] = useState(false);

    if (!isOpen || !item) return null;

    const legs = legsOf(item);
    const lastLeg = legs[legs.length - 1];
    const swapParams = item.swapParams;

    const handleCheckStatus = async () => {
        if (!lastLeg?.hash || !swapParams) return;
        setChecking(true);
        setError(null);
        try {
            const result = await getStatus({
                txHash: lastLeg.hash,
                fromChain: swapParams.fromChain,
                toChain: swapParams.toChain
            });
            setStatus(result);
            appStore.showToast(`Status: ${result.status}`, 'info');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to check status.';
            setError(message);
            appStore.showToast(message, 'error');
        } finally {
            setChecking(false);
        }
    };

    const handleResubmit = async () => {
        if (!item.evmTxParams) {
            const message = 'Re-submitting is only supported for EVM legs today.';
            setError(message);
            appStore.showToast(message, 'error');
            return;
        }
        setResubmitting(true);
        setError(null);
        try {
            await executeTransaction(item, { network: 'mainnet', wallet: currentWallet });
            appStore.showToast('Leg re-submitted', 'success');
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Re-submit failed.';
            setError(message);
            appStore.showToast(message, 'error');
        } finally {
            setResubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/70 dark:bg-near-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-white dark:bg-near-black">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Resume Swap</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        {legs.map((leg, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                                {leg.status === 'done' ? (
                                    <CheckCircle2 size={13} className="text-emerald-500" />
                                ) : (
                                    <AlertTriangle size={13} className="text-amber-500" />
                                )}
                                <span className="font-bold text-slate-700 dark:text-slate-300">{leg.tool}</span>
                                <span className="text-slate-400 font-mono truncate">{leg.hash}</span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleCheckStatus}
                        disabled={checking || !lastLeg?.hash}
                        className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40"
                    >
                        {checking ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                        Check current status
                    </button>

                    {status && (
                        <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black p-3 text-xs space-y-1">
                            <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="font-mono">{status.status}</span></div>
                            {status.substatus && <div className="flex justify-between"><span className="text-slate-500">Detail</span><span className="font-mono">{status.substatus}</span></div>}
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-[11px] text-red-600 dark:text-red-400">
                            <AlertTriangle size={13} /> {error}
                        </div>
                    )}

                    <p className="text-[11px] text-slate-500">
                        If LI.FI reports this transfer as failed or stuck rather than still confirming, re-submitting sends the
                        same transaction again using the same parameters that were originally built.
                    </p>

                    <button
                        onClick={handleResubmit}
                        disabled={resubmitting || !currentWallet}
                        className="w-full h-10 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black text-xs font-bold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {resubmitting ? <Loader2 size={13} className="animate-spin" /> : null}
                        {resubmitting ? 'Re-submitting…' : 'Re-submit this leg'}
                    </button>
                </div>
            </div>
        </div>
    );
};
