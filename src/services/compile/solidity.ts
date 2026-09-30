/**
 * Solidity compilation in the browser (solc-js in a Web Worker). The compiler
 * is a static asset served from this app's own origin; source code never
 * leaves the browser. Only Solidity/EVM is compiled here: Sui Move, Solana and
 * Soroban need native toolchains, so this module says nothing about them.
 */

export interface CompileDiagnostic {
    severity: 'error' | 'warning' | 'info';
    message: string;
    /** 1-based; absent when the compiler gave no location. */
    line?: number;
    column?: number;
    /** The compiler's own multi-line rendering, with the source excerpt. */
    formatted: string;
}

export interface CompiledContract {
    name: string;
    abi: unknown[];
    /** Creation bytecode, 0x-prefixed. */
    bytecode: `0x${string}`;
    /** Size of the deployed (runtime) code in bytes, for the 24 KB limit check. */
    runtimeSize: number;
    hasConstructorArgs: boolean;
}

export interface CompileResult {
    ok: boolean;
    contracts: CompiledContract[];
    diagnostics: CompileDiagnostic[];
    compilerVersion: string;
}

export const SOLC_VERSION = '0.8.28';
/** EIP-170 limit on deployed contract code. */
export const MAX_RUNTIME_BYTES = 24_576;

export const buildStandardInput = (fileName: string, source: string) => ({
    language: 'Solidity',
    sources: { [fileName]: { content: source } },
    settings: {
        optimizer: { enabled: true, runs: 200 },
        outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } }
    }
});

/** 1-based line and column of a character offset. */
export const offsetToLineColumn = (source: string, offset: number): { line: number; column: number } => {
    const clamped = Math.max(0, Math.min(offset, source.length));
    let line = 1;
    let lastBreak = -1;
    for (let i = 0; i < clamped; i++) {
        if (source.charCodeAt(i) === 10) {
            line++;
            lastBreak = i;
        }
    }
    return { line, column: clamped - lastBreak };
};

interface SolcError {
    severity?: string;
    message?: string;
    formattedMessage?: string;
    sourceLocation?: { file?: string; start?: number; end?: number };
}

interface SolcOutput {
    errors?: SolcError[];
    contracts?: Record<string, Record<string, { abi?: unknown[]; evm?: { bytecode?: { object?: string }; deployedBytecode?: { object?: string } } }>>;
}

export const parseCompileOutput = (source: string, output: SolcOutput): CompileResult => {
    const diagnostics: CompileDiagnostic[] = (output.errors ?? []).map((e) => {
        const start = e.sourceLocation?.start;
        const where = typeof start === 'number' && start >= 0 ? offsetToLineColumn(source, start) : {};
        return {
            severity: e.severity === 'error' ? 'error' : e.severity === 'warning' ? 'warning' : 'info',
            message: e.message ?? e.formattedMessage ?? 'Compiler message',
            formatted: e.formattedMessage ?? e.message ?? '',
            ...where
        };
    });

    const contracts: CompiledContract[] = [];
    for (const perFile of Object.values(output.contracts ?? {})) {
        for (const [name, artifact] of Object.entries(perFile)) {
            const creation = artifact.evm?.bytecode?.object ?? '';
            // Interfaces and abstract contracts compile to no bytecode; they cannot be deployed.
            if (!creation) continue;
            const abi = artifact.abi ?? [];
            contracts.push({
                name,
                abi,
                bytecode: `0x${creation}`,
                runtimeSize: Math.floor((artifact.evm?.deployedBytecode?.object ?? '').length / 2),
                hasConstructorArgs: abi.some((item) => (item as { type?: string; inputs?: unknown[] }).type === 'constructor' && ((item as { inputs?: unknown[] }).inputs?.length ?? 0) > 0)
            });
        }
    }

    return {
        ok: !diagnostics.some((d) => d.severity === 'error'),
        contracts,
        diagnostics,
        compilerVersion: SOLC_VERSION
    };
};

export interface WorkerLike {
    postMessage(message: unknown): void;
    terminate(): void;
    onmessage: ((event: { data: unknown }) => void) | null;
    onerror: ((event: { message?: string }) => void) | null;
}

type WorkerMessage =
    | { id: number; type: 'log'; line: string }
    | { id: number; type: 'result'; output: SolcOutput }
    | { id: number; type: 'error'; message: string };

let nextId = 1;

/**
 * Compiles one Solidity file. `onLog` receives progress lines as they happen.
 * A new worker is used per call and terminated afterwards, so a runaway
 * compile is cancelled by `signal` without leaving the page stuck.
 */
export const compileSolidity = (
    fileName: string,
    source: string,
    options: {
        onLog?: (line: string) => void;
        signal?: AbortSignal;
        createWorker?: () => WorkerLike;
        timeoutMs?: number;
    } = {}
): Promise<CompileResult> =>
    new Promise((resolve, reject) => {
        const worker =
            options.createWorker?.() ??
            (new Worker('/workers/solc-worker.js') as unknown as WorkerLike);
        const id = nextId++;
        let settled = false;

        const finish = (action: () => void) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            worker.terminate();
            action();
        };

        const timer = setTimeout(
            () => finish(() => reject(new Error('The compiler took too long and was stopped.'))),
            options.timeoutMs ?? 120_000
        );

        options.signal?.addEventListener('abort', () => finish(() => reject(new DOMException('Compilation cancelled.', 'AbortError'))));

        worker.onmessage = (event) => {
            const message = event.data as WorkerMessage;
            if (message.id !== id) return;
            if (message.type === 'log') options.onLog?.(message.line);
            else if (message.type === 'error') finish(() => reject(new Error(message.message)));
            else finish(() => resolve(parseCompileOutput(source, message.output)));
        };
        worker.onerror = (event) => finish(() => reject(new Error(event.message || 'The compiler worker failed.')));

        options.onLog?.(`Compiling ${fileName}`);
        worker.postMessage({ id, input: buildStandardInput(fileName, source) });
    });
