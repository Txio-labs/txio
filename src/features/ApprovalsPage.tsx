import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Select } from '@/components/Select';
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
    const { linkedWallets, openModal } = useWallet();
    const [chainId, setChainId] = useState<number>(EVM_CHAINS[0].id);
    const [approvals, setApprovals] = useState<EvmApproval[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingRevoke, setPendingRevoke] = useState<EvmApproval | null>(null);
    const [revokingKey, setRevokingKey] = useState<string | null>(null);

    // Approvals only exist on EVM chains, so this page needs the EVM wallet
    // specifically — not currentWallet, which could be any chain's wallet
    // marked as the default signer while an EVM wallet is also linked.
    const evmWallet = linkedWallets.evm ?? null;
    const isEvmConnected = Boolean(evmWallet);
    const owner = evmWallet?.address ?? null;

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
            await executeTransaction(revokeRequest, { network: 'mainnet', wallet: evmWallet });
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
        <div className="flex flex-col h-full bg-surface font-sans">
            <div className="px-6 md:px-8 pt-7 pb-5 border-b border-line shrink-0">
                <div className="flex justify-between items-center gap-4 flex-wrap">
                    <div>
                        <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-fg flex items-center gap-3">
<span className="h-9 w-9 rounded-[9px] border border-line bg-surface shadow-card flex items-center justify-center text-fg-muted shrink-0"><KeyRound size={16} /></span>
Approvals
                        </h1>
                        <p className="text-[14px] text-fg-muted mt-1.5">
                            Token spend approvals your connected wallet has granted. EVM only — Sui and Solana don&apos;t use the
                            same standing-allowance model, and Stellar has no analog either.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-44">
                            <Select
                                value={String(chainId)}
                                options={EVM_CHAINS.map((c) => ({ label: c.name, value: String(c.id) }))}
                                onChange={(v) => setChainId(Number(v))}
                                fullWidth
                            />
                        </div>
                        <button
                            onClick={runScan}
                            disabled={!owner || loading}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-line text-fg-muted hover:bg-hover disabled:opacity-50 transition-colors"
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
                        <ShieldOff size={28} className="text-fg-subtle mb-3" />
                        <p className="text-sm font-semibold text-fg">Connect an EVM wallet</p>
                        <p className="text-xs text-fg-subtle mt-1 max-w-xs">
                            Approval scanning reads on-chain allowances for your connected EVM address.
                        </p>
                        <button
                            onClick={openModal}
                            className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-inverse text-on-inverse"
                        >
                            Connect Wallet
                        </button>
                    </div>
                ) : error ? (
                    <div className="m-6 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-xs text-rose-500">
                        <AlertTriangle size={14} /> {error}
                    </div>
                ) : loading && approvals.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-fg-subtle text-xs gap-2">
                        <Loader2 size={16} className="animate-spin" /> Scanning {evmChainLabelFor(chainId)} for approvals…
                    </div>
                ) : approvals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <KeyRound size={28} className="text-fg-subtle mb-3" />
                        <p className="text-sm font-semibold text-fg">No active approvals found</p>
                        <p className="text-xs text-fg-subtle mt-1 max-w-xs">
                            No non-zero token allowances were found for this wallet on {evmChainLabelFor(chainId)} in the recent
                            block history scanned.
                        </p>
                    </div>
                ) : (
                    <table className="w-full min-w-[640px]">
                        <thead className="sticky top-0 bg-surface border-b border-line">
                            <tr>
                                <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-fg-subtle">Token</th>
                                <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-fg-subtle">Spender</th>
                                <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-fg-subtle">Amount</th>
                                <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-fg-subtle">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {approvals.map((approval) => {
                                const key = `${approval.tokenAddress}:${approval.spender}`;
                                return (
                                    <tr key={key} className="hover:bg-hover">
                                        <td className="px-4 py-2.5 text-xs font-mono text-fg-muted">
                                            {approval.tokenSymbol ?? shortenAddress(approval.tokenAddress, 6, 4)}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs font-mono text-fg-muted" title={approval.spender}>
                                            {shortenAddress(approval.spender, 6, 4)}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs">
                                            {approval.isUnlimited ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[12px] font-semibold uppercase text-red-500">
                                                    Unlimited
                                                </span>
                                            ) : (
                                                <span className="font-mono text-fg-muted">{approval.formattedAmount}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <button
                                                onClick={() => setPendingRevoke(approval)}
                                                disabled={revokingKey === key}
                                                className="px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/15 disabled:opacity-50 transition-colors"
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
                wallet={evmWallet}
                onRequestConnect={openModal}
                request={revokeRequest}
                network="mainnet"
            />
        </div>
    );
};
