import { describe, it, expect } from 'vitest';
import {
    toCliCollection, buildReport, clampConcurrency, errorCodeFor, planCells, reportExitCode, reportToMarkdown, runCells,
    type CellOutcome, type PlannedCell
} from './collectionRun';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { Assertion, RequestItem, RequestType, ChainId } from '../types';

const req = (id: string, chain: ChainId = 'sui'): RequestItem => ({
    id, name: `req-${id}`, type: RequestType.RPC, rpcParams: { method: 'm', params: [], chain }, moveParams: { ...DEFAULT_MOVE_CALL }
});
const pass: CellOutcome = { durationMs: 5, httpStatus: 200, assertions: [{ id: '1', category: 'status', target: 'status', operator: 'equals', expected: '200', actual: '200', passed: true, message: '' } as never] };

describe('planCells', () => {
    it('is request-major, network-minor, and runs EVM once', () => {
        const cells = planCells([req('a'), req('b', 'evm')], ['mainnet', 'testnet']);
        expect(cells.map((c) => `${c.request.id}@${c.network}${c.skipReason ? '!' : ''}`)).toEqual(['a@mainnet', 'a@testnet', 'b@mainnet', 'b@testnet!']);
    });
    it('one network reproduces the classic run', () => {
        expect(planCells([req('a'), req('b')], ['mainnet'])).toHaveLength(2);
    });
});

