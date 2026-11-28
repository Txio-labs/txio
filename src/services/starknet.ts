/**
 * Shared Starknet helpers: RPC provider, contract ABI lookup, calldata
 * compilation, simulation and explorer links. The transaction adapter, the
 * discovery adapter, the wallet balance hook and the history source all use
 * these, so Starknet-specific encoding rules live in one place.
 *
 * starknet.js is loaded lazily, like the other chain SDKs, so it never lands
 * in the first-load bundle.
 */
import type { Network, StarknetCall } from '@/types';
import { resolveChainCustomRpcUrl } from '@/lib/appConfig';
import { appStore } from '@/lib/store';

/** Starknet chain ids, hex-encoded short strings ("SN_MAIN", "SN_SEPOLIA"). */
export const STARKNET_CHAIN_IDS = {
    mainnet: '0x534e5f4d41494e',
    sepolia: '0x534e5f5345504f4c4941'
} as const;

/** STRK fee token. The same address on mainnet and Sepolia. */
export const STRK_TOKEN_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
export const STRK_DECIMALS = 18;

/** Starknet has no public devnet: devnet and testnet both mean Sepolia, like the RPC defaults. */
export const starknetChainIdFor = (network: Network): string =>
    network === 'mainnet' ? STARKNET_CHAIN_IDS.mainnet : STARKNET_CHAIN_IDS.sepolia;

export const starknetNetworkForChainId = (chainId: string): 'mainnet' | 'testnet' | null => {
    const id = chainId.toLowerCase();
    if (id === STARKNET_CHAIN_IDS.mainnet) return 'mainnet';
    if (id === STARKNET_CHAIN_IDS.sepolia) return 'testnet';
    return null;
};

const ADDRESS_RE = /^0x[0-9a-fA-F]{1,64}$/;
const FELT_MAX = (1n << 251n) + 17n * (1n << 192n); // Starknet field prime

export const isStarknetAddress = (value: string): boolean => {
    const v = value.trim();
    return ADDRESS_RE.test(v) && BigInt(v) < FELT_MAX;
};

/** Accepts a decimal or 0x-hex felt. Returns the 0x form, or null when it is not a valid felt. */
export const toFelt = (value: string): string | null => {
    const v = value.trim();
    if (!/^(0x[0-9a-fA-F]+|\d+)$/.test(v)) return null;
    const n = BigInt(v);
    return n < FELT_MAX ? `0x${n.toString(16)}` : null;
};

export const loadStarknet = () => import('starknet');

export const starknetRpcUrl = (network: Network): string =>
    resolveChainCustomRpcUrl('starknet', network, appStore.getSnapshot().settings);

export const getStarknetProvider = async (network: Network) => {
    const { RpcProvider } = await loadStarknet();
    return new RpcProvider({ nodeUrl: starknetRpcUrl(network) });
};

export const starknetExplorerHost = (network: Network): string | undefined => {
    if (network === 'localnet') return undefined;
    return network === 'mainnet' ? 'https://voyager.online' : 'https://sepolia.voyager.online';
};

export const starknetTxExplorerUrl = (network: Network, txHash: string): string | undefined => {
    const host = starknetExplorerHost(network);
    return host ? `${host}/tx/${txHash}` : undefined;
};

export const starknetAccountExplorerUrl = (network: Network, address: string): string | undefined => {
    const host = starknetExplorerHost(network);
    return host ? `${host}/contract/${address}` : undefined;
};

// ---------------------------------------------------------------------------
// ABI lookup
// ---------------------------------------------------------------------------

export type StarknetAbi = ReadonlyArray<Record<string, unknown>>;

const abiCache = new Map<string, Promise<StarknetAbi>>();

/**
 * The ABI of the class deployed at `address`. Cairo 0 classes return the ABI
 * as an array; Sierra (Cairo 1+) classes return it as a JSON string. Cached
 * per network+address; a failed lookup is evicted so it can be retried.
 */
