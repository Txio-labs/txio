import {
    decodeFunctionResult,
    encodeFunctionData,
    formatEther,
    parseEventLogs,
    parseUnits,
    type Abi,
    isAddress,
    isHex,
    parseAbiItem,
    parseEther,
    type AbiFunction,
    type Hex
} from 'viem';
import {
    getConnection,
    getPublicClient,
    sendTransaction,
    switchChain,
    waitForTransactionReceipt
} from 'wagmi/actions';

import { wagmiConfig, DEFAULT_EVM_CHAIN_ID } from '@/wallet/config';
import type { ChainAdapter, DescribedTransaction, TxContext, TxResult } from '../chainAdapter';
import { ChainExecutionError } from '../chainAdapter';
import type { EvmTxParams, Network, RequestItem } from '../../types';
import { describeEvmError, parseAbiJson } from '../evmContract';
import type { TxProgress } from '../../components/RequestPanel/response/types';

export const getEvmTxChain = (chainId: number) => wagmiConfig.chains.find((c) => c.id === chainId);

export const DEFAULT_EVM_TX: EvmTxParams = {
    chainId: DEFAULT_EVM_CHAIN_ID,
    to: '',
    value: '0',
    functionSignature: '',
    args: [],
    data: ''
};

const evmAbiOf = (p: EvmTxParams): Abi | undefined => {
    if (!p.abi) return undefined;
    try {
        return parseAbiJson(p.abi);
    } catch {
        return undefined;
    }
};

const parseEvmFunction = (signature: string): AbiFunction => {
    const sig = signature.trim().replace(/^function\s+/, '');
    let item;
    try {
        item = parseAbiItem(`function ${sig}`);
    } catch {
        throw new Error(`Couldn't parse function signature "${signature}". Use e.g. transfer(address,uint256).`);
    }
    if (item.type !== 'function') throw new Error('Signature must describe a function.');
    return item as AbiFunction;
};

const coerceEvmArg = (type: string, raw: string, decimals?: number | null): unknown => {
    const value = raw.trim();
    if (type.endsWith(']') || type.startsWith('tuple') || type.startsWith('(')) {
        try {
            return JSON.parse(value);
        } catch {
            throw new Error(`Argument of type ${type} must be JSON, e.g. ["0x…", "0x…"].`);
        }
    }
    if (/^u?int\d*$/.test(type)) {
        if (decimals) {
            if (!/^-?\d*\.?\d+$/.test(value)) throw new Error(`"${raw}" is not a number.`);
            // parseUnits would silently round extra digits — refuse instead.
            if ((value.split('.')[1] ?? '').length > decimals) {
                throw new Error(`"${raw}" has more than ${decimals} decimal places.`);
            }
            return parseUnits(value, decimals);
        }
        if (!/^-?\d+$/.test(value)) throw new Error(`"${raw}" is not a whole number for ${type}.`);
        return BigInt(value);
    }
    if (type === 'bool') {
        if (value !== 'true' && value !== 'false') throw new Error(`"${raw}" must be true or false.`);
        return value === 'true';
    }
    if (type === 'address' && !isAddress(value)) throw new Error(`"${raw}" is not a valid address.`);
    if (type.startsWith('bytes') && !isHex(value)) throw new Error(`"${raw}" must be hex for ${type}.`);
    return value;
};

/** Live per-field check for the generated form: null when valid. */
export const checkEvmArg = (type: string, value: string, decimals?: number | null): string | null => {
    if (!value.trim()) return 'Required';
    try {
        coerceEvmArg(type, value, decimals);
        return null;
    } catch (err) {
        return err instanceof Error ? err.message : 'Invalid value';
    }
};

/** Coerces every form argument to the ABI types (for read calls). */
export const coerceEvmArgs = (fn: AbiFunction, args: string[], decimals?: (number | null)[]) =>
    fn.inputs.map((input, i) => coerceEvmArg(input.type, args[i] ?? '', decimals?.[i]));

