'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCircle2,
    ExternalLink,
    Loader2,
    Search,
    X
} from 'lucide-react';
import React, {
    useDeferredValue,
    useMemo,
    useState
} from 'react';

import {
    type WalletCatalogItem,
    type WalletChainFamily,
    getFamilyLabel,
    useWallet
} from '@/wallet';
import { shortenAddress } from '@/wallet';

import { WalletGlyph } from './WalletGlyph';

// Same chain-identity colors used across the dashboard mockups, terminal
// previews, and the Wallets page, so the wallet picker reads as one language
// with the rest of the app instead of a generic bolted-on Web3Modal.
const CHAIN_FAMILY_ORDER: WalletChainFamily[] = ['sui', 'evm', 'solana', 'aptos', 'stellar'];
const CHAIN_FAMILY_COLOR: Record<WalletChainFamily, string> = {
    sui: '#6fbcf0',
    evm: '#a5a8f7',
    solana: '#14f195',
    aptos: '#2ed3b7',
    stellar: '#f5d060'
};

type CategoryId = 'popular' | WalletChainFamily;

export function WalletModal() {
    const {
        closeModal,
        connect,
        currentWallet,
        disconnect,
        error,
        isModalOpen,
        modalQuery,
        pendingWalletId,
        setModalQuery,
        wallets
    } = useWallet();

    const [activeCategory, setActiveCategory] = useState<CategoryId>('popular');

    const deferredQuery =
        useDeferredValue(
            modalQuery.trim().toLowerCase()
        );

    const filtered = useMemo(() => {
        if (!deferredQuery) return wallets;

        return wallets.filter((wallet) =>
            [
                wallet.name,
                wallet.description,
                wallet.chainFamily,
                ...wallet.tags
            ]
                .join(' ')
                .toLowerCase()
                .includes(deferredQuery)
        );
    }, [deferredQuery, wallets]);

    // Category rail: "Popular" (featured wallets across every chain) plus one
    // entry per chain family this app actually supports — a developer opening
    // this modal already knows which chain they're calling, so the chain is
    // the useful axis to browse by once they're past the popular shortlist.
    const categories = useMemo(() => {
        const popularCount = wallets.filter((w) => w.isFeatured).length;
        return [
            { id: 'popular' as CategoryId, label: 'Popular', color: null, count: popularCount },
            ...CHAIN_FAMILY_ORDER.map((family) => ({
                id: family as CategoryId,
                label: getFamilyLabel(family) ?? family,
                color: CHAIN_FAMILY_COLOR[family],
                count: wallets.filter((w) => w.chainFamily === family).length
            }))
        ];
    }, [wallets]);

    const categoryWallets = useMemo(() => {
        const base = activeCategory === 'popular'
            ? filtered.filter((w) => w.isFeatured)
            : filtered.filter((w) => w.chainFamily === activeCategory);

        return base.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    }, [filtered, activeCategory]);

    const activeAccent = activeCategory === 'popular' ? '#a5a8f7' : CHAIN_FAMILY_COLOR[activeCategory as WalletChainFamily];
    const activeCategoryLabel = categories.find((c) => c.id === activeCategory)?.label ?? '';

    return (
        <AnimatePresence>
            {isModalOpen ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-white/70 dark:bg-near-black/60 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={closeModal}
                    role="button"
                    tabIndex={-1}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') closeModal(); }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-label="Connect wallet"
                        className="w-[min(680px,calc(100vw-2rem))] h-[min(560px,calc(100vh-2rem))] flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#18181b] shadow-2xl"
                    >
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-white/10 shrink-0">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Connect Wallet</h2>
                                <p className="text-[11px] text-slate-500">Choose a wallet to connect to your account.</p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {currentWallet && (
                            <div
                                className="mx-4 mt-3 flex items-center gap-3 rounded-xl border p-3 shrink-0"
                                style={{
                                    borderColor: `${CHAIN_FAMILY_COLOR[currentWallet.family]}33`,
                                    backgroundColor: `${CHAIN_FAMILY_COLOR[currentWallet.family]}0f`
                                }}
                            >
                                <WalletGlyph
                                    walletId={currentWallet.id}
                                    family={currentWallet.family}
                                    shortName={currentWallet.name.slice(0, 2).toUpperCase()}
                                    size="sm"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentWallet.name}</div>
                                    <div className="text-[11px] font-mono text-slate-500 truncate">{shortenAddress(currentWallet.address, 6, 4)}</div>
                                </div>
                                <button
                                    onClick={() => void disconnect()}
                                    className="shrink-0 text-[11px] font-bold text-red-500 hover:opacity-80 transition-colors"
                                >
                                    Disconnect
                                </button>
                            </div>
                        )}

                        {error ? (
                            <div className="mx-4 mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-500 shrink-0">
                                {error.message}
                            </div>
                        ) : null}

                        <div className="flex-1 flex min-h-0 mt-3">
                            {/* Category rail */}
                            <div className="w-44 shrink-0 border-r border-slate-200 dark:border-white/10 flex flex-col">
                                <div className="px-3 pb-2">
                                    <label className="relative block">
                                        <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={modalQuery}
                                            onChange={(event) => setModalQuery(event.target.value)}
                                            placeholder="Search wallets..."
                                            className="h-8 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] pl-7 pr-2 text-[11px] text-slate-900 dark:text-white outline-none transition-colors placeholder:text-slate-400 focus:border-electric-violet/50"
                                        />
                                    </label>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2 space-y-0.5">
                                    {categories.map((cat) => {
                                        const isActive = cat.id === activeCategory;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => setActiveCategory(cat.id)}
                                                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                                                    isActive
                                                        ? 'bg-electric-violet/10 text-slate-900 dark:text-white font-bold'
                                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                                                }`}
                                            >
                                                {cat.color ? (
                                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                                ) : (
                                                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-electric-violet" />
                                                )}
                                                <span className="truncate flex-1 text-left">{cat.label}</span>
                                                <span className="text-[10px] text-slate-400 shrink-0">{cat.count}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Category detail */}
                            <div className="flex-1 min-w-0 flex flex-col">
                                <div className="px-4 pb-2 shrink-0">
                                    <label className="relative block">
                                        <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={modalQuery}
                                            onChange={(event) => setModalQuery(event.target.value)}
                                            placeholder={`Search ${activeCategoryLabel.toLowerCase()} wallets...`}
                                            className="h-9 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] pl-9 pr-3 text-xs text-slate-900 dark:text-white outline-none transition-colors placeholder:text-slate-400 focus:border-electric-violet/50"
                                        />
                                    </label>
                                </div>

                                <div className="flex items-center justify-between px-4 mb-1 shrink-0">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                        {activeCategory === 'popular' ? 'Recommended' : `${activeCategoryLabel} Wallets`}
                                    </span>
                                    {categoryWallets.length > 4 && (
                                        <button className="text-[11px] font-bold text-electric-violet hover:opacity-80 transition-colors">
                                            View all
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 space-y-1">
                                    {categoryWallets.map((wallet) => (
                                        <WalletRow
                                            key={wallet.id}
                                            wallet={wallet}
                                            isCurrent={currentWallet?.id === wallet.id}
                                            isPending={pendingWalletId === wallet.id}
                                            accentColor={activeCategory === 'popular' ? CHAIN_FAMILY_COLOR[wallet.chainFamily] : activeAccent}
                                            onConnect={() => void connect(wallet.id).catch(() => undefined)}
                                        />
                                    ))}

                                    {categoryWallets.length === 0 && (
                                        <div className="py-10 text-center text-xs text-slate-500">
                                            {deferredQuery ? `No wallets match "${modalQuery}".` : 'No wallets in this category yet.'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

function WalletRow({
    wallet,
    isCurrent,
    isPending,
    accentColor,
    onConnect
}: {
    wallet: WalletCatalogItem;
    isCurrent: boolean;
    isPending: boolean;
    accentColor: string;
    onConnect: () => void;
}) {
    const isInstalled = wallet.availability === 'installed';
    const isComingSoon = wallet.availability === 'coming-soon';

    return (
        <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
            <WalletGlyph
                walletId={wallet.id}
                family={wallet.chainFamily}
                shortName={wallet.shortName}
                size="sm"
            />
            <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{wallet.name}</div>
                <div className="text-[11px] text-slate-500 truncate">
                    {getFamilyLabel(wallet.chainFamily) ?? wallet.chainFamily} · {wallet.description}
                </div>
            </div>

            {isCurrent ? (
                <span className="shrink-0 text-[10px] font-bold" style={{ color: accentColor }}>Connected</span>
            ) : isInstalled ? (
                <button
                    onClick={onConnect}
                    disabled={isPending || isComingSoon}
                    title="Installed — click to connect"
                    className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold hover:bg-emerald-500/15 transition-colors disabled:opacity-50"
                >
                    {isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                    {isPending ? 'Connecting' : 'Connect'}
                </button>
            ) : !wallet.isReady && wallet.installUrl ? (
                <a
                    href={wallet.installUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 flex items-center gap-1 rounded-full border border-slate-200 dark:border-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/30 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    Install <ExternalLink size={10} />
                </a>
            ) : (
                <button
                    onClick={onConnect}
                    disabled={isComingSoon}
                    className="shrink-0 rounded-full border border-slate-200 dark:border-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/30 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50"
                >
                    {isComingSoon ? 'Soon' : 'Connect'}
                </button>
            )}
        </div>
    );
}
