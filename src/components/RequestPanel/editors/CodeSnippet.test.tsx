import { describe, it, expect } from 'vitest';
import { buildSnippet } from './CodeSnippet';
import { RequestType, type RequestItem } from '../../../types';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';

const base = (over: Partial<RequestItem>): RequestItem => ({
    id: 'r',
    name: 'r',
    type: RequestType.RPC,
    rpcParams: { method: '', params: [] },
    moveParams: { ...DEFAULT_MOVE_CALL },
    ...over
} as RequestItem);

describe('buildSnippet', () => {
    it('generates a REST curl for Aptos reads instead of crashing', () => {
        const s = buildSnippet(base({ rpcParams: { method: 'getAccount', params: ['0x1'], chain: 'aptos' } }), 'mainnet');
        expect(s).toBe("curl 'https://fullnode.mainnet.aptoslabs.com/v1/accounts/0x1'");
    });

    it('unwraps Soroban params into a single object', () => {
        const s = buildSnippet(base({ rpcParams: { method: 'getTransaction', params: [{ hash: 'abc' }], chain: 'stellar' } }), 'testnet');
        expect(s).toContain('"params": {\n    "hash": "abc"\n  }');
    });

    it('emits a chain-native command per transaction chain, never sui for EVM', () => {
        const evm = buildSnippet(
            base({
                type: RequestType.TRANSACTION,
                rpcParams: { method: '', params: [], chain: 'evm' },
                evmTxParams: { chainId: 1, to: '0xabc', value: '', functionSignature: 'transfer(address,uint256)', args: ['0xdef', '5'], data: '' }
            }),
            'mainnet'
        );
        expect(evm).toMatch(/^cast send 0xabc 'transfer\(address,uint256\)' '0xdef' '5'/);
        expect(evm).not.toContain('sui client');

        const aptos = buildSnippet(
            base({
                type: RequestType.TRANSACTION,
                rpcParams: { method: '', params: [], chain: 'aptos' },
                aptosTxParams: { moduleAddress: '0x1', module: 'coin', function: 'transfer', typeArguments: ['0x1::aptos_coin::AptosCoin'], arguments: [{ id: 'a', type: 'address', value: '0x2' }, { id: 'b', type: 'u64', value: '10' }] }
            }),
            'testnet'
        );
        expect(aptos).toContain('--function-id 0x1::coin::transfer');
        expect(aptos).toContain("--args 'address:0x2' 'u64:10'");
    });
});
