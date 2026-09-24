import React, { useState } from 'react';
import {
    Check,
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
    const {
        currentWallet,
        disconnect,
        openModal,
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
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                <div className="rounded-lg border border-border-default bg-surface-raised p-4">
                    <div className="mb-3 inline-flex rounded-md border border-border-default bg-near-black p-2 text-accent-muted">
                        <Wallet size={16} />
                    </div>
                    <div className="mb-1 text-xs font-bold text-white">
                        No wallet connected
                    </div>
                    <p className="mb-4 text-[11px] leading-5 text-slate-400">
                        Connect an EVM, Sui, Solana, or Stellar wallet to sign and inspect.
                    </p>
                    <ConnectWalletButton fullWidth />
                </div>

                {error ? (
                    <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-200">
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
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
            <div className="rounded-lg border border-border-default bg-surface-raised p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                            Active wallet
                        </div>
                        <div className="mt-1.5 text-sm font-semibold text-white">
                            {currentWallet.name}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                            {getFamilyLabel(
                                currentWallet.family
                            )}{' '}
                            •{' '}
                            {
                                currentWallet.chain.name
                            }
                        </div>
                    </div>
                    <div className="rounded-full border border-border-default bg-near-black p-1">
                        <Avatar
                            size="xs"
                            seed={
                                currentWallet.address
                            }
                        />
                    </div>
                </div>

                <div className="mt-4 rounded-md border border-border-subtle bg-near-black p-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                                Address
                            </div>
                            <div className="mt-1 font-mono text-xs text-white">
                                {formatAddress(
                                    currentWallet.address
                                )}
                            </div>
                        </div>
                        <span className="rounded-full border border-border-default bg-surface-hover px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                            {status}
                        </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
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

                    <div className="mt-3 flex items-center gap-1 rounded-md border border-border-subtle bg-surface-raised p-1">
                        <button
                            onClick={() =>
                                void handleCopy()
                            }
                            className="flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-bold text-slate-300 transition-colors hover:bg-surface-hover hover:text-white"
                        >
                            {copied ? (
                                <Check
                                    size={13}
                                    className="text-status-success"
                                />
                            ) : (
                                <Copy size={13} />
                            )}
                            {copied
                                ? 'Copied'
                                : 'Copy'}
                        </button>
                        <div className="h-4 w-px bg-border-default" />
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
                            className="flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-bold text-slate-300 transition-colors hover:bg-surface-hover hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-300"
                        >
                            <ExternalLink size={13} />
                            Explorer
                        </button>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                        onClick={openModal}
                        className="flex items-center justify-center gap-1.5 rounded-md border border-border-default px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300 transition-colors hover:bg-surface-hover"
                    >
                        <Wallet size={13} />
                        Switch
                    </button>
                    <button
                        onClick={() =>
                            void disconnect()
                        }
                        className="flex items-center justify-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-red-400 transition-colors hover:bg-red-500/15"
                    >
                        <LogOut size={13} />
                        Disconnect
                    </button>
                </div>

                <button
                    onClick={() => appStore.openTab('profile')}
                    className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 hover:text-white transition-colors"
                >
                    Manage all wallets →
                </button>
            </div>

            {error ? (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-200">
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
        <div className="rounded-md border border-border-subtle bg-surface-raised px-2.5 py-2">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {label}
            </div>
            <div className="mt-1 text-xs font-semibold text-white">
                {value}
            </div>
        </div>
    );
}