/** ABI-encodes the call from signature + args, or returns raw calldata. */
export const buildEvmCalldata = (p: EvmTxParams): { data: Hex; fn: AbiFunction | null } => {
    if (!p.functionSignature.trim()) {
        const raw = p.data.trim();
        return { data: (raw || '0x') as Hex, fn: null };
    }
    const parsed = parseEvmFunction(p.functionSignature);
    // Prefer the ABI's own entry (it carries outputs for decoding results).
    const key = (f: AbiFunction) => `${f.name}(${f.inputs.map((i) => i.type).join(',')})`;
    const fn =
        (evmAbiOf(p)?.find((item) => item.type === 'function' && key(item as AbiFunction) === key(parsed)) as
            | AbiFunction
            | undefined) ?? parsed;
    if (p.args.length !== fn.inputs.length) {
        throw new Error(`${fn.name} takes ${fn.inputs.length} argument(s), got ${p.args.length}.`);
    }
    const args = fn.inputs.map((input, i) => coerceEvmArg(input.type, p.args[i] ?? '', p.argDecimals?.[i]));
    return { data: encodeFunctionData({ abi: [fn], functionName: fn.name, args }), fn };
};

/** JSON-safe copy of a result (bigints → strings) for display/history. */
export const toJsonSafe = (value: unknown): unknown =>
    JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));

export const evmExplorerUrl = (hash: string, evmChainId?: number): string | undefined => {
    const base = getEvmTxChain(evmChainId ?? DEFAULT_EVM_CHAIN_ID)?.blockExplorers?.default.url;
    return base ? `${base}/tx/${hash}` : undefined;
};

const simulateEvm = async (p: EvmTxParams, from: string | null): Promise<TxResult> => {
    const client = getPublicClient(wagmiConfig, { chainId: p.chainId as never });
    if (!client) throw new Error(`No RPC client configured for chain ${p.chainId}.`);
    const { data, fn } = buildEvmCalldata(p);
    const value = parseEther(p.value.trim() || '0');
    const call = {
        account: (from ?? undefined) as Hex | undefined,
        to: p.to.trim() as Hex,
        data,
        value
    };

    const abi = evmAbiOf(p);
    const start = performance.now();
    let returnData: Hex | undefined;
    try {
        ({ data: returnData } = await client.call(call));
    } catch (err) {
        throw new Error(describeEvmError(err, abi));
    }
    let gasEstimate: bigint | null = null;
    try {
        gasEstimate = await client.estimateGas({ ...call, account: call.account ?? undefined } as never);
    } catch {
        // Estimation needs a funded sender for value transfers — the call
        // result above is still meaningful without it.
    }

    let decoded: unknown;
    if (fn && fn.outputs.length && returnData && returnData !== '0x') {
        try {
            decoded = decodeFunctionResult({ abi: [fn], functionName: fn.name, data: returnData });
        } catch {
            decoded = undefined;
        }
    }

    return {
        result: toJsonSafe({
            chainId: p.chainId,
            from,
            to: p.to,
            returnData: returnData ?? '0x',
            ...(decoded !== undefined ? { decoded } : {}),
            gasEstimate
        }),
        duration: Math.round(performance.now() - start),
        status: 200
    };
};

const executeEvm = async (p: EvmTxParams, network: Network, onProgress?: (p: TxProgress) => void): Promise<TxResult> => {
    const { data } = buildEvmCalldata(p);
    const value = parseEther(p.value.trim() || '0');
    const abi = evmAbiOf(p);
    const net = getEvmTxChain(p.chainId);

    // The wallet must be on the transaction's chain — switch it rather than
    // sending on whatever network it's currently set to.
    if (getConnection(wagmiConfig).chainId !== p.chainId) {
        await switchChain(wagmiConfig, { chainId: p.chainId as never });
    }

    const start = performance.now();
    onProgress?.({ stage: 'awaiting-signature' });
    const hash = await sendTransaction(wagmiConfig, {
        chainId: p.chainId as never,
        to: p.to.trim() as Hex,
        data,
        value
    });
    const explorerUrl = evmExplorerUrl(hash, p.chainId);
    onProgress?.({ stage: 'submitted', hash, explorerUrl });

    const receipt = await waitForTransactionReceipt(wagmiConfig, {
        chainId: p.chainId as never,
        hash,
        timeout: 120_000
    });
    onProgress?.({ stage: receipt.status === 'success' ? 'included' : 'failed', hash, explorerUrl });

    const events = abi
        ? parseEventLogs({ abi, logs: receipt.logs }).map((log) => ({ event: log.eventName, args: log.args }))
        : receipt.logs.map((log) => ({ address: log.address, topics: log.topics, data: log.data }));
    const gasPaid = BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice ?? 0);

    const result = toJsonSafe({
        hash,
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        gasPaid: `${formatEther(gasPaid)} ${net?.nativeCurrency.symbol ?? ''}`.trim(),
        events,
        explorerUrl
    });
    if (receipt.status === 'reverted') {
        throw Object.assign(new Error(`Transaction ${hash} reverted.`), { result });
    }

    // One more block on top before calling it confirmed; don't fail the
    // call if that takes a while — it's already included.
    try {
        await waitForTransactionReceipt(wagmiConfig, { chainId: p.chainId as never, hash, confirmations: 2, timeout: 60_000 });
        onProgress?.({ stage: 'confirmed', hash, explorerUrl });
    } catch {
        // Stays "included"; the explorer link shows further confirmations.
    }

    return { result, duration: Math.round(performance.now() - start), status: 200 };
};

