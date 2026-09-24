import type { ChainAdapter, DescribedTransaction, TxContext, TxResult } from '../chainAdapter';
import { ChainExecutionError } from '../chainAdapter';
import type { AptosTxParams, BuilderArg, MoveParamType, Network, RequestItem } from '../../types';
import { APTOS_NETWORKS } from '@/lib/constants';
import { signAndSubmitAptosTransaction, type AptosEntryFunctionPayload } from '@/wallet/aptos';
import { toJsonSafe } from './evmAdapter';

export const DEFAULT_APTOS_TX: AptosTxParams = {
    moduleAddress: '',
    module: '',
    function: '',
    typeArguments: [],
    arguments: []
};

export const aptosExplorerUrl = (network: Network, txHash: string): string | undefined => {
    if (network === 'localnet') return undefined;
    const suffix = network === 'mainnet' ? '' : `?network=${network}`;
    return `https://explorer.aptoslabs.com/txn/${txHash}${suffix}`;
};

/** REST fullnode endpoint for a network — Aptos is REST, not JSON-RPC. */
export const resolveAptosRpcUrl = (network: Network): string => APTOS_NETWORKS[network];

/** Loads the SDK lazily, same pattern as the Stellar/Sui adapters. */
const loadAptos = () => import('@aptos-labs/ts-sdk');

const buildAptosClient = async (network: Network) => {
    const { Aptos, AptosConfig, Network: SdkNetwork } = await loadAptos();
    return new Aptos(
        new AptosConfig({
            network: SdkNetwork.CUSTOM,
            fullnode: resolveAptosRpcUrl(network)
        })
    );
};

/**
 * Converts a BuilderArg (the same {type, value} shape Sui's Move-call
 * builder uses — Aptos entry functions take the same BCS-primitive
 * argument kinds) into the value the Aptos SDK's functionArguments expects.
 * The SDK itself handles BCS serialization once it knows the ABI types from
 * `typeArguments`/simulation, so this mostly just parses user-typed strings
 * into the right JS primitive.
 */
const coerceAptosArg = (arg: BuilderArg): unknown => {
    const value = arg.value.trim();
    const type: MoveParamType = arg.type;
    switch (type) {
        case 'bool':
            if (value !== 'true' && value !== 'false') throw new Error(`"${arg.value}" must be true or false.`);
            return value === 'true';
        case 'u8':
        case 'u16':
        case 'u32':
            if (!/^\d+$/.test(value)) throw new Error(`"${arg.value}" is not a whole number for ${type}.`);
            return Number(value);
        case 'u64':
        case 'u128':
        case 'u256':
            if (!/^\d+$/.test(value)) throw new Error(`"${arg.value}" is not a whole number for ${type}.`);
            return value; // SDK accepts numeric strings for large ints.
        case 'address':
            return value;
        case 'string':
            return value;
        case 'object':
            return value;
        case 'vector<u8>':
            try {
                return JSON.parse(value);
            } catch {
                throw new Error(`vector<u8> must be a JSON array, e.g. [1,2,3]. Got "${arg.value}".`);
            }
        case 'vector<address>':
            try {
                return JSON.parse(value);
            } catch {
                throw new Error(`vector<address> must be a JSON array of addresses. Got "${arg.value}".`);
            }
        default:
            return value;
    }
};

const buildEntryFunctionData = (p: AptosTxParams): import('@aptos-labs/ts-sdk').InputEntryFunctionData => ({
    function: `${p.moduleAddress.trim()}::${p.module.trim()}::${p.function.trim()}` as `${string}::${string}::${string}`,
    typeArguments: p.typeArguments,
    functionArguments: p.arguments.map(coerceAptosArg) as import('@aptos-labs/ts-sdk').InputEntryFunctionData['functionArguments']
});

export class AptosAdapter implements ChainAdapter {
    readonly chain = 'aptos' as const;
    readonly label = 'Aptos';

    validate(request: RequestItem): string | null {
        const p = request.aptosTxParams;
        if (!p?.moduleAddress?.trim() || !p.module?.trim() || !p.function?.trim()) {
            return 'Module address, module and function are required.';
        }
        try {
            p.arguments.forEach(coerceAptosArg);
        } catch (err) {
            return err instanceof Error ? err.message : 'Invalid argument.';
        }
        return null;
    }

    targetAddress(request: RequestItem): string | null {
        return request.aptosTxParams?.moduleAddress?.trim() || null;
    }

