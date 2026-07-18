'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCircle2,
    Clock3,
    ExternalLink,
    Link2,
    Search,
    Shield,
    Smartphone,
    Sparkles,
    X
} from 'lucide-react';
import React, {
    useDeferredValue,
    useMemo
} from 'react';

import {
    type WalletCatalogItem,
    getFamilyLabel,
    useWallet
} from '@/wallet';
import { shortenAddress } from '@/wallet';

import { WalletGlyph } from './WalletGlyph';

const FAMILY_ORDER = [
    'evm',
    'sui',
    'stellar'
] as const;

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
        status,
        wallets
    } = useWallet();

    const deferredQuery =
        useDeferredValue(
            modalQuery.trim().toLowerCase()
        );

    const walletGroups = useMemo(() => {
        const filtered = wallets
            .filter((wallet) => {
                if (!deferredQuery) {
                    return true;
                }

                return [
                    wallet.name,
                    wallet.description,
                    wallet.chainFamily,
                    ...wallet.tags
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(
                        deferredQuery
                    );
            })
            .sort((left, right) => {
                const leftScore =
                    Number(
                        left.id ===
                            currentWallet?.id
                    ) *
                        100 +
                    Number(
                        left.isRecent
                    ) *
                        10 +
                    Number(
                        left.isDetected
                    ) *
                        5 +
                    Number(
                        left.isFeatured
                    );
                const rightScore =
                    Number(
                        right.id ===
                            currentWallet?.id
                    ) *
                        100 +
                    Number(
                        right.isRecent
                    ) *
                        10 +
                    Number(
                        right.isDetected
                    ) *
                        5 +
                    Number(
                        right.isFeatured
                    );

                return rightScore -
                    leftScore ||
                    left.name.localeCompare(
                        right.name
                    );
            });

        return FAMILY_ORDER.map(
            (family) => ({
                family,
                wallets: filtered.filter(
                    (wallet) =>
                        wallet.chainFamily ===
                        family
                )
            })
        ).filter(
            (group) =>
                group.wallets.length > 0
        );
    }, [
        currentWallet?.id,
        deferredQuery,
        wallets
    ]);

    const recentWallets = useMemo(
        () =>
            wallets.filter(
                (wallet) =>
                    wallet.isRecent
            ),
        [wallets]
    );

    return (
        <AnimatePresence>
            {isModalOpen ? (
                <motion.div
                    initial={{
                        opacity: 0
                    }}
                    animate={{
                        opacity: 1
                    }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-xl"
                    onClick={closeModal}
                >
                    <motion.div
                        initial={{
                            opacity: 0,
                            y: 28,
                            scale: 0.98
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1
                        }}
                        exit={{
                            opacity: 0,
                            y: 18,
                            scale: 0.98
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 180,
                            damping: 22
                        }}
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                        className="mx-auto mt-6 flex max-h-[calc(100vh-3rem)] w-[min(980px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(173,223,241,0.16),transparent_38%),linear-gradient(180deg,rgba(0,49,82,0.98),rgba(0,27,46,0.98))] shadow-[0_40px_140px_rgba(0,0,0,0.55)]"
                    >
                        <div className="border-b border-white/10 px-5 py-4 sm:px-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="mb-2 flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1 rounded-full border border-electric-violet/20 bg-electric-violet/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-electric-violet">
                                            <Sparkles size={12} />
                                            Universal Connect
                                        </span>
                                        <span className="hidden rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 sm:inline-flex">
                                            Multi-chain ready
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-semibold tracking-tight text-white">
                                        Connect a wallet
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-400">
                                        One connection surface for EVM, Sui, and Stellar flows.
                                    </p>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-slate-400 transition-colors hover:border-white/20 hover:text-white"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 md:flex-row">
                                <label className="relative block flex-1">
                                    <Search
                                        size={16}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                                    />
                                    <input
                                        value={
                                            modalQuery
                                        }
                                        onChange={(event) =>
                                            setModalQuery(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="Search wallets, chains, or connection type"
                                        className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-electric-violet/40 focus:bg-black/35"
                                    />
                                </label>
                                <div className="grid grid-cols-2 gap-3 md:w-[280px]">
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                                            Installed
                                        </div>
                                        <div className="mt-1 text-lg font-semibold text-white">
                                            {
                                                wallets.filter(
                                                    (
                                                        wallet
                                                    ) =>
                                                        wallet.availability ===
                                                        'installed'
                                                )
                                                    .length
                                            }
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                                            Recent
                                        </div>
                                        <div className="mt-1 text-lg font-semibold text-white">
                                            {
                                                recentWallets.length
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                            <div className="mb-5 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
                                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                                                Session
                                            </div>
                                            <div className="mt-1 text-lg font-semibold text-white">
                                                {currentWallet
                                                    ? currentWallet.name
                                                    : 'No wallet connected'}
                                            </div>
                                        </div>
                                        <StatusBadge
                                            status={
                                                status
                                            }
                                        />
                                    </div>
                                    <div className="mt-4">
                                        {currentWallet ? (
                                            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center">
                                                <WalletGlyph
                                                    walletId={
                                                        currentWallet.id
                                                    }
                                                    family={
                                                        currentWallet.family
                                                    }
                                                    shortName={currentWallet.name
                                                        .slice(
                                                            0,
                                                            2
                                                        )
                                                        .toUpperCase()}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-semibold text-white">
                                                        {
                                                            currentWallet.name
                                                        }
                                                    </div>
                                                    <div className="mt-1 text-xs text-slate-400">
                                                        {shortenAddress(
                                                            currentWallet.address,
                                                            8,
                                                            6
                                                        )}
                                                    </div>
                                                    <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">
                                                        {getFamilyLabel(
                                                            currentWallet.family
                                                        )}{' '}
                                                        •{' '}
                                                        {
                                                            currentWallet.chain.name
                                                        }
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        void disconnect()
                                                    }
                                                    className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-red-300 transition-colors hover:bg-red-500/15"
                                                >
                                                    Disconnect
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                                                Installed wallets are detected automatically, recent choices are remembered, and reconnect state is restored when possible.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    <InfoPill
                                        icon={
                                            <Shield size={16} />
                                        }
                                        title="Safer session handling"
                                        body="Provider checks, stale session cleanup, and explicit disconnect flows are built in."
                                    />
                                    <InfoPill
                                        icon={
                                            <Link2 size={16} />
                                        }
                                        title="QR and deep links"
                                        body="WalletConnect, MetaMask, and Coinbase stay ready for mobile and desktop handoff."
                                    />
                                </div>
                            </div>

                            {error ? (
                                <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                    {error.message}
                                </div>
                            ) : null}

                            {recentWallets.length > 0 ? (
                                <section className="mb-6">
                                    <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                                        <Clock3 size={13} />
                                        Recent wallets
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        {recentWallets.map(
                                            (
                                                wallet
                                            ) => (
                                                <WalletCard
                                                    key={`recent-${wallet.id}`}
                                                    wallet={
                                                        wallet
                                                    }
                                                    currentWalletId={
                                                        currentWallet?.id
                                                    }
                                                    pendingWalletId={
                                                        pendingWalletId
                                                    }
                                                    onConnect={() =>
                                                        void connect(
                                                            wallet.id
                                                        ).catch(
                                                            () =>
                                                                undefined
                                                        )
                                                    }
                                                />
                                            )
                                        )}
                                    </div>
                                </section>
                            ) : null}

                            <div className="space-y-6">
                                {walletGroups.map(
                                    (
                                        group
                                    ) => (
                                        <section
                                            key={
                                                group.family
                                            }
                                        >
                                            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                                                {getFamilyLabel(
                                                    group.family
                                                )}{' '}
                                                wallets
                                            </div>
                                            <div className="grid gap-3 lg:grid-cols-2">
                                                {group.wallets.map(
                                                    (
                                                        wallet
                                                    ) => (
                                                        <WalletCard
                                                            key={
                                                                wallet.id
                                                            }
                                                            wallet={
                                                                wallet
                                                            }
                                                            currentWalletId={
                                                                currentWallet?.id
                                                            }
                                                            pendingWalletId={
                                                                pendingWalletId
                                                            }
                                                            onConnect={() =>
                                                                void connect(
                                                                    wallet.id
                                                                ).catch(
                                                                    () =>
                                                                        undefined
                                                                )
                                                            }
                                                        />
                                                    )
                                                )}
                                            </div>
                                        </section>
                                    )
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

function WalletCard({
    wallet,
    currentWalletId,
    pendingWalletId,
    onConnect
}: {
    wallet: WalletCatalogItem;
    currentWalletId?: string;
    pendingWalletId: string | null;
    onConnect: () => void;
}) {
    const isCurrent =
        currentWalletId === wallet.id;
    const isPending =
        pendingWalletId === wallet.id;
    const actionLabel =
        wallet.availability ===
        'coming-soon'
            ? 'Prepared'
            : wallet.isReady
              ? isCurrent
                    ? 'Connected'
                    : isPending
                      ? 'Connecting...'
                      : 'Connect'
              : 'Install';

    return (
        <motion.div
            layout
            whileHover={{
                y: -2
            }}
            className={`group rounded-[24px] border p-4 transition-all ${
                isCurrent
                    ? 'border-electric-violet/30 bg-electric-violet/10 shadow-[0_24px_70px_rgba(173,223,241,0.18)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
            }`}
        >
            <div className="flex items-start gap-4">
                <WalletGlyph
                    walletId={wallet.id}
                    family={
                        wallet.chainFamily
                    }
                    shortName={
                        wallet.shortName
                    }
                />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-semibold text-white">
                            {wallet.name}
                        </div>
                        {wallet.badge ? (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                                {wallet.badge}
                            </span>
                        ) : null}
                        {wallet.isRecent ? (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                                Recent
                            </span>
                        ) : null}
                        {wallet.isDetected ? (
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                                Installed
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                        {wallet.helperText}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {wallet.methods.includes(
                            'walletconnect'
                        ) ? (
                            <InlineBadge
                                icon={
                                    <Link2 size={12} />
                                }
                                label="QR ready"
                            />
                        ) : null}
                        {wallet.methods.includes(
                            'deeplink'
                        ) ? (
                            <InlineBadge
                                icon={
                                    <Smartphone size={12} />
                                }
                                label="Mobile deep link"
                            />
                        ) : null}
                        {wallet.availability ===
                        'installed' ? (
                            <InlineBadge
                                icon={
                                    <CheckCircle2 size={12} />
                                }
                                label="Detected"
                            />
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    {wallet.chainFamily}
                </div>
                <div className="flex items-center gap-2">
                    {!wallet.isReady &&
                    wallet.installUrl ? (
                        <a
                            href={
                                wallet.installUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-2 text-[11px] font-semibold text-slate-300 transition-colors hover:border-white/20 hover:text-white"
                        >
                            Install
                            <ExternalLink
                                size={12}
                            />
                        </a>
                    ) : null}
                    <button
                        onClick={onConnect}
                        disabled={
                            isPending ||
                            wallet.availability ===
                                'coming-soon' ||
                            isCurrent
                        }
                        className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] transition-all ${
                            isCurrent
                                ? 'bg-white/10 text-white'
                                : wallet.isReady &&
                                    wallet.availability !==
                                        'coming-soon'
                                  ? 'bg-gradient-to-r from-electric-violet to-soft-purple text-white shadow-[0_12px_30px_rgba(173,223,241,0.25)] hover:scale-[1.02]'
                                  : 'border border-white/10 bg-white/[0.03] text-slate-400'
                        }`}
                    >
                        {actionLabel}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function InlineBadge({
    icon,
    label
}: {
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
            {icon}
            {label}
        </span>
    );
}

function StatusBadge({
    status
}: {
    status: string;
}) {
    const tone =
        status === 'connected'
            ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
            : status === 'connecting'
              ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
              : status ===
                      'rejected' ||
                  status === 'error'
                ? 'border-red-400/20 bg-red-400/10 text-red-300'
                : 'border-white/10 bg-white/[0.04] text-slate-300';

    return (
        <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${tone}`}
        >
            {status.replace('-', ' ')}
        </span>
    );
}

function InfoPill({
    icon,
    title,
    body
}: {
    icon: React.ReactNode;
    title: string;
    body: string;
}) {
    return (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 inline-flex rounded-2xl border border-white/10 bg-black/20 p-2 text-electric-violet">
                {icon}
            </div>
            <div className="text-sm font-semibold text-white">
                {title}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
                {body}
            </p>
        </div>
    );
}