export class EvmAdapter implements ChainAdapter {
    readonly chain = 'evm' as const;
    readonly label = 'EVM';

    validate(request: RequestItem): string | null {
        const p = request.evmTxParams;
        if (!p) return 'Transaction details are missing.';
        if (!getEvmTxChain(p.chainId)) return `Unsupported EVM chain ${p.chainId}.`;
        if (!isAddress(p.to.trim())) return 'Enter a valid "to" address (0x…).';
        if (p.value.trim() && !/^\d*\.?\d+$/.test(p.value.trim())) return 'Value must be a decimal amount, e.g. 0.01.';
        if (!p.functionSignature.trim() && p.data.trim() && !isHex(p.data.trim())) {
            return 'Calldata must be hex (0x…).';
        }
        try {
            buildEvmCalldata(p);
        } catch (err) {
            return err instanceof Error ? err.message : 'Invalid function call.';
        }
        return null;
    }

    targetAddress(request: RequestItem): string | null {
        return request.evmTxParams?.to?.trim() || null;
    }

    describe(request: RequestItem): DescribedTransaction {
        const p = request.evmTxParams ?? DEFAULT_EVM_TX;
        const net = getEvmTxChain(p.chainId);
        return {
            chain: this.chain,
            kind: p.functionSignature.trim() ? 'Contract call' : p.data.trim() ? 'Raw calldata' : 'Transfer',
            target: p.functionSignature.trim() ? `${p.to} · ${p.functionSignature}` : p.to,
            details: [
                ['Network', net ? net.name : `Chain ${p.chainId}`],
                ['Value', `${p.value || '0'} ${net?.nativeCurrency.symbol ?? ''}`.trim()]
            ]
        };
    }

    isMainnetExecution(request: RequestItem, _network: Network): boolean {
        const net = getEvmTxChain(request.evmTxParams?.chainId ?? DEFAULT_EVM_CHAIN_ID);
        return !net?.testnet;
    }

    explorerUrl(_network: Network, txId: string, request?: RequestItem): string | undefined {
        return evmExplorerUrl(txId, request?.evmTxParams?.chainId);
    }

    async simulate(request: RequestItem, ctx: TxContext): Promise<TxResult> {
        const signer = ctx.wallet && ctx.wallet.family === 'evm' ? ctx.wallet.address : null;
        try {
            return await simulateEvm(request.evmTxParams!, signer);
        } catch (err) {
            throw new ChainExecutionError(err instanceof Error ? err.message : 'EVM simulation failed.', {
                code: 'SIMULATION_FAILED',
                chain: this.chain,
                stage: 'simulate',
                cause: err
            });
        }
    }

    async execute(request: RequestItem, ctx: TxContext): Promise<TxResult> {
        if (!ctx.wallet || ctx.wallet.family !== 'evm') {
            throw new ChainExecutionError('Connect an EVM wallet to sign this transaction.', {
                code: 'MISSING_WALLET',
                chain: this.chain,
                stage: 'execute'
            });
        }
        try {
            return await executeEvm(request.evmTxParams!, ctx.network, ctx.onProgress);
        } catch (err) {
            throw new ChainExecutionError(err instanceof Error ? err.message : 'EVM transaction failed.', {
                code: 'EXECUTION_FAILED',
                chain: this.chain,
                stage: 'submit',
                cause: err
            });
        }
    }
}

export const evmAdapter = new EvmAdapter();
