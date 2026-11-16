// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { contract, xdr } from '@stellar/stellar-sdk';
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

describe('parseStellarSpec with the full spec', () => {
    it('makes structured parameters enterable as JSON, with an example and docs', () => {
        const ids = xdr.ScSpecTypeDef.scSpecTypeVec(new xdr.ScSpecTypeVec({ elementType: xdr.ScSpecTypeDef.scSpecTypeU32() }));
        const memo = xdr.ScSpecTypeDef.scSpecTypeOption(new xdr.ScSpecTypeOption({ valueType: xdr.ScSpecTypeDef.scSpecTypeString() }));
        const f = new xdr.ScSpecFunctionV0({
            doc: 'Sends tokens.',
            name: 'send',
            inputs: [new xdr.ScSpecFunctionInputV0({ doc: 'Token IDs', name: 'ids', type: ids }), input('memo', memo)],
            outputs: []
        });
        const spec = new contract.Spec([xdr.ScSpecEntry.scSpecEntryFunctionV0(f)]);
        const [parsed] = parseStellarSpec(spec.funcs(), spec);
        expect(parsed.doc).toBe('Sends tokens.');
        expect(parsed.parameters[0]).toMatchObject({ type: 'vec<u32>', resolution: 'user_input', multiline: true, example: '[\n  1\n]', doc: 'Token IDs' });
        expect(parsed.parameters[1]).toMatchObject({ type: 'option<string>', required: false, multiline: false, placeholder: 'text (empty for none)' });
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
