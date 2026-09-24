import type { ConnectedWallet } from '@/wallet/types';
import type { ChainId, Network, RequestItem } from '../types';
import type { TxProgress } from '../components/RequestPanel/response/types';

/**
 * The universal transaction-execution contract every chain plugs into.
 *
 * This does NOT force every chain's transaction model to look the same —
 * `RequestItem` already carries each chain's native params (moveParams,
 * evmTxParams, solanaTxParams, stellarTxParams, aptosTxParams) untouched.
 * What's universal here is the *lifecycle* (validate → describe → simulate
 * → execute) and the *result/error shape* — not how a Move call, an EVM
 * contract call, a Solana instruction, or an Aptos entry function payload
 * gets built. Each adapter's `simulate`/`execute` methods own that
 * chain-specific construction internally, using that chain's own SDK.
 */

export interface TxResult {
    result: unknown;
    duration: number;
    status: number;
}

export interface TxContext {
    network: Network;
    wallet: ConnectedWallet | null;
    /** dapp-kit's signAndExecuteTransaction mutation (Sui only). */
    suiSignAndExecute?: (transaction: unknown) => Promise<unknown>;
    /** Called as a signed transaction moves from wallet prompt to confirmation. */
    onProgress?: (progress: TxProgress) => void;
}

/**
 * Universal error categories a `ChainExecutionError` can carry — every
 * adapter maps its chain-specific failures onto one of these so callers can
 * branch on `.code` without knowing which chain threw. The original error
 * (`cause`) is always preserved, never discarded.
 */
export type TxErrorCode =
    | 'UNSUPPORTED_CHAIN'
    | 'UNSUPPORTED_NETWORK'
    | 'INVALID_TARGET'
    | 'INVALID_ARGUMENT'
    | 'MISSING_WALLET'
    | 'WRONG_WALLET'
    | 'BUILD_FAILED'
    | 'SIMULATION_FAILED'
    | 'INSUFFICIENT_FUNDS'
    | 'SIGNING_FAILED'
    | 'USER_REJECTED'
    | 'SUBMISSION_FAILED'
    | 'EXECUTION_FAILED'
    | 'CONFIRMATION_TIMEOUT';

export class ChainExecutionError extends Error {
    code: TxErrorCode;
    chain: ChainId;
    stage: string;
    /** The chain-native error this was translated from — never discarded. */
    cause?: unknown;
    /**
     * Partial on-chain result carried by the original error (e.g. an EVM
     * revert still has a receipt/logs) — callers like the history log and
     * result viewer read `error.result` directly, so it must survive
     * wrapping rather than being dropped when translated to this type.
     */
    result?: unknown;

    constructor(
        message: string,
        opts: { code: TxErrorCode; chain: ChainId; stage: string; cause?: unknown }
    ) {
        super(message);
        this.name = 'ChainExecutionError';
        this.code = opts.code;
        this.chain = opts.chain;
        this.stage = opts.stage;
        this.cause = opts.cause;
        if (opts.cause && typeof opts.cause === 'object' && 'result' in opts.cause) {
            this.result = (opts.cause as { result?: unknown }).result;
        }
    }
}

export interface DescribedTransaction {
    chain: ChainId;
    kind: string;
    target: string;
    details: [string, string][];
}

/**
 * One chain's transaction execution model. A chain that can't do something
 * (no simulation support, no adapter yet) says so explicitly by throwing a
 * `ChainExecutionError` — adapters never silently no-op or fall back to
 * another chain's behavior.
 */
export interface ChainAdapter {
    readonly chain: ChainId;
    readonly label: string;

    /** Returns a user-facing problem with the request, or null when it's runnable. */
    validate(request: RequestItem): string | null;

    /** The single raw contract/program/package address this request targets. */
    targetAddress(request: RequestItem): string | null;

    /** Human-readable summary for review screens and terminal logs. */
    describe(request: RequestItem): DescribedTransaction;

    /** Whether executing this request spends real funds. */
    isMainnetExecution(request: RequestItem, network: Network): boolean;

    /** Block-explorer link for a transaction hash/signature/digest on this chain. */
    explorerUrl(network: Network, txId: string, request?: RequestItem): string | undefined;

    /** Runs the transaction against current chain state without signing it. */
    simulate(request: RequestItem, ctx: TxContext): Promise<TxResult>;

    /** Signs with the connected wallet and submits the transaction on-chain. */
    execute(request: RequestItem, ctx: TxContext): Promise<TxResult>;
}
