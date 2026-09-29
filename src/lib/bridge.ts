import { ChainId } from '../types';

/**
 * Types and chain-slug mapping for txio-backend's bridge module
 * (`/api/v1/bridge/...`). This is the fallback path for pairs LI.FI doesn't
 * route (see lib/lifi.ts) — notably Sui <-> Stellar today, though the
 * backend itself decides that by asking LI.FI first, not by a hardcoded
 * pair list here.
 *
 * Unlike LI.FI, SideShift doesn't return a signable transaction: it returns
 * a deposit address the user sends funds to from their own wallet, and the
 * shift settles asynchronously. That's a fundamentally different UX from
 * "sign and broadcast," which is why SideShift quotes are handled as a
 * separate branch in SwapReviewModal rather than reusing the LI.FI
 * sign-and-execute path.
 */

export type BridgeProvider = 'lifi' | 'sideshift';

/**
 * SideShift's own network slugs. Distinct from LI.FI's chain keys
 * (lib/lifi.ts's LIFI_CHAIN_KEY) — the two aggregators don't share a
 * naming convention.
 */
const SIDESHIFT_CHAIN_SLUG: Partial<Record<ChainId, string>> = {
    sui: 'sui',
    stellar: 'stellar',
    solana: 'solana',
    evm: 'ethereum'
};

/** SideShift's own coin symbol for a chain's native asset. */
const SIDESHIFT_NATIVE_COIN: Partial<Record<ChainId, string>> = {
    sui: 'sui',
    stellar: 'xlm',
    solana: 'sol',
    evm: 'eth'
};

export class BridgeUnsupportedChainError extends Error {
    constructor(chain: ChainId) {
        super(`${chain} is not supported by the SideShift fallback.`);
        this.name = 'BridgeUnsupportedChainError';
    }
}

export const sideshiftChainSlug = (chain: ChainId): string => {
    const slug = SIDESHIFT_CHAIN_SLUG[chain];
    if (!slug) throw new BridgeUnsupportedChainError(chain);
    return slug;
};

export const sideshiftNativeCoin = (chain: ChainId): string => {
    const coin = SIDESHIFT_NATIVE_COIN[chain];
    if (!coin) throw new BridgeUnsupportedChainError(chain);
    return coin;
};

/**
 * Resolves a free-text token field (LI.FI-style contract address or symbol)
 * to the coin symbol SideShift's API expects. SideShift only recognizes a
 * closed vocabulary of tickers, not contract addresses, so an unrecognized
 * or address-shaped value falls back to the chain's native coin rather than
 * being forwarded as-is (which SideShift rejects with "Invalid coin").
 *
 * This can't yet resolve a non-native token (e.g. USDC) from its contract
 * address to SideShift's `usdc` ticker — anything address-shaped falls back
 * to native. A user who wants to shift USDC specifically should type "usdc"
 * directly rather than pasting the contract address.
 */
export const asSideshiftCoin = (raw: string, chain: ChainId): string => {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return sideshiftNativeCoin(chain);

    // A real coin symbol is short and has no path/module separators; an
    // address (EVM 0x..., Sui 0x...::module::Type, Stellar G..., Solana
    // base58, etc.) is long or contains ':'. Anything else falls back to
    // native rather than risking a symbol SideShift doesn't recognize.
    const MAX_COIN_SYMBOL_LENGTH = 10;
    if (trimmed.length > MAX_COIN_SYMBOL_LENGTH || trimmed.includes(':')) {
        return sideshiftNativeCoin(chain);
    }
    return trimmed;
};

export interface BridgeChainAsset {
    chain: string;
    family: unknown;
    token: string;
    symbol: string;
    decimals: number;
}

export interface BridgeQuoteRequest {
    from_chain: string;
    from_token: string;
    to_chain: string;
    to_token: string;
    amount: string;
    from_address: string;
    to_address: string;
    provider?: BridgeProvider;
}

export interface BridgeQuoteResponse {
    id: string;
    provider: BridgeProvider;
    from: BridgeChainAsset;
    to: BridgeChainAsset;
    from_amount: string;
    to_amount_estimated: string;
    fee_usd_estimated?: number | null;
    estimated_duration_seconds?: number | null;
    // For a sideshift quote: { sideshiftQuoteId: string }.
    execution_payload: Record<string, unknown>;
    expires_at?: string | null;
}

export interface BridgeExecuteOrderRequest {
    quote_id: string;
    provider: BridgeProvider;
    from_chain: string;
    from_token: string;
    to_chain: string;
    to_token: string;
    from_address: string;
    to_address: string;
}

export type BridgeOrderStatus =
    | 'pending'
    | 'awaiting_deposit'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'refunded'
    | 'expired';

export interface BridgeOrder {
    quote_id: string;
    provider: BridgeProvider;
    provider_order_id: string;
    from_chain: string;
    from_token: string;
    to_chain: string;
    to_token: string;
    from_address: string;
    to_address: string;
    status: BridgeOrderStatus;
    tx_hash?: string | null;
    created_at: string;
    updated_at: string;
}

export interface BridgeExecuteOrderResponse {
    order: BridgeOrder;
    // For SideShift: the raw /shifts/fixed response — carries depositAddress, depositCoin, etc.
    provider_response: Record<string, unknown>;
}

export interface OfframpQuoteRequest {
    source_chain: string;
    amount_usdc: string;
    fiat_currency: string;
    country: string;
}

export type OfframpProvider = 'bridgexyz' | 'transak';

export interface OfframpQuoteResponse {
    provider: OfframpProvider;
    amount_usdc: string;
    estimated_fiat_amount: string;
    fiat_currency: string;
    fee_usd_estimated?: number | null;
    redirect_url?: string | null;
    widget_config?: Record<string, unknown> | null;
}
