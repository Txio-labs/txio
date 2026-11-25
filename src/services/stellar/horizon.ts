/**
 * Stellar's Horizon is a REST API, not JSON-RPC. It holds what Soroban RPC
 * does not: account balances and signers, payments and operations history,
 * ledgers, fee stats and assets. To let a Horizon call sit in the same
 * "method + params" builder as Soroban RPC, each read endpoint is exposed
 * under a `horizon_*` method whose positional params fill the URL. The result
 * is Horizon's JSON response as-is.
 */

type Params = unknown[];

interface HorizonMethod {
    path: (params: Params) => string;
    template: unknown[];
}

const seg = (params: Params, i: number, name: string): string => {
    const value = params[i];
    if ((typeof value !== 'string' && typeof value !== 'number') || !String(value).trim()) {
        throw new Error(`Missing ${name} (param ${i + 1}).`);
    }
    return encodeURIComponent(String(value).trim());
};

/** Page size from an optional param: 1 to 200 (Horizon's limit), default 10. */
const limit = (params: Params, i: number): number => {
    const n = Number(params[i]);
    return Number.isInteger(n) && n > 0 ? Math.min(n, 200) : 10;
};

const page = (params: Params, i: number) => `order=desc&limit=${limit(params, i)}`;

export const HORIZON_METHODS: Record<string, HorizonMethod> = {
    stellar_getRoot: { path: () => '/', template: [] },
    stellar_getAccount: { path: (p) => `/accounts/${seg(p, 0, 'account')}`, template: ['<G... account>'] },
    stellar_getAccountPayments: {
        path: (p) => `/accounts/${seg(p, 0, 'account')}/payments?${page(p, 1)}&include_failed=true`,
        template: ['<G... account>', 10]
    },
    stellar_getAccountOperations: {
        path: (p) => `/accounts/${seg(p, 0, 'account')}/operations?${page(p, 1)}&include_failed=true`,
        template: ['<G... account>', 10]
    },
    stellar_getAccountTransactions: {
        path: (p) => `/accounts/${seg(p, 0, 'account')}/transactions?${page(p, 1)}&include_failed=true`,
        template: ['<G... account>', 10]
    },
    stellar_getTransaction: { path: (p) => `/transactions/${seg(p, 0, 'transaction hash')}`, template: ['<transaction hash>'] },
    stellar_getTransactionOperations: {
        path: (p) => `/transactions/${seg(p, 0, 'transaction hash')}/operations`,
        template: ['<transaction hash>']
    },
    stellar_getLatestLedgers: { path: (p) => `/ledgers?${page(p, 0)}`, template: [5] },
    stellar_getLedger: { path: (p) => `/ledgers/${seg(p, 0, 'ledger sequence')}`, template: ['<ledger sequence>'] },
    stellar_getFeeStats: { path: () => '/fee_stats', template: [] },
    stellar_getAssets: {
        path: (p) => `/assets?asset_code=${seg(p, 0, 'asset code')}${p[1] ? `&asset_issuer=${seg(p, 1, 'issuer')}` : ''}&limit=${limit(p, 2)}`,
        template: ['USDC', '', 10]
    },
    stellar_getClaimableBalances: {
        path: (p) => `/claimable_balances?claimant=${seg(p, 0, 'claimant')}&${page(p, 1)}`,
        template: ['<G... account>', 10]
    }
};

export const isHorizonMethod = (method: string): boolean => Object.prototype.hasOwnProperty.call(HORIZON_METHODS, method);

export interface HorizonResponse {
    ok: boolean;
    status: number;
    data: unknown;
    url: string;
}

/** Builds and sends one Horizon GET for a named method. Throws only for unknown methods or bad params. */
export const callHorizon = async (baseUrl: string, method: string, params: Params, signal?: AbortSignal): Promise<HorizonResponse> => {
    const spec = HORIZON_METHODS[method];
    if (!spec) {
        throw new Error(`Unknown Stellar data method "${method}". Available: ${Object.keys(HORIZON_METHODS).join(', ')}.`);
    }
    const path = spec.path(params);
    const url = `${baseUrl.replace(/\/$/, '')}${path === '/' ? '' : path}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal });
    const text = await response.text();
    let data: unknown = text;
    try {
        data = JSON.parse(text);
    } catch {
        // Non-JSON body (rare): keep the raw text.
    }
    return { ok: response.ok, status: response.status, data, url };
};

/** Horizon's own error text: its problem+json `detail`, else `title`. */
export const horizonErrorMessage = (data: unknown, status: number): string => {
    if (data && typeof data === 'object') {
        const { detail, title } = data as { detail?: unknown; title?: unknown };
        if (typeof detail === 'string' && detail) return detail;
        if (typeof title === 'string' && title) return title;
    }
    if (typeof data === 'string' && data.trim()) return data.trim();
    return `Stellar data service returned HTTP ${status}.`;
};