    describe(request: RequestItem): DescribedTransaction {
        const p = request.aptosTxParams ?? DEFAULT_APTOS_TX;
        return {
            chain: this.chain,
            kind: 'Entry function call',
            target: `${p.moduleAddress}::${p.module}::${p.function}`,
            details: [
                ['Arguments', String(p.arguments.length)],
                ['Max gas', p.maxGasAmount ? `${p.maxGasAmount} octas` : 'Auto']
            ]
        };
    }

    isMainnetExecution(_request: RequestItem, network: Network): boolean {
        return network === 'mainnet';
    }

    explorerUrl(network: Network, txId: string): string | undefined {
        return aptosExplorerUrl(network, txId);
    }

    async simulate(request: RequestItem, ctx: TxContext): Promise<TxResult> {
        const p = request.aptosTxParams!;
        const signer = ctx.wallet && ctx.wallet.family === 'aptos' ? ctx.wallet.address : null;
        if (!signer) {
            throw new ChainExecutionError('Connect an Aptos wallet: simulation needs an existing sender account.', {
                code: 'MISSING_WALLET',
                chain: this.chain,
                stage: 'simulate'
            });
        }

        const start = performance.now();
        try {
            const aptos = await buildAptosClient(ctx.network);
            const transaction = await aptos.transaction.build.simple({
                sender: signer,
                data: buildEntryFunctionData(p),
                options: {
                    maxGasAmount: p.maxGasAmount ? Number(p.maxGasAmount) : undefined,
                    gasUnitPrice: p.gasUnitPrice ? Number(p.gasUnitPrice) : undefined
                }
            });
            // No real signature available in a non-custodial preflight —
            // the fullnode accepts an unsigned simulation when
            // signerPublicKey is omitted, mirroring how Sui's dev-inspect
            // and EVM's eth_call both run without a wallet signature.
            const [simResult] = await aptos.transaction.simulate.simple({ transaction });
            return {
                result: toJsonSafe(simResult),
                duration: Math.round(performance.now() - start),
                status: simResult.success ? 200 : 400
            };
        } catch (err) {
            throw new ChainExecutionError(err instanceof Error ? err.message : 'Aptos simulation failed.', {
                code: 'SIMULATION_FAILED',
                chain: this.chain,
                stage: 'simulate',
                cause: err
            });
        }
    }

    async execute(request: RequestItem, ctx: TxContext): Promise<TxResult> {
        if (!ctx.wallet || ctx.wallet.family !== 'aptos') {
            throw new ChainExecutionError('Connect an Aptos wallet to sign this transaction.', {
                code: 'MISSING_WALLET',
                chain: this.chain,
                stage: 'execute'
            });
        }

        const p = request.aptosTxParams!;
        const start = performance.now();
        ctx.onProgress?.({ stage: 'awaiting-signature' });

        const payload: AptosEntryFunctionPayload = {
            type: 'entry_function_payload',
            function: `${p.moduleAddress.trim()}::${p.module.trim()}::${p.function.trim()}`,
            type_arguments: p.typeArguments,
            arguments: p.arguments.map(coerceAptosArg),
            max_gas_amount: p.maxGasAmount,
            gas_unit_price: p.gasUnitPrice
        };

        let hash: string;
        try {
            const submitted = await signAndSubmitAptosTransaction(ctx.wallet.id, payload);
            hash = submitted.hash;
        } catch (err) {
            throw new ChainExecutionError(err instanceof Error ? err.message : 'Aptos transaction failed.', {
                code: 'SIGNING_FAILED',
                chain: this.chain,
                stage: 'sign',
                cause: err
            });
        }

        const explorerUrl = this.explorerUrl(ctx.network, hash);
        ctx.onProgress?.({ stage: 'submitted', hash, explorerUrl });

        try {
            const aptos = await buildAptosClient(ctx.network);
            const confirmed = await aptos.waitForTransaction({ transactionHash: hash });
            ctx.onProgress?.({ stage: 'confirmed', hash, explorerUrl });
            return {
                result: toJsonSafe({ ...confirmed, explorerUrl }),
                duration: Math.round(performance.now() - start),
                status: 200
            };
        } catch (err) {
            ctx.onProgress?.({ stage: 'failed', hash, explorerUrl });
            throw new ChainExecutionError(err instanceof Error ? err.message : 'Aptos transaction was submitted but did not confirm.', {
                code: 'CONFIRMATION_TIMEOUT',
                chain: this.chain,
                stage: 'confirm',
                cause: err
            });
        }
    }
}

export const aptosAdapter = new AptosAdapter();
