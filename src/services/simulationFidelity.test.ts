import { describe, it, expect, beforeEach } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { summarizeSimulation, withTxChain } from './transactionService';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { RequestItem, RequestType } from '../types';
import { computeSolanaBalanceDiff, type SolanaAccountSnapshot } from '@/wallet/solana';
import { extractSorobanTransfers, type SorobanEventLike } from './adapters/stellarAdapter';
import { collectEvmSimulationExtras, isMethodUnsupported, resetEvmSimulationSupport } from './adapters/evmSimulation';

const req = (chain: 'sui' | 'evm' | 'solana' | 'aptos' | 'stellar', extra: Partial<RequestItem> = {}): RequestItem =>
    withTxChain(
        {
            id: 't',
            name: 't',
            type: RequestType.TRANSACTION,
            rpcParams: { method: '', params: [] },
            moveParams: { ...DEFAULT_MOVE_CALL },
            ...extra
        },
        chain
    );

const ok = (result: unknown) => ({ status: 200, duration: 1, result });

describe('summarizeSimulation: hide what the chain does not report', () => {
    it('Solana without balanceDiff leaves balanceChanges undefined', () => {
        const summary = summarizeSimulation(req('solana'), ok({ err: null, logs: [], unitsConsumed: 1 }));
        expect(summary.balanceChanges).toBeUndefined();
    });

    it('Solana with balanceDiff formats SOL and token deltas per account', () => {
        const summary = summarizeSimulation(
            req('solana'),
            ok({
                err: null,
                logs: [],
                unitsConsumed: 1,
                balanceDiff: [
                    { account: 'Payer', asset: 'SOL', delta: '-1005000', decimals: 9 },
                    { account: 'Bob', asset: 'MintX', delta: '2500000', decimals: 6 },
                    { account: 'Carol', asset: 'MintY', delta: '7', decimals: null }
                ]
            })
        );
        expect(summary.balanceChanges).toEqual([
            { asset: 'SOL', amount: '0.001005', direction: 'out', account: 'Payer' },
            { asset: 'MintX', amount: '2.5', direction: 'in', account: 'Bob' },
            { asset: 'MintY', amount: '7', direction: 'in', account: 'Carol' }
        ]);
        expect(summary.sources.balanceChanges).toMatch(/simulated account states/);
    });

    it('Solana reported-but-empty diff is [] (reported), not undefined', () => {
        const summary = summarizeSimulation(req('solana'), ok({ err: null, logs: [], unitsConsumed: 1, balanceDiff: [] }));
        expect(summary.balanceChanges).toEqual([]);
    });

    it('Aptos derives balances only from framework coin events', () => {
        const withEvents = summarizeSimulation(
            req('aptos'),
            ok({
                success: true,
                gas_used: '10',
                gas_unit_price: '100',
                events: [
                    { type: '0x1::coin::CoinWithdraw', data: { account: '0xa', amount: '150000000', coin_type: '0x1::aptos_coin::AptosCoin' } },
                    { type: '0x1::coin::CoinDeposit', data: { account: '0xb', amount: '150000000', coin_type: '0x1::aptos_coin::AptosCoin' } },
                    { type: '0x1::coin::CoinWithdraw', data: { account: '0xa', amount: '5', coin_type: '0xabc::x::Y' } }
                ]
            })
        );
        expect(withEvents.balanceChanges).toEqual([
            { asset: 'APT', amount: '1.5', direction: 'out', account: '0xa' },
            { asset: 'APT', amount: '1.5', direction: 'in', account: '0xb' },
            { asset: '0xabc::x::Y', amount: '5', direction: 'out', account: '0xa' }
        ]);

        const noEvents = summarizeSimulation(req('aptos'), ok({ success: true, gas_used: '10', gas_unit_price: '100', events: [] }));
        expect(noEvents.balanceChanges).toBeUndefined();
    });

    it('Stellar shows transfers involving the source account and hides otherwise', () => {
        const shown = summarizeSimulation(
            req('stellar'),
            ok({
                minResourceFee: '1000',
                source: 'GSRC',
                transfers: [
                    { contract: 'CTOKEN', from: 'GSRC', to: 'GDST', amount: '250' },
                    { contract: 'CTOKEN', from: 'GOTHER', to: 'GDST', amount: '9' }
                ]
            })
        );
        expect(shown.balanceChanges).toEqual([{ asset: 'CTOKEN', amount: '250', direction: 'out' }]);

        const hidden = summarizeSimulation(req('stellar'), ok({ minResourceFee: '1000', source: 'GSRC' }));
        expect(hidden.balanceChanges).toBeUndefined();
    });

    it('EVM: no logs and no state diff yields no such sections', () => {
        const summary = summarizeSimulation(
            req('evm', { evmTxParams: { chainId: 1, to: '0x0000000000000000000000000000000000000001', value: '0', functionSignature: '', args: [], data: '0x' } }),
            ok({ from: '0xabc', gasEstimate: '21000' })
        );
        expect(summary.balanceChanges).toBeUndefined();
        expect(summary.stateDiff).toBeUndefined();
        expect(summary.events).toEqual([]);
        expect(summary.sources.events).toBeUndefined();
    });

    it('EVM: state diff gives exact native deltas; declared value is only a fallback', () => {
        const evmTxParams = { chainId: 1, to: '0x0000000000000000000000000000000000000001', value: '1', functionSignature: '', args: [], data: '0x' };
        const withDiff = summarizeSimulation(
            req('evm', { evmTxParams }),
            ok({
                from: '0xabc',
                gasEstimate: '21000',
                stateDiff: {
                    pre: { '0xabc': { balance: '0xde0b6b3a7640000', nonce: 1 }, '0xdef': { balance: '0x0' } },
                    post: { '0xabc': { balance: '0x0', nonce: 2 }, '0xdef': { balance: '0xde0b6b3a7640000' } }
                }
            })
        );
        expect(withDiff.balanceChanges).toEqual([
            { asset: 'ETH', amount: '1', direction: 'out', account: '0xabc' },
            { asset: 'ETH', amount: '1', direction: 'in', account: '0xdef' }
        ]);
        expect(withDiff.stateDiff).toContain('0xabc nonce 1 → 2');

        const declaredOnly = summarizeSimulation(req('evm', { evmTxParams }), ok({ from: '0xabc' }));
        expect(declaredOnly.balanceChanges).toEqual([{ asset: 'ETH', amount: '1', direction: 'out' }]);
        expect(declaredOnly.sources.balanceChanges).toMatch(/not a simulation output/);
    });

    it('EVM: ERC-20 Transfer logs involving the sender become token changes', () => {
        const from = '0x7a16ff8270133f063aab6c9977183d9e72835428';
        const pad = (a: string) => `0x${'0'.repeat(24)}${a.slice(2)}`;
        const summary = summarizeSimulation(
            req('evm', { evmTxParams: { chainId: 1, to: '0x0000000000000000000000000000000000000001', value: '0', functionSignature: '', args: [], data: '0x' } }),
            ok({
                from,
                logs: [
                    {
                        address: '0xTOKEN',
                        topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', pad(from), pad('0x000000000000000000000000000000000000dead')],
                        data: '0x64'
                    },
                    { address: '0xNFT', topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', pad(from), pad('0x01'), '0x01'], data: '0x' }
                ]
            })
        );
        expect(summary.balanceChanges).toEqual([{ asset: '0xTOKEN', amount: '100', direction: 'out' }]);
        expect(summary.events).toHaveLength(2);
    });
});

describe('computeSolanaBalanceDiff', () => {
    const OWNER = new PublicKey(new Uint8Array(32).fill(7)).toBase58();
    const MINT = new PublicKey(new Uint8Array(32).fill(9)).toBase58();
    const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

    const tokenAccount = (amount: bigint): SolanaAccountSnapshot => {
        const data = new Uint8Array(165);
        data.set(new Uint8Array(32).fill(9), 0);
        data.set(new Uint8Array(32).fill(7), 32);
        new DataView(data.buffer).setBigUint64(64, amount, true);
        return { lamports: 2039280, owner: TOKEN_PROGRAM, data };
    };
    const system = (lamports: number): SolanaAccountSnapshot => ({ lamports, owner: '11111111111111111111111111111111', data: new Uint8Array() });

    it('diffs lamports and SPL token amounts, skipping unchanged and missing accounts', () => {
        const diff = computeSolanaBalanceDiff(
            ['payer', 'ata', 'same', 'created'],
            [system(1_000_000), tokenAccount(100n), system(5), null],
            [system(994_000), tokenAccount(350n), system(5), system(10)],
            { [MINT]: 6 }
        );
        expect(diff).toEqual([
            { account: 'payer', asset: 'SOL', delta: '-6000', decimals: 9 },
            { account: OWNER, asset: MINT, delta: '250', decimals: 6 }
        ]);
    });
});

describe('extractSorobanTransfers', () => {
    const event = (type: string, topics: unknown[], data: unknown, contractId: Uint8Array | null = new Uint8Array([1])): SorobanEventLike => ({
        event: () => ({
            type: () => ({ name: type }),
            contractId: () => contractId,
            body: () => ({ v0: () => ({ topics: () => topics, data: () => data }) })
        })
    });
    const native = (v: unknown) => v;
    const id = () => 'CCONTRACT';

    it('reads SEP-41 transfers, including a Stellar Asset Contract asset topic and map-shaped data', () => {
        const transfers = extractSorobanTransfers(
            [
                event('contract', ['transfer', 'GA', 'GB', 'USDC:GISSUER'], 500n),
                event('contract', ['transfer', 'GA', 'GB'], { amount: 7n, to_muxed_id: 1n }),
                event('contract', ['mint', 'GA', 'GB'], 1n),
                event('system', ['transfer', 'GA', 'GB'], 1n),
                event('contract', ['transfer', 'GA'], 1n)
            ],
            native,
            id
        );
        expect(transfers).toEqual([
            { contract: 'CCONTRACT', from: 'GA', to: 'GB', amount: '500', asset: 'USDC:GISSUER' },
            { contract: 'CCONTRACT', from: 'GA', to: 'GB', amount: '7' }
        ]);
    });

    it('ignores events it cannot read instead of throwing', () => {
        const broken: SorobanEventLike = { event: () => { throw new Error('bad xdr'); } };
        expect(extractSorobanTransfers([broken], native, id)).toEqual([]);
    });
});

describe('EVM simulation capability detection', () => {
    beforeEach(() => resetEvmSimulationSupport());
    const call = { from: '0xabc', to: '0xdef', data: '0x' as const, value: 0n };

    it('treats method-not-found as unsupported and asks only once per chain', async () => {
        const calls: string[] = [];
        const client = {
            request: async ({ method }: { method: string }) => {
                calls.push(method);
                throw Object.assign(new Error('the method eth_simulateV1 does not exist/is not available'), { code: -32601 });
            }
        };
        expect(await collectEvmSimulationExtras(client, 1, call)).toEqual({});
        expect(await collectEvmSimulationExtras(client, 1, call)).toEqual({});
        expect(calls.sort()).toEqual(['debug_traceCall', 'eth_simulateV1']);
    });

    it('does not remember transient failures as unsupported', async () => {
        let attempts = 0;
        const client = {
            request: async () => {
                attempts++;
                throw new Error('rate limited');
            }
        };
        await collectEvmSimulationExtras(client, 5, call);
        await collectEvmSimulationExtras(client, 5, call);
        expect(attempts).toBe(4);
    });

    it('returns logs and a state diff when the node supports both', async () => {
        const client = {
            request: async ({ method }: { method: string }) =>
                method === 'eth_simulateV1'
                    ? [{ calls: [{ status: '0x1', logs: [{ address: '0xT', topics: ['0x1'], data: '0x' }] }] }]
                    : { pre: { '0xabc': { balance: '0x2' } }, post: { '0xabc': { balance: '0x1' } } }
        };
        const extras = await collectEvmSimulationExtras(client, 9, call);
        expect(extras.logs).toEqual([{ address: '0xT', topics: ['0x1'], data: '0x' }]);
        expect(extras.stateDiff?.post['0xabc'].balance).toBe('0x1');
    });

    it('classifies unsupported-method errors', () => {
        expect(isMethodUnsupported({ code: -32601 })).toBe(true);
        expect(isMethodUnsupported(new Error('Method debug_traceCall not found'))).toBe(true);
        expect(isMethodUnsupported(new Error('execution reverted'))).toBe(false);
    });
});
