import React from 'react';
import { Wallet as WalletIcon } from 'lucide-react';
import { useWallet } from '@/wallet';
import { shortenAddress } from '@/wallet/utils';
import { cx, StatusDot } from '../ui/primitives';

/** Opens the wallet manager. Shows the connected address, or a "Connect wallet" call to action. */
export function WalletButton({ compact = false }: { compact?: boolean }) {
    const { currentWallet, isConnected, openModal } = useWallet();
    return (
        <button
            onClick={openModal}
            className={cx(
                'inline-flex items-center gap-2 h-8 px-3 rounded-control text-[14px] font-medium transition-all shrink-0',
                isConnected ? 'border border-line bg-surface hover:border-line-strong text-fg shadow-card' : 'bg-inverse text-on-inverse hover:opacity-90'
            )}
            aria-label={isConnected ? 'Open wallet manager' : 'Connect wallet'}
            title={isConnected ? 'Open wallet manager' : 'Connect wallet'}
        >
            {isConnected && currentWallet ? (
                <>
                    <StatusDot tone="success" />
                    <span className="font-mono text-xs">{shortenAddress(currentWallet.address)}</span>
                </>
            ) : (
                <>
                    <WalletIcon size={14} />
                    <span className={cx(compact ? 'hidden' : 'hidden sm:inline')}>Connect wallet</span>
                </>
            )}
        </button>
    );
}
