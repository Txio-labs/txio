import { RPC_CHAINS } from '@/lib/constants';
import type { ChainId } from '@/types';

const ACTIVE_CHAIN_KEY = 'txio_activeChain';
// Kept when the user goes back to the picker, so the picker can mark the chain used last.
const LAST_CHAIN_KEY = 'txio_lastChain';

const isChainId = (value: string | null): value is ChainId => RPC_CHAINS.some((c) => c.id === value);

/** The chain workspace picked last on this device, or null when none was picked or the value is unknown. */
const read = (key: string): ChainId | null => {
    if (typeof window === 'undefined') return null;
    try {
        const value = localStorage.getItem(key);
        return isChainId(value) ? value : null;
    } catch {
        return null;
    }
};

export const readStoredActiveChain = (): ChainId | null => read(ACTIVE_CHAIN_KEY);

/** The last chain workspace opened on this device, even after returning to the picker. */
export const readLastPickedChain = (): ChainId | null => read(LAST_CHAIN_KEY);

export const persistActiveChain = (chain: ChainId | null) => {
    if (typeof window === 'undefined') return;
    try {
        if (chain) {
            localStorage.setItem(ACTIVE_CHAIN_KEY, chain);
            localStorage.setItem(LAST_CHAIN_KEY, chain);
        } else {
            localStorage.removeItem(ACTIVE_CHAIN_KEY);
        }
    } catch {
        // Storage can be unavailable (private mode, quota). The choice then lasts for this session only.
    }
};
