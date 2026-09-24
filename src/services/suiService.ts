
import { resolveChainCustomRpcUrl, resolveChainRpcUrlList, resolveRpcUrl, resolveRpcUrlList } from '@/lib/appConfig';
import { appStore } from '@/lib/store';
import { getEvmChain, STELLAR_HORIZON_URLS } from '@/lib/constants';
import {
  Network,
  ChainId,
  SuiRpcResponse,
  BuilderArg,
  RPCHealthMetric,
} from '../types';

const RPC_TIMEOUT_MS = 10000;
const DEGRADED_RPC_LATENCY_MS = 1500;

export class SuiRpcError extends Error {
  status: number;
  endpoint: string;
  duration: number;

  constructor(
    message: string,
    {
      status,
      endpoint,
      duration,
    }: {
      status: number;
      endpoint: string;
      duration: number;
    }
  ) {
    super(message);
    this.name = 'SuiRpcError';
    this.status = status;
    this.endpoint = endpoint;
    this.duration = duration;
    Object.setPrototypeOf(this, SuiRpcError.prototype);
  }
}

export const getActiveSuiRpcUrl = (
  network: Network
) =>
  resolveRpcUrl(
    network,
    appStore.getSnapshot().settings
  );

export const resolveChainRpcUrl = (
  chain: ChainId,
  network: Network,
  evmChainId?: number
): string => {
  if (chain !== 'sui' && chain !== 'evm' && chain !== 'stellar' && chain !== 'solana') {
    throw new Error(`No RPC endpoint configuration exists for chain "${chain}" yet.`);
  }

  // A specific EVM mainnet (e.g. Base, Arbitrum) overrides the generic
  // network-tier EVM default — these are distinct chains, not
  // mainnet/testnet variants of "the" EVM chain.
  if (chain === 'evm' && evmChainId) {
    return getEvmChain(evmChainId).rpcUrl;
  }

  return resolveChainCustomRpcUrl(chain, network, appStore.getSnapshot().settings);
};

/** Every endpoint to try, in priority order, for the given chain+network — used for failover. */
export const resolveChainRpcUrls = (
  chain: ChainId,
  network: Network,
  evmChainId?: number
): string[] => {
  if (chain !== 'sui' && chain !== 'evm' && chain !== 'stellar' && chain !== 'solana') {
    throw new Error(`No RPC endpoint configuration exists for chain "${chain}" yet.`);
  }

  if (chain === 'evm' && evmChainId) {
    return [getEvmChain(evmChainId).rpcUrl];
  }

  return resolveChainRpcUrlList(chain, network, appStore.getSnapshot().settings);
};

/**
 * POSTs a JSON-RPC request to each endpoint in order, moving to the next
 * only on a network-level failure (timeout, DNS, connection refused) — not
 * on an RPC-level error response, since that's a real answer from a healthy
 * node and retrying elsewhere won't change it. This is the "automatic
 * failover across providers" primitive every chain's RPC call now goes
 * through, whether the endpoint list has one entry (the common case) or
 * several (once a user configures backup endpoints in Settings).
 */
const postJsonRpcWithFailover = async (
  endpoints: string[],
  body: Record<string, unknown>
): Promise<{ response: Response; data: any; duration: number; url: string }> => {
  let lastNetworkError: unknown = null;
  let lastUrl = endpoints[0];

  for (const url of endpoints) {
    lastUrl = url;
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      const duration = Math.round(performance.now() - startTime);

      return { response, data, duration, url };
    } catch (error) {
      // AbortError (timeout) and network-level failures (fetch throws
      // before a response exists) both mean this endpoint is unusable —
      // fall through to the next one. A response that parsed but carried
      // an HTTP or RPC error is handled by the caller, not retried here.
      lastNetworkError = error;
    }
  }

  throw lastNetworkError;
};

/**
 * Fetches a Stellar account's balances from Horizon (REST, not JSON-RPC).
 * Returns the full account resource — including every asset balance, not
 * just native XLM — so users can inspect trustlines the same way `eth_call`
 * or `suix_getAllBalances` return a full structured result.
 */
