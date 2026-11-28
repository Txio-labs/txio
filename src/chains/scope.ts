/**
 * Which saved data belongs to which chain workspace. All data stays in one
 * store and on the same backend; a chain workspace only shows its part.
 *
 * Requests saved before multi-chain support have no chain and are Sui
 * requests, the same default the request editor uses.
 */
import type { ChainId, CollectionNode, EnvironmentVariable, FeatureId, RequestItem, TabItem } from '@/types';

export const requestChain = (request: Pick<RequestItem, 'rpcParams'> | null | undefined): ChainId =>
    request?.rpcParams?.chain ?? 'sui';

/** Explorer and studio tabs belong to the chain they work on. */
const EXPLORER_CHAIN: Partial<Record<FeatureId, ChainId>> = {
    explorer: 'sui',
    evm_explorer: 'evm',
    solana_explorer: 'solana',
    aptos_explorer: 'aptos',
    starknet_explorer: 'starknet',
    stellar_explorer: 'stellar',
    cairo_studio: 'starknet',
};

/** Tab types that hold one request in `data`. */
const REQUEST_TABS: ReadonlySet<FeatureId> = new Set(['rpc', 'ptb']);

/**
 * The chain a tab belongs to, or null for a tab that works on every chain
 * (settings, collections, history, wallets and the like).
 */
export const tabChain = (tab: Pick<TabItem, 'type' | 'data'>): ChainId | null => {
    if (REQUEST_TABS.has(tab.type)) return requestChain(tab.data);
    if (tab.type === 'new_request') return tab.data?.rpcParams?.chain ?? null;
    return EXPLORER_CHAIN[tab.type] ?? null;
};

export const tabBelongsTo = (tab: Pick<TabItem, 'type' | 'data'>, chain: ChainId): boolean => {
    const owner = tabChain(tab);
    return owner === null || owner === chain;
};

const requestChainsIn = (node: CollectionNode, out: Set<ChainId>): Set<ChainId> => {
    if (node.type === 'request') out.add(requestChain(node.requestData));
    for (const child of node.children ?? []) requestChainsIn(child, out);
    return out;
};

/** The chains a collection holds requests for. Empty for a collection with no requests. */
export const collectionChains = (node: CollectionNode): Set<ChainId> => requestChainsIn(node, new Set());

const pruneToChain = (node: CollectionNode, chain: ChainId): CollectionNode | null => {
    if (node.type === 'request') return requestChain(node.requestData) === chain ? node : null;
    const children = (node.children ?? [])
        .map((child) => pruneToChain(child, chain))
        .filter((child): child is CollectionNode => child !== null);
    // A folder that only held other chains' requests is hidden. An empty
    // folder stays, so a folder made a moment ago does not vanish.
    const hadRequests = collectionChains(node).size > 0;
    if (node.type === 'folder' && hadRequests && children.length === 0) return null;
    return { ...node, children };
};

/**
 * The collections a chain workspace shows: ones with at least one request on
 * that chain, cut down to those requests, plus empty collections, which have
 * no chain yet and so show in every workspace.
 */
export const collectionsForChain = (collections: CollectionNode[], chain: ChainId): CollectionNode[] =>
    collections.flatMap((collection) => {
        const chains = collectionChains(collection);
        if (chains.size > 0 && !chains.has(chain)) return [];
        const pruned = pruneToChain(collection, chain);
        return pruned ? [pruned] : [];
    });

export const historyForChain = <T extends Pick<RequestItem, 'rpcParams'>>(history: T[], chain: ChainId): T[] =>
    history.filter((item) => requestChain(item) === chain);

/** A variable with no chain was made before chain workspaces and applies to every chain. */
export const envVarAppliesTo = (variable: EnvironmentVariable, chain: ChainId): boolean =>
    !variable.chain || variable.chain === 'all' || variable.chain === chain;

export const envVarsForChain = (variables: EnvironmentVariable[], chain: ChainId): EnvironmentVariable[] =>
    variables.filter((v) => envVarAppliesTo(v, chain));
