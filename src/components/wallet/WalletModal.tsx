'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCircle2,
    ChevronDown,
    ExternalLink,
    HelpCircle,
    Info,
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

type CategoryId = 'all' | WalletChainFamily;

export function WalletModal() {
    const {
        closeModal,
        connect,
        currentWallet,
        linkedWallets,
        disconnect,
        error,
        isModalOpen,
        modalQuery,
        pendingWalletId,
        setModalQuery,
        wallets
    } = useWallet();

    const linkedEntries = CHAIN_FAMILY_ORDER
        .map((family) => linkedWallets[family])
        .filter((wallet): wallet is NonNullable<typeof wallet> => Boolean(wallet));

    const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
    const [collapsedGroups, setCollapsedGroups] = useState<Set<WalletChainFamily>>(new Set());
    const [installedOnly, setInstalledOnly] = useState(false);

    const deferredQuery =
        useDeferredValue(
            modalQuery.trim().toLowerCase()
        );

    const filtered = useMemo(() => {
        const byQuery = deferredQuery
            ? wallets.filter((wallet) =>
                  [
                      wallet.name,
                      wallet.description,
                      wallet.chainFamily,
                      ...wallet.tags
                  ]
                      .join(' ')
                      .toLowerCase()
                      .includes(deferredQuery)
              )
            : wallets;

        return installedOnly
            ? byQuery.filter((wallet) => wallet.availability === 'installed')
            : byQuery;
    }, [deferredQuery, wallets, installedOnly]);

    // Category rail: "All Wallets" plus one entry per chain family this app
    // actually supports — a developer opening this modal already knows which
    // chain they're calling, so the chain is the useful axis to browse by.
    const categories = useMemo(() => {
        return [
            { id: 'all' as CategoryId, label: 'All Wallets', color: null, count: wallets.length },
            ...CHAIN_FAMILY_ORDER.map((family) => ({
                id: family as CategoryId,
                label: getFamilyLabel(family) ?? family,
                color: CHAIN_FAMILY_COLOR[family],
                count: wallets.filter((w) => w.chainFamily === family).length
            }))
        ];
    }, [wallets]);

    // When browsing "All Wallets" the list is grouped into one section per
    // chain family (mirrors how the picker reads when every chain is mixed
    // together); picking a specific chain in the rail instead shows one flat,
    // ungrouped list for that chain alone.
    const groupedWallets = useMemo(() => {
        const families = activeCategory === 'all' ? CHAIN_FAMILY_ORDER : [activeCategory as WalletChainFamily];

        return families
            .map((family) => ({
                family,
                label: getFamilyLabel(family) ?? family,
                color: CHAIN_FAMILY_COLOR[family],
                items: filtered
                    .filter((w) => w.chainFamily === family)
                    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured))
            }))
            .filter((group) => group.items.length > 0);
    }, [filtered, activeCategory]);

    const toggleGroup = (family: WalletChainFamily) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(family)) {
                next.delete(family);
            } else {
                next.add(family);
            }
            return next;
        });
    };

    const activeCategoryLabel = categories.find((c) => c.id === activeCategory)?.label ?? '';

    return (
        <AnimatePresence>
            {isModalOpen ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-surface/80 backdrop-blur-md flex items-center justify-center p-4"
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
                        className="w-[min(760px,calc(100vw-2rem))] h-[min(620px,calc(100vh-2rem))] flex flex-col overflow-hidden rounded-card border border-line bg-elevated shadow-card"
                    >
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line shrink-0">
                            <div>
                                <h2 className="text-sm font-semibold text-fg">Connect Wallet</h2>
                                <p className="text-[12px] text-fg-subtle">Choose a wallet to connect to your account.</p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-hover transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="mx-4 mt-3 flex items-start gap-2.5 rounded-[10px] border border-line bg-hover px-3 py-2.5 shrink-0">
                            <Info size={14} className="mt-0.5 shrink-0 text-fg" />
                            <p className="text-[12px] leading-relaxed text-fg-muted">
                                {linkedEntries.length > 0
                                    ? 'Connecting another chain adds a second wallet alongside this one — nothing gets disconnected. Only what you send funds through can sign, so no private keys, ever.'
                                    : "Make sure you have the wallet extension or app installed. We'll only request the permissions needed to connect — no private keys, ever."}
                            </p>
                        </div>

                        {linkedEntries.length > 0 && (
                            <div className="mx-4 mt-3 space-y-1.5 shrink-0">
                                {linkedEntries.map((wallet) => (
                                    <div
                                        key={wallet.id}
                                        className="flex items-center gap-3 rounded-[10px] border p-3"
                                        style={{
                                            borderColor: `${CHAIN_FAMILY_COLOR[wallet.family]}33`,
                                            backgroundColor: `${CHAIN_FAMILY_COLOR[wallet.family]}0f`
                                        }}
                                    >
                                        <WalletGlyph
                                            walletId={wallet.id}
                                            family={wallet.family}
                                            shortName={wallet.name.slice(0, 2).toUpperCase()}
                                            size="sm"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-semibold text-fg truncate">{wallet.name}</span>
                                                <span className="text-[12px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-slate-200/60 dark:bg-white/10 text-fg-muted shrink-0">
                                                    {getFamilyLabel(wallet.family) ?? wallet.family}
                                                </span>
                                                {currentWallet?.id === wallet.id && (
                                                    <span className="text-[12px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[12px] font-mono text-fg-subtle truncate">{shortenAddress(wallet.address, 6, 4)}</div>
                                        </div>
                                        <button
                                            onClick={() => void disconnect(wallet.family)}
                                            className="shrink-0 text-[12px] font-semibold text-red-500 hover:opacity-80 transition-colors"
                                        >
                                            Disconnect
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {error ? (
                            <div className="mx-4 mt-3 rounded-[10px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-500 shrink-0">
                                {error.message}
                            </div>
                        ) : null}

                        <div className="flex-1 flex min-h-0 mt-3">
                            {/* Category rail */}
                            <div className="w-48 shrink-0 border-r border-line flex flex-col">
                                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 space-y-0.5">
                                    {categories.map((cat) => {
                                        const isActive = cat.id === activeCategory;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => setActiveCategory(cat.id)}
                                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-xs font-medium transition-colors ${
                                                    isActive
                                                        ? 'bg-hover text-fg font-semibold'
                                                        : 'text-fg-muted hover:bg-hover'
                                                }`}
                                            >
                                                {cat.color ? (
                                                    <span
                                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold text-white"
                                                        style={{ backgroundColor: cat.color }}
                                                    >
                                                        {cat.label.slice(0, 1)}
                                                    </span>
                                                ) : (
                                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-inverse text-[12px] font-semibold text-on-inverse">
                                                        ●
                                                    </span>
                                                )}
                                                <span className="truncate flex-1 text-left">{cat.label}</span>
                                                <span className="text-[12px] text-fg-subtle shrink-0">{cat.count}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Category detail */}
                            <div className="flex-1 min-w-0 flex flex-col">
                                <div className="px-4 pt-3 pb-2 shrink-0 flex items-center gap-2">
                                    <label className="relative block flex-1">
                                        <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                                        <input
                                            value={modalQuery}
                                            onChange={(event) => setModalQuery(event.target.value)}
                                            placeholder={activeCategory === 'all' ? 'Search wallets...' : `Search ${activeCategoryLabel} wallets...`}
                                            className="h-9 w-full rounded-lg border border-line bg-sunken pl-9 pr-3 text-xs text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-line-strong"
                                        />
                                    </label>
                                    <button
                                        onClick={() => setInstalledOnly((v) => !v)}
                                        aria-pressed={installedOnly}
                                        className={`h-9 shrink-0 flex items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                                            installedOnly
                                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                                                : 'border-line text-fg-subtle hover:border-line-strong hover:text-fg'
                                        }`}
                                    >
                                        <CheckCircle2 size={13} />
                                        Installed
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-2 space-y-4">
                                    {groupedWallets.map((group) => {
                                        const isCollapsed = collapsedGroups.has(group.family);
                                        return (
                                            <div key={group.family}>
                                                <button
                                                    onClick={() => toggleGroup(group.family)}
                                                    className="flex w-full items-center justify-between gap-2 pb-1.5"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <span
                                                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[12px] font-semibold text-white"
                                                            style={{ backgroundColor: group.color }}
                                                        >
                                                            {group.label.slice(0, 1)}
                                                        </span>
                                                        <span className="text-xs font-semibold text-fg">
                                                            {group.label} Wallets
                                                        </span>
                                                        <span className="text-[12px] text-fg-subtle">{group.items.length}</span>
                                                    </span>
                                                    <ChevronDown
                                                        size={14}
                                                        className={`text-fg-subtle transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                                                    />
                                                </button>

                                                {!isCollapsed && (
                                                    <div className="space-y-1">
                                                        {group.items.map((wallet) => (
                                                            <WalletRow
                                                                key={wallet.id}
                                                                wallet={wallet}
                                                                isCurrent={linkedWallets[wallet.chainFamily]?.id === wallet.id}
                                                                isPending={pendingWalletId === wallet.id}
                                                                accentColor={group.color}
                                                                onConnect={() => void connect(wallet.id).catch((err) => {
                                                                    appStore.showToast(err instanceof Error ? err.message : 'Failed to connect wallet.', 'error');
                                                                })}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {groupedWallets.length === 0 && (
                                        <div className="py-10 text-center text-xs text-fg-subtle">
                                            {deferredQuery
                                                ? `No wallets match "${modalQuery}".`
                                                : installedOnly
                                                    ? 'No installed wallets detected in this category.'
                                                    : 'No wallets in this category yet.'}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between border-t border-line px-4 py-3 shrink-0">
                                    <span className="flex items-center gap-1.5 text-[12px] text-fg-subtle">
                                        <HelpCircle size={13} />
                                        Need help?
                                    </span>
                                    <button
                                        onClick={closeModal}
                                        className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-fg-muted hover:border-line-strong hover:text-fg transition-colors"
                                    >
                                        Cancel
                                    </button>
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
        <div className="flex items-center gap-3 p-2.5 rounded-[10px] hover:bg-hover transition-colors">
            <WalletGlyph
                walletId={wallet.id}
                family={wallet.chainFamily}
                shortName={wallet.shortName}
                size="sm"
            />
            <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-fg truncate">{wallet.name}</div>
                <div className="text-[12px] text-fg-subtle truncate">
                    {getFamilyLabel(wallet.chainFamily) ?? wallet.chainFamily} · {wallet.description}
                </div>
            </div>

            {isCurrent ? (
                <span className="shrink-0 text-[12px] font-semibold" style={{ color: accentColor }}>Connected</span>
            ) : isInstalled ? (
                <button
                    onClick={onConnect}
                    disabled={isPending || isComingSoon}
                    title="Installed — click to connect"
                    className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 text-[12px] font-semibold hover:bg-emerald-500/15 transition-colors disabled:opacity-50"
                >
                    {isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                    {isPending ? 'Connecting' : 'Connect'}
                </button>
            ) : !wallet.isReady && wallet.installUrl ? (
                <a
                    href={wallet.installUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[12px] font-semibold text-fg-muted hover:border-line-strong hover:text-fg transition-colors"
                >
                    Install <ExternalLink size={10} />
                </a>
            ) : (
                <button
                    onClick={onConnect}
                    disabled={isComingSoon}
                    className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[12px] font-semibold text-fg-muted hover:border-line-strong hover:text-fg transition-colors disabled:opacity-50"
                >
                    {isComingSoon ? 'Soon' : 'Connect'}
                </button>
            )}
        </div>
    );
}
