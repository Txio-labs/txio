import type { ChainAdapter, DescribedTransaction, TxContext, TxResult } from '../chainAdapter';
import { ChainExecutionError } from '../chainAdapter';
import type { Network, RequestItem } from '../../types';
import { signAndExecuteMoveCall, simulateMoveCall } from '../suiService';

const SUI_ZERO_ADDRESS = `0x${'0'.repeat(64)}`;

export const suiExplorerUrl = (network: Network, txId: string): string | undefined =>
    network === 'localnet' ? undefined : `https://suiscan.xyz/${network}/tx/${txId}`;

export class SuiAdapter implements ChainAdapter {
    readonly chain = 'sui' as const;
    readonly label = 'Sui';

    validate(request: RequestItem): string | null {
        const m = request.moveParams;
        if (!m?.packageId?.trim() || !m.module?.trim() || !m.function?.trim()) {
            return 'Package ID, module and function are required.';
        }
        return null;
    }

    targetAddress(request: RequestItem): string | null {
        return request.moveParams?.packageId?.trim() || null;
    }

    describe(request: RequestItem): DescribedTransaction {
        const m = request.moveParams;
        return {
            chain: this.chain,
            kind: 'Move call',
            target: `${m.packageId}::${m.module}::${m.function}`,
            details: [
                ['Arguments', String(m.arguments.length)],
                ['Gas budget', m.gasBudget ? `${m.gasBudget} MIST` : 'Auto']
            ]
        };
    }

    isMainnetExecution(_request: RequestItem, network: Network): boolean {
        return network === 'mainnet';
    }

    explorerUrl(network: Network, txId: string): string | undefined {
        return suiExplorerUrl(network, txId);
    }

    async simulate(request: RequestItem, ctx: TxContext): Promise<TxResult> {
        const m = request.moveParams;
        const signer = ctx.wallet && ctx.wallet.family === 'sui' ? ctx.wallet.address : null;
        try {
            return await simulateMoveCall(
                ctx.network,
                signer ?? SUI_ZERO_ADDRESS,
                m.packageId,
                m.module,
                m.function,
                m.typeArguments,
                m.arguments
            );
        } catch (err) {
            throw new ChainExecutionError(err instanceof Error ? err.message : 'Sui simulation failed.', {
                code: 'SIMULATION_FAILED',
                chain: this.chain,
                stage: 'simulate',
                cause: err
            });
        }
    }

    async execute(request: RequestItem, ctx: TxContext): Promise<TxResult> {
        if (!ctx.wallet || ctx.wallet.family !== 'sui') {
            throw new ChainExecutionError('Connect a Sui wallet to sign this transaction.', {
                code: 'MISSING_WALLET',
                chain: this.chain,
                stage: 'execute'
            });
        }
        if (!ctx.suiSignAndExecute) {
            throw new ChainExecutionError('Sui wallet signing is unavailable.', {
                code: 'SIGNING_FAILED',
                chain: this.chain,
                stage: 'sign'
            });
        }

        const m = request.moveParams;
        ctx.onProgress?.({ stage: 'awaiting-signature' });

        let res: TxResult;
        try {
            res = await signAndExecuteMoveCall(
                ctx.network,
                ctx.wallet.address,
                m.packageId,
                m.module,
                m.function,
                m.typeArguments,
                m.arguments,
                ctx.suiSignAndExecute as (tx: unknown) => Promise<never>,
                m.gasBudget
            );
        } catch (err) {
            throw new ChainExecutionError(err instanceof Error ? err.message : 'Sui transaction failed.', {
                code: 'EXECUTION_FAILED',
                chain: this.chain,
                stage: 'submit',
                cause: err
            });
        }

        const digest = (res.result as { digest?: string })?.digest;
        // dapp-kit resolves once the transaction has executed.
        if (digest) ctx.onProgress?.({ stage: 'confirmed', hash: digest, explorerUrl: this.explorerUrl(ctx.network, digest) });
        return {
            ...res,
            result: { ...(res.result as object), explorerUrl: digest ? this.explorerUrl(ctx.network, digest) : undefined }
        };
    }
}

export const suiAdapter = new SuiAdapter();
