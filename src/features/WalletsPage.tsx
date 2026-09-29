/**
 * Wallets page — shows every wallet linked right now, one per chain family
 * (Txio supports linking a Sui wallet, a Stellar wallet, an EVM wallet, etc.
 * all at the same time — see WalletManagerProvider's `linkedWallets` map).
 * `activeSignerFamily` marks which one a new sign action targets by
 * default; it's not the only "real" connection, just the current default.
 * "Recent wallets" (previously connected, not currently linked to any
 * chain) are listed below with a one-click reconnect.
 */
import React from 'react';
import {
    Copy,
    RefreshCcw,
    Shield,
    ShieldCheck,
    ExternalLink,
    Check,
    Wallet as WalletIcon,
    Plus
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useWallet, useWalletBalance } from '@/wallet';
import { shortenAddress, getWalletExplorerUrl } from '@/wallet/utils';
import type { ConnectedWallet, WalletChainFamily } from '@/wallet/types';
import { TransactionHistoryList } from '@/components/wallet/TransactionHistoryList';

const CHAIN_META: Record<WalletChainFamily, { label: string; color: string }> = {
    sui: { label: 'Sui', color: '#6fbcf0' },
    evm: { label: 'EVM', color: '#a5a8f7' },
    solana: { label: 'Solana', color: '#14f195' },
    aptos: { label: 'Aptos', color: '#2ed3b7' },
    stellar: { label: 'Stellar', color: '#f5d060' }
};

const CHAIN_FAMILY_ORDER: WalletChainFamily[] = ['sui', 'evm', 'solana', 'aptos', 'stellar'];

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
        linkedWallets,
        activeSignerFamily,
        setActiveSigner,
        isConnecting,
        wallets,
        recentWalletIds,
        connect,
        disconnect,
        openModal
    } = useWallet();
    const { balance, isLoading: isBalanceLoading } = useWalletBalance();

    const linkedEntries = CHAIN_FAMILY_ORDER
        .map((family) => linkedWallets[family])
        .filter((wallet): wallet is ConnectedWallet => Boolean(wallet));
    const unlinkedFamilies = CHAIN_FAMILY_ORDER.filter((family) => !linkedWallets[family]);

    // Wallets the user has connected before but aren't linked to any chain
    // right now — shown as one-click reconnect shortcuts.
    const linkedIds = new Set(linkedEntries.map((w) => w.id));
    const recentWallets = recentWalletIds
        .filter((id) => !linkedIds.has(id))
        .map((id) => wallets.find((w) => w.id === id))
        .filter((w): w is NonNullable<typeof w> => Boolean(w));

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-near-black p-6 md:p-8">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Wallets</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Connect one wallet per chain — a Sui wallet and a Stellar wallet can both stay linked at once, which is what lets a cross-chain send find an address on each side.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
                    <div className="space-y-6 min-w-0">
                        {/* Linked wallets */}
                        {linkedEntries.length > 0 ? (
                            <div className="space-y-3">
                                {linkedEntries.map((wallet) => {
                                    const isActive = activeSignerFamily === wallet.family;
                                    const explorerUrl = getWalletExplorerUrl(wallet, settings);
                                    return (
                                        <div
                                            key={wallet.id}
                                            className="rounded-2xl border p-5 flex flex-wrap items-center gap-6"
                                            style={{
                                                borderColor: isActive ? `${CHAIN_META[wallet.family].color}66` : undefined
                                            }}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <WalletGlyph shortName={wallet.name.slice(0, 2).toUpperCase()} family={wallet.family} />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900 dark:text-white truncate">{wallet.name}</span>
                                                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                                            {CHAIN_META[wallet.family].label}
                                                        </span>
                                                        {isActive && (
                                                            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                                Default signer
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Connected
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-1 text-xs font-mono text-slate-500">
                                                        <span>{shortenAddress(wallet.address)}</span>
                                                        <CopyButton value={wallet.address} />
                                                    </div>
                                                </div>
                                            </div>

                                            {wallet.family === currentWallet?.family && (
                                                <div className="flex items-center gap-6 text-sm">
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white">
                                                            {isBalanceLoading ? '…' : balance?.formatted ?? '—'}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">Balance</div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 ml-auto">
                                                {!isActive && (
                                                    <button
                                                        onClick={() => setActiveSigner(wallet.family)}
                                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                                    >
                                                        Make default
                                                    </button>
                                                )}
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
                                                    onClick={() => void disconnect(wallet.family)}
                                                    className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black text-xs font-bold hover:opacity-90 transition-opacity"
                                                >
                                                    Disconnect
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
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

                        {/* Connect another chain */}
                        {unlinkedFamilies.length > 0 && (
                            <button
                                onClick={openModal}
                                disabled={isConnecting}
                                className="w-full rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-electric-violet hover:border-electric-violet/40 transition-colors disabled:opacity-50"
                            >
                                <Plus size={14} />
                                Connect a wallet on {unlinkedFamilies.map((f) => CHAIN_META[f].label).join(', ')}
                            </button>
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

                        {/* Transaction history */}
                        {currentWallet && (
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-indigo-glow overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/5">
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Transaction History</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Recent activity for {CHAIN_META[currentWallet.family].label} ({currentWallet.name}).</p>
                                    </div>
                                </div>
                                <TransactionHistoryList wallet={currentWallet} />
                            </div>
                        )}
                    </div>

                    {/* Right sidebar */}
                    <div className="space-y-6">
                        {/* Supported networks */}
                        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-5 space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Supported Networks</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {CHAIN_FAMILY_ORDER.map((family) => (
                                    <div
                                        key={family}
                                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs ${
                                            linkedWallets[family]
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
                                Your wallets are connected directly to their own blockchains. Txio does not store your private keys or seed phrases.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
