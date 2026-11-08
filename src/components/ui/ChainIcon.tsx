import React from 'react';
import { NetworkAptos, NetworkEthereum, NetworkSolana, NetworkStellar, NetworkSui } from '@web3icons/react';
import type { ChainId } from '@/types';

const ICONS: Record<ChainId, React.ComponentType<{ size?: number | string; variant?: 'mono' | 'branded' | 'background'; className?: string }>> = {
    sui: NetworkSui,
    evm: NetworkEthereum,
    solana: NetworkSolana,
    stellar: NetworkStellar,
    aptos: NetworkAptos
};

/** A chain's real logo in a neutral tile, sized for lists and cards. */
export const ChainIcon: React.FC<{ chain: ChainId; size?: number; className?: string }> = ({ chain, size = 32, className = '' }) => {
    const Icon = ICONS[chain];
    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center rounded-[7px] border border-line bg-sunken ${className}`}
            style={{ width: size, height: size }}
        >
            <span className={`inline-flex ${chain === 'aptos' || chain === 'stellar' ? 'dark:invert' : ''}`}>
                <Icon size={Math.round(size * 0.6)} variant="branded" />
            </span>
        </span>
    );
};
