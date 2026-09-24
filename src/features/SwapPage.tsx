import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, Loader2, Repeat, Zap } from 'lucide-react';

import { useWallet } from '@/wallet';
import { RPC_CHAINS, EVM_CHAINS, DEFAULT_EVM_CHAIN_ID } from '@/lib/constants';
import { getRoutes, LifiError, LifiRoute } from '@/lib/lifi';
import { ChainId, RequestType, RequestItem, SwapParams } from '../types';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { SwapReviewModal } from '@/components/SwapReviewModal';

const SLIPPAGE_PRESETS = [0.1, 0.5, 1];
const DEFAULT_SLIPPAGE = 0.5;
const DEFAULT_DEADLINE_MINUTES = 20;

const routeHopCount = (route: LifiRoute) => route.steps.length;

const routeCostLabel = (route: LifiRoute) => {
    const usd = route.fromAmountUSD && route.toAmountUSD
        ? (Number(route.fromAmountUSD) - Number(route.toAmountUSD)).toFixed(2)
        : null;
    return usd ? `~$${usd}` : '—';
};

const routeTimeLabel = (route: LifiRoute) => {
    const totalSeconds = route.steps.reduce((sum, s) => sum + (s.estimate?.executionDuration ?? 0), 0);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    return `${Math.round(totalSeconds / 60)}m`;
};

