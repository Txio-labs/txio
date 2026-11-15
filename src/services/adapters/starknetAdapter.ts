import type { ChainAdapter, DescribedTransaction, TxContext, TxResult } from '../chainAdapter';
import { ChainExecutionError } from '../chainAdapter';
import type { Network, RequestItem, StarknetCall, StarknetTxParams } from '../../types';
import {
    checkStarknetCall,
    compileStarknetCall,
    getStarknetProvider,
    simulateStarknetCalls,
    starknetRevertReason,
    starknetTxExplorerUrl
} from '../starknet';
import { signAndSubmitStarknetCalls } from '@/wallet/starknet';
import { toJsonSafe } from './evmAdapter';

export const newStarknetCall = (): StarknetCall => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    contractAddress: '',
    entrypoint: '',
    args: []
});

export const newStarknetTxParams = (): StarknetTxParams => ({ calls: [newStarknetCall()] });

/** Kept for symmetry with the other chains' DEFAULT_*_TX exports. Use newStarknetTxParams() for fresh call ids. */
export const DEFAULT_STARKNET_TX: StarknetTxParams = { calls: [] };

export const starknetExplorerUrl = starknetTxExplorerUrl;

const callsOf = (request: RequestItem): StarknetCall[] => request.starknetTxParams?.calls ?? [];

const fail = (message: string, code: ChainExecutionError['code'], stage: string, cause?: unknown) =>
    new ChainExecutionError(message, { code, chain: 'starknet', stage, cause });

const errorMessage = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

/**
 * Starknet invoke transactions. A request holds one or more calls that the
 * connected account contract executes atomically (a multicall).
 *
 * Simulation encodes each call against the target contract's on-chain ABI,
 * then runs starknet_simulateTransactions from the connected account with
 * SKIP_VALIDATE (no signature needed). Execution hands the encoded calls to
 * the wallet, which signs, pays the fee and submits.
 */
export class StarknetAdapter implements ChainAdapter {
    readonly chain = 'starknet' as const;
    readonly label = 'Starknet';

    validate(request: RequestItem): string | null {
        const calls = callsOf(request);
        if (calls.length === 0) return 'Add at least one call.';
        for (let i = 0; i < calls.length; i++) {
            const problem = checkStarknetCall(calls[i], i, calls.length);
            if (problem) return problem;
        }
        return null;
    }

    targetAddress(request: RequestItem): string | null {
        return callsOf(request)[0]?.contractAddress.trim() || null;
    }

    describe(request: RequestItem): DescribedTransaction {
        const calls = callsOf(request);
        const first = calls[0];
        return {
            chain: this.chain,
            kind: calls.length > 1 ? `Multicall (${calls.length} calls)` : 'Contract call',
            target: first ? `${first.contractAddress}::${first.entrypoint}` : '',
            details: calls.map((c, i): [string, string] => [
                calls.length > 1 ? `Call ${i + 1}` : 'Call',
                `${c.entrypoint || '?'}(${c.args.length} arg${c.args.length === 1 ? '' : 's'}${c.rawCalldata ? ', raw' : ''})`
            ])
        };
    }

    isMainnetExecution(_request: RequestItem, network: Network): boolean {
        return network === 'mainnet';
    }

    explorerUrl(network: Network, txId: string): string | undefined {
        return starknetTxExplorerUrl(network, txId);
    }

    private async compile(request: RequestItem, network: Network, stage: string) {
        try {
            return await Promise.all(callsOf(request).map((c) => compileStarknetCall(network, c)));
        } catch (err) {
            throw fail(errorMessage(err, 'Could not encode the call arguments.'), 'INVALID_ARGUMENT', stage, err);
        }
    }

    async simulate(request: RequestItem, ctx: TxContext): Promise<TxResult> {
        const sender = ctx.wallet?.family === 'starknet' ? ctx.wallet.address : null;
        if (!sender) {
            throw fail('Connect a Starknet wallet: simulation runs from your deployed account contract.', 'MISSING_WALLET', 'simulate');
        }
        const start = performance.now();
        const calls = await this.compile(request, ctx.network, 'simulate');
        try {
            const simulated = await simulateStarknetCalls(ctx.network, sender, calls);
            const revert = starknetRevertReason(simulated);
            return {
                result: toJsonSafe({ calls, ...simulated, ...(revert ? { revert_reason: revert } : {}) }),
                duration: Math.round(performance.now() - start),
                status: revert ? 400 : 200
            };
        } catch (err) {
            const message = errorMessage(err, 'Starknet simulation failed.');
            const notDeployed = /contract not found|not deployed/i.test(message);
            throw fail(
                notDeployed ? `Your account ${sender} is not deployed on this network yet. Deploy it from your wallet first.` : message,
                'SIMULATION_FAILED',
                'simulate',
                err
            );
        }
    }

    async execute(request: RequestItem, ctx: TxContext): Promise<TxResult> {
        if (!ctx.wallet || ctx.wallet.family !== 'starknet') {
            throw fail('Connect a Starknet wallet to sign this transaction.', 'MISSING_WALLET', 'execute');
        }
        const start = performance.now();
        const calls = await this.compile(request, ctx.network, 'build');
        ctx.onProgress?.({ stage: 'awaiting-signature' });

        let hash: string;
        try {
            hash = (await signAndSubmitStarknetCalls(ctx.wallet.id, ctx.network, calls)).hash;
        } catch (err) {
            const message = errorMessage(err, 'Starknet transaction failed.');
            const rejected = /reject|refus|denied|cancel/i.test(message);
            throw fail(message, rejected ? 'USER_REJECTED' : 'SIGNING_FAILED', 'sign', err);
        }

        const explorerUrl = this.explorerUrl(ctx.network, hash);
        ctx.onProgress?.({ stage: 'submitted', hash, explorerUrl });

        try {
            const provider = await getStarknetProvider(ctx.network);
            const receipt = (await provider.waitForTransaction(hash)) as unknown as Record<string, unknown>;
            const reverted = receipt.execution_status === 'REVERTED';
            ctx.onProgress?.({ stage: reverted ? 'failed' : 'confirmed', hash, explorerUrl });
            if (reverted) {
                throw fail(String(receipt.revert_reason ?? 'Transaction reverted.'), 'EXECUTION_FAILED', 'confirm', { result: toJsonSafe(receipt) });
            }
            return {
                result: toJsonSafe({ ...receipt, transaction_hash: hash, explorerUrl }),
                duration: Math.round(performance.now() - start),
                status: 200
            };
        } catch (err) {
            if (err instanceof ChainExecutionError) throw err;
            ctx.onProgress?.({ stage: 'failed', hash, explorerUrl });
            throw fail(errorMessage(err, 'Transaction was submitted but did not confirm.'), 'CONFIRMATION_TIMEOUT', 'confirm', err);
        }
    }
}

export const starknetAdapter = new StarknetAdapter();
