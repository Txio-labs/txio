import React, { useEffect, useState } from 'react';
import { AlertTriangle, KeyRound, Loader2, Plus, ShieldAlert, X } from 'lucide-react';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import { apiService, ApiError, BackendSessionKey } from '@/services/api';
import { appStore } from '@/lib/store';
import type { ConnectedWallet } from '@/wallet/types';
import { useWallet } from '@/wallet';
import { EvmTxParams, RequestItem, RequestType } from '../../types';
import { SignTransactionModal } from '@/components/SignTransactionModal';
import { executeTransaction } from '@/services/transactionService';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';

interface SessionKeysTabProps {
    wallets: ConnectedWallet[];
}

const buildDelegationRequest = (
    tokenAddress: string,
    delegateAddress: string,
    amountWei: string,
    chainId: number
): RequestItem => {
    const evmTxParams: EvmTxParams = {
        chainId,
        to: tokenAddress,
        value: '0',
        functionSignature: 'approve(address,uint256)',
        args: [delegateAddress, amountWei],
        data: ''
    };
    return {
        id: `session-key-delegation-${delegateAddress}`,
        name: 'Authorize session key',
        type: RequestType.TRANSACTION,
        network: 'mainnet',
        rpcParams: { chain: 'evm', method: '', params: [] },
        moveParams: { ...DEFAULT_MOVE_CALL },
        evmTxParams
    };
};

