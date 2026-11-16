import type { ChainAdapter, DescribedTransaction, TxContext, TxResult } from '../chainAdapter';
import { ChainExecutionError } from '../chainAdapter';
import type { Network, RequestItem, StellarArg, StellarTxParams } from '../../types';
import { resolveChainRpcUrl } from '../suiService';
import { signStellarTransaction } from '@/wallet/stellar';
import type { ConnectedWallet } from '@/wallet/types';
import { toJsonSafe } from './evmAdapter';
import { STELLAR_PASSPHRASES, stellarExpertUrl } from '@/lib/constants';
import type { TxProgress } from '../../components/RequestPanel/response/types';

export const DEFAULT_STELLAR_TX: StellarTxParams = { contractId: '', function: '', args: [] };

/** Undefined on networks stellar.expert does not index (Futurenet, local). */
export const stellarExplorerUrl = (network: Network, txId: string): string | undefined => stellarExpertUrl(network, 'tx', txId);

const loadStellar = () => import('@stellar/stellar-sdk');

// Async for its existing callers; the passphrases are constants.
export const stellarPassphrase = async (network: Network): Promise<string> => STELLAR_PASSPHRASES[network];

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

/**
 * `placeholderAccount`: simulate from an account that need not exist on-chain
 * (sequence 0). Soroban simulation does not check the source account, so
 * read-only calls can be simulated without a wallet.
 */
const buildStellarTx = async (p: StellarTxParams, source: string, network: Network, placeholderAccount = false) => {
    const { rpc, Account, Contract, TransactionBuilder, BASE_FEE } = await loadStellar();
    const server = new rpc.Server(resolveChainRpcUrl('stellar', network));
    const networkPassphrase = await stellarPassphrase(network);
    const account = placeholderAccount ? new Account(source, '0') : await server.getAccount(source);
    const scArgs = await Promise.all(p.args.map(toStellarScVal));
    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
        .addOperation(new Contract(p.contractId.trim()).call(p.function.trim(), ...scArgs))
        .setTimeout(60)
        .build();
    return { server, tx, networkPassphrase };
};

/** Minimal view of a Soroban diagnostic event, so extraction can be tested without XDR fixtures. */
export interface SorobanEventLike {
    event(): {
        type(): { name: string };
        contractId(): Uint8Array | null | undefined;
        body(): { v0(): { topics(): unknown[]; data(): unknown } };
    };
}

export interface SorobanTransfer {
    contract: string;
    from: string;
    to: string;
    /** Token base units. */
    amount: string;
    /** The asset name a Stellar Asset Contract emits as a 4th topic ("native", "USDC:G…"), when present. */
    asset?: string;
}

/**
 * Pulls SEP-41 / Stellar Asset Contract `transfer` events out of a
 * simulation's diagnostic events. Anything that does not look exactly like a
 * transfer is ignored, so an unfamiliar contract yields no entries, not wrong ones.
 */
export const extractSorobanTransfers = (
    events: SorobanEventLike[],
    toNative: (value: never) => unknown,
    contractIdToString: (id: Uint8Array) => string
): SorobanTransfer[] => {
    const transfers: SorobanTransfer[] = [];
    for (const diagnostic of events) {
        try {
            const event = diagnostic.event();
            if (event.type().name !== 'contract') continue;
            const body = event.body().v0();
            const topics = body.topics().map((t) => toNative(t as never));
            if (topics.length < 3 || topics[0] !== 'transfer') continue;
            const data = toNative(body.data() as never);
            const raw = data && typeof data === 'object' && 'amount' in (data as object) ? (data as { amount: unknown }).amount : data;
            if (typeof raw !== 'bigint' && typeof raw !== 'number' && typeof raw !== 'string') continue;
            const id = event.contractId();
            transfers.push({
                contract: id ? contractIdToString(id) : '',
                from: String(topics[1]),
                to: String(topics[2]),
                amount: BigInt(raw).toString(),
                ...(typeof topics[3] === 'string' ? { asset: topics[3] } : {})
            });
        } catch {
            /* not a transfer event we understand */
        }
    }
    return transfers;
};

