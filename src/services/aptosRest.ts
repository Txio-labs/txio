/**
 * Aptos fullnodes speak REST, not JSON-RPC. To let an Aptos request sit in the
 * same "method + params" builder as every other chain, each read endpoint is
 * exposed under a named method whose params fill the URL path (and, for
 * `view`, the POST body). The result is the fullnode's JSON response as-is.
 */

type Params = unknown[];

interface AptosMethod {
    http: 'GET' | 'POST';
    path: (params: Params) => string;
    body?: (params: Params) => unknown;
    template: unknown[];
}

const seg = (params: Params, i: number, name: string): string => {
    const value = params[i];
    if (typeof value !== 'string' && typeof value !== 'number') {
        throw new Error(`Missing ${name} (param ${i + 1}).`);
    }
    return encodeURIComponent(String(value).trim());
};

export const APTOS_REST_METHODS: Record<string, AptosMethod> = {
    getLedgerInfo: { http: 'GET', path: () => '', template: [] },
    getAccount: { http: 'GET', path: (p) => `/accounts/${seg(p, 0, 'address')}`, template: ['<account address>'] },
    getAccountBalance: {
        http: 'GET',
        path: (p) => `/accounts/${seg(p, 0, 'address')}/balance/${seg(p, 1, 'asset type')}`,
        template: ['<account address>', '0x1::aptos_coin::AptosCoin']
    },
    getAccountResources: {
        http: 'GET',
        path: (p) => `/accounts/${seg(p, 0, 'address')}/resources`,
        template: ['<account address>']
    },
    getAccountResource: {
        http: 'GET',
        path: (p) => `/accounts/${seg(p, 0, 'address')}/resource/${seg(p, 1, 'resource type')}`,
        template: ['<account address>', '0x1::account::Account']
    },
    getAccountModules: {
        http: 'GET',
        path: (p) => `/accounts/${seg(p, 0, 'address')}/modules`,
        template: ['<account address>']
    },
    getAccountTransactions: {
        http: 'GET',
        path: (p) => `/accounts/${seg(p, 0, 'address')}/transactions?limit=${Number(p[1]) > 0 ? Number(p[1]) : 25}`,
        template: ['<account address>', 25]
    },
    getTransactionByHash: {
        http: 'GET',
        path: (p) => `/transactions/by_hash/${seg(p, 0, 'transaction hash')}`,
        template: ['<0x transaction hash>']
    },
    getTransactionByVersion: {
        http: 'GET',
        path: (p) => `/transactions/by_version/${seg(p, 0, 'version')}`,
        template: ['<ledger version>']
    },
    getBlockByHeight: {
        http: 'GET',
        path: (p) => `/blocks/by_height/${seg(p, 0, 'height')}?with_transactions=false`,
        template: ['<block height>']
    },
    estimateGasPrice: { http: 'GET', path: () => '/estimate_gas_price', template: [] },
    view: {
        http: 'POST',
        path: () => '/view',
        body: (p) => p[0],
        template: [
            {
                function: '0x1::coin::balance',
                type_arguments: ['0x1::aptos_coin::AptosCoin'],
                arguments: ['<account address>']
            }
        ]
    }
};

export interface AptosRestResponse {
    ok: boolean;
    status: number;
    data: unknown;
    url: string;
}

/** Builds and sends one Aptos REST call for a named method. Throws only for unknown methods or bad params. */
export const callAptosRest = async (
    baseUrl: string,
    method: string,
    params: Params,
    signal?: AbortSignal
): Promise<AptosRestResponse> => {
    const spec = APTOS_REST_METHODS[method];
    if (!spec) {
        throw new Error(`Unknown Aptos method "${method}". Available: ${Object.keys(APTOS_REST_METHODS).join(', ')}.`);
    }
    const url = `${baseUrl.replace(/\/$/, '')}${spec.path(params)}`;
    const response = await fetch(url, {
        method: spec.http,
        // Without Accept the fullnode answers browsers with plain-text errors.
        headers: spec.http === 'POST' ? { Accept: 'application/json', 'Content-Type': 'application/json' } : { Accept: 'application/json' },
        body: spec.body ? JSON.stringify(spec.body(params)) : undefined,
        signal
    });
    const text = await response.text();
    let data: unknown = text;
    try {
        data = JSON.parse(text);
    } catch {
        // Non-JSON body (rare) — keep the raw text.
    }
    return { ok: response.ok, status: response.status, data, url };
};

/** The fullnode's own error message, when its error body carries one. */
export const aptosErrorMessage = (data: unknown, status: number): string => {
    if (data && typeof data === 'object' && typeof (data as { message?: unknown }).message === 'string') {
        return (data as { message: string }).message;
    }
    if (typeof data === 'string' && data.trim()) return data.trim();
    return `Aptos fullnode returned HTTP ${status}.`;
};