export const getStarknetAbi = (network: Network, address: string): Promise<StarknetAbi> => {
    const key = `${starknetRpcUrl(network)}|${BigInt(address.trim()).toString(16)}`;
    const cached = abiCache.get(key);
    if (cached) return cached;
    const pending = (async () => {
        const provider = await getStarknetProvider(network);
        const cls = (await provider.getClassAt(address.trim())) as { abi?: unknown };
        const abi = typeof cls.abi === 'string' ? JSON.parse(cls.abi) : cls.abi;
        if (!Array.isArray(abi)) throw new Error('This contract has no ABI.');
        return abi as StarknetAbi;
    })();
    abiCache.set(key, pending);
    pending.catch(() => abiCache.delete(key));
    return pending;
};

export interface StarknetAbiFunction {
    name: string;
    inputs: { name: string; type: string }[];
    outputs: { type: string }[];
    stateMutability: 'view' | 'external';
    /** The interface (Cairo 1) the function belongs to, or "" for top-level functions. */
    interfaceName: string;
}

/** Flattens Cairo 0 top-level functions and Cairo 1 interface functions into one list. */
export const listAbiFunctions = (abi: StarknetAbi): StarknetAbiFunction[] => {
    const out: StarknetAbiFunction[] = [];
    const add = (item: Record<string, unknown>, interfaceName: string) => {
        if (item.type !== 'function') return;
        const mutability = item.state_mutability === 'view' || item.stateMutability === 'view' ? 'view' : 'external';
        out.push({
            name: String(item.name),
            inputs: ((item.inputs as { name: string; type: string }[]) ?? []).map((i) => ({ name: i.name, type: i.type })),
            outputs: ((item.outputs as { type: string }[]) ?? []).map((o) => ({ type: o.type })),
            stateMutability: mutability,
            interfaceName
        });
    };
    for (const item of abi) {
        if (item.type === 'interface' && Array.isArray(item.items)) {
            for (const inner of item.items as Record<string, unknown>[]) add(inner, String(item.name ?? ''));
        } else {
            add(item, '');
        }
    }
    return out;
};

/** Short display form of a Cairo type: "core::integer::u256" → "u256". */
export const shortCairoType = (type: string): string => type.replace(/\b(?:[a-z_][a-z0-9_]*::)+/g, '');

// ---------------------------------------------------------------------------
// Calldata
// ---------------------------------------------------------------------------

/**
 * Turns one typed argument into the value starknet.js's ABI encoder expects:
 * JSON for arrays/structs/tuples/enums, true/false for bool, text otherwise
 * (numbers, addresses, short strings and ByteArrays are all passed as text).
 */
export const parseStarknetArg = (raw: string, type: string): unknown => {
    const value = raw.trim();
    const short = shortCairoType(type);
    if (short === 'bool') {
        if (value !== 'true' && value !== 'false') throw new Error(`"${raw}" must be true or false.`);
        return value === 'true';
    }
    if (short === 'ByteArray') return raw;
    if (value.startsWith('[') || value.startsWith('{')) {
        try {
            return JSON.parse(value);
        } catch {
            throw new Error(`"${raw}" is not valid JSON for ${short}.`);
        }
    }
    return value;
};

/** Validates a call's shape without network access. Returns a user-facing problem or null. */
export const checkStarknetCall = (call: StarknetCall, index: number, total: number): string | null => {
    const label = total > 1 ? `Call ${index + 1}: ` : '';
    if (!isStarknetAddress(call.contractAddress)) return `${label}enter a contract address (0x followed by up to 64 hex digits).`;
    if (!call.entrypoint.trim()) return `${label}choose a function.`;
    if (call.rawCalldata) {
        const bad = call.args.find((a) => toFelt(a) === null);
        if (bad !== undefined) return `${label}"${bad}" is not a felt. Raw calldata takes decimal or 0x-hex numbers.`;
    }
    return null;
};

/**
 * Compiles a call's arguments to felts. Raw calls pass through as felts; ABI
 * calls are encoded against the contract's on-chain ABI through Cairo
 * Studio's value layer (services/cairo), which checks argument count, types
 * and ranges and names the failing argument.
 */
