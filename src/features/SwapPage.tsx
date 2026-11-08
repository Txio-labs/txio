import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, Banknote, Loader2, Repeat, Zap } from 'lucide-react';

import { useWallet } from '@/wallet';
import { appStore } from '@/lib/store';
import { RPC_CHAINS, EVM_CHAINS, DEFAULT_EVM_CHAIN_ID } from '@/lib/constants';
import { getRoutes, LifiError, LifiRoute } from '@/lib/lifi';
import { sideshiftChainSlug, asSideshiftCoin, BridgeQuoteResponse, BridgeUnsupportedChainError } from '@/lib/bridge';
import { apiService, ApiError } from '@/services/api';
import { ChainId, RequestType, RequestItem, SwapParams } from '../types';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { SwapReviewModal } from '@/components/SwapReviewModal';
import { OfframpPanel } from '@/components/OfframpPanel';
import { Select } from '@/components/Select';

const SLIPPAGE_PRESETS = [0.1, 0.5, 1];
const DEFAULT_SLIPPAGE = 0.5;
const DEFAULT_DEADLINE_MINUTES = 20;

// Route APIs take integer base units; name the unit so nobody types "1.5 ETH".
const BASE_UNIT: Record<ChainId, string> = {
    evm: 'wei',
    sui: 'MIST',
    solana: 'lamports',
    aptos: 'octas',
    stellar: 'stroops'
};

const chainLabel = (chain: ChainId) => RPC_CHAINS.find((c) => c.id === chain)?.label ?? chain;

const fieldClass =
    'h-9 rounded-lg border border-line bg-surface px-3 text-xs font-mono text-fg outline-none focus:border-line-strong';

