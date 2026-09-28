import React, { useState } from 'react';
import { AlertTriangle, ArrowUpRight, Banknote, Loader2 } from 'lucide-react';

import { useWallet } from '@/wallet';
import { appStore } from '@/lib/store';
import { RPC_CHAINS } from '@/lib/constants';
import { apiService, ApiError } from '@/services/api';
import { sideshiftChainSlug } from '@/lib/bridge';
import { OfframpQuoteResponse } from '@/lib/bridge';
import { ChainId } from '../types';

const FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS'];

/**
 * USDC -> fiat off-ramp. txio never collects KYC/bank details itself — this
 * only gets a quote from the backend (Bridge.xyz preferred, Transak
 * fallback) and hands the user off to that provider's own hosted flow to
 * finish the cash-out.
 */
export const OfframpPanel: React.FC = () => {
    const { linkedWallets } = useWallet();

    const [sourceChain, setSourceChain] = useState<ChainId>('evm');
    const [amountUsdc, setAmountUsdc] = useState('');
    const [fiatCurrency, setFiatCurrency] = useState('USD');
    const [country, setCountry] = useState('US');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quote, setQuote] = useState<OfframpQuoteResponse | null>(null);

    const canQuote = Boolean(amountUsdc.trim() && fiatCurrency.trim() && country.trim().length === 2);
    const wallet = linkedWallets[sourceChain] ?? null;

    const handleGetQuote = async () => {
        setLoading(true);
        setError(null);
        setQuote(null);
        try {
            const result = await apiService.getOfframpQuote({
                source_chain: sideshiftChainSlug(sourceChain),
                amount_usdc: amountUsdc.trim(),
                fiat_currency: fiatCurrency.trim().toUpperCase(),
                country: country.trim().toUpperCase()
            });
            setQuote(result);
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Failed to get an off-ramp quote.';
            setError(message);
            appStore.showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = () => {
        if (!quote) return;
        if (quote.redirect_url) {
            window.open(quote.redirect_url, '_blank', 'noopener,noreferrer');
            return;
        }
        if (quote.widget_config) {
            appStore.showToast(`Continue with ${quote.provider === 'bridgexyz' ? 'Bridge.xyz' : 'Transak'} to finish cashing out.`, 'success');
        }
    };

    return (
        <div className="space-y-5 w-full max-w-md">
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-4 space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">From</label>
                <select
                    value={sourceChain}
                    onChange={(e) => setSourceChain(e.target.value as ChainId)}
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-electric-violet"
                >
                    {RPC_CHAINS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <input
                    value={amountUsdc}
                    onChange={(e) => setAmountUsdc(e.target.value)}
                    placeholder="Amount (USDC)"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                />
                {!wallet && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle size={12} /> No {sourceChain.toUpperCase()} wallet linked.
                    </p>
                )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-4 space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">To (fiat)</label>
                <div className="flex gap-2">
                    <select
                        value={fiatCurrency}
                        onChange={(e) => setFiatCurrency(e.target.value)}
                        className="h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-electric-violet"
                    >
                        {FIAT_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input
                        value={country}
                        onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="Country (e.g. US)"
                        maxLength={2}
                        className="flex-1 min-w-0 h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                    />
                </div>
            </div>

            <button
                onClick={handleGetQuote}
                disabled={!canQuote || loading}
                className="w-full h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-near-black text-sm font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />}
                {loading ? 'Getting quote…' : 'Get off-ramp quote'}
            </button>

            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-[11px] text-red-600 dark:text-red-400">
                    <AlertTriangle size={13} /> {error}
                </div>
            )}

            {quote && (
                <div className="rounded-xl border border-electric-violet bg-electric-violet/5 p-4 space-y-3">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Provider</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{quote.provider === 'bridgexyz' ? 'Bridge.xyz' : 'Transak'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">You receive (est.)</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{quote.estimated_fiat_amount} {quote.fiat_currency}</span>
                    </div>
                    {quote.fee_usd_estimated != null && (
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Fee (est.)</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">${quote.fee_usd_estimated.toFixed(2)}</span>
                        </div>
                    )}
                    <button
                        onClick={handleContinue}
                        className="w-full h-10 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2"
                    >
                        Continue with {quote.provider === 'bridgexyz' ? 'Bridge.xyz' : 'Transak'} <ArrowUpRight size={13} />
                    </button>
                    <p className="text-[10px] text-slate-400">
                        You&apos;ll complete KYC and bank details directly with {quote.provider === 'bridgexyz' ? 'Bridge.xyz' : 'Transak'} — txio never sees that information.
                    </p>
                </div>
            )}
        </div>
    );
};
