import type { ChainId, Network } from '../../types';
import type { ChainDiscoveryAdapter, DiscoveredPackage } from './types';
import { DiscoveryError } from './types';
import { suiDiscoveryAdapter } from './suiDiscovery';
import { getCachedPackage, setCachedPackage } from './cache';

export type {
    ChainDiscoveryAdapter,
    DiscoveredFunction,
    DiscoveredModule,
    DiscoveredPackage,
    DiscoveredParameter,
    DiscoveredTypeParameter,
    ParameterKind,
    ParameterResolution
} from './types';
export { DiscoveryError } from './types';

/**
 * Every chain's discovery adapter, keyed by ChainId. A chain with no real
 * implementation yet is simply absent — `getDiscoveryAdapter` reports that
 * clearly rather than the caller silently getting `undefined` back.
 */
const DISCOVERY_ADAPTERS: Partial<Record<ChainId, ChainDiscoveryAdapter>> = {
    sui: suiDiscoveryAdapter
};

export const getDiscoveryAdapter = (chain: ChainId): ChainDiscoveryAdapter => {
    const adapter = DISCOVERY_ADAPTERS[chain];
    if (!adapter) {
        throw new DiscoveryError(`On-chain discovery isn't available for ${chain} yet.`, {
            code: 'DISCOVERY_UNAVAILABLE',
            chain
        });
    }
    return adapter;
};

export const isDiscoverySupported = (chain: ChainId): boolean => Boolean(DISCOVERY_ADAPTERS[chain]?.isSupported);

/** Discovers a package's modules/functions, using the in-memory cache when available. */
export const discoverPackage = async (chain: ChainId, identifier: string, network: Network): Promise<DiscoveredPackage> => {
    const cached = getCachedPackage(chain, network, identifier);
    if (cached) return cached;

    const pkg = await getDiscoveryAdapter(chain).discoverPackage(identifier, network);
    setCachedPackage(chain, network, identifier, pkg);
    return pkg;
};
