import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Shield, X } from 'lucide-react';

import { useWallet } from '@/wallet';
import { appStore } from '@/lib/store';
import { EvmTxParams, RequestItem, RequestType } from '../types';
import { LifiRoute, LifiStep, getStepTransaction } from '@/lib/lifi';
import { executeTransaction, txExplorerUrl } from '@/services/transactionService';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';

interface SwapLegResult {
    chain: string;
    tool: string;
    hash?: string;
    explorerUrl?: string;
    status: 'pending' | 'done' | 'failed';
    error?: string;
}

interface SwapReviewModalProps {
    isOpen: boolean;
    request: RequestItem | null;
    route: LifiRoute | null;
    onClose: () => void;
}

/** Builds an ERC-20 approve(spender, amount) RequestItem — same synthetic-transaction pattern ApprovalsPage.tsx uses for revoke. */
const buildApprovalRequest = (
    tokenAddress: string,
    spender: string,
    amount: string,
    chainId: number
): RequestItem => {
    const evmTxParams: EvmTxParams = {
        chainId,
        to: tokenAddress,
        value: '0',
        functionSignature: 'approve(address,uint256)',
        args: [spender, amount],
        data: ''
    };
    return {
        id: `swap-approval-${tokenAddress}-${spender}`,
        name: 'Approve router',
        type: RequestType.TRANSACTION,
        network: 'mainnet',
        rpcParams: { chain: 'evm', method: '', params: [] },
        moveParams: { ...DEFAULT_MOVE_CALL },
        evmTxParams
    };
};

/** Builds a TRANSACTION RequestItem from a resolved LI.FI step's transactionRequest (EVM only — the only chain LI.FI returns raw calldata for that maps directly onto EvmTxParams). */
const buildStepRequest = (step: LifiStep): RequestItem | null => {
    const tx = step.transactionRequest;
    if (!tx || !tx.chainId) return null;

    const evmTxParams: EvmTxParams = {
        chainId: tx.chainId,
        to: tx.to,
        value: tx.value ?? '0',
        functionSignature: '',
        args: [],
        data: tx.data
    };
    return {
        id: `swap-step-${step.id}`,
        name: `${step.tool} ${step.type}`,
        type: RequestType.TRANSACTION,
        network: 'mainnet',
        rpcParams: { chain: 'evm', method: '', params: [] },
        moveParams: { ...DEFAULT_MOVE_CALL },
        evmTxParams
    };
};

export const SwapReviewModal: React.FC<SwapReviewModalProps> = ({ isOpen, request, route, onClose }) => {
    const { currentWallet } = useWallet();
    const [executing, setExecuting] = useState(false);
    const [legs, setLegs] = useState<SwapLegResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    if (!isOpen || !request || !route) return null;

    const firstStep = route.steps[0];
    const approvalAddress = firstStep?.estimate?.approvalAddress;
    const swapParams = request.swapParams;

    const handleExecute = async () => {
        setExecuting(true);
        setError(null);
        const completedLegs: SwapLegResult[] = [];
        setLegs([]);

        try {
            // 1. Approval leg, if the router needs a spend allowance (EVM only).
            if (approvalAddress && typeof firstStep.action.fromChainId === 'number') {
                const approvalRequest = buildApprovalRequest(
                    firstStep.action.fromToken.address,
                    approvalAddress,
                    firstStep.action.fromAmount,
                    firstStep.action.fromChainId
                );
                const approvalResult = await executeTransaction(approvalRequest, { network: 'mainnet', wallet: currentWallet });
                completedLegs.push({
                    chain: swapParams?.fromChain ?? 'evm',
                    tool: 'approval',
                    hash: (approvalResult.result as { hash?: string })?.hash,
                    status: 'done'
                });
                setLegs([...completedLegs]);
            }

            // 2. Resolve the step to a submittable transaction right before sending — quotes can go stale between comparison and execution.
            const resolvedStep = await getStepTransaction(firstStep);
            const stepRequest = buildStepRequest(resolvedStep);
            if (!stepRequest) {
                throw new Error('This route’s transaction could not be prepared for execution. Only EVM legs are supported today.');
            }

            const stepResult = await executeTransaction(stepRequest, { network: 'mainnet', wallet: currentWallet });
            const hash = (stepResult.result as { hash?: string })?.hash;
            const explorerUrl = hash && swapParams
                ? txExplorerUrl(swapParams.fromChain, 'mainnet', hash, firstStep.action.fromChainId as number)
                : undefined;

            completedLegs.push({
                chain: swapParams?.fromChain ?? 'evm',
                tool: firstStep.tool,
                hash,
                explorerUrl,
                status: 'done'
            });
            setLegs([...completedLegs]);

            appStore.addToHistory(
                request,
                200,
                0,
                { legs: completedLegs, routeId: route.id },
                currentWallet ? { family: currentWallet.family, address: currentWallet.address } : null
            );

            setDone(true);
            appStore.showToast('Swap submitted', 'success');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Swap failed.';
            setError(message);
            appStore.addToHistory(
                request,
                500,
                0,
                { legs: completedLegs, routeId: route.id, error: message },
                currentWallet ? { family: currentWallet.family, address: currentWallet.address } : null
            );
        } finally {
            setExecuting(false);
        }
    };

    const handleClose = () => {
        if (executing) return;
        setLegs([]);
        setError(null);
        setDone(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/70 dark:bg-near-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-white dark:bg-near-black">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield size={16} className="text-electric-violet" /> Review Swap
                    </h2>
                    <button onClick={handleClose} disabled={executing} className="text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-40">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black p-3 space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Route</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">{route.steps.map((s) => s.tool).join(' → ')}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">You receive (min)</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">{route.toAmountMin}</span>
                        </div>
                        {swapParams && (
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Slippage</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">{swapParams.slippagePercent}%</span>
                            </div>
                        )}
                        {firstStep && (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Target contract</span>
                                <VerificationBadge chain={swapParams?.fromChain ?? 'evm'} address={firstStep.action.toToken.address} evmChainId={firstStep.action.fromChainId as number} />
                            </div>
                        )}
                    </div>

                    {approvalAddress && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 p-3 text-[11px] text-amber-700 dark:text-amber-400">
                            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                            This route needs a spend approval first. It will run before the swap, as a separate transaction.
                        </div>
                    )}

                    {legs.length > 0 && (
                        <div className="space-y-1.5">
                            {legs.map((leg, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                    {leg.status === 'done' ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Loader2 size={13} className="animate-spin text-slate-400" />}
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{leg.tool}</span>
                                    {leg.explorerUrl && (
                                        <a href={leg.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-electric-violet hover:underline">
                                            View
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-[11px] text-red-600 dark:text-red-400">
                            <AlertTriangle size={13} /> {error}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-dark-indigo-glow flex justify-end gap-3">
                    <button onClick={handleClose} disabled={executing} className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-40">
                        {done ? 'Close' : 'Cancel'}
                    </button>
                    {!done && (
                        <button
                            onClick={handleExecute}
                            disabled={executing || !currentWallet}
                            className="px-6 py-2 bg-slate-900 dark:bg-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-near-black text-xs font-bold rounded shadow-lg flex items-center gap-2"
                        >
                            {executing ? <Loader2 size={14} className="animate-spin" /> : null}
                            {executing ? 'Executing…' : 'Execute Swap'} {!executing && <ArrowRight size={14} />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
