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
    rabby: {
        ring: 'from-blue-500/70 to-sky-300/40',
        fill: 'from-blue-600 to-sky-400'
    },
    zerion: {
        ring: 'from-blue-500/70 to-fuchsia-300/40',
        fill: 'from-blue-600 to-fuchsia-500'
    },
    oneinch: {
        ring: 'from-red-500/70 to-rose-300/40',
        fill: 'from-red-600 to-rose-400'
    },
    frame: {
        ring: 'from-slate-500/70 to-zinc-300/40',
        fill: 'from-slate-700 to-zinc-500'
    },
    ledger: {
        ring: 'from-slate-900/70 to-slate-600/40',
        fill: 'from-slate-900 to-slate-700'
    },
    'sui-wallet': {
        ring: 'from-electric-violet/80 to-electric-violet/40',
        fill: 'from-electric-violet to-slate-700'
    },
    suiet: {
        ring: 'from-cyan-400/70 to-electric-violet/40',
        fill: 'from-cyan-400 to-electric-violet'
    },
    ethos: {
        ring: 'from-emerald-400/70 to-cyan-300/40',
        fill: 'from-emerald-400 to-cyan-300'
    },
    'nightly-sui': {
        ring: 'from-indigo-600/70 to-slate-400/40',
        fill: 'from-indigo-700 to-slate-500'
    },
    'okx-wallet-sui': {
        ring: 'from-zinc-500/70 to-slate-300/40',
        fill: 'from-zinc-700 to-slate-400'
    },
    slush: {
        ring: 'from-sky-400/70 to-blue-300/40',
        fill: 'from-sky-500 to-blue-400'
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
    },
    'phantom-solana': {
        ring: 'from-purple-500/70 to-fuchsia-300/40',
        fill: 'from-purple-500 to-fuchsia-400'
    },
    solflare: {
        ring: 'from-orange-500/70 to-yellow-300/40',
        fill: 'from-orange-500 to-yellow-400'
    },
    backpack: {
        ring: 'from-red-500/70 to-orange-300/40',
        fill: 'from-red-500 to-orange-400'
    },
    glow: {
        ring: 'from-amber-400/70 to-yellow-300/40',
        fill: 'from-amber-500 to-yellow-400'
    },
    'nightly-solana': {
        ring: 'from-indigo-600/70 to-slate-400/40',
        fill: 'from-indigo-700 to-slate-500'
    },
    petra: {
        ring: 'from-pink-500/70 to-purple-300/40',
        fill: 'from-pink-500 to-purple-400'
    },
    martian: {
        ring: 'from-blue-500/70 to-indigo-300/40',
        fill: 'from-blue-500 to-indigo-400'
    },
    pontem: {
        ring: 'from-emerald-500/70 to-teal-300/40',
        fill: 'from-emerald-600 to-teal-400'
    },
    'rise-wallet': {
        ring: 'from-orange-500/70 to-amber-300/40',
        fill: 'from-orange-600 to-amber-400'
    },
    'nightly-aptos': {
        ring: 'from-indigo-600/70 to-slate-400/40',
        fill: 'from-indigo-700 to-slate-500'
    }
};

const FAMILY_MARKS: Record<
    WalletChainFamily,
    string
> = {
    evm: 'Ξ',
    sui: 'S',
    stellar: '✦',
    solana: '◎',
    aptos: '∞'
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