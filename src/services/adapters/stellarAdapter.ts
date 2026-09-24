import type { ChainAdapter, DescribedTransaction, TxContext, TxResult } from '../chainAdapter';
import { ChainExecutionError } from '../chainAdapter';
import type { Network, RequestItem, StellarArg, StellarTxParams } from '../../types';
import { resolveChainRpcUrl } from '../suiService';
import { signStellarTransaction } from '@/wallet/stellar';
import type { ConnectedWallet } from '@/wallet/types';
import { toJsonSafe } from './evmAdapter';
import type { TxProgress } from '../../components/RequestPanel/response/types';

export const DEFAULT_STELLAR_TX: StellarTxParams = { contractId: '', function: '', args: [] };

export const stellarExplorerUrl = (network: Network, txId: string): string =>
    `https://stellar.expert/explorer/${network === 'mainnet' ? 'public' : 'testnet'}/tx/${txId}`;

const loadStellar = () => import('@stellar/stellar-sdk');

const stellarPassphrase = async (network: Network) => {
    const { Networks } = await loadStellar();
    return network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
};

/** Converts a typed form argument into a Soroban ScVal. */
export const toStellarScVal = async (arg: StellarArg) => {
    const { nativeToScVal, Address } = await loadStellar();
    const v = arg.value.trim();
    switch (arg.type) {
        case 'address':
            return new Address(v).toScVal();
        case 'i128':
        case 'u128':
        case 'i64':
        case 'u64':
            if (!/^-?\d+$/.test(v)) throw new Error(`"${arg.value}" is not a whole number for ${arg.type}.`);
            return nativeToScVal(BigInt(v), { type: arg.type });
        case 'i32':
        case 'u32':
            if (!/^-?\d+$/.test(v)) throw new Error(`"${arg.value}" is not a whole number for ${arg.type}.`);
            return nativeToScVal(Number(v), { type: arg.type });
        case 'bool':
            return nativeToScVal(v === 'true');
        case 'symbol':
            return nativeToScVal(v, { type: 'symbol' });
        case 'bytes': {
            const hex = v.replace(/^0x/, '');
            if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2) throw new Error(`"${arg.value}" is not valid hex bytes.`);
            return nativeToScVal(Uint8Array.from(hex.match(/../g)?.map((b) => parseInt(b, 16)) ?? []));
        }
        default:
            return nativeToScVal(v, { type: 'string' });
    }
};

const buildStellarTx = async (p: StellarTxParams, source: string, network: Network) => {
    const { rpc, Contract, TransactionBuilder, BASE_FEE } = await loadStellar();
    const server = new rpc.Server(resolveChainRpcUrl('stellar', network));
    const networkPassphrase = await stellarPassphrase(network);
    const account = await server.getAccount(source);
    const scArgs = await Promise.all(p.args.map(toStellarScVal));
    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
        .addOperation(new Contract(p.contractId.trim()).call(p.function.trim(), ...scArgs))
        .setTimeout(60)
        .build();
    return { server, tx, networkPassphrase };
};

const simulateStellar = async (p: StellarTxParams, source: string, network: Network): Promise<TxResult> => {
    const { rpc, scValToNative } = await loadStellar();
    const start = performance.now();
    const { server, tx } = await buildStellarTx(p, source, network);
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
        throw new Error(`Simulation failed: ${sim.error}`);
    }
    const retval = sim.result?.retval;
    return {
        result: toJsonSafe({
            returnValue: retval ? scValToNative(retval) : null,
            minResourceFee: sim.minResourceFee,
            latestLedger: sim.latestLedger
        }),
        duration: Math.round(performance.now() - start),
        status: 200
    };
};

