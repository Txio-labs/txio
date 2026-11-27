import { describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ nonceBlock: '' as unknown, simulateBlock: '' as unknown, nonceUsed: '' as unknown }));

vi.mock('starknet', () => ({
    RpcProvider: class {
        async getNonceForAddress(_address: string, block: unknown) {
            calls.nonceBlock = block;
            return '0x7';
        }
        async getSimulateTransaction(txs: { nonce: string }[], opts: { blockIdentifier: unknown }) {
            calls.simulateBlock = opts.blockIdentifier;
            calls.nonceUsed = txs[0].nonce;
            return { simulated_transactions: [{ transaction_trace: { execute_invocation: {} } }] };
        }
    },
    TransactionType: { INVOKE: 'INVOKE' },
    transaction: { getExecuteCalldata: () => ['0x0'] },
}));

import { simulateStarknetCalls, STARKNET_SIMULATION_BLOCK } from './starknet';

describe('simulateStarknetCalls', () => {
    it('reads the nonce and simulates on the same pre-confirmed state', async () => {
        await simulateStarknetCalls('testnet', '0x1', []);
        expect(STARKNET_SIMULATION_BLOCK).toBe('pre_confirmed');
        expect(calls.nonceBlock).toBe('pre_confirmed');
        expect(calls.simulateBlock).toBe('pre_confirmed');
        expect(calls.nonceUsed).toBe('0x7');
    });
});
