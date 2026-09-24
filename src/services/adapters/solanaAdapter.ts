import type { ChainAdapter, DescribedTransaction, TxContext, TxResult } from '../chainAdapter';
import { ChainExecutionError } from '../chainAdapter';
import type { Network, RequestItem, SolanaTxParams } from '../../types';
import { resolveChainRpcUrl } from '../suiService';
import { sendSolanaTransaction, simulateSolanaTransaction } from '@/wallet/solana';
import { toJsonSafe } from './evmAdapter';

export const DEFAULT_SOLANA_TX: SolanaTxParams = {
    programId: '',
    accounts: [],
    data: '',
    dataEncoding: 'hex'
};

export const solanaExplorerUrl = (network: Network, txId: string): string =>
    `https://explorer.solana.com/tx/${txId}${network === 'mainnet' ? '' : `?cluster=${network}`}`;

export class SolanaAdapter implements ChainAdapter {
    readonly chain = 'solana' as const;
    readonly label = 'Solana';

    validate(request: RequestItem): string | null {
        const p = request.solanaTxParams;
        if (!p?.programId.trim()) return 'Program ID is required.';
        return null;
    }

    targetAddress(request: RequestItem): string | null {
        return request.solanaTxParams?.programId?.trim() || null;
    }

    describe(request: RequestItem): DescribedTransaction {
        const p = request.solanaTxParams ?? DEFAULT_SOLANA_TX;
        return {
            chain: this.chain,
            kind: 'Program instruction',
            target: p.programId,
            details: [
                ['Accounts', String(p.accounts.length)],
                ['Data', p.data ? `${p.data.length} chars (${p.dataEncoding})` : 'None']
            ]
        };
    }

    isMainnetExecution(_request: RequestItem, network: Network): boolean {
        return network === 'mainnet';
    }

    explorerUrl(network: Network, txId: string): string | undefined {
        return solanaExplorerUrl(network, txId);
    }

    async simulate(request: RequestItem, ctx: TxContext): Promise<TxResult> {
        const p = request.solanaTxParams!;
        const signer = ctx.wallet && ctx.wallet.family === 'solana' ? ctx.wallet.address : null;
        const feePayer = signer ?? p.accounts.find((a) => a.isSigner && a.pubkey.trim())?.pubkey;
        if (!feePayer) {
            throw new ChainExecutionError(
                'Connect a Solana wallet (or mark a signer account) to pay fees for the simulation.',
                { code: 'MISSING_WALLET', chain: this.chain, stage: 'simulate' }
            );
        }
        const start = performance.now();
        try {
            const sim = await simulateSolanaTransaction({
                ...p,
                rpcUrl: resolveChainRpcUrl('solana', ctx.network),
                feePayer
            });
            return {
                result: toJsonSafe(sim),
                duration: Math.round(performance.now() - start),
                status: sim.err ? 400 : 200
            };
        } catch (err) {
            throw new ChainExecutionError(err instanceof Error ? err.message : 'Solana simulation failed.', {
                code: 'SIMULATION_FAILED',
                chain: this.chain,
                stage: 'simulate',
                cause: err
            });
        }
    }

    async execute(request: RequestItem, ctx: TxContext): Promise<TxResult> {
        if (!ctx.wallet || ctx.wallet.family !== 'solana') {
            throw new ChainExecutionError('Connect a Solana wallet to sign this transaction.', {
                code: 'MISSING_WALLET',
                chain: this.chain,
                stage: 'execute'
            });
        }
        const p = request.solanaTxParams!;
        const start = performance.now();
        ctx.onProgress?.({ stage: 'awaiting-signature' });
        try {
            const { signature } = await sendSolanaTransaction({
                walletId: ctx.wallet.id,
                rpcUrl: resolveChainRpcUrl('solana', ctx.network),
                ...p
            });
            const explorerUrl = this.explorerUrl(ctx.network, signature);
            ctx.onProgress?.({ stage: 'confirmed', hash: signature, explorerUrl });
            return { result: { signature, explorerUrl }, duration: Math.round(performance.now() - start), status: 200 };
        } catch (err) {
            throw new ChainExecutionError(err instanceof Error ? err.message : 'Solana transaction failed.', {
                code: 'EXECUTION_FAILED',
                chain: this.chain,
                stage: 'submit',
                cause: err
            });
        }
    }
}

export const solanaAdapter = new SolanaAdapter();