export const SwapPage: React.FC = () => {
    const { linkedWallets } = useWallet();

    const [fromChain, setFromChain] = useState<ChainId>('evm');
    const [toChain, setToChain] = useState<ChainId>('evm');
    const [fromEvmChainId, setFromEvmChainId] = useState(DEFAULT_EVM_CHAIN_ID);
    const [toEvmChainId, setToEvmChainId] = useState(DEFAULT_EVM_CHAIN_ID);
    const [fromToken, setFromToken] = useState('');
    const [toToken, setToToken] = useState('');
    const [fromAmount, setFromAmount] = useState('');
    const [slippagePercent, setSlippagePercent] = useState(DEFAULT_SLIPPAGE);
    const [customSlippage, setCustomSlippage] = useState('');
    const [deadlineMinutes, setDeadlineMinutes] = useState(DEFAULT_DEADLINE_MINUTES);
    const [gasTopUp, setGasTopUp] = useState(false);

    const [routes, setRoutes] = useState<LifiRoute[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRoute, setSelectedRoute] = useState<LifiRoute | null>(null);
    const [reviewRequest, setReviewRequest] = useState<RequestItem | null>(null);

    const fromWallet = linkedWallets[fromChain] ?? null;
    const fromAddress = fromWallet?.address ?? null;

    const canSearch = Boolean(fromAddress && fromToken.trim() && toToken.trim() && fromAmount.trim());

    const handleSearch = async () => {
        if (!fromAddress) return;
        setLoading(true);
        setError(null);
        setRoutes([]);
        setSelectedRoute(null);

        try {
            const found = await getRoutes({
                fromChain,
                toChain,
                fromEvmChainId: fromChain === 'evm' ? fromEvmChainId : undefined,
                toEvmChainId: toChain === 'evm' ? toEvmChainId : undefined,
                fromToken: fromToken.trim(),
                toToken: toToken.trim(),
                fromAddress,
                fromAmount: fromAmount.trim(),
                slippagePercent,
                // A simple fixed share (5%) of the transferred amount,
                // converted to destination-chain gas per LI.FI's
                // gas-subsidy mechanism — not a source-chain "pay gas in
                // another token" feature. Integer division stays bigint-safe.
                fromAmountForGas: gasTopUp && /^\d+$/.test(fromAmount.trim())
                    ? String(BigInt(fromAmount.trim()) / BigInt(20))
                    : undefined
            });
            setRoutes(found);
            if (found.length === 0) {
                setError('No routes found for this pair/amount.');
            }
        } catch (err) {
            setError(err instanceof LifiError ? err.message : 'Failed to fetch routes.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectRoute = (route: LifiRoute) => {
        setSelectedRoute(route);

        const swapParams: SwapParams = {
            fromChain,
            toChain,
            fromToken: fromToken.trim(),
            toToken: toToken.trim(),
            fromAmount: fromAmount.trim(),
            slippagePercent,
            deadlineMinutes,
            selectedRouteId: route.id
        };

        setReviewRequest({
            id: `swap-${route.id}`,
            type: RequestType.SWAP,
            name: `Swap ${fromToken.trim()} → ${toToken.trim()}`,
            rpcParams: { method: '', params: [], chain: fromChain },
            moveParams: { ...DEFAULT_MOVE_CALL },
            swapParams
        });
    };

    const effectiveSlippage = useMemo(() => {
        const custom = Number(customSlippage);
        return customSlippage.trim() && !Number.isNaN(custom) && custom > 0 ? custom : slippagePercent;
    }, [customSlippage, slippagePercent]);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-near-black font-sans overflow-y-auto custom-scrollbar">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-dark-indigo-glow/50 shrink-0">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                    <Repeat size={22} className="text-electric-violet" />
                    Swap
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                    Compare routes across DEXs and bridges (via LI.FI) for a same-chain swap or cross-chain transfer.
                </p>
            </div>

            <div className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-5">
                {/* From */}
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-4 space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">From</label>
                    <div className="flex gap-2">
                        <select
                            value={fromChain}
                            onChange={(e) => setFromChain(e.target.value as ChainId)}
                            className="h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-electric-violet"
                        >
                            {RPC_CHAINS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                        {fromChain === 'evm' && (
                            <select
                                value={fromEvmChainId}
                                onChange={(e) => setFromEvmChainId(Number(e.target.value))}
                                className="h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-electric-violet"
                            >
                                {EVM_CHAINS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        )}
                        <input
                            value={fromToken}
                            onChange={(e) => setFromToken(e.target.value)}
                            placeholder="Token address or symbol"
                            className="flex-1 min-w-0 h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                        />
                    </div>
                    <input
                        value={fromAmount}
                        onChange={(e) => setFromAmount(e.target.value)}
                        placeholder="Amount (smallest unit)"
                        className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                    />
                    {!fromAddress && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle size={12} /> No {fromChain.toUpperCase()} wallet linked — connect one to search routes.
                        </p>
                    )}
                </div>

                <div className="flex justify-center -my-2 relative z-10">
                    <button
                        onClick={() => { setFromChain(toChain); setToChain(fromChain); setFromToken(toToken); setToToken(fromToken); }}
                        className="p-2 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black text-slate-500 hover:text-electric-violet transition-colors"
                        title="Reverse"
                    >
                        <ArrowDown size={14} />
                    </button>
                </div>

                {/* To */}
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-4 space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">To</label>
                    <div className="flex gap-2">
                        <select
                            value={toChain}
                            onChange={(e) => setToChain(e.target.value as ChainId)}
                            className="h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-electric-violet"
                        >
                            {RPC_CHAINS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                        {toChain === 'evm' && (
                            <select
                                value={toEvmChainId}
                                onChange={(e) => setToEvmChainId(Number(e.target.value))}
                                className="h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-electric-violet"
                            >
                                {EVM_CHAINS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        )}
                        <input
                            value={toToken}
                            onChange={(e) => setToToken(e.target.value)}
                            placeholder="Token address or symbol"
                            className="flex-1 min-w-0 h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                        />
                    </div>
                </div>

                {/* Slippage & deadline */}
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Slippage tolerance</label>
                        <span className="text-xs font-mono text-slate-600 dark:text-slate-300">{effectiveSlippage}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {SLIPPAGE_PRESETS.map((p) => (
                            <button
                                key={p}
                                onClick={() => { setSlippagePercent(p); setCustomSlippage(''); }}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                                    !customSlippage.trim() && slippagePercent === p
                                        ? 'bg-electric-violet/10 text-electric-violet border border-electric-violet/30'
                                        : 'border border-slate-200 dark:border-white/10 text-slate-500 hover:bg-white dark:hover:bg-white/5'
                                }`}
                            >
                                {p}%
                            </button>
                        ))}
                        <input
                            value={customSlippage}
                            onChange={(e) => setCustomSlippage(e.target.value)}
                            placeholder="Custom %"
                            className="w-24 h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-2 text-[11px] font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                        />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="swap-deadline">Deadline (minutes)</label>
                        <input
                            id="swap-deadline"
                            type="number"
                            min={1}
                            value={deadlineMinutes}
                            onChange={(e) => setDeadlineMinutes(Math.max(1, Number(e.target.value) || DEFAULT_DEADLINE_MINUTES))}
                            className="w-20 h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-2 text-[11px] font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                        />
                    </div>

                    {fromChain !== toChain && (
                        <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                            <input type="checkbox" checked={gasTopUp} onChange={(e) => setGasTopUp(e.target.checked)} />
                            Ensure I have gas on the destination chain
                            <span className="text-slate-400">(converts part of the bridged amount into destination-chain gas)</span>
                        </label>
                    )}
                </div>

                <button
                    onClick={handleSearch}
                    disabled={!canSearch || loading}
                    className="w-full h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-near-black text-sm font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    {loading ? 'Comparing routes…' : 'Compare routes'}
                </button>

                {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-[11px] text-red-600 dark:text-red-400">
                        <AlertTriangle size={13} /> {error}
                    </div>
                )}

                {routes.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {routes.length} route{routes.length === 1 ? '' : 's'} found
                        </label>
                        {routes.map((route) => (
                            <button
                                key={route.id}
                                onClick={() => handleSelectRoute(route)}
                                className={`w-full text-left rounded-xl border p-4 transition-colors ${
                                    selectedRoute?.id === route.id
                                        ? 'border-electric-violet bg-electric-violet/5'
                                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-dark-indigo-glow hover:border-electric-violet/40'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {(route.tags ?? []).map((tag) => (
                                            <span key={tag} className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                {tag}
                                            </span>
                                        ))}
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            {route.steps.map((s) => s.tool).join(' → ')}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">{routeHopCount(route)} hop{routeHopCount(route) === 1 ? '' : 's'}</span>
                                </div>
                                <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
                                    <span>Cost {routeCostLabel(route)}</span>
                                    <span>~{routeTimeLabel(route)}</span>
                                    <span>You receive {route.toAmountMin}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <SwapReviewModal
                isOpen={Boolean(reviewRequest)}
                request={reviewRequest}
                route={selectedRoute}
                onClose={() => { setReviewRequest(null); setSelectedRoute(null); }}
            />
        </div>
    );
};
