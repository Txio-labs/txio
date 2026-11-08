'use client';

import React from 'react';
import { ChevronRight, Wallet } from 'lucide-react';

import { useWallet } from '@/wallet';
import { shortenAddress } from '@/wallet';

import { WalletGlyph } from './WalletGlyph';

interface ConnectWalletButtonProps {
    className?: string;
    fullWidth?: boolean;
}

export function ConnectWalletButton({
    className = '',
    fullWidth = false
}: ConnectWalletButtonProps) {
    const {
        currentWallet,
        openModal,
        status
    } = useWallet();

    if (currentWallet) {
        return (
            <button
                onClick={openModal}
                className={`group flex items-center gap-3 rounded-card border border-line bg-hover px-3 py-2 text-left transition-all hover:border-line-strong hover:bg-hover ${fullWidth ? 'w-full' : ''} ${className}`}
            >
                <WalletGlyph
                    walletId={
                        currentWallet.id
                    }
                    family={
                        currentWallet.family
                    }
                    shortName={getShortName(
                        currentWallet.name
                    )}
                    size="sm"
                />
                <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold text-fg-subtle">
                        Connected
                    </div>
                    <div className="truncate text-sm font-semibold text-white">
                        {
                            currentWallet.name
                        }
                    </div>
                    <div className="truncate text-xs text-fg-subtle">
                        {shortenAddress(
                            currentWallet.address
                        )}
                    </div>
                </div>
                <ChevronRight
                    size={16}
                    className="text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                />
            </button>
        );
    }

    return (
        <button
            onClick={openModal}
            className={`group inline-flex items-center justify-center gap-2 rounded-card border border-line bg-inverse px-5 py-3 font-semibold text-on-inverse shadow-[0_18px_40px_rgba(163,163,163,0.28)] transition-all hover:opacity-90 hover:scale-[1.01] hover:shadow-[0_22px_50px_rgba(163,163,163,0.34)] ${fullWidth ? 'w-full' : ''} ${className}`}
        >
            <Wallet
                size={16}
                className={
                    status ===
                    'connecting'
                        ? 'animate-pulse'
                        : ''
                }
            />
            <span>
                Connect Wallet
            </span>
        </button>
    );
}

function getShortName(
    name: string
) {
    return name
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}