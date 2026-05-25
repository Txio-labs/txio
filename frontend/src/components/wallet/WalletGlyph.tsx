import React from 'react';

import type {
    WalletChainFamily,
    WalletId
} from '@/wallet';

const GLYPH_STYLES: Record<
    WalletId,
    {
        ring: string;
        fill: string;
    }
> = {
    metamask: {
        ring: 'from-orange-400/70 to-amber-300/40',
        fill: 'from-orange-400 to-amber-300'
    },
    walletconnect: {
        ring: 'from-blue-400/70 to-cyan-300/40',
        fill: 'from-blue-500 to-cyan-300'
    },
    'coinbase-wallet': {
        ring: 'from-blue-500/70 to-indigo-300/40',
        fill: 'from-blue-500 to-indigo-300'
    },
    phantom: {
        ring: 'from-fuchsia-500/70 to-violet-300/40',
        fill: 'from-fuchsia-500 to-violet-300'
    },
    'trust-wallet': {
        ring: 'from-sky-500/70 to-blue-400/40',
        fill: 'from-sky-500 to-blue-400'
    },
    rainbow: {
        ring: 'from-pink-400/70 to-yellow-300/40',
        fill: 'from-pink-500 via-amber-400 to-sky-400'
    },
    'okx-wallet': {
        ring: 'from-zinc-500/70 to-slate-300/40',
        fill: 'from-zinc-700 to-slate-400'
    },
    'brave-wallet': {
        ring: 'from-orange-500/70 to-red-400/40',
        fill: 'from-orange-500 to-red-500'
    },
    'sui-wallet': {
        ring: 'from-electric-violet/80 to-soft-purple/40',
        fill: 'from-electric-violet to-soft-purple'
    },
    suiet: {
        ring: 'from-cyan-400/70 to-electric-violet/40',
        fill: 'from-cyan-400 to-electric-violet'
    },
    ethos: {
        ring: 'from-emerald-400/70 to-cyan-300/40',
        fill: 'from-emerald-400 to-cyan-300'
    },
    lobstr: {
        ring: 'from-rose-400/70 to-orange-300/40',
        fill: 'from-rose-400 to-orange-300'
    },
    freighter: {
        ring: 'from-lime-400/70 to-emerald-300/40',
        fill: 'from-lime-400 to-emerald-300'
    },
    albedo: {
        ring: 'from-indigo-500/70 to-purple-300/40',
        fill: 'from-indigo-500 to-purple-400'
    },
    xbull: {
        ring: 'from-yellow-400/70 to-orange-300/40',
        fill: 'from-yellow-500 to-orange-400'
    },
    rabet: {
        ring: 'from-teal-400/70 to-cyan-300/40',
        fill: 'from-teal-500 to-cyan-400'
    },
    'hana-wallet': {
        ring: 'from-pink-400/70 to-rose-300/40',
        fill: 'from-pink-500 to-rose-400'
    }
};

const FAMILY_MARKS: Record<
    WalletChainFamily,
    string
> = {
    evm: 'Ξ',
    sui: 'S',
    stellar: '✦'
};

export function WalletGlyph({
    walletId,
    family,
    shortName,
    size = 'md'
}: {
    walletId: WalletId;
    family: WalletChainFamily;
    shortName: string;
    size?: 'sm' | 'md' | 'lg';
}) {
    const style =
        GLYPH_STYLES[walletId];
    const dimensions =
        size === 'sm'
            ? 'h-10 w-10 text-xs'
            : size === 'lg'
              ? 'h-14 w-14 text-base'
              : 'h-12 w-12 text-sm';

    return (
        <div
            className={`relative ${dimensions} shrink-0 rounded-2xl border border-white/10 bg-black/30 p-[1px] shadow-[0_16px_40px_rgba(0,0,0,0.35)]`}
        >
            <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${style.ring} opacity-80 blur-[1px]`}
            />
            <div
                className={`relative flex h-full w-full items-center justify-center rounded-[calc(theme(borderRadius.2xl)-1px)] bg-gradient-to-br ${style.fill} font-black text-white`}
            >
                <span className="tracking-[0.22em]">
                    {shortName}
                </span>
                <span className="absolute bottom-1 right-1 rounded-full bg-black/20 px-1 text-[9px] font-bold tracking-[0.18em] text-white/90">
                    {
                        FAMILY_MARKS[
                            family
                        ]
                    }
                </span>
            </div>
        </div>
    );
}
