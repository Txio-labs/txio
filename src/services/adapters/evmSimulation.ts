import type { Hex } from 'viem';

/**
 * Optional, node-dependent enrichment of an EVM dry run. `eth_call` and
 * `eth_estimateGas` return no logs and no state diff, so richer data is only
 * requested from nodes that support `eth_simulateV1` (logs) or
 * `debug_traceCall` with the prestate tracer (state diff). Public RPCs often
 * reject both; that is expected and simply leaves those sections out.
 */

export interface EvmSimLog {
    address: string;
    topics: string[];
    data: string;
}

export interface EvmStateDiff {
    pre: Record<string, { balance?: string; nonce?: number; storage?: Record<string, string> }>;
    post: Record<string, { balance?: string; nonce?: number; storage?: Record<string, string> }>;
}

export interface EvmSimulationExtras {
    logs?: EvmSimLog[];
    stateDiff?: EvmStateDiff;
    /** Which node method produced the logs. */
    simulationSource?: string;
}

interface RequestClient {
    request(args: { method: string; params: unknown[] }): Promise<unknown>;
}

interface CallInput {
    from?: string;
    /** Absent for a contract deployment. */
    to?: string;
    data: Hex;
    value: bigint;
}

type MethodSupport = { simulateV1?: boolean; traceCall?: boolean };

/** Per-chain memory of which methods the configured node lacks, so unsupported ones are asked for once. */
const support = new Map<number, MethodSupport>();

/** Clears the capability cache (tests, or after the user changes RPC endpoint). */
export const resetEvmSimulationSupport = (): void => support.clear();

const TIMEOUT_MS = 8000;

const withTimeout = <T,>(promise: Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
        promise.then(
            (v) => {
                clearTimeout(timer);
                resolve(v);
            },
            (e) => {
                clearTimeout(timer);
                reject(e);
            }
        );
    });

/** True when the error says the node does not offer the method (as opposed to a transient failure). */
export const isMethodUnsupported = (error: unknown): boolean => {
    const e = error as { code?: number; message?: string; details?: string; cause?: { code?: number; message?: string } };
    const code = e?.code ?? e?.cause?.code;
    if (code === -32601) return true;
    const text = `${e?.message ?? ''} ${e?.details ?? ''} ${e?.cause?.message ?? ''}`.toLowerCase();
    return /method .*(not found|not supported|does not exist|not available|disabled|unsupported)|unsupported method|not whitelisted|is not available/.test(text);
};

const toHexQuantity = (v: bigint): string => `0x${v.toString(16)}`;

const callObject = (call: CallInput) => ({
    ...(call.from ? { from: call.from } : {}),
    ...(call.to ? { to: call.to } : {}),
    data: call.data,
    value: toHexQuantity(call.value)
});

const normalizeLogs = (raw: unknown): EvmSimLog[] | undefined => {
    if (!Array.isArray(raw)) return undefined;
    return raw
        .filter((l): l is { address: string; topics: string[]; data: string } => Boolean(l) && typeof (l as EvmSimLog).address === 'string' && Array.isArray((l as EvmSimLog).topics))
        .map((l) => ({ address: l.address, topics: l.topics, data: typeof l.data === 'string' ? l.data : '0x' }));
};

const tryLogs = async (client: RequestClient, chainId: number, call: CallInput): Promise<EvmSimLog[] | undefined> => {
    const cap = support.get(chainId) ?? {};
    if (cap.simulateV1 === false) return undefined;
    try {
        const result = (await withTimeout(
            client.request({
                method: 'eth_simulateV1',
                params: [
                    { blockStateCalls: [{ calls: [callObject(call)] }], traceTransfers: true, validation: false },
                    'latest'
                ]
            })
        )) as { calls?: { status?: string; logs?: unknown }[] }[];
        support.set(chainId, { ...cap, simulateV1: true });
        const first = result?.[0]?.calls?.[0];
        return first ? normalizeLogs(first.logs ?? []) : undefined;
    } catch (error) {
        if (isMethodUnsupported(error)) support.set(chainId, { ...cap, simulateV1: false });
        return undefined;
    }
};

const tryStateDiff = async (client: RequestClient, chainId: number, call: CallInput): Promise<EvmStateDiff | undefined> => {
    const cap = support.get(chainId) ?? {};
    if (cap.traceCall === false) return undefined;
    try {
        const result = (await withTimeout(
            client.request({
                method: 'debug_traceCall',
                params: [callObject(call), 'latest', { tracer: 'prestateTracer', tracerConfig: { diffMode: true } }]
            })
        )) as Partial<EvmStateDiff> | null;
        support.set(chainId, { ...(support.get(chainId) ?? cap), traceCall: true });
        if (!result || (typeof result.pre !== 'object' && typeof result.post !== 'object')) return undefined;
        return { pre: result.pre ?? {}, post: result.post ?? {} };
    } catch (error) {
        if (isMethodUnsupported(error)) support.set(chainId, { ...(support.get(chainId) ?? cap), traceCall: false });
        return undefined;
    }
};

/** Best-effort logs and state diff for a call that already simulated successfully. */
export const collectEvmSimulationExtras = async (
    client: RequestClient,
    chainId: number,
    call: CallInput
): Promise<EvmSimulationExtras> => {
    const [logs, stateDiff] = await Promise.all([tryLogs(client, chainId, call), tryStateDiff(client, chainId, call)]);
    return {
        ...(logs ? { logs, simulationSource: 'eth_simulateV1 logs' } : {}),
        ...(stateDiff ? { stateDiff } : {})
    };
};
