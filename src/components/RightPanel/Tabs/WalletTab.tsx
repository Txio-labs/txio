import { RPC_CHAINS } from '@/lib/constants';
import { ChainIcon } from '@/components/ui/ChainIcon';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Check,
    ChevronDown,
    Copy,
    ExternalLink,
    LogOut,
    Wallet
} from 'lucide-react';

import {
    getFamilyLabel,
    getWalletExplorerUrl,
    useWallet,
    useWalletBalance
} from '@/wallet';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { Avatar } from '@/components/ui/Avatar';
import { useAppStore, appStore } from '@/lib/store';

interface WalletTabProps {
    formatAddress: (address: string) => string;
}

export const WalletTab: React.FC<
    WalletTabProps
> = ({ formatAddress }) => {
    const [copied, setCopied] =
        useState(false);
    const [isSwitchOpen, setIsSwitchOpen] =
        useState(false);
    const switchTriggerRef =
        useRef<HTMLButtonElement>(null);
    const switchMenuRef =
        useRef<HTMLDivElement>(null);
    // Rendered through a portal (see switchMenuRect below): a plain
    // `absolute` menu gets clipped by the wallet card's `overflow-hidden`
    // (used to clip its decorative background gradient) instead of
    // floating above everything.
    const [switchMenuRect, setSwitchMenuRect] =
        useState<{ top: number; left: number; width: number } | null>(null);
    const {
        currentWallet,
        linkedWallets,
        setActiveSigner,
        disconnect,
        openModal,
        error,
        status
    } = useWallet();

    const updateSwitchMenuRect = useCallback(() => {
        const el = switchTriggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // The trigger is only half-width (one of two buttons in a
        // grid-cols-2 row), too narrow for wallet name/address/"Connect
        // another chain" text to lay out cleanly — widen the menu and clamp
        // it to the viewport instead of matching the trigger exactly.
        const MIN_MENU_WIDTH = 220;
        const width = Math.max(rect.width, MIN_MENU_WIDTH);
        const left = Math.min(rect.left, window.innerWidth - width - 8);
        setSwitchMenuRect({
            top: rect.bottom + 4,
            left: Math.max(8, left),
            width
        });
    }, []);

    useEffect(() => {
        if (!isSwitchOpen) return;
        updateSwitchMenuRect();

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                switchTriggerRef.current && !switchTriggerRef.current.contains(target) &&
                switchMenuRef.current && !switchMenuRef.current.contains(target)
            ) {
                setIsSwitchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', updateSwitchMenuRect, true);
        window.addEventListener('resize', updateSwitchMenuRect);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', updateSwitchMenuRect, true);
            window.removeEventListener('resize', updateSwitchMenuRect);
        };
    }, [isSwitchOpen, updateSwitchMenuRect]);

    const otherLinkedWallets = Object.values(linkedWallets).filter(
        (wallet) => wallet && wallet.id !== currentWallet?.id
    ) as NonNullable<typeof currentWallet>[];
    const {
        balance,
        isLoading
    } = useWalletBalance();
    const { settings } = useAppStore();

    const handleCopy = async () => {
        if (!currentWallet) {
            return;
        }

        await navigator.clipboard.writeText(
            currentWallet.address
        );
        setCopied(true);
        setTimeout(
            () => setCopied(false),
            1800
        );
    };

    if (!currentWallet) {
        return (
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-5">
                <div className="rounded-card border border-line bg-surface p-5">
                    <div className="mb-3 inline-flex rounded-[10px] border border-line bg-sunken p-2.5 text-fg-muted">
                        <Wallet size={20} />
                    </div>
                    <div className="mb-1 text-sm font-semibold text-fg">No wallet connected</div>
                    <p className="mb-4 text-xs leading-5 text-fg-subtle">
                        Connect a wallet on any supported chain to sign transactions and see balances here.
                    </p>
                    <div className="mb-4 flex items-center gap-1.5">
                        {RPC_CHAINS.map((chain) => (
                            <span key={chain.id} title={chain.label}>
                                <ChainIcon chain={chain.id} size={26} />
                            </span>
                        ))}
                    </div>
                    <ConnectWalletButton fullWidth />
                </div>

                {error ? (
                    <div className="rounded-card border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-6 text-red-600 dark:text-red-300">
                        {error.message}
                    </div>
                ) : null}
            </div>
        );
    }

    const explorerUrl =
        getWalletExplorerUrl(currentWallet, {
            explorer: settings.explorer,
            evmExplorer: settings.evmExplorer,
            stellarExplorer: settings.stellarExplorer,
            solanaExplorer: settings.solanaExplorer
        });

    return (
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-5">
            <div className="relative overflow-hidden rounded-[28px] border border-line bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.07),transparent_42%),linear-gradient(180deg,#ffffff,#f8fafc)] dark:bg-[radial-gradient(circle_at_top,rgba(163,163,163,0.18),transparent_42%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(10,10,10,0.98))] p-5 shadow-sm dark:shadow-[0_28px_80px_rgba(0,0,0,0.4)]">
                <div className="absolute -right-8 top-0 h-32 w-32 rounded-full bg-hover blur-[48px]" />
                <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-[12px] font-semibold text-fg-subtle">
                                Active wallet
                            </div>
                            <div className="mt-2 text-lg font-semibold text-fg">
                                {
                                    currentWallet.name
                                }
                            </div>
                            <div className="mt-1 text-xs text-fg-subtle">
                                {getFamilyLabel(
                                    currentWallet.family
                                )}{' '}
                                •{' '}
                                {
                                    currentWallet.chain.name
                                }
                            </div>
                        </div>
                        <div className="rounded-full border border-line bg-hover p-1">
                            <Avatar
                                size="xs"
                                seed={
                                    currentWallet.address
                                }
                            />
                        </div>
                    </div>

                    <div className="mt-5 rounded-card border border-line bg-hover p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-[12px] font-semibold text-fg-subtle">
                                    Address
                                </div>
                                <div className="mt-1 font-mono text-sm text-fg">
                                    {formatAddress(
                                        currentWallet.address
                                    )}
                                </div>
                            </div>
                            <span className="rounded-full border border-line bg-hover px-2.5 py-1 text-[12px] font-semibold text-fg-muted">
                                {status}
                            </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <Metric
                                label="Balance"
                                value={
                                    isLoading
                                        ? 'Loading'
                                        : balance
                                          ? balance.formatted
                                          : 'Unavailable'
                                }
                            />
                            <Metric
                                label="Connector"
                                value={
                                    currentWallet.connectorName
                                }
                            />
                        </div>

                        <div className="mt-5 flex items-center gap-2 rounded-card border border-line bg-hover p-1">
                            <button
                                onClick={() =>
                                    void handleCopy()
                                }
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] px-3 py-2 text-[12px] font-semibold text-fg-muted transition-colors hover:bg-hover hover:text-fg"
                            >
                                {copied ? (
                                    <Check
                                        size={13}
                                        className="text-emerald-500"
                                    />
                                ) : (
                                    <Copy size={13} />
                                )}
                                {copied
                                    ? 'Copied'
                                    : 'Copy'}
                            </button>
                            <div className="h-5 w-px bg-active" />
                            <button
                                onClick={() => {
                                    if (
                                        explorerUrl
                                    ) {
                                        window.open(
                                            explorerUrl,
                                            '_blank'
                                        );
                                    }
                                }}
                                disabled={
                                    !explorerUrl
                                }
                                title={explorerUrl ? undefined : 'No block explorer configured for this network'}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] px-3 py-2 text-[12px] font-semibold text-fg-muted transition-colors hover:bg-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 dark:disabled:hover:text-slate-300"
                            >
                                <ExternalLink size={13} />
                                Explorer
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                            ref={switchTriggerRef}
                            onClick={() =>
                                otherLinkedWallets.length > 0
                                    ? setIsSwitchOpen((open) => !open)
                                    : openModal()
                            }
                            className="flex w-full items-center justify-center gap-2 rounded-card border border-line px-4 py-3 text-xs font-semibold text-fg-muted transition-colors hover:bg-hover"
                        >
                            <Wallet size={14} />
                            Switch
                            {otherLinkedWallets.length > 0 && (
                                <ChevronDown
                                    size={12}
                                    className={`transition-transform ${isSwitchOpen ? 'rotate-180' : ''}`}
                                />
                            )}
                        </button>

                        {isSwitchOpen && otherLinkedWallets.length > 0 && switchMenuRect && createPortal(
                            <>
                                <button
                                    className="fixed inset-0 z-[100] cursor-default"
                                    onClick={() => setIsSwitchOpen(false)}
                                    tabIndex={-1}
                                    aria-hidden="true"
                                />
                                <div
                                    ref={switchMenuRef}
                                    style={{
                                        position: 'fixed',
                                        top: switchMenuRect.top,
                                        left: switchMenuRect.left,
                                        width: switchMenuRect.width
                                    }}
                                    className="z-[101] overflow-hidden rounded-card border border-line bg-elevated shadow-pop animate-in fade-in zoom-in-95 duration-100 origin-top"
                                >
                                    {otherLinkedWallets.map((wallet) => (
                                        <button
                                            key={wallet.id}
                                            onClick={() => {
                                                setActiveSigner(wallet.family);
                                                setIsSwitchOpen(false);
                                            }}
                                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-hover"
                                        >
                                            <Avatar size="xs" seed={wallet.address} />
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-xs font-semibold text-fg">{wallet.name}</div>
                                                <div className="text-[12px] text-fg-subtle">
                                                    {getFamilyLabel(wallet.family)} · {formatAddress(wallet.address)}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => {
                                            setIsSwitchOpen(false);
                                            openModal();
                                        }}
                                        className="flex w-full items-center gap-2.5 whitespace-nowrap border-t border-line px-3 py-2.5 text-left text-xs font-semibold text-fg transition-colors hover:bg-hover"
                                    >
                                        <Wallet size={13} className="shrink-0" />
                                        Connect another chain
                                    </button>
                                </div>
                            </>,
                            document.body
                        )}
                        <button
                            onClick={() =>
                                void disconnect()
                            }
                            className="flex items-center justify-center gap-2 rounded-card border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-600 dark:text-red-400 transition-colors hover:bg-red-500/15"
                        >
                            <LogOut size={14} />
                            Disconnect
                        </button>
                    </div>

                    <button
                        onClick={() => appStore.openTab('profile')}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-card px-4 py-2.5 text-[12px] font-semibold text-fg-subtle hover:text-fg transition-colors"
                    >
                        Manage all wallets →
                    </button>
                </div>
            </div>

            {error ? (
                <div className="rounded-card border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-6 text-red-600 dark:text-red-300">
                    {error.message}
                </div>
            ) : null}
        </div>
    );
};

function Metric({
    label,
    value
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-card border border-line bg-hover px-3 py-3">
            <div className="text-[12px] font-semibold text-fg-subtle">
                {label}
            </div>
            <div className="mt-2 text-sm font-semibold text-fg">
                {value}
            </div>
        </div>
    );
}
