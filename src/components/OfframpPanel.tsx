import React, { useState } from 'react';
import { Select } from '@/components/Select';
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
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-5 w-full">
                <div className="rounded-[10px] border border-line bg-sunken p-4 space-y-3">
                    <label className="text-[12px] font-semibold text-fg-subtle">From</label>
                    <Select
                        value={sourceChain}
                        options={RPC_CHAINS.map((c) => ({ label: c.label, value: c.id }))}
                        onChange={(v) => setSourceChain(v as ChainId)}
                        fullWidth
                    />
                    <input
                        value={amountUsdc}
                        onChange={(e) => setAmountUsdc(e.target.value)}
                        placeholder="Amount (USDC)"
                        className="w-full h-9 rounded-lg border border-line bg-surface px-3 text-xs font-mono text-fg outline-none focus:border-line-strong"
                    />
                    {!wallet && (
                        <p className="text-[12px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle size={12} /> No {RPC_CHAINS.find((c) => c.id === sourceChain)?.label ?? sourceChain} wallet linked.
                        </p>
                    )}
                </div>

                <div className="rounded-[10px] border border-line bg-sunken p-4 space-y-3">
                    <label className="text-[12px] font-semibold text-fg-subtle">To (fiat)</label>
                    <div className="flex gap-2">
                        <div className="w-28 shrink-0">
                            <Select
                                value={fiatCurrency}
                                options={FIAT_CURRENCIES.map((c) => ({ label: c, value: c }))}
                                onChange={setFiatCurrency}
                                fullWidth
                            />
                        </div>
                        <input
                            value={country}
                            onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
                            placeholder="Country (e.g. US)"
                            maxLength={2}
                            className="flex-1 min-w-0 h-9 rounded-lg border border-line bg-surface px-3 text-xs font-mono text-fg outline-none focus:border-line-strong"
                        />
                    </div>
                </div>

                <button
                    onClick={handleGetQuote}
                    disabled={!canQuote || loading}
                    className="w-full h-11 rounded-[10px] bg-inverse text-on-inverse text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />}
                    {loading ? 'Getting quote…' : 'Get off-ramp quote'}
                </button>

                {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-[12px] text-red-600 dark:text-red-400">
                        <AlertTriangle size={13} /> {error}
                    </div>
                )}
            </div>

            <div className="w-full">
                {quote ? (
                    <div className="rounded-[10px] border border-fg/40 bg-hover p-4 space-y-3">
                        <div className="flex justify-between text-xs">
                            <span className="text-fg-subtle">Provider</span>
                            <span className="font-mono text-fg-muted">{quote.provider === 'bridgexyz' ? 'Bridge.xyz' : 'Transak'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-fg-subtle">You receive (est.)</span>
                            <span className="font-mono text-fg-muted">{quote.estimated_fiat_amount} {quote.fiat_currency}</span>
                        </div>
                        {quote.fee_usd_estimated != null && (
                            <div className="flex justify-between text-xs">
                                <span className="text-fg-subtle">Fee (est.)</span>
                                <span className="font-mono text-fg-muted">${quote.fee_usd_estimated.toFixed(2)}</span>
                            </div>
                        )}
                        <button
                            onClick={handleContinue}
                            className="w-full h-10 rounded-lg bg-inverse text-on-inverse text-xs font-semibold hover:opacity-90 flex items-center justify-center gap-2"
                        >
                            Continue with {quote.provider === 'bridgexyz' ? 'Bridge.xyz' : 'Transak'} <ArrowUpRight size={13} />
                        </button>
                        <p className="text-[12px] text-fg-subtle">
                            You&apos;ll complete KYC and bank details directly with {quote.provider === 'bridgexyz' ? 'Bridge.xyz' : 'Transak'} — txio never sees that information.
                        </p>
                    </div>
                ) : (
                    <div className="hidden lg:flex flex-col items-center justify-center h-full min-h-[320px] rounded-[10px] border border-dashed border-line text-center p-6">
                        <Banknote size={24} className="text-fg-subtle mb-3" />
                        <p className="text-xs text-fg-subtle">Your off-ramp quote will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
