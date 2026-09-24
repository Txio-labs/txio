import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, KeyRound, Loader2, RefreshCw, ShieldOff } from 'lucide-react';

import { useWallet } from '@/wallet';
import { shortenAddress } from '@/wallet/utils';
import { EVM_CHAINS } from '@/lib/constants';
import { EvmApproval, evmChainLabelFor, scanEvmApprovals } from '@/services/approvals';
import { executeTransaction } from '@/services/transactionService';
import { SignTransactionModal } from '@/components/SignTransactionModal';
import { EvmTxParams, RequestItem, RequestType } from '../types';
import { appStore } from '@/lib/store';

const buildRevokeRequest = (approval: EvmApproval, chainId: number): RequestItem => {
    const evmTxParams: EvmTxParams = {
        chainId,
        to: approval.tokenAddress,
        value: '0',
        functionSignature: 'approve(address,uint256)',
        args: [approval.spender, '0'],
        data: ''
    };

    return {
        id: `revoke-${approval.tokenAddress}-${approval.spender}`,
        name: `Revoke ${approval.tokenSymbol ?? 'token'} approval`,
        type: RequestType.TRANSACTION,
        network: 'mainnet',
        rpcParams: { chain: 'evm', method: '', params: [] },
        moveParams: { packageId: '', module: '', function: '', typeArguments: [], arguments: [], gasBudget: '' },
        evmTxParams
    };
};

export const ApprovalsPage: React.FC = () => {
    const { currentWallet, openModal } = useWallet();
    const [chainId, setChainId] = useState<number>(EVM_CHAINS[0].id);
    const [approvals, setApprovals] = useState<EvmApproval[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingRevoke, setPendingRevoke] = useState<EvmApproval | null>(null);
    const [revokingKey, setRevokingKey] = useState<string | null>(null);

    const isEvmConnected = currentWallet?.family === 'evm';
    const owner = isEvmConnected ? currentWallet!.address : null;

    const runScan = useCallback(() => {
        if (!owner) return;
        setLoading(true);
        setError(null);
        scanEvmApprovals(chainId, owner)
            .then((results) => setApprovals(results))
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to scan approvals.'))
            .finally(() => setLoading(false));
    }, [owner, chainId]);

    useEffect(() => {
        if (owner) queueMicrotask(() => runScan());
    }, [owner, runScan]);

    const revokeRequest = useMemo(
        () => (pendingRevoke ? buildRevokeRequest(pendingRevoke, chainId) : null),
        [pendingRevoke, chainId]
    );

    const handleExecuteRevoke = async () => {
        if (!revokeRequest || !pendingRevoke) return;
        const key = `${pendingRevoke.tokenAddress}:${pendingRevoke.spender}`;
        setRevokingKey(key);
        try {
            await executeTransaction(revokeRequest, { network: 'mainnet', wallet: currentWallet });
            appStore.showToast(`Revoked approval for ${pendingRevoke.tokenSymbol ?? 'token'}`, 'success');
            setPendingRevoke(null);
            runScan();
        } catch (err) {
            appStore.showToast(err instanceof Error ? err.message : 'Revoke failed.', 'error');
        } finally {
            setRevokingKey(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-near-black font-sans">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-dark-indigo-glow/50 shrink-0">
                <div className="flex justify-between items-center gap-4 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                            <KeyRound size={22} className="text-electric-violet" />
                            Approvals
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Token spend approvals your connected wallet has granted. EVM only — Sui and Solana don&apos;t use the
                            same standing-allowance model, and Stellar has no analog either.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={chainId}
                            onChange={(e) => setChainId(Number(e.target.value))}
                            className="bg-white dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-electric-violet"
                        >
                            {EVM_CHAINS.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={runScan}
                            disabled={!owner || loading}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                            Rescan
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                {!isEvmConnected ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <ShieldOff size={28} className="text-slate-400 mb-3" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Connect an EVM wallet</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                            Approval scanning reads on-chain allowances for your connected EVM address.
                        </p>
                        <button
                            onClick={openModal}
                            className="mt-4 px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black"
                        >
                            Connect Wallet
                        </button>
                    </div>
                ) : error ? (
                    <div className="m-6 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-xs text-rose-500">
                        <AlertTriangle size={14} /> {error}
                    </div>
                ) : loading && approvals.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500 text-xs gap-2">
                        <Loader2 size={16} className="animate-spin" /> Scanning {evmChainLabelFor(chainId)} for approvals…
                    </div>
                ) : approvals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <KeyRound size={28} className="text-slate-400 mb-3" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No active approvals found</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                            No non-zero token allowances were found for this wallet on {evmChainLabelFor(chainId)} in the recent
                            block history scanned.
                        </p>
                    </div>
                ) : (
                    <table className="w-full min-w-[640px]">
                        <thead className="sticky top-0 bg-white dark:bg-near-black border-b border-slate-200 dark:border-white/5">
                            <tr>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Token</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Spender</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount</th>
                                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                            {approvals.map((approval) => {
                                const key = `${approval.tokenAddress}:${approval.spender}`;
                                return (
                                    <tr key={key} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                        <td className="px-4 py-2.5 text-xs font-mono text-slate-700 dark:text-slate-300">
                                            {approval.tokenSymbol ?? shortenAddress(approval.tokenAddress, 6, 4)}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs font-mono text-slate-700 dark:text-slate-300" title={approval.spender}>
                                            {shortenAddress(approval.spender, 6, 4)}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs">
                                            {approval.isUnlimited ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-red-500">
                                                    Unlimited
                                                </span>
                                            ) : (
                                                <span className="font-mono text-slate-700 dark:text-slate-300">{approval.formattedAmount}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <button
                                                onClick={() => setPendingRevoke(approval)}
                                                disabled={revokingKey === key}
                                                className="px-3 py-1.5 text-[11px] font-bold rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/15 disabled:opacity-50 transition-colors"
                                            >
                                                {revokingKey === key ? 'Revoking…' : 'Revoke'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <SignTransactionModal
                isOpen={Boolean(pendingRevoke)}
                onClose={() => setPendingRevoke(null)}
                onConfirm={() => {}}
                onExecute={handleExecuteRevoke}
                wallet={currentWallet}
                onRequestConnect={openModal}
                request={revokeRequest}
                network="mainnet"
            />
        </div>
    );
};
