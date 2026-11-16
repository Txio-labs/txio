/**
 * Client for txio-compiler (txio-backend/compiler): compiles Move (Sui,
 * Aptos), Soroban, Solana and Cairo sources on a server that has the
 * toolchains. Solidity compiles in the browser instead (./solidity.ts).
 */
import type { ChainId } from '@/types';

export type RemoteCompileChain = Extract<ChainId, 'sui' | 'aptos' | 'stellar' | 'solana' | 'starknet'>;

/**
 * The compile service. Development falls back to a local txio-compiler; a
 * production build without NEXT_PUBLIC_COMPILER_URL has none, rather than
 * pointing every visitor's browser at their own localhost.
 */
export const COMPILER_URL: string | null =
    process.env.NEXT_PUBLIC_COMPILER_URL?.replace(/\/$/, '') ||
    (process.env.NODE_ENV === 'production' ? null : 'http://localhost:8090');

const NOT_CONFIGURED = 'Compiling isn’t available on this site yet.';

export interface SuiArtifact {
    modules: string[];
    dependencies: string[];
    digest?: number[];
}
export interface StellarArtifact {
    wasm: string;
}
export interface SolanaArtifact {
    program: string;
    programId: string;
}
export interface StarknetContractArtifact {
    name: string;
    sierra: Record<string, unknown>;
    casm: Record<string, unknown>;
}
export interface StarknetArtifact {
    contracts: StarknetContractArtifact[];
}
/** `aptos move build-publish-payload` output. */
export interface AptosArtifact {
    function_id: string;
    type_args: string[];
    args: { type: string; value: string | string[] }[];
}

export interface RemoteCompileResult<A = unknown> {
    ok: boolean;
    logs: string;
    artifact?: A;
}

export type ToolchainStatus = Partial<Record<RemoteCompileChain, { available: boolean; tool: string }>>;

export class CompilerUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CompilerUnavailableError';
    }
}

/** Which chains the compiler host can build. Throws CompilerUnavailableError when it is unreachable. */
export async function getToolchains(signal?: AbortSignal): Promise<ToolchainStatus> {
    if (!COMPILER_URL) throw new CompilerUnavailableError(NOT_CONFIGURED);
    let res: Response;
    try {
        res = await fetch(`${COMPILER_URL}/toolchains`, { signal });
    } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') throw err;
        throw new CompilerUnavailableError(`The compiler service at ${COMPILER_URL} is not reachable. Start txio-compiler or set NEXT_PUBLIC_COMPILER_URL.`);
    }
    if (!res.ok) throw new CompilerUnavailableError(`The compiler service answered ${res.status}.`);
    return ((await res.json()) as { chains: ToolchainStatus }).chains;
}

export async function compileRemote<A>(
    chain: RemoteCompileChain,
    body: { name: string; source: string; programId?: string; sender?: string },
    signal?: AbortSignal
): Promise<RemoteCompileResult<A>> {
    if (!COMPILER_URL) throw new CompilerUnavailableError(NOT_CONFIGURED);
    let res: Response;
    try {
        res = await fetch(`${COMPILER_URL}/compile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chain, name: body.name, source: body.source, program_id: body.programId, sender: body.sender }),
            signal
        });
    } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') throw err;
        throw new CompilerUnavailableError(`The compiler service at ${COMPILER_URL} is not reachable.`);
    }
    const data = (await res.json().catch(() => ({}))) as RemoteCompileResult<A> & { error?: string };
    if (!res.ok) throw new Error(data.error || `Compile request failed with status ${res.status}.`);
    return data;
}

export const base64ToBytes = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
