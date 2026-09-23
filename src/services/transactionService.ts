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

import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { wagmiConfig, DEFAULT_EVM_CHAIN_ID } from '@/wallet/config';
import { sendSolanaTransaction, simulateSolanaTransaction } from '@/wallet/solana';
import { signStellarTransaction } from '@/wallet/stellar';
import type { ConnectedWallet, WalletChainFamily } from '@/wallet/types';
import {
    ChainId,
    EvmTxParams,
    Network,
    RequestItem,
    RequestType,
    StellarArg,
    StellarTxParams,
    SolanaTxParams
} from '../types';
import { resolveChainRpcUrl, signAndExecuteMoveCall, simulateMoveCall } from './suiService';
import { describeEvmError, parseAbiJson } from './evmContract';
import type { TxProgress } from '../components/RequestPanel/response/types';

/**
 * One entry point for building, simulating and executing transactions on
 * every supported chain. A TRANSACTION request names its chain in
 * `rpcParams.chain` and carries that chain's native params; this module
 * dispatches to the right adapter so the UI never branches on chain for
 * execution.
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

/** Block-explorer link for a transaction on any supported chain. */
export const txExplorerUrl = (chain: ChainId, network: Network, hash: string, evmChainId?: number): string | undefined => {
    switch (chain) {
        case 'evm': {
            const base = getEvmTxChain(evmChainId ?? DEFAULT_EVM_CHAIN_ID)?.blockExplorers?.default.url;
            return base ? `${base}/tx/${hash}` : undefined;
        }
        case 'sui':
            return network === 'localnet' ? undefined : `https://suiscan.xyz/${network}/tx/${hash}`;
        case 'solana':
            return `https://explorer.solana.com/tx/${hash}${network === 'mainnet' ? '' : `?cluster=${network}`}`;
        case 'stellar':
            return `https://stellar.expert/explorer/${network === 'mainnet' ? 'public' : 'testnet'}/tx/${hash}`;
    }
};

const evmAbiOf = (p: EvmTxParams): Abi | undefined => {
    if (!p.abi) return undefined;
    try {
        return parseAbiJson(p.abi);
    } catch {
        return undefined;
    }
};

const SUI_ZERO_ADDRESS = `0x${'0'.repeat(64)}`;

