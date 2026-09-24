import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { ChainId, EvmTxParams, Network, RequestItem, RequestType, StellarTxParams, SolanaTxParams } from '../types';
import type { ConnectedWallet, WalletChainFamily } from '@/wallet/types';
import type { ChainAdapter, TxContext, TxResult } from './chainAdapter';
import { suiAdapter } from './adapters/suiAdapter';
import { evmAdapter, DEFAULT_EVM_TX, getEvmTxChain, checkEvmArg, coerceEvmArgs, buildEvmCalldata, toJsonSafe } from './adapters/evmAdapter';
import { solanaAdapter, DEFAULT_SOLANA_TX } from './adapters/solanaAdapter';
import { stellarAdapter, DEFAULT_STELLAR_TX, toStellarScVal } from './adapters/stellarAdapter';

/**
 * One entry point for building, simulating and executing transactions on
 * every supported chain. A TRANSACTION request names its chain in
 * `rpcParams.chain` and carries that chain's native params; this module
 * dispatches to the chain's `ChainAdapter` (see `./chainAdapter.ts` and
 * `./adapters/`) so the UI never branches on chain for execution — each
 * adapter owns its own transaction construction, simulation and signing
 * internally, using that chain's own SDK and execution model.
 */

export type { TxResult, TxContext, DescribedTransaction, TxErrorCode } from './chainAdapter';
export { ChainExecutionError } from './chainAdapter';

// Re-exported for existing call sites — these were previously defined here
// and now live in their chain's adapter module.
export { DEFAULT_EVM_TX, getEvmTxChain, checkEvmArg, coerceEvmArgs, buildEvmCalldata, toJsonSafe };
export { DEFAULT_SOLANA_TX };
export { DEFAULT_STELLAR_TX, toStellarScVal };

/** Every chain's adapter, keyed by ChainId — the registry the dispatcher below looks up. */
const ADAPTERS: Record<ChainId, ChainAdapter> = {
    sui: suiAdapter,
    evm: evmAdapter,
    solana: solanaAdapter,
    stellar: stellarAdapter
};

/** The adapter for a given chain — throws rather than returning undefined for an unregistered chain. */
export const getAdapter = (chain: ChainId): ChainAdapter => {
    const adapter = ADAPTERS[chain];
    if (!adapter) throw new Error(`No chain adapter registered for "${chain}".`);
    return adapter;
};

export const TX_CHAIN_LABELS: Record<ChainId, string> = {
    sui: suiAdapter.label,
    evm: evmAdapter.label,
    solana: solanaAdapter.label,
    stellar: stellarAdapter.label
};

export const getTxChain = (request: RequestItem): ChainId => request.rpcParams?.chain ?? 'sui';

/**
 * The chain-native params for a TRANSACTION request, whichever of
 * moveParams/evmTxParams/solanaTxParams/stellarTxParams applies — this is
 * what a saved History entry needs to actually replay/redisplay a
 * transaction instead of just recording that one ran. Undefined for RPC
 * requests, which already have their own method/params in history.
 */
export const getTxParamsForHistory = (request: RequestItem): unknown => {
    if (request.type !== RequestType.TRANSACTION) return undefined;
    switch (getTxChain(request)) {
        case 'sui':
            return request.moveParams;
        case 'evm':
            return request.evmTxParams;
        case 'solana':
            return request.solanaTxParams;
        case 'stellar':
            return request.stellarTxParams;
    }
};

/** Wallet family that can sign for each chain. */
export const walletFamilyForChain = (chain: ChainId): WalletChainFamily => chain;

/** Switches a request to `chain`, seeding that chain's params if missing. */
export const withTxChain = (request: RequestItem, chain: ChainId): RequestItem => ({
    ...request,
    rpcParams: { ...request.rpcParams, chain },
    moveParams: request.moveParams ?? { ...DEFAULT_MOVE_CALL },
    ...(chain === 'evm' && !request.evmTxParams ? { evmTxParams: { ...DEFAULT_EVM_TX } } : {}),
    ...(chain === 'solana' && !request.solanaTxParams ? { solanaTxParams: { ...DEFAULT_SOLANA_TX } } : {}),
    ...(chain === 'stellar' && !request.stellarTxParams ? { stellarTxParams: { ...DEFAULT_STELLAR_TX } } : {})
});

// ---------------------------------------------------------------------------
// Validation, description & dispatch
// ---------------------------------------------------------------------------

/** Returns a user-facing problem with the request, or null when it's runnable. */
export const validateTransaction = (request: RequestItem): string | null =>
    getAdapter(getTxChain(request)).validate(request);

/**
 * The single raw contract/module/program address a transaction targets, for
 * verification-badge lookups — narrower than `describeTransaction().target`,
 * which for Sui includes the module/function too.
 */
export const getTxTargetAddress = (request: RequestItem): string | null =>
    getAdapter(getTxChain(request)).targetAddress(request);

/** Human-readable summary for review screens and terminal logs. */
export const describeTransaction = (request: RequestItem) => getAdapter(getTxChain(request)).describe(request);

/** Whether executing this request spends real funds. */
export const isMainnetExecution = (request: RequestItem, network: Network): boolean =>
    getAdapter(getTxChain(request)).isMainnetExecution(request, network);