const getStellarBalanceViaHorizon = async (
  network: Network,
  address: unknown
): Promise<{ result: any; duration: number; status: number }> => {
  const startTime = performance.now();
  const horizonUrl = STELLAR_HORIZON_URLS[network];

  if (!horizonUrl) {
    throw new SuiRpcError(
      `Horizon (balance lookups) has no public endpoint for the "${network}" network. Use mainnet or testnet.`,
      { status: 0, endpoint: '', duration: 0 }
    );
  }

  if (typeof address !== 'string' || !address.trim()) {
    throw new SuiRpcError(
      'getBalance requires a Stellar address as its first parameter.',
      { status: 0, endpoint: horizonUrl, duration: 0 }
    );
  }

  const url = `${horizonUrl}/accounts/${address.trim()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const duration = Math.round(performance.now() - startTime);
    const data = await response.json();

    if (response.status === 404) {
      // The account doesn't exist on-ledger yet — Stellar accounts only
      // appear once they receive the minimum XLM reserve. This is a valid,
      // successful lookup (the answer is "unfunded"), not a request
      // failure — report status 200 so History/the response panel don't
      // flag it as an error alongside genuinely failed requests.
      return {
        result: { account_id: address.trim(), balances: [], funded: false },
        duration,
        status: 200,
      };
    }

    if (!response.ok) {
      const message =
        typeof data?.detail === 'string' && data.detail
          ? data.detail
          : `Horizon request failed with status ${response.status}.`;
      throw new SuiRpcError(message, { status: response.status, endpoint: url, duration });
    }

    return {
      result: { ...data, funded: true },
      duration,
      status: response.status,
    };
  } catch (error: any) {
    const duration = Math.round(performance.now() - startTime);

    if (error instanceof SuiRpcError) {
      throw error;
    }

    if (error?.name === 'AbortError') {
      throw new SuiRpcError(`Horizon request timed out after ${RPC_TIMEOUT_MS / 1000}s.`, {
        status: 504,
        endpoint: url,
        duration,
      });
    }

    throw new SuiRpcError(
      error instanceof Error && error.message.trim()
        ? error.message
        : 'Unable to reach Horizon.',
      { status: 0, endpoint: url, duration }
    );
  }
};

/** Generic JSON-RPC fetch used for all chains. */
export const executeChainRpc = async (
  chain: ChainId,
  network: Network,
  method: string,
  params: any[],
  evmChainId?: number
): Promise<{ result: any; duration: number; status: number }> => {
  if (chain === 'sui') {
    return executeSuiRpc(network, method, params);
  }

  // "getBalance" isn't a real Soroban RPC method — Soroban RPC has no way to
  // read a plain account balance. Route it to Horizon's REST API instead,
  // the same service the connected-wallet balance display already uses
  // (see fetchStellarBalance in wallet/stellar.ts).
  if (chain === 'stellar' && method === 'getBalance') {
    return getStellarBalanceViaHorizon(network, params[0]);
  }

  const endpoints = resolveChainRpcUrls(chain, network, evmChainId);
  const primaryUrl = endpoints[0];
  const startTime = performance.now();

  // Soroban RPC (Stellar) takes a single params OBJECT per call, not a
  // positional array like Sui/EVM. Templates store that one object as the
  // sole array element; unwrap it here before building the request body.
  const requestParams = chain === 'stellar' ? (params[0] ?? {}) : params;

  try {
    const { response, data, duration, url } = await postJsonRpcWithFailover(endpoints, {
      jsonrpc: '2.0',
      id: 1,
      method,
      params: requestParams,
    });

    if (!response.ok) {
      const message =
        typeof data.error?.message === 'string' && data.error.message
          ? data.error.message
          : `RPC request failed with status ${response.status}.`;
      throw new SuiRpcError(message, {
        status: response.status,
        endpoint: url,
        duration,
      });
    }

    if (data.error) {
      const message =
        typeof data.error.message === 'string' && data.error.message
          ? data.error.message
          : `${chain.toUpperCase()} RPC returned an error.`;
      throw new SuiRpcError(message, {
        status: response.status || 500,
        endpoint: url,
        duration,
      });
    }

    return {
      result: data.result,
      duration,
      status: response.status,
    };
  } catch (error: any) {
    const duration = Math.round(
      performance.now() - startTime
    );

    if (error instanceof SuiRpcError) {
      throw error;
    }

    if (error?.name === 'AbortError') {
      throw new SuiRpcError(
        `RPC request timed out after ${RPC_TIMEOUT_MS / 1000}s.`,
        { status: 504, endpoint: primaryUrl, duration }
      );
    }

    throw new SuiRpcError(
      error instanceof Error && error.message.trim()
        ? error.message
        : `Unable to reach any configured ${chain.toUpperCase()} RPC endpoint (tried ${endpoints.length}).`,
      { status: 0, endpoint: primaryUrl, duration }
    );
  }
};

/** Chain-aware health check: pings a lightweight method per chain. */
export const getChainRpcHealth = async (
  chain: ChainId,
  network: Network,
  evmChainId?: number
): Promise<RPCHealthMetric> => {
  if (chain === 'sui') {
    return getSuiRpcHealth(network);
  }

  const url = resolveChainRpcUrl(chain, network, evmChainId);
  const method = chain === 'evm' ? 'eth_blockNumber' : 'getHealth';
  const params: any[] = chain === 'evm' ? [] : [];

  try {
    const { result, duration } =
      await executeChainRpc(chain, network, method, params, evmChainId);
    return {
      endpoint: url,
      latency: [duration],
      successRate: 1,
      status: duration >= DEGRADED_RPC_LATENCY_MS ? 'degraded' : 'healthy',
      blockHeight: typeof result === 'string' ? parseInt(result, 16) || 0 : Number(result) || 0,
    };
  } catch (error) {
    const rpcError = error instanceof SuiRpcError ? error : null;
    return {
      endpoint: url,
      latency: [rpcError?.duration ?? RPC_TIMEOUT_MS],
      successRate: 0,
      status: rpcError?.status === 504 ? 'degraded' : 'down',
      blockHeight: 0,
    };
  }
};

export const executeSuiRpc = async (
  network: Network,
  method: string,
  params: any[]
): Promise<{ result: any; duration: number; status: number }> => {
  const endpoints = resolveRpcUrlList(network, appStore.getSnapshot().settings);
  const primaryUrl = endpoints[0];
  const startTime = performance.now();

  try {
    const { response, data: rawData, duration, url } = await postJsonRpcWithFailover(endpoints, {
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    });
    const data: SuiRpcResponse = rawData;

    if (!response.ok) {
      const message =
        typeof data.error?.message ===
          'string' && data.error.message
          ? data.error.message
          : `RPC request failed with status ${response.status}.`;

      throw new SuiRpcError(message, {
        status: response.status,
        endpoint: url,
        duration,
      });
    }

    if (data.error) {
      const message =
        typeof data.error.message ===
          'string' && data.error.message
          ? data.error.message
          : 'Sui RPC returned an error.';

      throw new SuiRpcError(message, {
        status: response.status || 500,
        endpoint: url,
        duration,
      });
    }

    return {
      result: data.result,
      duration,
      status: response.status,
    };
  } catch (error: any) {
    const duration = Math.round(
      performance.now() - startTime
    );

    if (error instanceof SuiRpcError) {
      throw error;
    }

    if (error?.name === 'AbortError') {
      throw new SuiRpcError(
        `RPC request timed out after ${RPC_TIMEOUT_MS / 1000}s.`,
        {
          status: 504,
          endpoint: primaryUrl,
          duration,
        }
      );
    }

    throw new SuiRpcError(
      error instanceof Error &&
        error.message.trim()
        ? error.message
        : `Unable to reach any configured Sui RPC endpoint (tried ${endpoints.length}).`,
      {
        status: 0,
        endpoint: primaryUrl,
        duration,
      }
    );
  }
};

export const getSuiRpcHealth =
  async (
    network: Network
  ): Promise<RPCHealthMetric> => {
    const endpoint =
      getActiveSuiRpcUrl(network);

    try {
      const { result, duration } =
        await executeSuiRpc(
          network,
          'sui_getLatestCheckpointSequenceNumber',
          []
        );

      const blockHeight =
        Number.parseInt(
          String(result),
          10
        ) || 0;

      return {
        endpoint,
        latency: [duration],
        successRate: 1,
        status:
          duration >=
          DEGRADED_RPC_LATENCY_MS
            ? 'degraded'
            : 'healthy',
        blockHeight,
      };
    } catch (error) {
      const rpcError =
        error instanceof SuiRpcError
          ? error
          : null;

      return {
        endpoint,
        latency: [
          rpcError?.duration ??
            RPC_TIMEOUT_MS,
        ],
        successRate: 0,
        status:
          rpcError?.status === 504
            ? 'degraded'
            : 'down',
        blockHeight: 0,
      };
    }
  };

// ─── SuiNS resolution ────────────────────────────────────────────────────
// Sui RPC methods that take an "owner" expect a 0x-prefixed hex address.
// These helpers let callers pass either a raw address or a SuiNS name
// like `aliphatic.sui` and auto-resolve through `suix_resolveNameServiceAddress`.

const SUI_ADDRESS_RE = /^0x[0-9a-fA-F]{1,64}$/;
const SUI_NS_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.sui$/i;

export const looksLikeSuiAddress = (value: string): boolean =>
    SUI_ADDRESS_RE.test(value.trim());

export const looksLikeSuiNs = (value: string): boolean =>
    SUI_NS_RE.test(value.trim());

const SUI_NS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type SuiNsCacheEntry = { address: string; expiresAt: number };

const suiNsCache = new Map<string, SuiNsCacheEntry>();
const cacheKey = (network: Network, name: string) => `${network}:${name.trim().toLowerCase()}`;


/**
 * Resolve a Sui address or SuiNS name to a raw 0x address.
 * Returns the input unchanged if it already looks like an address.
 * Throws SuiRpcError if the name cannot be resolved.
 */
export const resolveSuiAddress = async (
    network: Network,
    input: string,
): Promise<string> => {
    const value = input.trim();
    if (looksLikeSuiAddress(value)) return value;
    if (!looksLikeSuiNs(value)) {
        // Pass through unchanged — let the underlying RPC reject if invalid.
        return value;
    }

    const key = cacheKey(network, value);
    const cached = suiNsCache.get(key);
    if (cached) {
        if (cached.expiresAt > Date.now()) {
            return cached.address;
        }

        suiNsCache.delete(key);
    }

    const { result } = await executeSuiRpc(network, 'suix_resolveNameServiceAddress', [value]);
    if (typeof result !== 'string' || !looksLikeSuiAddress(result)) {
        throw new SuiRpcError(`Could not resolve ${value}`, {
            status: 200,
            endpoint: getActiveSuiRpcUrl(network),
            duration: 0,
        });
    }

    suiNsCache.set(key, { address: result, expiresAt: Date.now() + SUI_NS_CACHE_TTL_MS });
    return result;
};

/**
 * Builds a single Move call as a Sui Transaction with typed arguments.
 * Shared by simulation (devInspect) and wallet execution so both run the
 * exact same transaction.
 */
export const buildMoveCallTransaction = async (
  packageId: string,
  module: string,
  func: string,
  typeArgs: string[],
  args: BuilderArg[],
  gasBudget?: string
) => {
    const { Transaction } = await import('@mysten/sui/transactions');
    const txb = new Transaction();

    const txArgs = args.map(arg => {
        switch (arg.type) {
            case 'u8':
                return txb.pure.u8(parseInt(arg.value, 10));
            case 'u16':
                return txb.pure.u16(parseInt(arg.value, 10));
            case 'u32':
                return txb.pure.u32(parseInt(arg.value, 10));
            case 'u64':
                return txb.pure.u64(arg.value); // Passed as string to avoid precision loss
            case 'u128':
                return txb.pure.u128(arg.value);
            case 'u256':
                return txb.pure.u256(arg.value);
            case 'bool':
                return txb.pure.bool(arg.value === 'true');
            case 'address':
                return txb.pure.address(arg.value);
            case 'object':
                return txb.object(arg.value);
            case 'vector<u8>':
                return txb.pure.vector('u8', arg.value.split(',').map(v => parseInt(v.trim(), 10)));
            case 'vector<address>':
                return txb.pure.vector('address', arg.value.split(',').map(v => v.trim()));
            default:
                return txb.pure.string(arg.value);
        }
    });

    txb.moveCall({
        target: `${packageId}::${module}::${func}`,
        typeArguments: typeArgs,
        arguments: txArgs
    });

    if (gasBudget && /^\d+$/.test(gasBudget.trim()) && BigInt(gasBudget.trim()) > BigInt(0)) {
        txb.setGasBudget(BigInt(gasBudget.trim()));
    }

    return txb;
};

/**
 * Runs the Move call through `devInspectTransactionBlock`: executes it
 * against current chain state without signing or committing anything.
 * Any sender works, so this runs even with no wallet connected.
 */
export const simulateMoveCall = async (
  network: Network,
  sender: string,
  packageId: string,
  module: string,
  func: string,
  typeArgs: string[],
  args: BuilderArg[]
) => {
    const resolvedSender = await resolveSuiAddress(network, sender);
    const txb = await buildMoveCallTransaction(packageId, module, func, typeArgs, args);
    const endpoint = getActiveSuiRpcUrl(network);
    const { SuiJsonRpcClient } = await import('@mysten/sui/jsonRpc');
    const client = new SuiJsonRpcClient({ url: endpoint, network });

    const startTime = performance.now();
    try {
        const result = await client.devInspectTransactionBlock({
            sender: resolvedSender,
            transactionBlock: txb
        });
        const duration = Math.round(performance.now() - startTime);
        const failed = result.effects?.status?.status === 'failure';
        return { result, duration, status: failed ? 400 : 200 };
    } catch (error) {
        throw new SuiRpcError(
            error instanceof Error && error.message.trim()
                ? error.message
                : 'Move call simulation failed.',
            { status: 500, endpoint, duration: Math.round(performance.now() - startTime) }
        );
    }
};

export const getOwnedObjects = async (network: Network, address: string) => {
    const resolved = await resolveSuiAddress(network, address);
    return executeSuiRpc(network, 'suix_getOwnedObjects', [
        resolved,
        { options: { showType: true, showContent: true, showDisplay: true } }
    ]);
};

export const getObject = async (network: Network, objectId: string) => {
    return executeSuiRpc(network, 'sui_getObject', [
        objectId,
        { showType: true, showContent: true, showOwner: true }
    ]);
};

export const getBalance = async (network: Network, owner: string) => {
    const resolved = await resolveSuiAddress(network, owner);
    return executeSuiRpc(network, 'suix_getBalance', [
        resolved,
        '0x2::sui::SUI'
    ]);
};

export const signAndExecuteMoveCall = async (
  network: Network,
  sender: string,
  packageId: string,
  module: string,
  func: string,
  typeArgs: string[],
  args: BuilderArg[],
  signAndExecuteTransaction: (transactionBlock: any) => Promise<any>,
  gasBudget?: string
) => {
    const resolvedSender = await resolveSuiAddress(network, sender);
    const txb = await buildMoveCallTransaction(packageId, module, func, typeArgs, args, gasBudget);
    txb.setSender(resolvedSender);

    try {
        // Name the chain explicitly so the wallet signs for the app's
        // network, not whichever one it happens to be switched to.
        const result = await signAndExecuteTransaction({ transaction: txb, chain: `sui:${network}` });
        return {
            result: {
                digest: result.digest,
                transaction: result.transaction,
                effects: result.effects,
                confirmed: true,
                executed: true
            },
            duration: 0,
            status: 200
        };
    } catch (error: any) {
        throw new SuiRpcError(
            error instanceof Error && error.message.trim()
                ? error.message
                : 'Transaction signing or execution failed.',
            {
                status: 500,
                endpoint: getActiveSuiRpcUrl(network),
                duration: 0,
            }
        );
    }
};
