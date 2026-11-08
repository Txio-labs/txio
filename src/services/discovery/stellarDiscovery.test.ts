import { describe, it, expect, vi } from 'vitest';
import { xdr } from '@stellar/stellar-sdk';
import { isStellarContractId, parseStellarSpec, stellarArgTypeFor, stellarDiscoveryAdapter } from './stellarDiscovery';

const input = (name: string, type: xdr.ScSpecTypeDef) => new xdr.ScSpecFunctionInputV0({ doc: '', name, type });
const fn = (name: string, inputs: xdr.ScSpecFunctionInputV0[], outputs: xdr.ScSpecTypeDef[] = []) =>
    new xdr.ScSpecFunctionV0({ doc: '', name, inputs, outputs });

describe('parseStellarSpec', () => {
    it('maps spec inputs to named, typed parameters and skips reserved functions', () => {
        const fns = parseStellarSpec([
            fn('__constructor', [input('admin', xdr.ScSpecTypeDef.scSpecTypeAddress())]),
            fn(
                'transfer',
                [
                    input('from', xdr.ScSpecTypeDef.scSpecTypeAddress()),
                    input('amount', xdr.ScSpecTypeDef.scSpecTypeI128()),
                    input('ids', xdr.ScSpecTypeDef.scSpecTypeVec(new xdr.ScSpecTypeVec({ elementType: xdr.ScSpecTypeDef.scSpecTypeU32() })))
                ],
                [xdr.ScSpecTypeDef.scSpecTypeBool()]
            )
        ]);
        expect(fns.map((f) => f.name)).toEqual(['transfer']);
        expect(fns[0].parameters.map((p) => [p.name, p.type, p.kind, p.resolution])).toEqual([
            ['from', 'address', 'address', 'user_input'],
            ['amount', 'i128', 'primitive', 'user_input'],
            ['ids', 'vec<u32>', 'vector', 'unsupported']
        ]);
        expect(fns[0].returnTypes).toEqual(['bool']);
    });
});

describe('stellarArgTypeFor', () => {
    it('maps buildable types and rejects the rest', () => {
        expect(stellarArgTypeFor('u64')).toBe('u64');
        expect(stellarArgTypeFor('bytesn<32>')).toBe('bytes');
        expect(stellarArgTypeFor('muxed_address')).toBe('address');
        expect(stellarArgTypeFor('option<i128>')).toBeNull();
    });
});

describe('stellarDiscoveryAdapter', () => {
    it('validates the contract ID before any network call', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        expect(isStellarContractId('GABC')).toBe(false);
        await expect(stellarDiscoveryAdapter.discoverPackage('GABC', 'testnet')).rejects.toMatchObject({ code: 'INVALID_IDENTIFIER' });
        expect(fetchMock).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
    });
});