describe('runCells', () => {
    const cells = () => planCells([req('a'), req('b'), req('c'), req('d')], ['mainnet']);

    it('sequential never overlaps', async () => {
        let inFlight = 0, peak = 0;
        await runCells(cells(), async () => {
            peak = Math.max(peak, ++inFlight);
            await new Promise((r) => setTimeout(r, 5));
            inFlight--;
            return pass;
        }, { mode: 'sequential', concurrency: 8 });
        expect(peak).toBe(1);
    });

    it('parallel respects the concurrency cap and returns results in plan order', async () => {
        let inFlight = 0, peak = 0;
        const order: string[] = [];
        const results = await runCells(cells(), async (cell) => {
            peak = Math.max(peak, ++inFlight);
            await new Promise((r) => setTimeout(r, cell.request.id === 'a' ? 20 : 2));
            order.push(cell.request.id);
            inFlight--;
            return pass;
        }, { mode: 'parallel', concurrency: 2 });
        expect(peak).toBe(2);
        expect(order[0]).not.toBe('a');
        expect(results.map((r) => r?.requestId)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('classifies pass, fail (assertion), error (request) and turns thrown errors into -32002', async () => {
        const outcomes: CellOutcome[] = [
            pass,
            { durationMs: 1, assertions: [{ id: '2', category: 'status', target: 'x', operator: 'equals', expected: '1', actual: '2', passed: false, message: 'nope' } as never] },
            { durationMs: 1, assertions: [], error: { code: -32000, message: 'down' } }
        ];
        let i = 0;
        const results = await runCells(planCells([req('a'), req('b'), req('c'), req('d')], ['mainnet']), async () => {
            if (i === 3) throw new Error('boom');
            return outcomes[i++];
        }, { mode: 'sequential', concurrency: 1 });
        expect(results.map((r) => r?.status)).toEqual(['pass', 'fail', 'error', 'error']);
        expect(results[3]?.error?.code).toBe(-32002);
    });

    it('stops starting cells after abort but keeps finished ones', async () => {
        let abort = false;
        const results = await runCells(cells(), async () => { abort = true; return pass; }, { mode: 'sequential', concurrency: 1 }, { shouldAbort: () => abort });
        expect(results.filter(Boolean)).toHaveLength(1);
    });

    it('reports skipped cells without executing them', async () => {
        let calls = 0;
        const results = await runCells(planCells([req('e', 'evm')], ['mainnet', 'testnet']), async () => { calls++; return pass; }, { mode: 'sequential', concurrency: 1 });
        expect(calls).toBe(1);
        expect(results[1]?.status).toBe('skipped');
        expect(results[1]?.skipReason).toMatch(/chain id/);
    });
});

describe('report', () => {
    const build = async () => {
        const planned: PlannedCell[] = planCells([req('a'), req('b')], ['mainnet', 'testnet']);
        const results = await runCells(planned, async (c) => c.request.id === 'b' && c.network === 'testnet'
            ? { durationMs: 3, assertions: [], error: { code: -32000, message: 'Sui RPC | unreachable' } }
            : pass, { mode: 'parallel', concurrency: 3 });
        return buildReport({ startedAt: new Date('2026-01-01T00:00:00Z'), finishedAt: new Date('2026-01-01T00:00:01Z'), config: { mode: 'parallel', concurrency: 3, networks: ['mainnet', 'testnet'] }, collection: { name: 'smoke' }, results });
    };

    it('totals, schema and exit code', async () => {
        const report = await build();
        expect(report.schema).toBe('txio.run/v1');
        expect(report.totals).toEqual({ pass: 3, fail: 0, error: 1, skipped: 0, cells: 4 });
        expect(reportExitCode(report)).toBe(1);
        expect(JSON.parse(JSON.stringify(report)).results[3].error.code).toBe(-32000);
    });

    it('markdown lists failures first and escapes table pipes', async () => {
        const md = reportToMarkdown(await build());
        expect(md.indexOf('## Failures')).toBeLessThan(md.indexOf('## All cells'));
        expect(md).toContain('Error -32000: Sui RPC | unreachable');
        expect(md).toContain('Sui RPC \\| unreachable');
        expect(md).toContain('Dry runs only');
    });

    it('a clean run exits 0', async () => {
        const results = await runCells(planCells([req('a')], ['mainnet']), async () => pass, { mode: 'sequential', concurrency: 1 });
        expect(reportExitCode(buildReport({ startedAt: new Date(), finishedAt: new Date(), config: { mode: 'sequential', concurrency: 1, networks: ['mainnet'] }, collection: { name: 'c' }, results }))).toBe(0);
    });
});

describe('helpers', () => {
    it('clamps concurrency', () => {
        expect(clampConcurrency(1)).toBe(2);
        expect(clampConcurrency(99)).toBe(8);
        expect(clampConcurrency(Number.NaN)).toBe(4);
    });
    it('maps errors to JSON-RPC style codes', () => {
        expect(errorCodeFor({ code: -32001 })).toBe(-32001);
        expect(errorCodeFor({ status: 0 })).toBe(-32000);
        expect(errorCodeFor({ status: 503 })).toBe(-32000);
        expect(errorCodeFor(new TypeError('Failed to fetch'))).toBe(-32000);
        expect(errorCodeFor(new Error('x'))).toBe(-32002);
    });
});

describe('toCliCollection', () => {
    const tx = (id: string, chain: ChainId, extra: Partial<RequestItem>): RequestItem => ({
        ...req(id, chain), type: RequestType.TRANSACTION, name: `tx-${id}`, ...extra
    });
    const test = (a: Partial<Assertion>): Assertion => ({ id: 'x', category: 'transaction', target: 'tx_status', operator: 'equals', value: 'success', enabled: true, ...a });

    it('exports RPC calls with their checks and maps chains to CLI names', () => {
        const rpc = {
            ...req('r', 'evm'), name: 'gas', rpcParams: { method: 'eth_gasPrice', params: [], chain: 'evm' as ChainId },
            tests: [test({ category: 'response', target: 'json_path', value: 'n::7' }), test({ category: 'response', target: 'http_status', value: '200' })]
        };
        const { file, skipped, dropped } = toCliCollection('Smoke', [rpc, { ...req('empty'), rpcParams: { method: '', params: [], chain: 'sui' as ChainId } }]);
        expect(file).toEqual({ name: 'Smoke', requests: [{ name: 'gas', chain: 'eth', method: 'eth_gasPrice', params: [], expect: [{ path: 'n', equals: 7 }] }] });
        expect(skipped).toEqual(['req-empty: no RPC method']);
        expect(dropped).toEqual(['gas: http_status equals 200']);
    });

    it('exports EVM, Aptos and Solana transactions as simulate cells', () => {
        const evm = tx('e', 'evm', {
            evmTxParams: { chainId: 11155111, to: '0xTo', value: '0', functionSignature: 'transfer(address,uint256)', args: ['0xB', '1.5'], argDecimals: [null, 6], data: '' },
            tests: [test({}), test({ target: 'gas_used', operator: 'less_than', value: '50000' })]
        });
        const aptos = tx('a', 'aptos', {
            aptosTxParams: { moduleAddress: '0x1', module: 'aptos_account', function: 'transfer', typeArguments: [], arguments: [{ id: '1', type: 'address', value: '0xB' }, { id: '2', type: 'u64', value: '10' }], maxGasAmount: '5000' },
            tests: [
                test({ target: 'balance_change', value: '0x1::coin::T@0xB::-0.5' }),
                test({ target: 'balance_change', value: 'APT@0xC::0' }),
                test({ category: 'event', target: 'event_type', operator: 'contains', value: 'CoinDeposit' }),
                test({ target: 'balance_change', operator: 'less_than', value: 'APT@0xB::0' })
            ]
        });
        const solana = tx('s', 'solana', {
            solanaTxParams: { programId: 'Prog', accounts: [{ id: '1', pubkey: 'Acc', isSigner: true, isWritable: true }, { id: '2', pubkey: 'Ro', isSigner: false, isWritable: false }], data: 'hi', dataEncoding: 'utf8' }
        });
        const { file, skipped, dropped } = toCliCollection('Tx', [evm, aptos, solana], { aptos: '0xSender', solana: 'Payer' });
        expect(skipped).toEqual([]);
        expect(file.requests).toEqual([
            { name: 'tx-e', chain: 'eth', kind: 'simulate', tx: { to: '0xTo', sig: 'transfer(address,uint256)', args: ['0xB', '1500000'] },
              expect: [{ status: 'success' }, { gasUsed: { lte: '49999' } }] },
            { name: 'tx-a', chain: 'aptos', kind: 'simulate',
              tx: { function: '0x1::aptos_account::transfer', sender: '0xSender', args: ['address:0xB', 'u64:10'], maxGas: 5000 },
              expect: [
                  { balanceChange: { account: '0xB', asset: '0x1::coin::T', direction: 'out', amount: { eq: '0.5' } } },
                  { balanceChange: { account: '0xC', asset: 'APT', direction: 'none' } },
                  { event: 'CoinDeposit' }
              ] },
            { name: 'tx-s', chain: 'solana', kind: 'simulate', tx: { program: 'Prog', accounts: ['Acc:s:w', 'Ro'], payer: 'Payer', data: 'utf8:hi' } }
        ]);
        expect(dropped).toEqual(['tx-a: balance_change less_than APT@0xB::0']);
    });

    it('names each transaction it cannot export, with the reason', () => {
        const { file, skipped } = toCliCollection('Tx', [
            tx('sui', 'sui', {}),
            tx('base', 'evm', { evmTxParams: { chainId: 8453, to: '0x1', value: '', functionSignature: '', args: [], data: '' } }),
            tx('nosender', 'aptos', { aptosTxParams: { moduleAddress: '0x1', module: 'm', function: 'f', typeArguments: [], arguments: [] } }),
            tx('deploy', 'evm', { evmTxParams: { chainId: 1, to: '', value: '', functionSignature: '', args: [], data: '0x60', deploy: true } })
        ]);
        expect(file.requests).toEqual([]);
        expect(skipped).toEqual([
            'tx-sui: the CLI cannot simulate Sui transactions yet',
            'tx-base: the CLI targets Ethereum mainnet or Sepolia only (chain 8453)',
            'tx-nosender: link an Aptos wallet: the CLI needs a sender account',
            'tx-deploy: contract deployment is not available in the CLI'
        ]);
    });
});
