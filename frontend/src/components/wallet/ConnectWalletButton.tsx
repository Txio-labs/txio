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
                className={`group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition-all hover:border-white/20 hover:bg-white/[0.05] ${fullWidth ? 'w-full' : ''} ${className}`}
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
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                        Connected
                    </div>
                    <div className="truncate text-sm font-semibold text-white">
                        {
                            currentWallet.name
                        }
                    </div>
                    <div className="truncate text-xs text-slate-400">
                        {shortenAddress(
                            currentWallet.address
                        )}
                    </div>
                </div>
                <ChevronRight
                    size={16}
                    className="text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                />
            </button>
        );
    }

    return (
        <button
            onClick={openModal}
            className={`group inline-flex items-center justify-center gap-2 rounded-2xl border border-electric-violet/20 bg-gradient-to-r from-electric-violet via-[#93D3EC] to-soft-purple px-5 py-3 font-bold text-white shadow-[0_18px_40px_rgba(173,223,241,0.28)] transition-all hover:scale-[1.01] hover:shadow-[0_22px_50px_rgba(173,223,241,0.34)] ${fullWidth ? 'w-full' : ''} ${className}`}
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