export const TX_CHAIN_LABELS: Record<ChainId, string> = {
    sui: 'Sui',
    evm: 'EVM',
    solana: 'Solana',
    stellar: 'Stellar'
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

export const DEFAULT_EVM_TX: EvmTxParams = {
    chainId: DEFAULT_EVM_CHAIN_ID,
    to: '',
    value: '0',
    functionSignature: '',
    args: [],
    data: ''
};

export const DEFAULT_STELLAR_TX: StellarTxParams = { contractId: '', function: '', args: [] };

export const DEFAULT_SOLANA_TX: SolanaTxParams = {
    programId: '',
    accounts: [],
    data: '',
    dataEncoding: 'hex'
};

/** Switches a request to `chain`, seeding that chain's params if missing. */
export const withTxChain = (request: RequestItem, chain: ChainId): RequestItem => ({
    ...request,
    rpcParams: { ...request.rpcParams, chain },
    moveParams: request.moveParams ?? { ...DEFAULT_MOVE_CALL },
    ...(chain === 'evm' && !request.evmTxParams ? { evmTxParams: { ...DEFAULT_EVM_TX } } : {}),
    ...(chain === 'solana' && !request.solanaTxParams ? { solanaTxParams: { ...DEFAULT_SOLANA_TX } } : {}),
    ...(chain === 'stellar' && !request.stellarTxParams ? { stellarTxParams: { ...DEFAULT_STELLAR_TX } } : {})
});

export const getEvmTxChain = (chainId: number) => wagmiConfig.chains.find((c) => c.id === chainId);

// ---------------------------------------------------------------------------
// Validation & description
// ---------------------------------------------------------------------------

/** Returns a user-facing problem with the request, or null when it's runnable. */
export const validateTransaction = (request: RequestItem): string | null => {
    const chain = getTxChain(request);
    switch (chain) {
        case 'sui': {
            const m = request.moveParams;
            if (!m?.packageId?.trim() || !m.module?.trim() || !m.function?.trim()) {
                return 'Package ID, module and function are required.';
            }
            return null;
        }
        case 'evm': {
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
        case 'solana': {
            const p = request.solanaTxParams;
            if (!p?.programId.trim()) return 'Program ID is required.';
            return null;
        }
        case 'stellar': {
            const p = request.stellarTxParams;
            if (!p?.contractId.trim() || !p.function.trim()) return 'Contract ID and function are required.';
            return null;
        }
    }
};

/** Human-readable summary for review screens and terminal logs. */
export const describeTransaction = (
    request: RequestItem
): { chain: ChainId; kind: string; target: string; details: [string, string][] } => {
    const chain = getTxChain(request);
    switch (chain) {
        case 'sui': {
            const m = request.moveParams;
            return {
                chain,
                kind: 'Move call',
                target: `${m.packageId}::${m.module}::${m.function}`,
                details: [
                    ['Arguments', String(m.arguments.length)],
                    ['Gas budget', m.gasBudget ? `${m.gasBudget} MIST` : 'Auto']
                ]
            };
        }
        case 'evm': {
            const p = request.evmTxParams ?? DEFAULT_EVM_TX;
            const net = getEvmTxChain(p.chainId);
            return {
                chain,
                kind: p.functionSignature.trim() ? 'Contract call' : p.data.trim() ? 'Raw calldata' : 'Transfer',
                target: p.functionSignature.trim() ? `${p.to} · ${p.functionSignature}` : p.to,
                details: [
                    ['Network', net ? net.name : `Chain ${p.chainId}`],
                    ['Value', `${p.value || '0'} ${net?.nativeCurrency.symbol ?? ''}`.trim()]
                ]
            };
        }
        case 'solana': {
            const p = request.solanaTxParams ?? DEFAULT_SOLANA_TX;
            return {
                chain,
                kind: 'Program instruction',
                target: p.programId,
                details: [
                    ['Accounts', String(p.accounts.length)],
                    ['Data', p.data ? `${p.data.length} chars (${p.dataEncoding})` : 'None']
                ]
            };
        }
        case 'stellar': {
            const p = request.stellarTxParams ?? DEFAULT_STELLAR_TX;
            return {
                chain,
                kind: 'Contract invocation',
                target: `${p.contractId} · ${p.function}`,
                details: [['Arguments', String(p.args.length)]]
            };
        }
    }
};

/** Whether executing this request spends real funds. */
export const isMainnetExecution = (request: RequestItem, network: Network): boolean => {
    if (getTxChain(request) === 'evm') {
        const net = getEvmTxChain(request.evmTxParams?.chainId ?? DEFAULT_EVM_CHAIN_ID);
        return !net?.testnet;
    }
    return network === 'mainnet';
};

/** The connected wallet's address when it can sign for this request's chain. */
export const signerAddressFor = (request: RequestItem, wallet: ConnectedWallet | null): string | null =>
    wallet && wallet.family === walletFamilyForChain(getTxChain(request)) ? wallet.address : null;

// ---------------------------------------------------------------------------
// EVM
// ---------------------------------------------------------------------------

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
    const explorerUrl = txExplorerUrl('evm', network, hash, p.chainId);
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

// ---------------------------------------------------------------------------
// Stellar (Soroban)
// ---------------------------------------------------------------------------

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
    const explorerUrl = txExplorerUrl('stellar', network, sent.hash);
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

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

const requireSigner = (request: RequestItem, wallet: ConnectedWallet | null): ConnectedWallet => {
    const chain = getTxChain(request);
    if (!wallet || wallet.family !== walletFamilyForChain(chain)) {
        throw new Error(`Connect a ${TX_CHAIN_LABELS[chain]} wallet to sign this transaction.`);
    }
    return wallet;
};

const assertValid = (request: RequestItem) => {
    const problem = validateTransaction(request);
    if (problem) throw new Error(problem);
};

/** Runs the transaction against current chain state without signing it. */
export const simulateTransaction = async (request: RequestItem, ctx: TxContext): Promise<TxResult> => {
    assertValid(request);
    const signer = signerAddressFor(request, ctx.wallet);

    switch (getTxChain(request)) {
        case 'sui': {
            const m = request.moveParams;
            return simulateMoveCall(
                ctx.network,
                signer ?? SUI_ZERO_ADDRESS,
                m.packageId,
                m.module,
                m.function,
                m.typeArguments,
                m.arguments
            );
        }
        case 'evm':
            return simulateEvm(request.evmTxParams!, signer);
        case 'solana': {
            const p = request.solanaTxParams!;
            const feePayer = signer ?? p.accounts.find((a) => a.isSigner && a.pubkey.trim())?.pubkey;
            if (!feePayer) {
                throw new Error('Connect a Solana wallet (or mark a signer account) to pay fees for the simulation.');
            }
            const start = performance.now();
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
        }
        case 'stellar': {
            if (!signer) {
                throw new Error('Connect a Stellar wallet: Soroban simulation needs an existing source account.');
            }
            return simulateStellar(request.stellarTxParams!, signer, ctx.network);
        }
    }
};

/** Signs with the connected wallet and submits the transaction on-chain. */
export const executeTransaction = async (request: RequestItem, ctx: TxContext): Promise<TxResult> => {
    assertValid(request);
    const wallet = requireSigner(request, ctx.wallet);

    switch (getTxChain(request)) {
        case 'sui': {
            if (!ctx.suiSignAndExecute) throw new Error('Sui wallet signing is unavailable.');
            const m = request.moveParams;
            ctx.onProgress?.({ stage: 'awaiting-signature' });
            const res = await signAndExecuteMoveCall(
                ctx.network,
                wallet.address,
                m.packageId,
                m.module,
                m.function,
                m.typeArguments,
                m.arguments,
                ctx.suiSignAndExecute as (tx: unknown) => Promise<never>,
                m.gasBudget
            );
            const digest = (res.result as { digest?: string })?.digest;
            // dapp-kit resolves once the transaction has executed.
            if (digest) ctx.onProgress?.({ stage: 'confirmed', hash: digest, explorerUrl: txExplorerUrl('sui', ctx.network, digest) });
            return { ...res, result: { ...(res.result as object), explorerUrl: digest ? txExplorerUrl('sui', ctx.network, digest) : undefined } };
        }
        case 'evm':
            return executeEvm(request.evmTxParams!, ctx.network, ctx.onProgress);
        case 'solana': {
            const p = request.solanaTxParams!;
            const start = performance.now();
            ctx.onProgress?.({ stage: 'awaiting-signature' });
            const { signature } = await sendSolanaTransaction({
                walletId: wallet.id,
                rpcUrl: resolveChainRpcUrl('solana', ctx.network),
                ...p
            });
            const explorerUrl = txExplorerUrl('solana', ctx.network, signature);
            ctx.onProgress?.({ stage: 'confirmed', hash: signature, explorerUrl });
            return { result: { signature, explorerUrl }, duration: Math.round(performance.now() - start), status: 200 };
        }
        case 'stellar':
            return executeStellar(request.stellarTxParams!, wallet, ctx.network, ctx.onProgress);
    }
};
