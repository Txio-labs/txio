import type { ChainId, Network } from '../../types';
import type { DiscoveredPackage } from './types';

/**
 * In-memory cache for package/module/function discovery. Package bytecode
 * on Sui is immutable per-version (a new publish is a new package ID unless
 * it's an upgrade, which Sui also gives a new object ID for), so there's no
 * TTL — an entry is valid until the app reloads. Keyed by chain+network+
 * identifier, matching how a request already scopes a package to a network.
 */
const cache = new Map<string, DiscoveredPackage>();

const cacheKey = (chain: ChainId, network: Network, identifier: string): string =>
    `${chain}:${network}:${identifier.trim().toLowerCase()}`;

export const getCachedPackage = (chain: ChainId, network: Network, identifier: string): DiscoveredPackage | null =>
    cache.get(cacheKey(chain, network, identifier)) ?? null;

export const setCachedPackage = (chain: ChainId, network: Network, identifier: string, pkg: DiscoveredPackage): void => {
    cache.set(cacheKey(chain, network, identifier), pkg);
};

export const clearDiscoveryCache = (): void => cache.clear();