const executeStellar = async (
    p: StellarTxParams,
    wallet: ConnectedWallet,
    network: Network,
    onProgress?: (p: TxProgress) => void
): Promise<TxResult> => {
    const { rpc, scValToNative, TransactionBuilder } = await loadStellar();
    const start = performance.now();
    const { server, tx, networkPassphrase } = await buildStellarTx(p, wallet.address, network);
    // prepareTransaction simulates and attaches the Soroban footprint + fees.
    const prepared = await server.prepareTransaction(tx);
    onProgress?.({ stage: 'awaiting-signature' });
    const signedXdr = await signStellarTransaction(wallet.id, prepared.toXDR(), networkPassphrase, wallet.address);
    const sent = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, networkPassphrase));
    if (sent.status === 'ERROR') {
        throw new Error(`Submission rejected: ${JSON.stringify(toJsonSafe(sent.errorResult ?? sent.status))}`);
    }
    const explorerUrl = stellarExplorerUrl(network, sent.hash);
    onProgress?.({ stage: 'submitted', hash: sent.hash, explorerUrl });

    for (let attempt = 0; attempt < 30; attempt++) {
        const got = await server.getTransaction(sent.hash);
        if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
            onProgress?.({ stage: 'confirmed', hash: sent.hash, explorerUrl });
            return {
                result: toJsonSafe({
                    hash: sent.hash,
                    explorerUrl,
                    ledger: got.ledger,
                    returnValue: got.returnValue ? scValToNative(got.returnValue) : null
                }),
                duration: Math.round(performance.now() - start),
                status: 200
            };
        }
        if (got.status === rpc.Api.GetTransactionStatus.FAILED) {
            onProgress?.({ stage: 'failed', hash: sent.hash, explorerUrl });
            throw new Error(`Transaction ${sent.hash} failed on-chain.`);
        }
        await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`Transaction ${sent.hash} was submitted but not confirmed within 30s.`);
};

export class StellarAdapter implements ChainAdapter {
    readonly chain = 'stellar' as const;
    readonly label = 'Stellar';

    validate(request: RequestItem): string | null {
        const p = request.stellarTxParams;
        if (!p?.contractId.trim() || !p.function.trim()) return 'Contract ID and function are required.';
        return null;
    }

    targetAddress(request: RequestItem): string | null {
        return request.stellarTxParams?.contractId?.trim() || null;
    }

    describe(request: RequestItem): DescribedTransaction {
        const p = request.stellarTxParams ?? DEFAULT_STELLAR_TX;
        return {
            chain: this.chain,
            kind: 'Contract invocation',
            target: `${p.contractId} · ${p.function}`,
            details: [['Arguments', String(p.args.length)]]
        };
    }

    isMainnetExecution(_request: RequestItem, network: Network): boolean {
        return network === 'mainnet';
    }

    explorerUrl(network: Network, txId: string): string | undefined {
        return stellarExplorerUrl(network, txId);
    }

    async simulate(request: RequestItem, ctx: TxContext): Promise<TxResult> {
        const signer = ctx.wallet && ctx.wallet.family === 'stellar' ? ctx.wallet.address : null;
        if (!signer) {
            throw new ChainExecutionError('Connect a Stellar wallet: Soroban simulation needs an existing source account.', {
                code: 'MISSING_WALLET',
                chain: this.chain,
                stage: 'simulate'
            });
        }
        try {
            return await simulateStellar(request.stellarTxParams!, signer, ctx.network);
        } catch (err) {
            throw new ChainExecutionError(err instanceof Error ? err.message : 'Stellar simulation failed.', {
                code: 'SIMULATION_FAILED',
                chain: this.chain,
                stage: 'simulate',
                cause: err
            });
        }
    }

    async execute(request: RequestItem, ctx: TxContext): Promise<TxResult> {
        if (!ctx.wallet || ctx.wallet.family !== 'stellar') {
            throw new ChainExecutionError('Connect a Stellar wallet to sign this transaction.', {
                code: 'MISSING_WALLET',
                chain: this.chain,
                stage: 'execute'
            });
        }
        try {
            return await executeStellar(request.stellarTxParams!, ctx.wallet, ctx.network, ctx.onProgress);
        } catch (err) {
            throw new ChainExecutionError(err instanceof Error ? err.message : 'Stellar transaction failed.', {
                code: 'EXECUTION_FAILED',
                chain: this.chain,
                stage: 'submit',
                cause: err
            });
        }
    }
}

export const stellarAdapter = new StellarAdapter();
