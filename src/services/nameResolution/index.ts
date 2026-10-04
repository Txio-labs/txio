import type { ChainId, Network, RequestItem } from '../../types';
import { RequestType } from '../../types';
import { ensResolver } from './ens';
import { aptosNamesResolver } from './aptosNames';
import { federationResolver } from './federation';
import { looksLikeSuiNs, resolveSuiAddress } from '../suiService';

/** JSON-RPC style code for a name that could not be resolved. */
export const NAME_RESOLUTION_FAILED = -32001;

export class NameResolutionFailed extends Error {
    readonly code = NAME_RESOLUTION_FAILED;
    readonly chain: ChainId;
    readonly resolvedName: string;

    constructor(name: string, chain: ChainId, reason: string) {
        super(`Could not resolve "${name}": ${reason}`);
        this.name = 'NameResolutionFailed';
        this.chain = chain;
        this.resolvedName = name;
    }
}

export interface NameResolver {
    chain: ChainId;
    /** Matches candidate names inside a string. Boundaries are checked separately. */
    pattern: RegExp;
    /** Resolves one name to the chain's native address; throws with a plain reason on failure. */
    resolve(name: string, ctx: { network: Network; evmChainId?: number }): Promise<string>;
}

export interface NameResolution {
    name: string;
    address: string;
}

const RESOLVERS: Partial<Record<ChainId, NameResolver>> = {
    evm: ensResolver,
    aptos: aptosNamesResolver,
    stellar: federationResolver
};

/**
 * A match is a name only when it is a whole token: not followed by more name
 * characters (`alice.eth2`, `alice.eth.evil.com`) and not embedded in an email
 * or URL (`bob@alice.eth`, `/alice.eth`).
 */
export const findNames = (pattern: RegExp, text: string): { start: number; end: number; name: string }[] => {
    const re = new RegExp(pattern.source, 'g');
    const found: { start: number; end: number; name: string }[] = [];
    for (const match of text.matchAll(re)) {
        const start = match.index ?? 0;
        const end = start + match[0].length;
        const after = text[end];
        const before = start > 0 ? text[start - 1] : undefined;
        if (after && /[A-Za-z0-9.\-*]/.test(after)) continue;
        if (before && /[A-Za-z0-9@/._\-*]/.test(before)) continue;
        found.push({ start, end, name: match[0] });
    }
    return found;
};

/**
 * Replaces every whole-token name in every string of `value`, at any depth.
 * Each distinct name is resolved once per call.
 */
export const resolveNamesDeep = async <T,>(
    value: T,
    resolver: NameResolver,
    ctx: { network: Network; evmChainId?: number },
    seen: Map<string, string> = new Map()
): Promise<T> => {
    if (typeof value === 'string') {
        const spans = findNames(resolver.pattern, value);
        if (spans.length === 0) return value;
        for (const { name } of spans) {
            if (seen.has(name)) continue;
            try {
                seen.set(name, await resolver.resolve(name, ctx));
            } catch (error) {
                if (error instanceof NameResolutionFailed) throw error;
                throw new NameResolutionFailed(name, resolver.chain, error instanceof Error ? error.message : 'lookup failed');
            }
        }
        let out = '';
        let last = 0;
        for (const { start, end, name } of spans) {
            out += value.slice(last, start) + seen.get(name);
            last = end;
        }
        return (out + value.slice(last)) as unknown as T;
    }
    if (Array.isArray(value)) {
        const items: unknown[] = [];
        for (const item of value) items.push(await resolveNamesDeep(item, resolver, ctx, seen));
        return items as unknown as T;
    }
    if (value && typeof value === 'object') {
        const entries: [string, unknown][] = [];
        for (const [key, item] of Object.entries(value)) entries.push([key, await resolveNamesDeep(item, resolver, ctx, seen)]);
        return Object.fromEntries(entries) as T;
    }
    return value;
};

/**
 * Resolves names in a request for its own chain only: a `.eth` string in a
 * Sui request is left alone, and vice versa. Only fields that carry addresses
 * or arguments are walked; ABI JSON, function signatures and raw calldata are
 * never touched. Returns the request to send plus what was resolved, so the
 * review can show "alice.eth → 0x…".
 */
export const resolveRequestNames = async (
    request: RequestItem,
    network: Network,
    chain: ChainId
): Promise<{ request: RequestItem; resolutions: NameResolution[] }> => {
    const resolver = RESOLVERS[chain];
    if (!resolver) return { request, resolutions: [] };

    const seen = new Map<string, string>();
    const ctx = { network, evmChainId: request.evmTxParams?.chainId };
    let next = request;

    if (request.type === RequestType.TRANSACTION) {
        if (chain === 'evm' && request.evmTxParams) {
            const p = request.evmTxParams;
            next = {
                ...request,
                evmTxParams: {
                    ...p,
                    to: await resolveNamesDeep(p.to, resolver, ctx, seen),
                    args: await resolveNamesDeep(p.args, resolver, ctx, seen)
                }
            };
        } else if (chain === 'aptos' && request.aptosTxParams) {
            const p = request.aptosTxParams;
            next = {
                ...request,
                aptosTxParams: {
                    ...p,
                    moduleAddress: await resolveNamesDeep(p.moduleAddress, resolver, ctx, seen),
                    arguments: await Promise.all(
                        p.arguments.map(async (a) =>
                            a.type === 'string' ? a : { ...a, value: await resolveNamesDeep(a.value, resolver, ctx, seen) }
                        )
                    )
                }
            };
        } else if (chain === 'stellar' && request.stellarTxParams) {
            const p = request.stellarTxParams;
            next = {
                ...request,
                stellarTxParams: {
                    ...p,
                    args: await Promise.all(
                        p.args.map(async (a) =>
                            a.type === 'address' ? { ...a, value: await resolveNamesDeep(a.value, resolver, ctx, seen) } : a
                        )
                    )
                }
            };
        }
    } else if (request.rpcParams && request.rpcParams.params !== undefined) {
        next = {
            ...request,
            rpcParams: { ...request.rpcParams, params: await resolveNamesDeep(request.rpcParams.params, resolver, ctx, seen) }
        };
    }

    return { request: next, resolutions: [...seen.entries()].map(([name, address]) => ({ name, address })) };
};

/** Sui keeps its own resolver (recursive backend/CLI path); re-exported so callers have one import. */
export { looksLikeSuiNs, resolveSuiAddress };
