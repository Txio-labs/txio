import { describe, expect, it } from 'vitest';
import spec from './starknetSpec-0.10.3.json';
import { STARKNET_METHODS, STARKNET_SPEC_VERSION, getStarknetMethod, isStarknetWriteMethod } from './starknetMethods';
import { endpointsFor, isSubmitMethod } from './rpcRetrySafety';
import { parseRpcBody } from './suiService';
import { COMMON_RPC_METHODS, RPC_METHOD_TEMPLATES } from '@/lib/constants';

// The fixture is the method list and parameters of starkware-libs/starknet-specs
// v0.10.3 (api/*.json), extracted with the script in docs/starknet/feature-map.md.
const httpMethods = spec.methods.filter((m) => m.api !== 'ws');

describe('Starknet method registry', () => {
    it('matches the spec version the fixture was taken from', () => {
        expect(spec.version).toBe(STARKNET_SPEC_VERSION);
    });

    it('has every HTTP method of the spec and no other', () => {
        expect(STARKNET_METHODS.map((m) => m.name).sort()).toEqual(httpMethods.map((m) => m.name).sort());
    });

    it('files each method under the API it belongs to in the spec', () => {
        for (const m of httpMethods) expect(getStarknetMethod(m.name)?.api, m.name).toBe(m.api);
    });

    it('lists parameters in spec order, marking optional ones', () => {
        for (const m of httpMethods) {
            const expected = m.params.map((p) => (p.required ? p.name : `${p.name}?`));
            expect(getStarknetMethod(m.name)?.params, m.name).toEqual(expected);
        }
    });

    it('gives every required parameter a template value, and no extra values', () => {
        for (const m of httpMethods) {
            const template = getStarknetMethod(m.name)!.template;
            const required = m.params.filter((p) => p.required).length;
            expect(template.length, m.name).toBeGreaterThanOrEqual(required);
            expect(template.length, m.name).toBeLessThanOrEqual(m.params.length);
        }
    });

    it('never uses the "pending" block tag, which 0.10 removed', () => {
        expect(JSON.stringify(STARKNET_METHODS)).not.toMatch(/"pending"/);
    });

    it('marks exactly the write API as not read-only', () => {
        for (const m of STARKNET_METHODS) expect(m.readOnly, m.name).toBe(m.api !== 'write');
        expect(isStarknetWriteMethod('starknet_addInvokeTransaction')).toBe(true);
        expect(isStarknetWriteMethod('starknet_call')).toBe(false);
        expect(isStarknetWriteMethod('not_a_method')).toBe(false);
    });

    it('excludes subscriptions, which only run over WebSocket', () => {
        expect(STARKNET_METHODS.some((m) => m.name.includes('subscribe'))).toBe(false);
    });

    it('feeds the request editor its method list and templates', () => {
        expect(COMMON_RPC_METHODS.starknet).toEqual(['getAddressTransactions', ...STARKNET_METHODS.map((m) => m.name)]);
        for (const m of STARKNET_METHODS) expect(RPC_METHOD_TEMPLATES.starknet?.[m.name]).toEqual(m.template);
    });
});

describe('submission retry safety', () => {
    const endpoints = ['https://a', 'https://b', 'https://c'];

    it('sends a submission to the first endpoint only', () => {
        expect(endpointsFor('starknet', 'starknet_addInvokeTransaction', endpoints)).toEqual(['https://a']);
        expect(endpointsFor('evm', 'eth_sendRawTransaction', endpoints)).toEqual(['https://a']);
        expect(endpointsFor('solana', 'sendTransaction', endpoints)).toEqual(['https://a']);
        expect(endpointsFor('sui', 'sui_executeTransactionBlock', endpoints)).toEqual(['https://a']);
    });

    it('lets reads fail over across every endpoint', () => {
        expect(endpointsFor('starknet', 'starknet_call', endpoints)).toEqual(endpoints);
        expect(endpointsFor('evm', 'eth_call', endpoints)).toEqual(endpoints);
        expect(isSubmitMethod('starknet', 'starknet_simulateTransactions')).toBe(false);
    });
});

describe('parseRpcBody', () => {
    it('turns an HTML error page into a readable RPC error', () => {
        const data = parseRpcBody('<!DOCTYPE html><html>429</html>', 'https://starknet-rpc.publicnode.com', 200);
        expect(data.error.message).toBe('starknet-rpc.publicnode.com returned a non-JSON response (HTTP 200). The provider may be rate limiting or unavailable.');
        expect(parseRpcBody('{"jsonrpc":"2.0","result":1}', 'https://x.test', 200)).toEqual({ jsonrpc: '2.0', result: 1 });
    });
});
