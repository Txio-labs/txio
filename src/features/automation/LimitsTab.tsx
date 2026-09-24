import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Save, ShieldOff, Trash2 } from 'lucide-react';
import { apiService, ApiError } from '@/services/api';
import type { ConnectedWallet } from '@/wallet/types';
import { appStore } from '@/lib/store';

interface LimitsTabProps {
    wallet: ConnectedWallet;
}

interface FormState {
    dailyLimitUsd: string;
    perTxLimitUsd: string;
    maxTxPerHour: string;
}

const EMPTY_FORM: FormState = { dailyLimitUsd: '', perTxLimitUsd: '', maxTxPerHour: '' };

export const LimitsTab: React.FC<LimitsTabProps> = ({ wallet }) => {
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasPolicy, setHasPolicy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        queueMicrotask(() => {
            setLoading(true);
            setError(null);
        });
        apiService
            .getSpendPolicy(wallet.address)
            .then((policy) => {
                if (cancelled) return;
                if (policy) {
                    setHasPolicy(true);
                    setForm({
                        dailyLimitUsd: policy.daily_limit_usd?.toString() ?? '',
                        perTxLimitUsd: policy.per_tx_limit_usd?.toString() ?? '',
                        maxTxPerHour: policy.max_tx_per_hour?.toString() ?? ''
                    });
                } else {
                    setHasPolicy(false);
                    setForm(EMPTY_FORM);
                }
            })
            .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load spend limits.'))
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [wallet.address]);

    const parseOrNull = (value: string): number | null => {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const n = Number(trimmed);
        return Number.isFinite(n) && n >= 0 ? n : null;
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await apiService.upsertSpendPolicy({
                walletFamily: wallet.family,
                walletAddress: wallet.address,
                dailyLimitUsd: parseOrNull(form.dailyLimitUsd),
                perTxLimitUsd: parseOrNull(form.perTxLimitUsd),
                maxTxPerHour: form.maxTxPerHour.trim() ? Number(form.maxTxPerHour.trim()) : null
            });
            setHasPolicy(true);
            appStore.showToast('Spend limits saved', 'success');
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to save spend limits.');
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async () => {
        setSaving(true);
        setError(null);
        try {
            await apiService.deleteSpendPolicy(wallet.address);
            setForm(EMPTY_FORM);
            setHasPolicy(false);
            appStore.showToast('Spend limits removed', 'success');
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to remove spend limits.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs gap-2">
                <Loader2 size={16} className="animate-spin" /> Loading limits…
            </div>
        );
    }

    return (
        <div className="p-6 max-w-xl mx-auto space-y-5">
            <p className="text-xs text-slate-500">
                Caps enforced before any transaction on this wallet executes — interactive or automated (scheduled tasks
                always go through this check, since there&apos;s no human present to warn). Leave a field blank for no cap on
                that dimension.
            </p>

            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-4 space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="daily-limit">
                        Daily limit (USD)
                    </label>
                    <input
                        id="daily-limit"
                        value={form.dailyLimitUsd}
                        onChange={(e) => setForm((f) => ({ ...f, dailyLimitUsd: e.target.value }))}
                        placeholder="No limit"
                        inputMode="decimal"
                        className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="per-tx-limit">
                        Per-transaction limit (USD)
                    </label>
                    <input
                        id="per-tx-limit"
                        value={form.perTxLimitUsd}
                        onChange={(e) => setForm((f) => ({ ...f, perTxLimitUsd: e.target.value }))}
                        placeholder="No limit"
                        inputMode="decimal"
                        className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="max-tx">
                        Max transactions per window
                    </label>
                    <input
                        id="max-tx"
                        value={form.maxTxPerHour}
                        onChange={(e) => setForm((f) => ({ ...f, maxTxPerHour: e.target.value }))}
                        placeholder="No limit"
                        inputMode="numeric"
                        className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                    />
                </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 p-3 text-[11px] text-amber-700 dark:text-amber-400">
                <ShieldOff size={13} className="shrink-0 mt-0.5" />
                USD valuation for on-chain amounts isn&apos;t wired to a live price feed yet — dollar-denominated limits
                aren&apos;t enforced against real transaction values until that lands. Transaction-count limits work today.
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-[11px] text-red-600 dark:text-red-400">
                    <AlertTriangle size={13} /> {error}
                </div>
            )}

            <div className="flex items-center gap-2">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black hover:opacity-90 disabled:opacity-40"
                >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Save
                </button>
                {hasPolicy && (
                    <button
                        onClick={handleRemove}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/15 disabled:opacity-40"
                    >
                        <Trash2 size={13} /> Remove limits
                    </button>
                )}
            </div>
        </div>
    );
};
