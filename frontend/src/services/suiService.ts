
import { resolveRpcUrl } from '@/lib/appConfig';
import { appStore } from '@/lib/store';
import {
  Network,
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

export const executeSuiRpc = async (
  network: Network,
  method: string,
  params: any[]
): Promise<{ result: any; duration: number; status: number }> => {
  const url = getActiveSuiRpcUrl(network);
  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      RPC_TIMEOUT_MS
    );
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data: SuiRpcResponse = await response.json();
    const duration = Math.round(
      performance.now() - startTime
    );

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
          endpoint: url,
          duration,
        }
      );
    }

    throw new SuiRpcError(
      error instanceof Error &&
        error.message.trim()
        ? error.message
        : 'Unable to reach the configured Sui RPC endpoint.',
      {
        status: 0,
        endpoint: url,
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

export const simulateMoveCall = async (
  network: Network,
  sender: string,
  packageId: string,
  module: string,
  func: string,
  typeArgs: string[],
  args: BuilderArg[]
) => {
    // Convert BuilderArgs to raw arguments for simulation/inspection
    // For simulation, we can often pass pure values as is, and object IDs as strings
    const rawArgs = args.map(arg => {
        if (arg.type === 'u64' || arg.type === 'u128' || arg.type === 'u256') {
            return arg.value; // Passed as string to avoid precision loss
        }
        if (arg.type === 'u8' || arg.type === 'u16' || arg.type === 'u32') {
            return parseInt(arg.value);
        }
        if (arg.type === 'bool') {
            return arg.value === 'true';
        }
        // Address, String, Object ID, etc.
        return arg.value;
    });

    const method = 'sui_devInspectTransactionBlock';
    const params = [
        sender,
        {
            kind: 'moveCall',
            target: `${packageId}::${module}::${func}`,
            typeArguments: typeArgs,
            arguments: rawArgs
        },
        null, 
        null
    ];
    
    return executeSuiRpc(network, method, params);
};

export const getOwnedObjects = async (network: Network, address: string) => {
    return executeSuiRpc(network, 'suix_getOwnedObjects', [
        address,
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
    return executeSuiRpc(network, 'suix_getBalance', [
        owner,
        '0x2::sui::SUI'
    ]);
};
