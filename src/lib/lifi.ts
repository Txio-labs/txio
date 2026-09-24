import { ChainId } from '../types';

/**
 * Client for LI.FI's cross-chain swap/bridge aggregator API
 * (https://li.quest/v1 — not api.li.fi). Keyless for basic use; an
 * `x-lifi-api-key` header raises rate limits but isn't required to
 * prototype, so this calls the API directly from the browser rather than
 * proxying through the backend. If rate limits become a real problem,
 * move this behind a new txio-backend lifi_service.rs (mirroring
 * ai_service.rs's Groq client) without changing this module's exports.
 */

const LIFI_API_BASE = 'https://li.quest/v1';

export class LifiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'LifiError';
        this.status = status;
        Object.setPrototypeOf(this, LifiError.prototype);
    }
}

/** Maps Txio's ChainId to the LI.FI chain key it expects in requests. Aptos has no LI.FI coverage. */
const LIFI_CHAIN_KEY: Record<ChainId, string> = {
    evm: 'eth', // caller must override with the specific EVM chain key/id when not Ethereum mainnet
    sui: 'sui',
    solana: 'sol',
    stellar: 'xlm'
};

export const lifiChainKeyFor = (chain: ChainId, evmChainId?: number): string | number => {
    if (chain === 'evm' && evmChainId) return evmChainId;
    return LIFI_CHAIN_KEY[chain];
};

export interface LifiTransactionRequest {
    to: string;
    data: string;
    value?: string;
    chainId?: number;
    gasLimit?: string;
    gasPrice?: string;
}

/** One step of a route — a route may have multiple steps (e.g. swap then bridge). */
export interface LifiStep {
    id: string;
    type: string;
    tool: string;
    action: {
        fromChainId: number | string;
        toChainId: number | string;
        fromToken: { address: string; symbol: string; decimals: number };
        toToken: { address: string; symbol: string; decimals: number };
        fromAmount: string;
        slippage?: number;
    };
    estimate: {
        toAmount: string;
        toAmountMin: string;
        executionDuration: number;
        approvalAddress?: string;
        feeCosts?: { amountUSD?: string; name?: string }[];
        gasCosts?: { amountUSD?: string }[];
    };
    // Present once a quote resolves this step to a submittable transaction —
    // absent on routes returned by /advanced/routes until a specific route
    // is fetched as a single quote for execution.
    transactionRequest?: LifiTransactionRequest;
}

export interface LifiRoute {
    id: string;
    fromChainId: number | string;
    toChainId: number | string;
    fromAmountUSD?: string;
    toAmountUSD?: string;
    toAmount: string;
    toAmountMin: string;
    steps: LifiStep[];
    // LI.FI itself tags/ranks routes — e.g. CHEAPEST, FASTEST — so the
    // "best price / fastest / fewest hops" comparison doesn't need to be
    // recomputed client-side.
    tags?: string[];
}

export interface GetRoutesParams {
    fromChain: ChainId;
    toChain: ChainId;
    fromEvmChainId?: number;
    toEvmChainId?: number;
    fromToken: string;
    toToken: string;
    fromAddress: string;
    toAddress?: string;
    fromAmount: string;
    slippagePercent: number;
    /** Portion of fromAmount to convert into native gas on the destination chain — LI.FI's "gas subsidy" mechanism, not a source-chain gas-token swap. */
    fromAmountForGas?: string;
}

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
    let response: Response;
    try {
        response = await fetch(`${LIFI_API_BASE}${path}`, {
            ...init,
            headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
        });
    } catch (error) {
        throw new LifiError(
            error instanceof Error && error.message.trim() ? error.message : 'Unable to reach LI.FI.',
            0
        );
    }

    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json().catch(() => null) : null;

    if (!response.ok) {
        const message =
            (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' && body.message) ||
            `LI.FI request failed with status ${response.status}.`;
        throw new LifiError(message, response.status);
    }

    return body as T;
};

/** Multiple ranked routes for a swap/bridge — the actual multi-route-comparison endpoint. */
export const getRoutes = async (params: GetRoutesParams): Promise<LifiRoute[]> => {
    const body = await request<{ routes: LifiRoute[] }>('/advanced/routes', {
        method: 'POST',
        body: JSON.stringify({
            fromChainId: lifiChainKeyFor(params.fromChain, params.fromEvmChainId),
            toChainId: lifiChainKeyFor(params.toChain, params.toEvmChainId),
            fromTokenAddress: params.fromToken,
            toTokenAddress: params.toToken,
            fromAddress: params.fromAddress,
            toAddress: params.toAddress ?? params.fromAddress,
            fromAmount: params.fromAmount,
            options: {
                slippage: params.slippagePercent / 100,
                ...(params.fromAmountForGas ? { fromAmountForGas: params.fromAmountForGas } : {})
            }
        })
    });
    return body.routes;
};

/** Resolves one route's first step to a submittable transaction — call right before execution, not while just comparing routes (quotes can go stale). */
export const getStepTransaction = async (step: LifiStep): Promise<LifiStep> =>
    request<LifiStep>('/advanced/stepTransaction', {
        method: 'POST',
        body: JSON.stringify(step)
    });

export type LifiSubstatus =
    | 'WAIT_SOURCE_CONFIRMATIONS'
    | 'WAIT_DESTINATION_TRANSACTION'
    | 'BRIDGE_NOT_AVAILABLE'
    | 'CHAIN_NOT_AVAILABLE'
    | 'REFUND_IN_PROGRESS'
    | 'UNKNOWN_ERROR'
    | 'COMPLETED'
    | 'PARTIAL'
    | 'REFUNDED'
    | 'PENDING'
    | 'FAILED'
    | 'NOT_FOUND';

export interface LifiStatus {
    status: 'NOT_FOUND' | 'INVALID' | 'PENDING' | 'DONE' | 'FAILED';
    substatus?: LifiSubstatus;
    substatusMessage?: string;
    sending?: { txHash?: string; chainId?: number | string };
    receiving?: { txHash?: string; chainId?: number | string };
}

/** Polls a submitted cross-chain transfer's status — the primitive retry/resume is built on. */
export const getStatus = async (params: {
    txHash: string;
    fromChain: ChainId;
    toChain: ChainId;
    fromEvmChainId?: number;
    toEvmChainId?: number;
    bridge?: string;
}): Promise<LifiStatus> => {
    const query = new URLSearchParams({
        txHash: params.txHash,
        fromChain: String(lifiChainKeyFor(params.fromChain, params.fromEvmChainId)),
        toChain: String(lifiChainKeyFor(params.toChain, params.toEvmChainId)),
        ...(params.bridge ? { bridge: params.bridge } : {})
    });
    return request<LifiStatus>(`/status?${query.toString()}`, { method: 'GET' });
};