export const SessionKeysTab: React.FC<SessionKeysTabProps> = ({ wallets }) => {
    const { currentWallet, openModal } = useWallet();
    const [keys, setKeys] = useState<BackendSessionKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const evmWallet = wallets.find((w) => w.family === 'evm') ?? null;

    const [label, setLabel] = useState('');
    const [tokenAddress, setTokenAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [maxUsd, setMaxUsd] = useState('');
    const [expiryHours, setExpiryHours] = useState('24');

    // Held only in memory between "generate" and the on-chain delegation tx
    // confirming — never persisted client-side, never logged.
    const [pendingSigner, setPendingSigner] = useState<{ address: string; privateKey: string } | null>(null);
    const [delegationRequest, setDelegationRequest] = useState<RequestItem | null>(null);
    const [creating, setCreating] = useState(false);

    const loadKeys = () => {
        queueMicrotask(() => {
            setLoading(true);
            setError(null);
        });
        apiService
            .listSessionKeys()
            .then(setKeys)
            .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load session keys.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadKeys();
    }, []);

    const handleGenerate = () => {
        if (!evmWallet || !tokenAddress.trim() || !amount.trim()) return;
        const privateKey = generatePrivateKey();
        const account = privateKeyToAccount(privateKey);
        setPendingSigner({ address: account.address, privateKey });
        setDelegationRequest(
            buildDelegationRequest(tokenAddress.trim(), account.address, amount.trim(), evmWallet.chain.id === 'evm' ? 1 : 1)
        );
    };

    const handleDelegationExecuted = async () => {
        if (!pendingSigner || !evmWallet) return;
        setCreating(true);
        setError(null);
        try {
            const expires = new Date(Date.now() + Number(expiryHours || '24') * 60 * 60 * 1000).toISOString();
            await apiService.createSessionKey({
                walletFamily: evmWallet.family,
                walletAddress: evmWallet.address,
                label: label.trim() || 'Untitled session key',
                delegateAddress: pendingSigner.address,
                delegatePrivateKey: pendingSigner.privateKey,
                scopedContracts: [tokenAddress.trim()],
                maxAmountPerTxUsd: maxUsd.trim() ? Number(maxUsd.trim()) : null,
                expiresAt: expires
            });
            appStore.showToast('Session key created', 'success');
            setShowCreate(false);
            setPendingSigner(null);
            setDelegationRequest(null);
            setLabel('');
            setTokenAddress('');
            setAmount('');
            setMaxUsd('');
            loadKeys();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to save session key.');
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (id?: string) => {
        if (!id) return;
        try {
            await apiService.revokeSessionKey(id);
            appStore.showToast('Session key revoked', 'success');
            loadKeys();
        } catch (err) {
            appStore.showToast(err instanceof ApiError ? err.message : 'Failed to revoke.', 'error');
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 max-w-md">
                    A session key lets automations sign on your behalf without your real wallet — scoped to a contract, an
                    amount, and an expiry. EVM only today.
                </p>
                <button
                    onClick={() => setShowCreate((s) => !s)}
                    disabled={!evmWallet}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black hover:opacity-90 disabled:opacity-40 shrink-0"
                >
                    <Plus size={13} /> New session key
                </button>
            </div>

            {!evmWallet && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 p-3 text-[11px] text-amber-700 dark:text-amber-400">
                    <AlertTriangle size={13} /> Link an EVM wallet to create a session key.
                </div>
            )}

            {showCreate && evmWallet && (
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-4 space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Label</label>
                        <input
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="e.g. Weekly DCA bot"
                            className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Token contract to scope to</label>
                        <input
                            value={tokenAddress}
                            onChange={(e) => setTokenAddress(e.target.value)}
                            placeholder="0x…"
                            className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Approved amount (base units)</label>
                            <input
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="1000000000000000000"
                                className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Max USD per tx (optional)</label>
                            <input
                                value={maxUsd}
                                onChange={(e) => setMaxUsd(e.target.value)}
                                placeholder="No limit"
                                className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Expires in (hours)</label>
                        <input
                            value={expiryHours}
                            onChange={(e) => setExpiryHours(e.target.value)}
                            inputMode="numeric"
                            className="w-32 h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                        />
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 p-3 text-[11px] text-amber-700 dark:text-amber-400">
                        <ShieldAlert size={13} className="shrink-0 mt-0.5" />
                        This generates a new signing key in your browser and sends it once to Txio&apos;s server, encrypted at
                        rest, so scheduled tasks can sign without you present. It is never your real wallet&apos;s key, and is
                        capped by exactly the scope/amount/expiry set here.
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={!tokenAddress.trim() || !amount.trim()}
                        className="w-full h-10 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black text-xs font-bold hover:opacity-90 disabled:opacity-40"
                    >
                        Generate &amp; authorize on-chain
                    </button>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-[11px] text-red-600 dark:text-red-400">
                    <AlertTriangle size={13} /> {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-10 text-slate-500 text-xs gap-2">
                    <Loader2 size={16} className="animate-spin" /> Loading session keys…
                </div>
            ) : keys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <KeyRound size={28} className="text-slate-400 mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No session keys yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {keys.map((key) => {
                        const active = !key.revoked_at && new Date(key.expires_at) > new Date();
                        return (
                            <div key={key.id?.toString()} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-indigo-glow p-3">
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{key.label}</div>
                                    <div className="text-[11px] text-slate-500 font-mono truncate">{key.delegate_address}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                        {active ? `Expires ${new Date(key.expires_at).toLocaleString()}` : 'Expired or revoked'}
                                    </div>
                                </div>
                                {active && (
                                    <button
                                        onClick={() => handleRevoke(key.id?.toString())}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg shrink-0"
                                        title="Revoke"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <SignTransactionModal
                isOpen={Boolean(delegationRequest)}
                onClose={() => { setDelegationRequest(null); setPendingSigner(null); }}
                onConfirm={() => {}}
                onExecute={async () => {
                    if (!delegationRequest) return;
                    await executeTransaction(delegationRequest, { network: 'mainnet', wallet: currentWallet });
                    await handleDelegationExecuted();
                }}
                wallet={currentWallet}
                onRequestConnect={openModal}
                request={delegationRequest}
                network="mainnet"
            />

            {creating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-near-black/80">
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <Loader2 size={16} className="animate-spin" /> Saving session key…
                    </div>
                </div>
            )}
        </div>
    );
};