export const compileStarknetCall = async (
    network: Network,
    call: StarknetCall
): Promise<{ contractAddress: string; entrypoint: string; calldata: string[] }> => {
    const contractAddress = call.contractAddress.trim();
    const entrypoint = call.entrypoint.trim();
    if (call.rawCalldata) {
        return { contractAddress, entrypoint, calldata: call.args.map((a) => toFelt(a) as string) };
    }
    // Imported here: services/cairo/contract imports this module.
    const [{ parseAbiInput, encodeCall }, { callableFunctions }, rawAbi] = await Promise.all([
        import('./cairo/contract'),
        import('./cairo/abi'),
        getStarknetAbi(network, contractAddress),
    ]);
    const abi = await parseAbiInput(rawAbi as unknown[]);
    const fn = callableFunctions(abi).find((f) => f.name === entrypoint);
    if (!fn) throw new Error(`The contract at ${contractAddress} has no function "${entrypoint}".`);
    if (call.args.length !== fn.inputs.length) {
        throw new Error(`"${entrypoint}" takes ${fn.inputs.length} argument${fn.inputs.length === 1 ? '' : 's'}, got ${call.args.length}.`);
    }
    return { contractAddress, entrypoint, calldata: await encodeCall(abi, fn, call.args) };
};

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

/** Nonce and simulation read the same block, the one the next transaction will run on. */
export const STARKNET_SIMULATION_BLOCK = 'pre_confirmed' as const;

const ZERO_BOUNDS = {
    l1_gas: { max_amount: 0n, max_price_per_unit: 0n },
    l2_gas: { max_amount: 0n, max_price_per_unit: 0n },
    l1_data_gas: { max_amount: 0n, max_price_per_unit: 0n }
};

/**
 * Runs the calls from `sender` against the pre-confirmed state without a
 * signature. SKIP_VALIDATE drops the account's signature check and
 * SKIP_FEE_CHARGE drops the balance check, so zero resource bounds are
 * accepted. The trace still carries the real fee estimate and any revert
 * reason.
 *
 * The node checks the nonce against pre-confirmed state (it answers "Invalid
 * transaction nonce ... Account nonce: N; got: N-k" otherwise), so an account
 * with a transaction still in the pre-confirmed block needs the pre-confirmed
 * nonce. That is also the state the real transaction will run on.
 */
export const simulateStarknetCalls = async (
    network: Network,
    sender: string,
    calls: { contractAddress: string; entrypoint: string; calldata: string[] }[]
) => {
    const { transaction, TransactionType } = await loadStarknet();
    const provider = await getStarknetProvider(network);
    const nonce = await provider.getNonceForAddress(sender, STARKNET_SIMULATION_BLOCK);
    const { simulated_transactions: [simulated] } = await provider.getSimulateTransaction(
        [
            {
                type: TransactionType.INVOKE,
                contractAddress: sender,
                calldata: transaction.getExecuteCalldata(calls, '1'),
                signature: [],
                nonce,
                version: 3,
                resourceBounds: ZERO_BOUNDS,
                tip: 0n,
                paymasterData: [],
                accountDeploymentData: [],
                nonceDataAvailabilityMode: 'L1',
                feeDataAvailabilityMode: 'L1'
            } as never
        ],
        { blockIdentifier: STARKNET_SIMULATION_BLOCK, skipValidate: true, skipFeeCharge: true }
    );
    return simulated;
};

/** The revert reason in a simulation trace, or null when execution succeeded. */
export const starknetRevertReason = (simulated: unknown): string | null => {
    const trace = (simulated as { transaction_trace?: { execute_invocation?: { revert_reason?: string } } })?.transaction_trace;
    return trace?.execute_invocation?.revert_reason ?? null;
};

/** STRK balance of `address`, in fri (10^-18 STRK). */
export const getStrkBalance = async (network: Network, address: string): Promise<bigint> => {
    const provider = await getStarknetProvider(network);
    const result = await provider.callContract({
        contractAddress: STRK_TOKEN_ADDRESS,
        entrypoint: 'balanceOf',
        calldata: [address]
    });
    const [low = '0x0', high = '0x0'] = result;
    return BigInt(low) + (BigInt(high) << 128n);
};