/** Block-explorer link for a transaction on any supported chain. */
export const txExplorerUrl = (chain: ChainId, network: Network, hash: string, evmChainId?: number): string | undefined => {
    const fauxRequest = evmChainId ? ({ evmTxParams: { chainId: evmChainId } } as RequestItem) : undefined;
    return getAdapter(chain).explorerUrl(network, hash, fauxRequest);
};

/** The connected wallet's address when it can sign for this request's chain. */
export const signerAddressFor = (request: RequestItem, wallet: ConnectedWallet | null): string | null =>
    wallet && wallet.family === walletFamilyForChain(getTxChain(request)) ? wallet.address : null;

/** Runs the transaction against current chain state without signing it. */
export const simulateTransaction = async (request: RequestItem, ctx: TxContext): Promise<TxResult> => {
    const adapter = getAdapter(getTxChain(request));
    const problem = adapter.validate(request);
    if (problem) throw new Error(problem);
    return adapter.simulate(request, ctx);
};

/** Signs with the connected wallet and submits the transaction on-chain. */
export const executeTransaction = async (request: RequestItem, ctx: TxContext): Promise<TxResult> => {
    const adapter = getAdapter(getTxChain(request));
    const problem = adapter.validate(request);
    if (problem) throw new Error(problem);
    return adapter.execute(request, ctx);
};

// ---------------------------------------------------------------------------
// Pre-trade simulation summary
// ---------------------------------------------------------------------------

export interface SimulationBalanceChange {
    asset: string;
    amount: string;
    direction: 'in' | 'out';
}

/** Plain-language view of a simulation, layered on top of the raw `TxResult`. */
export interface SimulationSummary {
    chain: ChainId;
    success: boolean;
    balanceChanges: SimulationBalanceChange[];
    warnings: string[];
    /** The underlying TxResult.result, preserved for the raw/JSON view. */
    raw: unknown;
}

const MAX_UINT256 = (BigInt(2) ** BigInt(256) - BigInt(1)).toString();

/** ERC-20/721 `approve(address,uint256)` selector. */
const APPROVE_SELECTOR = '0x095ea7b3';
/** ERC-721/1155 `setApprovalForAll(address,bool)` selector. */
const SET_APPROVAL_FOR_ALL_SELECTOR = '0xa22cb465';

/** Flags an EVM request that grants a token spend approval, especially an unlimited one. */
const evmApprovalWarnings = (p: EvmTxParams): string[] => {
    const warnings: string[] = [];
    const signature = p.functionSignature.trim().toLowerCase();
    const isApprove = signature.startsWith('approve(') || p.data.trim().toLowerCase().startsWith(APPROVE_SELECTOR);
    const isApprovalForAll =
        signature.startsWith('setapprovalforall(') || p.data.trim().toLowerCase().startsWith(SET_APPROVAL_FOR_ALL_SELECTOR);

    if (isApprovalForAll) {
        warnings.push('Grants approval for ALL tokens in this contract, not a fixed amount — a common phishing pattern.');
    } else if (isApprove) {
        const amountArg = p.args[1]?.trim();
        if (amountArg === MAX_UINT256 || amountArg?.toLowerCase() === 'max' || amountArg?.toLowerCase() === 'unlimited') {
            warnings.push('Grants an unlimited spending approval — the spender can move any amount, at any time, until revoked.');
        } else {
            warnings.push('Grants a token spending approval to another address.');
        }
    }

    return warnings;
};

/** Turns a raw TxResult into a plain-language balance-change/warning summary. */
export const summarizeSimulation = (
    request: RequestItem,
    txResult: TxResult
): SimulationSummary => {
    const chain = getTxChain(request);
    const success = txResult.status < 400;
    const warnings: string[] = chain === 'evm' && request.evmTxParams ? evmApprovalWarnings(request.evmTxParams) : [];

    if (chain === 'sui') {
        const result = txResult.result as { balanceChanges?: { coinType: string; amount: string }[] } | undefined;
        const balanceChanges: SimulationBalanceChange[] = (result?.balanceChanges ?? []).map((change) => {
            const negative = change.amount.trim().startsWith('-');
            return {
                asset: change.coinType,
                amount: negative ? change.amount.slice(1) : change.amount,
                direction: negative ? 'out' : 'in'
            };
        });
        return { chain, success, balanceChanges, warnings, raw: txResult.result };
    }

    if (chain === 'evm') {
        const p = request.evmTxParams;
        const balanceChanges: SimulationBalanceChange[] = [];
        if (p && p.value.trim() && p.value.trim() !== '0') {
            const net = getEvmTxChain(p.chainId);
            balanceChanges.push({ asset: net?.nativeCurrency.symbol ?? 'native', amount: p.value.trim(), direction: 'out' });
        }
        return { chain, success, balanceChanges, warnings, raw: txResult.result };
    }

    if (chain === 'solana') {
        const result = txResult.result as { err?: unknown; logs?: string[] | null } | undefined;
        if (result?.err) {
            warnings.push(`Simulation failed: ${JSON.stringify(result.err)}`);
        }
        return { chain, success, balanceChanges: [], warnings, raw: txResult.result };
    }

    // stellar — Soroban's simulateTransaction response carries no structured
    // balance-diff; surface a failure warning when the sim itself failed.
    if (!success) {
        warnings.push('Simulation failed — this call would revert on-chain.');
    }
    return { chain, success, balanceChanges: [], warnings, raw: txResult.result };
};
