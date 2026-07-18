import React, { useState } from 'react';
import {
    Check,
    Copy,
    ExternalLink,
    LogOut,
    Shield,
    Sparkles,
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
import { useAppStore } from '@/lib/store';

interface WalletTabProps {
    formatAddress: (address: string) => string;
}

export const WalletTab: React.FC<
    WalletTabProps
> = ({ formatAddress }) => {
    const [copied, setCopied] =
        useState(false);
    const {
        currentWallet,
        disconnect,
        error,
        status
    } = useWallet();
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
                <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(173,223,241,0.16),transparent_42%),linear-gradient(180deg,rgba(0,49,82,0.98),rgba(0,27,46,0.98))] p-5">
                    <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.04),transparent)] opacity-60" />
                    <div className="relative z-10">
                        <div className="mb-4 inline-flex rounded-2xl border border-electric-violet/20 bg-electric-violet/10 p-3 text-electric-violet shadow-[0_20px_45px_rgba(173,223,241,0.18)]">
                            <Wallet size={24} />
                        </div>
                        <div className="mb-2 text-sm font-bold text-white">
                            Universal wallet access
                        </div>
                        <p className="mb-5 text-xs leading-6 text-slate-400">
                            Connect EVM, Sui, or Stellar wallets from one shared connection layer.
                        </p>
                        <ConnectWalletButton fullWidth />
                        <div className="mt-4 grid gap-3">
                            <InfoCard
                                icon={
                                    <Shield size={16} />
                                }
                                title="Safer session handling"
                                body="Provider validation, reconnect persistence, and explicit disconnect flows are built in."
                            />
                            <InfoCard
                                icon={
                                    <Sparkles size={16} />
                                }
                                title="Chain-aware tooling"
                                body="Sui object inspection stays intact while EVM and Stellar sessions are ready for expansion."
                            />
                        </div>
                    </div>
                </div>

                {error ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-6 text-red-200">
                        {error.message}
                    </div>
                ) : null}
            </div>
        );
    }

    const explorerUrl =
        getWalletExplorerUrl(
            currentWallet,
            settings.explorer
        );

    return (
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-5">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(173,223,241,0.18),transparent_42%),linear-gradient(180deg,rgba(0,49,82,0.98),rgba(0,27,46,0.98))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.4)]">
                <div className="absolute -right-8 top-0 h-32 w-32 rounded-full bg-electric-violet/10 blur-[48px]" />
                <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">
                                Active wallet
                            </div>
                            <div className="mt-2 text-lg font-semibold text-white">
                                {
                                    currentWallet.name
                                }
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                                {getFamilyLabel(
                                    currentWallet.family
                                )}{' '}
                                •{' '}
                                {
                                    currentWallet.chain.name
                                }
                            </div>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.04] p-1">
                            <Avatar
                                size="xs"
                                seed={
                                    currentWallet.address
                                }
                            />
                        </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                                    Address
                                </div>
                                <div className="mt-1 font-mono text-sm text-white">
                                    {formatAddress(
                                        currentWallet.address
                                    )}
                                </div>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">
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

                        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-near-black/40 p-1">
                            <button
                                onClick={() =>
                                    void handleCopy()
                                }
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] px-3 py-2 text-[11px] font-bold text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                            >
                                {copied ? (
                                    <Check
                                        size={13}
                                        className="text-emerald-400"
                                    />
                                ) : (
                                    <Copy size={13} />
                                )}
                                {copied
                                    ? 'Copied'
                                    : 'Copy'}
                            </button>
                            <div className="h-5 w-px bg-white/10" />
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
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] px-3 py-2 text-[11px] font-bold text-slate-400 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ExternalLink size={13} />
                                Explorer
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() =>
                            void disconnect()
                        }
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-red-300 transition-colors hover:bg-red-500/15"
                    >
                        <LogOut size={14} />
                        Disconnect
                    </button>
                </div>
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-6 text-red-200">
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
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                {label}
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
                {value}
            </div>
        </div>
    );
}

function InfoCard({
    icon,
    title,
    body
}: {
    icon: React.ReactNode;
    title: string;
    body: string;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 inline-flex rounded-2xl border border-white/10 bg-black/20 p-2 text-electric-violet">
                {icon}
            </div>
            <div className="text-xs font-bold text-white">
                {title}
            </div>
            <div className="mt-1 text-[11px] leading-6 text-slate-400">
                {body}
            </div>
        </div>
    );
}
