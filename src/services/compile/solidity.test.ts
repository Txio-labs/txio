import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
    buildStandardInput, compileSolidity, offsetToLineColumn, parseCompileOutput, MAX_RUNTIME_BYTES, type WorkerLike
} from './solidity';

/** Runs the real compiler (soljson.js) under the same message protocol as the browser worker. */
const realCompilerWorker = (): WorkerLike => {
    let ready: Promise<(input: string) => string> | null = null;
    const load = () =>
        (ready ??= new Promise((resolve) => {
            const ctx: Record<string, unknown> = { console, setTimeout, WebAssembly, TextDecoder, TextEncoder, URL, performance };
            ctx.Module = {
                onRuntimeInitialized() {
                    const compile = (ctx.Module as { cwrap: (...a: unknown[]) => (i: string, a: number, b: number) => string }).cwrap(
                        'solidity_compile', 'string', ['string', 'number', 'number']
                    );
                    resolve((input: string) => compile(input, 0, 0));
                }
            };
            ctx.self = ctx;
            ctx.globalThis = ctx;
            vm.createContext(ctx);
            vm.runInContext(readFileSync('node_modules/solc/soljson.js', 'utf8'), ctx);
        }));
    const worker: WorkerLike = {
        onmessage: null,
        onerror: null,
        terminate() {},
        postMessage(message) {
            const { id, input } = message as { id: number; input: unknown };
            void load().then((compile) => {
                worker.onmessage?.({ data: { id, type: 'log', line: 'Compiler ready' } });
                worker.onmessage?.({ data: { id, type: 'result', output: JSON.parse(compile(JSON.stringify(input))) } });
            });
        }
    };
    return worker;
};

const TOKEN = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract Box {
    uint256 public value;
    constructor(uint256 initial) { value = initial; }
    function set(uint256 v) external { value = v; }
}
interface IThing { function f() external; }
`;

describe('offsetToLineColumn', () => {
    it('is 1-based and handles line breaks', () => {
        expect(offsetToLineColumn('abc\ndef', 0)).toEqual({ line: 1, column: 1 });
        expect(offsetToLineColumn('abc\ndef', 4)).toEqual({ line: 2, column: 1 });
        expect(offsetToLineColumn('abc\ndef', 6)).toEqual({ line: 2, column: 3 });
        expect(offsetToLineColumn('abc', 999)).toEqual({ line: 1, column: 4 });
    });
});

describe('parseCompileOutput', () => {
    it('separates errors from warnings and locates them', () => {
        const source = 'line1\nbad';
        const result = parseCompileOutput(source, {
            errors: [
                { severity: 'error', message: 'Expected ;', formattedMessage: 'ParserError: Expected ;', sourceLocation: { file: 'A.sol', start: 6, end: 9 } },
                { severity: 'warning', message: 'unused', sourceLocation: { file: 'A.sol', start: -1, end: -1 } }
            ]
        });
        expect(result.ok).toBe(false);
        expect(result.diagnostics[0]).toMatchObject({ severity: 'error', line: 2, column: 1 });
        expect(result.diagnostics[1]).toMatchObject({ severity: 'warning' });
        expect(result.diagnostics[1].line).toBeUndefined();
    });

    it('skips contracts with no bytecode (interfaces) and reports constructor args', () => {
        const result = parseCompileOutput('', {
            contracts: {
                'A.sol': {
                    Real: { abi: [{ type: 'constructor', inputs: [{ name: 'x', type: 'uint256' }] }], evm: { bytecode: { object: '6080' }, deployedBytecode: { object: '60' } } },
                    IFace: { abi: [], evm: { bytecode: { object: '' } } }
                }
            }
        });
        expect(result.contracts.map((c) => c.name)).toEqual(['Real']);
        expect(result.contracts[0]).toMatchObject({ bytecode: '0x6080', runtimeSize: 1, hasConstructorArgs: true });
        expect(MAX_RUNTIME_BYTES).toBe(24576);
    });
});

describe('compileSolidity with the real compiler', () => {
    it('compiles valid source into deployable artifacts', async () => {
        const logs: string[] = [];
        const result = await compileSolidity('Box.sol', TOKEN, { createWorker: realCompilerWorker, onLog: (l) => logs.push(l) });
        expect(result.ok).toBe(true);
        expect(result.contracts.map((c) => c.name)).toEqual(['Box']);
        const box = result.contracts[0];
        expect(box.bytecode.startsWith('0x6080')).toBe(true);
        expect(box.hasConstructorArgs).toBe(true);
        expect(box.runtimeSize).toBeGreaterThan(50);
        expect(logs[0]).toBe('Compiling Box.sol');
        expect(logs).toContain('Compiler ready');
    }, 60_000);

    it('reports a syntax error with its line and no artifacts', async () => {
        const result = await compileSolidity('Bad.sol', 'pragma solidity ^0.8.20;\ncontract A {\n  uint x = ;\n}\n', { createWorker: realCompilerWorker });
        expect(result.ok).toBe(false);
        expect(result.contracts).toEqual([]);
        const error = result.diagnostics.find((d) => d.severity === 'error')!;
        expect(error.line).toBe(3);
        expect(error.formatted).toContain('ParserError');
    }, 60_000);
});

describe('compileSolidity plumbing', () => {
    it('cancels through the abort signal and terminates the worker', async () => {
        const terminate = vi.fn();
        const worker: WorkerLike = { onmessage: null, onerror: null, terminate, postMessage() {} };
        const controller = new AbortController();
        const pending = compileSolidity('A.sol', 'x', { createWorker: () => worker, signal: controller.signal });
        controller.abort();
        await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
        expect(terminate).toHaveBeenCalled();
    });

    it('times out a compile that never answers', async () => {
        const terminate = vi.fn();
        const worker: WorkerLike = { onmessage: null, onerror: null, terminate, postMessage() {} };
        await expect(compileSolidity('A.sol', 'x', { createWorker: () => worker, timeoutMs: 10 })).rejects.toThrow(/too long/);
        expect(terminate).toHaveBeenCalled();
    });

    it('surfaces a worker that failed to start the compiler', async () => {
        const worker: WorkerLike = {
            onmessage: null, onerror: null, terminate() {},
            postMessage(m) { const { id } = m as { id: number }; queueMicrotask(() => worker.onmessage?.({ data: { id, type: 'error', message: 'Could not load the compiler' } })); }
        };
        await expect(compileSolidity('A.sol', 'x', { createWorker: () => worker })).rejects.toThrow('Could not load the compiler');
    });

    it('asks for optimized output with abi and both bytecodes', () => {
        const input = buildStandardInput('A.sol', 'src');
        expect(input.sources['A.sol'].content).toBe('src');
        expect(input.settings.outputSelection['*']['*']).toEqual(['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object']);
    });
});
