import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { collectionsForChain, envVarsForChain, historyForChain } from './scope';

/**
 * Collections, history and environment variables as the current chain
 * workspace shows them. Before a chain is picked, everything is returned.
 */
export function useChainScope() {
    const { activeChain, collections, history, envVariables } = useAppStore();
    return useMemo(
        () => ({
            chain: activeChain,
            collections: activeChain ? collectionsForChain(collections, activeChain) : collections,
            history: activeChain ? historyForChain(history, activeChain) : history,
            envVariables: activeChain ? envVarsForChain(envVariables, activeChain) : envVariables,
        }),
        [activeChain, collections, history, envVariables]
    );
}
