'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
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
import { appStore } from '@/lib/store';

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

type TabId = 'popular' | WalletChainFamily;

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

    const [activeTab, setActiveTab] = useState<TabId>('popular');

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

    // A single row of pill tabs — "Popular" plus one per chain family this
    // app supports — replaces the old sidebar rail. A developer opening this
    // modal already knows which chain they're calling, so the chain is the
    // useful axis to browse by once they're past the popular shortlist.
    const tabs = useMemo(() => {
        const popularCount = wallets.filter((w) => w.isFeatured).length;
        return [
            { id: 'popular' as TabId, label: 'Popular', color: null, count: popularCount },
            ...CHAIN_FAMILY_ORDER.map((family) => ({
                id: family as TabId,
                label: getFamilyLabel(family) ?? family,
                color: CHAIN_FAMILY_COLOR[family],
                count: wallets.filter((w) => w.chainFamily === family).length
            }))
        ];
    }, [wallets]);

    const gridWallets = useMemo(() => {
        const base = activeTab === 'popular'
            ? filtered.filter((w) => w.isFeatured)
            : filtered.filter((w) => w.chainFamily === activeTab);

        return base.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    }, [filtered, activeTab]);

    const activeAccent = activeTab === 'popular' ? '#a5a8f7' : CHAIN_FAMILY_COLOR[activeTab as WalletChainFamily];

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
                        className="w-[min(420px,calc(100vw-2rem))] max-h-[min(640px,calc(100vh-2rem))] flex flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#18181b] shadow-2xl"
                    >
                        <div className="flex items-center justify-between px-5 py-4 shrink-0">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Connect a Wallet</h2>
                            <button
                                onClick={closeModal}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {currentWallet && (
                            <div
                                className="mx-5 mb-3 flex items-center gap-3 rounded-2xl border p-3 shrink-0"
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
                            <div className="mx-5 mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-500 shrink-0">
                                {error.message}
                            </div>
                        ) : null}

                        <div className="px-5 pb-3 shrink-0">
                            <label className="relative block">
                                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={modalQuery}
                                    onChange={(event) => setModalQuery(event.target.value)}
                                    placeholder="Search wallets..."
                                    className="h-10 w-full rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] pl-9 pr-3 text-xs text-slate-900 dark:text-white outline-none transition-colors placeholder:text-slate-400 focus:border-electric-violet/50"
                                />
                            </label>
                        </div>

                        {/* Chain tabs — a single scrollable row of pills instead of a sidebar rail. */}
                        <div
                            className="flex items-center gap-1.5 px-5 pb-3 overflow-x-auto shrink-0"
                            style={{ scrollbarWidth: 'none' }}
                        >
                            {tabs.map((tab) => {
                                const isActive = tab.id === activeTab;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                                            isActive
                                                ? 'bg-slate-900 dark:bg-white text-white dark:text-near-black'
                                                : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1]'
                                        }`}
                                    >
                                        {tab.color && (
                                            <span
                                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                                style={{ backgroundColor: isActive ? 'currentColor' : tab.color }}
                                            />
                                        )}
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Wallet grid — icon-first tiles, RainbowKit-style, in place of list rows. */}
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 pb-5">
                            {gridWallets.length > 0 ? (
                                <div className="grid grid-cols-4 gap-2">
                                    {gridWallets.map((wallet) => (
                                        <WalletTile
                                            key={wallet.id}
                                            wallet={wallet}
                                            isCurrent={currentWallet?.id === wallet.id}
                                            isPending={pendingWalletId === wallet.id}
                                            accentColor={activeTab === 'popular' ? CHAIN_FAMILY_COLOR[wallet.chainFamily] : activeAccent}
                                            onConnect={() => void connect(wallet.id).catch((err) => {
                                                appStore.showToast(err instanceof Error ? err.message : 'Failed to connect wallet.', 'error');
                                            })}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 text-center text-xs text-slate-500">
                                    {deferredQuery ? `No wallets match "${modalQuery}".` : 'No wallets in this category yet.'}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

function WalletTile({
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
    const needsInstall = !wallet.isReady && wallet.installUrl;

    const content = (
        <>
            <div className="relative">
                <WalletGlyph
                    walletId={wallet.id}
                    family={wallet.chainFamily}
                    shortName={wallet.shortName}
                    size="lg"
                />
                {isPending && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
                        <Loader2 size={16} className="animate-spin text-white" />
                    </div>
                )}
            </div>
            <div className="w-full text-center">
                <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{wallet.name}</div>
                {isCurrent ? (
                    <div className="text-[10px] font-bold" style={{ color: accentColor }}>Connected</div>
                ) : needsInstall ? (
                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                        Install <ExternalLink size={9} />
                    </div>
                ) : isComingSoon ? (
                    <div className="text-[10px] text-slate-400">Soon</div>
                ) : isInstalled ? (
                    <div className="text-[10px] text-emerald-500">Installed</div>
                ) : null}
            </div>
        </>
    );

    const tileClasses =
        'flex flex-col items-center gap-2 rounded-2xl p-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04] disabled:opacity-50 disabled:pointer-events-none';

    if (needsInstall) {
        return (
            <a href={wallet.installUrl} target="_blank" rel="noreferrer" className={tileClasses}>
                {content}
            </a>
        );
    }

    return (
        <button onClick={onConnect} disabled={isPending || isComingSoon} className={tileClasses}>
            {content}
        </button>
    );
}