const chainOptions = RPC_CHAINS.map((c) => ({ label: c.label, value: c.id }));
const evmOptions = EVM_CHAINS.map((c) => ({ label: c.name, value: String(c.id) }));

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
    const [tab, setTab] = useState<'swap' | 'offramp'>('swap');

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
    const [sideshiftQuote, setSideshiftQuote] = useState<BridgeQuoteResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRoute, setSelectedRoute] = useState<LifiRoute | null>(null);
    const [reviewRequest, setReviewRequest] = useState<RequestItem | null>(null);

    const fromWallet = linkedWallets[fromChain] ?? null;
    const fromAddress = fromWallet?.address ?? null;
    // Funds settle on the destination chain, so the receiving address must be
    // a wallet on that chain's family — the source address is only reusable
    // when both sides are the same family (e.g. EVM → EVM).
    const toAddress = toChain === fromChain ? fromAddress : linkedWallets[toChain]?.address ?? null;
    const amountIsBaseUnits = /^\d+$/.test(fromAmount.trim());

    const canSearch = Boolean(fromAddress && toAddress && fromToken.trim() && toToken.trim() && amountIsBaseUnits);

    /**
     * Falls back to txio-backend's bridge aggregator (which itself tries
     * LI.FI then SideShift) when the client-side LI.FI call above finds
     * nothing — this is what makes pairs like Sui <-> Stellar sendable,
     * since LI.FI doesn't actually route them despite lib/lifi.ts mapping
     * chain keys for both.
     */
    const tryBackendFallback = async () => {
        if (!fromAddress || !toAddress) return;
        try {
            const quote = await apiService.getBridgeQuote({
                from_chain: sideshiftChainSlug(fromChain),
                from_token: asSideshiftCoin(fromToken, fromChain),
                to_chain: sideshiftChainSlug(toChain),
                to_token: asSideshiftCoin(toToken, toChain),
                amount: fromAmount.trim(),
                from_address: fromAddress,
                to_address: toAddress
            });
            setSideshiftQuote(quote);
            setError(null);
            appStore.showToast('Route found via SideShift', 'success');
        } catch (err) {
            if (err instanceof BridgeUnsupportedChainError) {
                setError('No route found for this pair/amount.');
                return;
            }
            const message = err instanceof ApiError ? err.message : 'No route found for this pair/amount.';
            setError(message);
            appStore.showToast(message, 'error');
        }
    };

    const effectiveSlippage = useMemo(() => {
        const custom = Number(customSlippage);
        return customSlippage.trim() && !Number.isNaN(custom) && custom > 0 ? custom : slippagePercent;
    }, [customSlippage, slippagePercent]);

    const handleSearch = async () => {
        if (!fromAddress || !toAddress) return;
        setLoading(true);
        setError(null);
        setRoutes([]);
        setSideshiftQuote(null);
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
                toAddress,
                fromAmount: fromAmount.trim(),
                slippagePercent: effectiveSlippage,
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
                await tryBackendFallback();
            } else {
                appStore.showToast(`${found.length} route${found.length === 1 ? '' : 's'} found`, 'success');
            }
        } catch (err) {
            // LI.FI throws for chain pairs it doesn't support at all (e.g.
            // sui -> stellar) rather than returning an empty route list —
            // that's still a "try the fallback" case, not a hard failure.
            await tryBackendFallback();
            if (!(err instanceof LifiError)) {
                appStore.showToast('Failed to fetch routes.', 'error');
            }
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
            slippagePercent: effectiveSlippage,
            deadlineMinutes,
            selectedRouteId: route.id
        };

        setReviewRequest({
            id: `swap-${route.id}`,
            type: RequestType.SWAP,
            name: `Send ${fromToken.trim()} → ${toToken.trim()}`,
            rpcParams: { method: '', params: [], chain: fromChain },
            moveParams: { ...DEFAULT_MOVE_CALL },
            swapParams
        });
    };

    const handleSelectSideshiftQuote = () => {
        if (!sideshiftQuote) return;

        const swapParams: SwapParams = {
            fromChain,
            toChain,
            fromToken: fromToken.trim(),
            toToken: toToken.trim(),
            fromAmount: fromAmount.trim(),
            slippagePercent: effectiveSlippage,
            deadlineMinutes,
            selectedRouteId: sideshiftQuote.id
        };

        setReviewRequest({
            id: `swap-sideshift-${sideshiftQuote.id}`,
            type: RequestType.SWAP,
            name: `Send ${fromToken.trim()} → ${toToken.trim()}`,
            rpcParams: { method: '', params: [], chain: fromChain },
            moveParams: { ...DEFAULT_MOVE_CALL },
            swapParams
        });
    };

    const reverse = () => {
        setFromChain(toChain);
        setToChain(fromChain);
        setFromEvmChainId(toEvmChainId);
        setToEvmChainId(fromEvmChainId);
        setFromToken(toToken);
        setToToken(fromToken);
    };

    return (
        <div className="flex flex-col h-full bg-surface font-sans overflow-y-auto custom-scrollbar">
            <div className="px-4 sm:px-6 py-5 border-b border-line bg-sunken shrink-0">
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-fg flex items-center gap-3">
<span className="h-9 w-9 rounded-[9px] border border-line bg-surface shadow-card flex items-center justify-center text-fg-muted shrink-0"><Repeat size={16} /></span>
Send
                </h1>
                <p className="text-[14px] text-fg-muted mt-1.5">
                    Compare routes across DEXs and bridges (via LI.FI, with a SideShift fallback) for a swap or cross-chain transfer, or cash out USDC to fiat.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                    <button
                        onClick={() => setTab('swap')}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-colors ${
                            tab === 'swap'
                                ? 'bg-hover text-fg border border-line-strong'
                                : 'border border-line text-fg-subtle hover:bg-hover'
                        }`}
                    >
                        <Repeat size={12} /> Swap / Bridge
                    </button>
                    <button
                        onClick={() => setTab('offramp')}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-colors ${
                            tab === 'offramp'
                                ? 'bg-hover text-fg border border-line-strong'
                                : 'border border-line text-fg-subtle hover:bg-hover'
                        }`}
                    >
                        <Banknote size={12} /> Cash out (USDC → fiat)
                    </button>
                </div>
            </div>

            {tab === 'offramp' ? (
                <div className="flex-1 p-4 sm:p-6 w-full">
                    <OfframpPanel />
                </div>
            ) : (
            <div className="flex-1 p-4 sm:p-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-5 w-full">
                {/* From */}
                <div className="rounded-[10px] border border-line bg-sunken p-4 space-y-3">
                    <label className="text-[12px] font-semibold text-fg-subtle">From</label>
                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                        <Select value={fromChain} options={chainOptions} onChange={(v) => setFromChain(v as ChainId)} fullWidth />
                        {fromChain === 'evm' ? (
                            <Select value={String(fromEvmChainId)} options={evmOptions} onChange={(v) => setFromEvmChainId(Number(v))} fullWidth />
                        ) : (
                            <div className="hidden sm:block" />
                        )}
                    </div>
                    <input
                        value={fromToken}
                        onChange={(e) => setFromToken(e.target.value)}
                        placeholder="Token address or symbol"
                        aria-label="From token"
                        className={`w-full ${fieldClass}`}
                    />
                    <input
                        value={fromAmount}
                        onChange={(e) => setFromAmount(e.target.value)}
                        placeholder={`Amount in ${BASE_UNIT[fromChain]} (integer base units)`}
                        aria-label="Amount"
                        inputMode="numeric"
                        className={`w-full ${fieldClass}`}
                    />
                    {fromAmount.trim() && !amountIsBaseUnits && (
                        <p className="text-[12px] text-red-600 dark:text-red-400 flex items-center gap-1.5">
                            <AlertTriangle size={12} /> Enter a whole number of {BASE_UNIT[fromChain]} — no decimals.
                        </p>
                    )}
                    {!fromAddress && (
                        <p className="text-[12px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle size={12} /> No {chainLabel(fromChain)} wallet linked — connect one to search routes.
                        </p>
                    )}
                </div>

                <div className="flex justify-center -my-2 relative z-10">
                    <button
                        onClick={reverse}
                        className="p-2 rounded-full border border-line bg-surface text-fg-subtle hover:text-fg transition-colors"
                        title="Reverse"
                        aria-label="Reverse from and to"
                    >
                        <ArrowDown size={14} />
                    </button>
                </div>

                {/* To */}
                <div className="rounded-[10px] border border-line bg-sunken p-4 space-y-3">
                    <label className="text-[12px] font-semibold text-fg-subtle">To</label>
                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                        <Select value={toChain} options={chainOptions} onChange={(v) => setToChain(v as ChainId)} fullWidth />
                        {toChain === 'evm' ? (
                            <Select value={String(toEvmChainId)} options={evmOptions} onChange={(v) => setToEvmChainId(Number(v))} fullWidth />
                        ) : (
                            <div className="hidden sm:block" />
                        )}
                    </div>
                    <input
                        value={toToken}
                        onChange={(e) => setToToken(e.target.value)}
                        placeholder="Token address or symbol"
                        aria-label="To token"
                        className={`w-full ${fieldClass}`}
                    />
                    {fromAddress && !toAddress && (
                        <p className="text-[12px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle size={12} /> Link a {chainLabel(toChain)} wallet to receive on {chainLabel(toChain)}.
                        </p>
                    )}
                </div>

                {/* Slippage & deadline */}
                <div className="rounded-[10px] border border-line bg-sunken p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-[12px] font-semibold text-fg-subtle">Slippage tolerance</label>
                        <span className="text-xs font-mono text-fg-muted">{effectiveSlippage}%</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {SLIPPAGE_PRESETS.map((p) => (
                            <button
                                key={p}
                                onClick={() => { setSlippagePercent(p); setCustomSlippage(''); }}
                                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                                    !customSlippage.trim() && slippagePercent === p
                                        ? 'bg-hover text-fg border border-line-strong'
                                        : 'border border-line text-fg-subtle hover:bg-hover'
                                }`}
                            >
                                {p}%
                            </button>
                        ))}
                        <input
                            value={customSlippage}
                            onChange={(e) => setCustomSlippage(e.target.value)}
                            placeholder="Custom %"
                            className="w-24 h-8 rounded-lg border border-line bg-surface px-2 text-[12px] font-mono text-fg outline-none focus:border-line-strong"
                        />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        <label className="text-[12px] font-semibold text-fg-subtle" htmlFor="swap-deadline">Deadline (minutes)</label>
                        <input
                            id="swap-deadline"
                            type="number"
                            min={1}
                            value={deadlineMinutes}
                            onChange={(e) => setDeadlineMinutes(Math.max(1, Number(e.target.value) || DEFAULT_DEADLINE_MINUTES))}
                            className="w-20 h-8 rounded-lg border border-line bg-surface px-2 text-[12px] font-mono text-fg outline-none focus:border-line-strong"
                        />
                    </div>

                    {fromChain !== toChain && (
                        <label className="flex items-center gap-2 pt-1 text-[12px] text-fg-muted">
                            <input type="checkbox" checked={gasTopUp} onChange={(e) => setGasTopUp(e.target.checked)} />
                            Ensure I have gas on the destination chain
                            <span className="text-fg-subtle">(converts part of the bridged amount into destination-chain gas)</span>
                        </label>
                    )}
                </div>

                <button
                    onClick={handleSearch}
                    disabled={!canSearch || loading}
                    className="w-full h-11 rounded-[10px] bg-inverse text-on-inverse text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    {loading ? 'Comparing routes…' : 'Compare routes'}
                </button>

                {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-[12px] text-red-600 dark:text-red-400">
                        <AlertTriangle size={13} /> {error}
                    </div>
                )}
            </div>

            <div className="space-y-2 w-full">
                {routes.length > 0 ? (
                    <>
                        <label className="text-[12px] font-semibold text-fg-subtle">
                            {routes.length} route{routes.length === 1 ? '' : 's'} found
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {routes.map((route) => (
                                <button
                                    key={route.id}
                                    onClick={() => handleSelectRoute(route)}
                                    className={`w-full text-left rounded-[10px] border p-4 transition-colors ${
                                        selectedRoute?.id === route.id
                                            ? 'border-fg/40 bg-hover'
                                            : 'border-line bg-elevated hover:border-line-strong'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {(route.tags ?? []).map((tag) => (
                                                <span key={tag} className="px-2 py-0.5 rounded-full text-[12px] font-semibold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                    {tag}
                                                </span>
                                            ))}
                                            <span className="text-xs font-semibold text-fg">
                                                {route.steps.map((s) => s.tool).join(' → ')}
                                            </span>
                                        </div>
                                        <span className="text-[12px] text-fg-subtle shrink-0">{routeHopCount(route)} hop{routeHopCount(route) === 1 ? '' : 's'}</span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-4 text-[12px] text-fg-subtle">
                                        <span>Cost {routeCostLabel(route)}</span>
                                        <span>~{routeTimeLabel(route)}</span>
                                        <span>You receive {route.toAmountMin}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                ) : sideshiftQuote ? (
                    <>
                        <label className="text-[12px] font-semibold text-fg-subtle">
                            1 route found (via SideShift)
                        </label>
                        <button
                            onClick={handleSelectSideshiftQuote}
                            className="w-full text-left rounded-[10px] border border-fg/40 bg-hover p-4 transition-colors"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    SideShift
                                </span>
                                <span className="text-[12px] text-fg-subtle shrink-0">deposit-address flow</span>
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-[12px] text-fg-subtle">
                                <span>You receive ~{sideshiftQuote.to_amount_estimated} {sideshiftQuote.to.symbol}</span>
                            </div>
                        </button>
                    </>
                ) : (
                    <div className="hidden lg:flex flex-col items-center justify-center h-full min-h-[320px] rounded-[10px] border border-dashed border-line text-center p-6">
                        <Zap size={24} className="text-fg-subtle mb-3" />
                        <p className="text-xs text-fg-subtle">Compared routes will appear here.</p>
                    </div>
                )}
            </div>
            </div>
            )}

            <SwapReviewModal
                isOpen={Boolean(reviewRequest)}
                request={reviewRequest}
                route={selectedRoute}
                sideshiftQuote={selectedRoute ? null : sideshiftQuote}
                onClose={() => { setReviewRequest(null); setSelectedRoute(null); setSideshiftQuote(null); }}
            />
        </div>
    );
};
