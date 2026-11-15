import { describe, expect, it } from 'vitest';
import { checkStarknetCall, compileStarknetCall, isStarknetAddress, listAbiFunctions, parseStarknetArg, shortCairoType, starknetChainIdFor, toFelt } from './starknet';
import { starknetAdapter } from './adapters/starknetAdapter';
import { RequestType, type RequestItem, type StarknetCall } from '@/types';
import { EVM_CHAINS as RPC_EVM_CHAINS } from '@/lib/constants';
import { wagmiConfig } from '@/wallet/config';

const call = (over: Partial<StarknetCall> = {}): StarknetCall => ({
    id: '1',
    contractAddress: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    entrypoint: 'transfer',
    args: [],
    ...over
});

describe('starknet helpers', () => {
    it('validates addresses against the field prime', () => {
        expect(isStarknetAddress('0x1')).toBe(true);
        expect(isStarknetAddress('0x' + 'f'.repeat(64))).toBe(false);
        expect(isStarknetAddress('hello')).toBe(false);
    });

    it('normalizes felts from decimal or hex', () => {
        expect(toFelt('255')).toBe('0xff');
        expect(toFelt('0xFF')).toBe('0xff');
        expect(toFelt('abc')).toBeNull();
    });

    it('maps networks to chain ids, with devnet on Sepolia', () => {
        expect(starknetChainIdFor('mainnet')).toBe('0x534e5f4d41494e');
        expect(starknetChainIdFor('devnet')).toBe('0x534e5f5345504f4c4941');
    });

    it('shortens Cairo paths and parses typed args', () => {
        expect(shortCairoType('core::integer::u256')).toBe('u256');
        expect(shortCairoType('core::array::Span::<core::felt252>')).toBe('Span::<felt252>');
        expect(parseStarknetArg('true', 'core::bool')).toBe(true);
        expect(parseStarknetArg('[1,2]', 'core::array::Array::<core::felt252>')).toEqual([1, 2]);
        expect(() => parseStarknetArg('yes', 'core::bool')).toThrow(/true or false/);
    });

    it('lists functions from Cairo 1 interfaces and top-level items', () => {
        const fns = listAbiFunctions([
            {
                type: 'interface',
                name: 'IERC20',
                items: [
                    { type: 'function', name: 'balance_of', inputs: [{ name: 'a', type: 'core::starknet::contract_address::ContractAddress' }], outputs: [], state_mutability: 'view' },
                    { type: 'function', name: 'transfer', inputs: [], outputs: [], state_mutability: 'external' }
                ]
            },
            { type: 'function', name: 'legacy', inputs: [], outputs: [] }
        ]);
        expect(fns.map((f) => [f.name, f.stateMutability, f.interfaceName])).toEqual([
            ['balance_of', 'view', 'IERC20'],
            ['transfer', 'external', 'IERC20'],
            ['legacy', 'external', '']
        ]);
    });

    it('checks call shape and raw felts', () => {
        expect(checkStarknetCall(call(), 0, 1)).toBeNull();
        expect(checkStarknetCall(call({ contractAddress: 'x' }), 0, 2)).toMatch(/^Call 1: enter a contract address/);
        expect(checkStarknetCall(call({ rawCalldata: true, args: ['1', 'nope'] }), 0, 1)).toMatch(/"nope" is not a felt/);
    });

    it('passes raw calldata through as hex felts', async () => {
        const compiled = await compileStarknetCall('mainnet', call({ rawCalldata: true, args: ['10', '0x0'] }));
        expect(compiled.calldata).toEqual(['0xa', '0x0']);
    });
});

describe('starknet adapter', () => {
    const request = (calls: StarknetCall[]) =>
        ({ id: 'r', type: RequestType.TRANSACTION, name: 'r', rpcParams: { method: '', params: [], chain: 'starknet' }, starknetTxParams: { calls } }) as unknown as RequestItem;

    it('validates every call in a multicall', () => {
        expect(starknetAdapter.validate(request([]))).toBe('Add at least one call.');
        expect(starknetAdapter.validate(request([call(), call({ entrypoint: '' })]))).toBe('Call 2: choose a function.');
        expect(starknetAdapter.validate(request([call()]))).toBeNull();
    });

    it('describes multicalls and links to Voyager', () => {
        expect(starknetAdapter.describe(request([call(), call()])).kind).toBe('Multicall (2 calls)');
        expect(starknetAdapter.explorerUrl('mainnet', '0xabc')).toBe('https://voyager.online/tx/0xabc');
        expect(starknetAdapter.explorerUrl('testnet', '0xabc')).toBe('https://sepolia.voyager.online/tx/0xabc');
        expect(starknetAdapter.explorerUrl('localnet', '0xabc')).toBeUndefined();
    });
});

describe('EVM chain lists', () => {
    it('lets wallets sign on every EVM chain the RPC picker offers', () => {
        const signable = new Set<number>(wagmiConfig.chains.map((c) => c.id));
        const missing = RPC_EVM_CHAINS.filter((c) => !signable.has(c.id)).map((c) => c.name);
        expect(missing).toEqual([]);
    });
});

describe('Starknet ID encoding', () => {
    it('encodes labels base-38, with the trailing-"a" rule', async () => {
        const { encodeStarknetIdLabel, encodeStarknetIdDomain } = await import('./nameResolution/starknetId');
        // b=1, e=4, n=13: 1 + 4·38 + 13·38²
        expect(encodeStarknetIdLabel('ben')).toBe(BigInt(18925));
        // A final "a" is written as (37, 0) so it is not lost as a leading zero.
        expect(encodeStarknetIdLabel('ba')).toBe(BigInt(1 + 37 * 38));
        expect(encodeStarknetIdDomain('pay.ben.stark')).toEqual([encodeStarknetIdLabel('pay'), BigInt(18925)]);
        expect(() => encodeStarknetIdLabel('b_n')).toThrow(/not allowed/);
    });
});
