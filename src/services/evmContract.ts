import { formatAbiItem } from 'viem/utils';
import {
    decodeErrorResult,
    formatUnits,
    type Abi,
    type AbiFunction,
    type Hex
} from 'viem';
import { getPublicClient } from 'wagmi/actions';
import { wagmiConfig } from '@/wallet/config';

/**
 * ABI-driven helpers for the EVM contract-call flow: load a contract's
 * interface, split read from write functions, run free read calls, and turn
 * reverts into readable reasons.
 */

export const isReadFunction = (fn: AbiFunction) =>
    fn.stateMutability === 'view' || fn.stateMutability === 'pure';

/** Accepts a bare ABI array or a compiler artifact ({ abi: [...] }). */
export const parseAbiJson = (text: string): Abi => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error('ABI must be valid JSON.');
    }
    const abi = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as { abi?: unknown }).abi)
          ? (parsed as { abi: unknown[] }).abi
          : null;
    if (!abi) throw new Error('Expected an ABI array or an artifact with an "abi" field.');
    return abi as Abi;
};

export const abiFunctions = (abi: Abi): { read: AbiFunction[]; write: AbiFunction[] } => {
    const fns = abi.filter((item): item is AbiFunction => item.type === 'function');
    return { read: fns.filter(isReadFunction), write: fns.filter((f) => !isReadFunction(f)) };
};

/** Human-readable signature, e.g. "transfer(address to, uint256 amount)". */
export const functionSignature = (fn: AbiFunction) => formatAbiItem(fn, { includeName: true });

/** Stable key for a function (overloads share a name). */
export const functionKey = (fn: AbiFunction) => `${fn.name}(${fn.inputs.map((i) => i.type).join(',')})`;

const SOURCIFY = 'https://sourcify.dev/server/v2/contract';

/**
 * Fetches the verified ABI from Sourcify, which indexes verified sources
 * across EVM chains without an API key.
 */
export const fetchVerifiedAbi = async (chainId: number, address: string, signal?: AbortSignal): Promise<Abi> => {
    const res = await fetch(`${SOURCIFY}/${chainId}/${address.trim()}?fields=abi`, { signal });
    if (res.status === 404) {
        throw new Error('This contract isn’t verified on Sourcify. Paste or upload its ABI JSON instead.');
    }
    if (!res.ok) throw new Error(`Couldn’t load the ABI (HTTP ${res.status}).`);
    const body = (await res.json()) as { abi?: Abi };
    if (!Array.isArray(body.abi)) throw new Error('Sourcify returned no ABI for this contract.');
    return body.abi;
};

/** Pulls the revert payload out of a viem error chain and decodes it. */
export const describeEvmError = (error: unknown, abi?: Abi): string => {
    let current: unknown = error;
    let data: Hex | undefined;
    let reason: string | undefined;
    for (let depth = 0; current && depth < 10; depth++) {
        const e = current as { data?: unknown; reason?: string; shortMessage?: string; cause?: unknown };
        if (!reason && typeof e.reason === 'string') reason = e.reason;
        if (!data && typeof e.data === 'string' && e.data.startsWith('0x')) data = e.data as Hex;
        if (!data && e.data && typeof e.data === 'object' && typeof (e.data as { data?: unknown }).data === 'string') {
            data = (e.data as { data: Hex }).data;
        }
        current = e.cause;
    }
    if (data && data !== '0x' && abi) {
        try {
            const decoded = decodeErrorResult({ abi, data });
            const args = (decoded.args ?? []).map((a) => (typeof a === 'bigint' ? a.toString() : JSON.stringify(a)));
            return `Reverted: ${decoded.errorName}(${args.join(', ')})`;
        } catch {
            // Not an error declared in this ABI — fall through.
        }
    }
    if (reason) return `Reverted: ${reason}`;
    const top = error as { shortMessage?: string; message?: string };
    return top?.shortMessage || top?.message || 'Call failed.';
};

/** Runs a view/pure function — no wallet, no gas. */
export const readContract = async (params: {
    chainId: number;
    address: string;
    abi: Abi;
    fn: AbiFunction;
    args: unknown[];
    from?: string | null;
}): Promise<unknown> => {
    const client = getPublicClient(wagmiConfig, { chainId: params.chainId as never });
    if (!client) throw new Error(`No RPC client configured for chain ${params.chainId}.`);
    try {
        return await client.readContract({
            address: params.address.trim() as Hex,
            abi: [params.fn],
            functionName: params.fn.name,
            args: params.args,
            account: (params.from ?? undefined) as Hex | undefined
        } as never);
    } catch (err) {
        throw new Error(describeEvmError(err, params.abi));
    }
};

/**
 * Formats a read result for display. When the contract exposes decimals()
 * and symbol() (an ERC-20), single uint results are also shown in token
 * units, e.g. "4210.55 USDC".
 */
export const formatReadResult = (value: unknown, token?: { decimals: number; symbol: string } | null): string => {
    if (typeof value === 'bigint') {
        return token ? `${formatUnits(value, token.decimals)} ${token.symbol} (${value.toString()})` : value.toString();
    }
    return JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
};

export const loadTokenMeta = async (chainId: number, address: string, abi: Abi) => {
    const has = (name: string) =>
        abi.some((i) => i.type === 'function' && i.name === name && i.inputs.length === 0);
    if (!has('decimals') || !has('symbol')) return null;
    const client = getPublicClient(wagmiConfig, { chainId: chainId as never });
    if (!client) return null;
    try {
        const [decimals, symbol] = await Promise.all([
            client.readContract({ address: address as Hex, abi, functionName: 'decimals' } as never),
            client.readContract({ address: address as Hex, abi, functionName: 'symbol' } as never)
        ]);
        return { decimals: Number(decimals), symbol: String(symbol) };
    } catch {
        return null;
    }
};

// Saved contracts are a per-browser convenience list.
export interface SavedContract {
    chainId: number;
    address: string;
    name: string;
    abi: string;
}

const SAVED_KEY = 'txio_savedContracts';

export const readSavedContracts = (): SavedContract[] => {
    try {
        const raw = localStorage.getItem(SAVED_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
};

export const saveContract = (contract: SavedContract): SavedContract[] => {
    const next = [
        contract,
        ...readSavedContracts().filter(
            (c) => !(c.chainId === contract.chainId && c.address.toLowerCase() === contract.address.toLowerCase())
        )
    ].slice(0, 50);
    try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {
        // Storage unavailable — the list just isn't remembered.
    }
    return next;
};
