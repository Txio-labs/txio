import { ChainId } from '../types';

/**
 * Contract/address verification for the safety badge shown before every
 * send. Only EVM has a real, checkable source-verification registry
 * (Sourcify) — Sui/Solana/Stellar have no equivalent public service, so
 * their "verification" is a much weaker interaction-history heuristic and
 * is labeled distinctly so it's never mistaken for the same guarantee.
 */

export type VerificationLevel = 'verified' | 'unverified' | 'seen-before' | 'unknown' | 'blocked';

export interface VerificationResult {
    level: VerificationLevel;
    label: string;
    detail: string;
}

const SOURCIFY = 'https://sourcify.dev/server/v2/contract';

interface SourcifyMatchResponse {
    match: 'match' | 'exact_match' | null;
    creationMatch: string | null;
    runtimeMatch: string | null;
    verifiedAt?: string;
}

/**
 * Checks Sourcify for source verification on an EVM contract address. Only
 * meaningful for contract addresses — an EOA (wallet) will always come back
 * unverified, which is expected and not itself a warning sign.
 */
export const checkEvmVerification = async (
    chainId: number,
    address: string,
    signal?: AbortSignal
): Promise<VerificationResult> => {
    try {
        const res = await fetch(`${SOURCIFY}/${chainId}/${address.trim()}`, { signal });

        if (res.status === 404) {
            return {
                level: 'unverified',
                label: 'Unverified',
                detail: 'No verified source found on Sourcify for this address on this chain.'
            };
        }

        if (!res.ok) {
            return { level: 'unknown', label: 'Unknown', detail: `Verification check failed (HTTP ${res.status}).` };
        }

        const body = (await res.json()) as SourcifyMatchResponse;
        if (body.match === 'exact_match') {
            return {
                level: 'verified',
                label: 'Verified (exact match)',
                detail: 'Source code matches the deployed bytecode exactly, verified via Sourcify.'
            };
        }
        if (body.match === 'match') {
            return {
                level: 'verified',
                label: 'Verified',
                detail: 'Source code verified via Sourcify (partial/metadata match).'
            };
        }

        return {
            level: 'unverified',
            label: 'Unverified',
            detail: 'No verified source found on Sourcify for this address on this chain.'
        };
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw err;
        }
        return { level: 'unknown', label: 'Unknown', detail: 'Could not reach Sourcify to check verification.' };
    }
};

// ---------------------------------------------------------------------------
// User-maintainable local blocklist
// ---------------------------------------------------------------------------
// No live third-party scam-address feed is wired up yet — shipping a fake
// "protected by X" badge without a real data source would be actively
// misleading. This is a local, user-maintained list instead: honest about
// what it actually is, and still useful for a user to flag an address they
// personally know is malicious so Txio warns them before they send to it
// again.

const BLOCKLIST_KEY = 'txio_address_blocklist';

interface BlockedAddress {
    address: string;
    chain: ChainId;
    note?: string;
    addedAt: number;
}

const isBrowser = () => typeof window !== 'undefined';

const normalizeKey = (chain: ChainId, address: string) => `${chain}:${address.trim().toLowerCase()}`;

export const readBlocklist = (): BlockedAddress[] => {
    if (!isBrowser()) return [];
    try {
        const raw = localStorage.getItem(BLOCKLIST_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as BlockedAddress[]) : [];
    } catch {
        return [];
    }
};

export const isAddressBlocked = (chain: ChainId, address: string): BlockedAddress | null => {
    const key = normalizeKey(chain, address);
    return readBlocklist().find((entry) => normalizeKey(entry.chain, entry.address) === key) ?? null;
};

export const addToBlocklist = (chain: ChainId, address: string, note?: string) => {
    if (!isBrowser()) return;
    const next = [
        ...readBlocklist().filter((entry) => normalizeKey(entry.chain, entry.address) !== normalizeKey(chain, address)),
        { address: address.trim(), chain, note, addedAt: Date.now() }
    ];
    localStorage.setItem(BLOCKLIST_KEY, JSON.stringify(next));
};

export const removeFromBlocklist = (chain: ChainId, address: string) => {
    if (!isBrowser()) return;
    const key = normalizeKey(chain, address);
    const next = readBlocklist().filter((entry) => normalizeKey(entry.chain, entry.address) !== key);
    localStorage.setItem(BLOCKLIST_KEY, JSON.stringify(next));
};

/**
 * Full verification check for any chain: blocklist first (fast, synchronous,
 * and always wins), then chain-specific checks. Non-EVM chains have no
 * source-verification registry, so they only get the blocklist check today
 * — 'unknown' rather than 'unverified' for those, since "no verification
 * data exists" and "checked and found unverified" are different claims.
 */
export const checkAddress = async (
    chain: ChainId,
    address: string,
    opts: { evmChainId?: number; signal?: AbortSignal } = {}
): Promise<VerificationResult> => {
    const blocked = isAddressBlocked(chain, address);
    if (blocked) {
        return {
            level: 'blocked',
            label: 'Flagged by you',
            detail: blocked.note?.trim() || 'You previously flagged this address as unsafe.'
        };
    }

    if (chain === 'evm') {
        return checkEvmVerification(opts.evmChainId ?? 1, address, opts.signal);
    }

    return {
        level: 'unknown',
        label: 'No verification data',
        detail: `${chain} has no public source-verification registry — this address hasn't been checked against anything beyond your own blocklist.`
    };
};