/**
 * Simulates a contract call and reports everything Soroban RPC returns, in
 * readable form: return value, resource usage and footprint, the auth tree
 * each signer must approve, every event, and ledger state changes.
 * `source` null: simulate from a throwaway account (read-only calls only;
 * calls that need the caller's authorization will fail).
 */
const simulateStellar = async (p: StellarTxParams, source: string | null, network: Network): Promise<TxResult> => {
    const sdk = await loadStellar();
    const { rpc, scValToNative, StrKey } = sdk;
    const xdrHelpers = await import('../stellar/xdr');
    const start = performance.now();
    const from = source ?? sdk.Keypair.random().publicKey();
    let built: Awaited<ReturnType<typeof buildStellarTx>>;
    try {
        built = await buildStellarTx(p, from, network, source === null);
    } catch (err) {
        // A connected but unfunded wallet: simulation still works from a placeholder account.
        if (source === null || !(err instanceof Error) || !/not found/i.test(err.message)) throw err;
        built = await buildStellarTx(p, from, network, true);
    }
    const sim = await built.server.simulateTransaction(built.tx);
    if (rpc.Api.isSimulationError(sim)) {
        // The RPC error text already carries the host's event log (newest first).
        throw new Error(`Simulation failed: ${sim.error}`);
    }
    const retval = sim.result?.retval;
    const transfers = extractSorobanTransfers(
        sim.events as unknown as SorobanEventLike[],
        scValToNative as (value: never) => unknown,
        (id) => StrKey.encodeContract(Buffer.from(id))
    );
    const stateChanges = (sim as { stateChanges?: { type: number | string; key: unknown; before: unknown; after: unknown }[] }).stateChanges;
    return {
        result: toJsonSafe({
            returnValue: retval ? scValToNative(retval) : null,
            minResourceFee: sim.minResourceFee,
            latestLedger: sim.latestLedger,
            source: from,
            ...(source === null ? { sourceNote: 'Simulated from a throwaway account; connect a wallet to simulate as yourself.' } : {}),
            ...(rpc.Api.isSimulationRestore(sim)
                ? { restoreRequired: { note: 'Archived ledger entries must be restored before this call can run.', minResourceFee: sim.restorePreamble.minResourceFee } }
                : {}),
            resources: xdrHelpers.summarizeSorobanData(sdk, sim.transactionData.build()),
            auth: (sim.result?.auth ?? []).map((entry) => xdrHelpers.summarizeAuthEntry(sdk, entry)),
            events: sim.events.map((e) => xdrHelpers.summarizeDiagnosticEvent(sdk, e)),
            ...(stateChanges ? { stateChanges: stateChanges.map((c) => xdrHelpers.summarizeStateChange(sdk, c)) } : {}),
            // Present only when the simulation emitted transfer events.
            ...(transfers.length > 0 ? { transfers } : {})
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

/**
 * Signs and submits a pre-built raw Stellar transaction (unsigned XDR
 * envelope) — the shape LI.FI's `advanced/stepTransaction` returns for a
 * Stellar-origin cross-chain send. Unlike `executeStellar`, this does not
 * build the transaction from a Soroban contract call; it only signs and
 * submits the XDR the caller already has.
 */
export const signAndSubmitRawStellarTransaction = async (
    unsignedXdr: string,
    wallet: ConnectedWallet,
    network: Network,
    onProgress?: (p: TxProgress) => void
): Promise<TxResult> => {
    const { rpc, TransactionBuilder } = await loadStellar();
    const start = performance.now();
    const networkPassphrase = await stellarPassphrase(network);
    const server = new rpc.Server(resolveChainRpcUrl('stellar', network));

    onProgress?.({ stage: 'awaiting-signature' });
    const signedXdr = await signStellarTransaction(wallet.id, unsignedXdr, networkPassphrase, wallet.address);
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
                result: toJsonSafe({ hash: sent.hash, explorerUrl, ledger: got.ledger }),
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
        // No wallet: read-only calls still simulate, from a throwaway source account.
        const signer = ctx.wallet && ctx.wallet.family === 'stellar' ? ctx.wallet.address : null;
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
