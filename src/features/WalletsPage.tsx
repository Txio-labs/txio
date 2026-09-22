/**
 * Wallets page — shows the app's REAL wallet state. Txio only ever has one
 * active connected wallet at a time (see WalletManagerProvider's
 * `currentWallet`), not a table of simultaneously-connected wallets across
 * chains — so this page reflects that honestly instead of a fabricated
 * multi-wallet dashboard. "Recent wallets" (previously connected, not
 * currently active) are listed below with a one-click reconnect.
 */
import React from 'react';
import {
    Copy,
    RefreshCcw,
    Shield,
    ShieldCheck,
    ExternalLink,
    Check,
    Wallet as WalletIcon
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useWallet, useWalletBalance } from '@/wallet';
import { shortenAddress, getWalletExplorerUrl } from '@/wallet/utils';
import type { WalletChainFamily } from '@/wallet/types';

const CHAIN_META: Record<WalletChainFamily, { label: string; color: string }> = {
    sui: { label: 'Sui', color: '#6fbcf0' },
    evm: { label: 'EVM', color: '#a5a8f7' },
    solana: { label: 'Solana', color: '#14f195' },
    aptos: { label: 'Aptos', color: '#2ed3b7' },
    stellar: { label: 'Stellar', color: '#f5d060' }
};

const ChainDot: React.FC<{ family: WalletChainFamily; size?: number }> = ({ family, size = 8 }) => (
    <span
        className="inline-block rounded-full shrink-0"
        style={{ width: size, height: size, backgroundColor: CHAIN_META[family].color }}
    />
);

const WalletGlyph: React.FC<{ shortName: string; family: WalletChainFamily; size?: 'sm' | 'md' }> = ({ shortName, family, size = 'md' }) => {
    const dims = size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-xs';
    return (
        <div
            className={`${dims} rounded-xl flex items-center justify-center font-bold shrink-0 border`}
            style={{ backgroundColor: `${CHAIN_META[family].color}1a`, borderColor: `${CHAIN_META[family].color}40`, color: CHAIN_META[family].color }}
        >
            {shortName}
        </div>
    );
};

const CopyButton: React.FC<{ value: string }> = ({ value }) => {
    const [copied, setCopied] = React.useState(false);
    return (
        <button
            onClick={() => {
                navigator.clipboard.writeText(value);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
            }}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors shrink-0"
            title="Copy address"
        >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
        </button>
    );
};

export const WalletsPage: React.FC = () => {
    const { theme, settings } = useAppStore();
    const isDark = theme === 'dark';
    const {
        currentWallet,
        isConnected,
        isConnecting,
        wallets,
        recentWalletIds,
        connect,
        disconnect,
        openModal
    } = useWallet();
    const { balance, isLoading: isBalanceLoading } = useWalletBalance();

    // Wallets the user has connected before but aren't the active session —
    // shown as one-click reconnect shortcuts, not as "also connected".
    const recentWallets = recentWalletIds
        .filter((id) => id !== currentWallet?.id)
        .map((id) => wallets.find((w) => w.id === id))
        .filter((w): w is NonNullable<typeof w> => Boolean(w));

    const explorerUrl = currentWallet ? getWalletExplorerUrl(currentWallet, settings) : null;

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-near-black p-6 md:p-8">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Wallets</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your connected wallet and reconnect to recent ones.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
                    <div className="space-y-6 min-w-0">
                        {/* Active wallet summary */}
                        {isConnected && currentWallet ? (
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-5 flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-3 min-w-0">
                                    <WalletGlyph shortName={currentWallet.name.slice(0, 2).toUpperCase()} family={currentWallet.family} />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white truncate">{currentWallet.name}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                                {CHAIN_META[currentWallet.family].label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            Connected
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 text-xs font-mono text-slate-500">
                                            <span>{shortenAddress(currentWallet.address)}</span>
                                            <CopyButton value={currentWallet.address} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 text-sm">
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">
                                            {isBalanceLoading ? '…' : balance?.formatted ?? '—'}
                                        </div>
                                        <div className="text-[11px] text-slate-500">Balance</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{currentWallet.connectorName}</div>
                                        <div className="text-[11px] text-slate-500">Connector</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 ml-auto">
                                    {explorerUrl && (
                                        <a
                                            href={explorerUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <ExternalLink size={12} /> Explorer
                                        </a>
                                    )}
                                    <button
                                        onClick={openModal}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <RefreshCcw size={12} /> Switch Wallet
                                    </button>
                                    <button
                                        onClick={() => void disconnect()}
                                        className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black text-xs font-bold hover:opacity-90 transition-opacity"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-8 flex flex-col items-center text-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                    <WalletIcon size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white">No wallet connected</div>
                                    <p className="text-xs text-slate-500 mt-1">Connect a wallet to sign transactions across Sui, EVM, Solana, Aptos, or Stellar.</p>
                                </div>
                                <button
                                    onClick={openModal}
                                    disabled={isConnecting}
                                    className="mt-1 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {isConnecting ? 'Connecting…' : 'Connect Wallet'}
                                </button>
                            </div>
                        )}

                        {/* Recent wallets */}
                        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-indigo-glow overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/5">
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Wallets</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Wallets you&apos;ve connected before — reconnect with one click.</p>
                                </div>
                            </div>

                            {recentWallets.length === 0 ? (
                                <div className="px-5 py-10 text-center text-xs text-slate-500">
                                    No recent wallets yet.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {recentWallets.map((wallet) => (
                                        <div
                                            key={wallet.id}
                                            className="flex items-center justify-between gap-3 px-5 py-3"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <WalletGlyph shortName={wallet.shortName} family={wallet.chainFamily} size="sm" />
                                                <div className="min-w-0">
                                                    <div className="font-bold text-slate-900 dark:text-white truncate">{wallet.name}</div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                        <ChainDot family={wallet.chainFamily} />
                                                        {CHAIN_META[wallet.chainFamily].label}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => void connect(wallet.id)}
                                                disabled={isConnecting}
                                                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                                            >
                                                <RefreshCcw size={12} /> Reconnect
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="space-y-6">
                        {/* Supported networks */}
                        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-5 space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Supported Networks</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {(Object.keys(CHAIN_META) as WalletChainFamily[]).map((family) => (
                                    <div
                                        key={family}
                                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs ${
                                            currentWallet?.family === family
                                                ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                                                : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                                        }`}
                                    >
                                        <ChainDot family={family} />
                                        {CHAIN_META[family].label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Security note */}
                        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-5 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                                {isDark ? <ShieldCheck size={16} /> : <Shield size={16} />}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Your wallet is connected directly to the blockchain. Txio does not store your private keys or seed phrases.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
