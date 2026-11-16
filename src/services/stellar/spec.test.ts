// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { contract, scValToNative, xdr } from '@stellar/stellar-sdk';
import { describeContractError, exampleValue, isTextInput, placeholderFor, specArgsToScVals, specResultToNative, validateSpecArg } from './spec';

const T = xdr.ScSpecTypeDef;
const udt = (name: string) => T.scSpecTypeUdt(new xdr.ScSpecTypeUdt({ name }));
const vec = (elementType: xdr.ScSpecTypeDef) => T.scSpecTypeVec(new xdr.ScSpecTypeVec({ elementType }));
const option = (valueType: xdr.ScSpecTypeDef) => T.scSpecTypeOption(new xdr.ScSpecTypeOption({ valueType }));
const map = (keyType: xdr.ScSpecTypeDef, valueType: xdr.ScSpecTypeDef) => T.scSpecTypeMap(new xdr.ScSpecTypeMap({ keyType, valueType }));
const bytesN = (n: number) => T.scSpecTypeBytesN(new xdr.ScSpecTypeBytesN({ n }));
const input = (name: string, type: xdr.ScSpecTypeDef) => new xdr.ScSpecFunctionInputV0({ doc: '', name, type });

const ADDR = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

const spec = new contract.Spec([
    xdr.ScSpecEntry.scSpecEntryUdtStructV0(
        new xdr.ScSpecUdtStructV0({
            doc: '',
            lib: '',
            name: 'Order',
            fields: [
                new xdr.ScSpecUdtStructFieldV0({ doc: '', name: 'owner', type: T.scSpecTypeAddress() }),
                new xdr.ScSpecUdtStructFieldV0({ doc: '', name: 'amount', type: T.scSpecTypeI128() }),
                new xdr.ScSpecUdtStructFieldV0({ doc: '', name: 'memo', type: option(T.scSpecTypeString()) })
            ]
        })
    ),
    xdr.ScSpecEntry.scSpecEntryUdtUnionV0(
        new xdr.ScSpecUdtUnionV0({
            doc: '',
            lib: '',
            name: 'Side',
            cases: [
                xdr.ScSpecUdtUnionCaseV0.scSpecUdtUnionCaseVoidV0(new xdr.ScSpecUdtUnionCaseVoidV0({ doc: '', name: 'Market' })),
                xdr.ScSpecUdtUnionCaseV0.scSpecUdtUnionCaseTupleV0(
                    new xdr.ScSpecUdtUnionCaseTupleV0({ doc: '', name: 'Limit', type: [T.scSpecTypeU64()] })
                )
            ]
        })
    ),
    xdr.ScSpecEntry.scSpecEntryUdtEnumV0(
        new xdr.ScSpecUdtEnumV0({
            doc: '',
            lib: '',
            name: 'Tier',
            cases: [
                new xdr.ScSpecUdtEnumCaseV0({ doc: '', name: 'Bronze', value: 1 }),
                new xdr.ScSpecUdtEnumCaseV0({ doc: '', name: 'Gold', value: 3 })
            ]
        })
    ),
    xdr.ScSpecEntry.scSpecEntryUdtErrorEnumV0(
        new xdr.ScSpecUdtErrorEnumV0({
            doc: '',
            lib: '',
            name: 'Error',
            cases: [new xdr.ScSpecUdtErrorEnumCaseV0({ doc: 'Not enough funds', name: 'InsufficientBalance', value: 3 })]
        })
    ),
    xdr.ScSpecEntry.scSpecEntryFunctionV0(
        new xdr.ScSpecFunctionV0({
            doc: '',
            name: 'place',
            inputs: [
                input('order', udt('Order')),
                input('side', udt('Side')),
                input('tier', udt('Tier')),
                input('ids', vec(T.scSpecTypeU32())),
                input('limits', map(T.scSpecTypeSymbol(), T.scSpecTypeI128())),
                input('hash', bytesN(4)),
                input('note', option(T.scSpecTypeString()))
            ],
            outputs: [udt('Order')]
        })
    )
]);

const args = (...values: string[]) => values.map((value) => ({ value }));
const native = (vals: xdr.ScVal[]) => vals.map((v) => scValToNative(v));

describe('specArgsToScVals', () => {
    it('builds structs, unions, enums, vecs, maps, bytesN and options from form text', () => {
        const vals = specArgsToScVals(
            spec,
            'place',
            args(
                JSON.stringify({ owner: ADDR, amount: '170141183460469231731687303715884105727' }),
                JSON.stringify({ tag: 'Limit', values: ['25'] }),
                'Gold',
                '[1, 2, "3"]',
                '{"btc": "5", "eth": 6}',
                '0xdeadbeef',
                ''
            )
        );
        expect(native(vals)).toEqual([
            { owner: ADDR, amount: 170141183460469231731687303715884105727n, memo: null },
            ['Limit', 25n],
            3,
            [1, 2, 3],
            { btc: 5n, eth: 6n },
            Uint8Array.from([0xde, 0xad, 0xbe, 0xef]),
            null
        ]);
    });

    it('accepts a bare tag for a union case without values', () => {
        const [, side] = specArgsToScVals(spec, 'place', args(JSON.stringify({ owner: ADDR, amount: 1 }), '"Market"', '1', '[]', '{}', '0x00000000', 'hi'));
        expect(scValToNative(side)).toEqual(['Market']);
    });

    it('names the argument and the problem', () => {
        expect(() => specArgsToScVals(spec, 'place', args('{"owner": "nope", "amount": 1}', '"Market"', '1', '[]', '{}', '0x00000000', ''))).toThrow(
            'order.owner: expected a G…, C… or M… address.'
        );
        expect(validateSpecArg(spec, 'place', 0, '{"owner": "' + ADDR + '"}')).toBe('order: Order is missing field "amount".');
        expect(validateSpecArg(spec, 'place', 0, '{"owner": "' + ADDR + '", "amount": 1, "extra": 2}')).toBe('order: Order has no field "extra".');
        expect(validateSpecArg(spec, 'place', 1, '"Stop"')).toMatch(/Side expects one of Market, Limit/);
        expect(validateSpecArg(spec, 'place', 2, 'Silver')).toMatch(/Bronze \(1\), Gold \(3\)/);
        expect(validateSpecArg(spec, 'place', 3, '[1, -2]')).toBe('ids[1]: -2 is out of range for u32.');
        expect(validateSpecArg(spec, 'place', 4, '{"btc": 12345678901234567890}')).toMatch(/put it in quotes/);
        expect(validateSpecArg(spec, 'place', 5, '0xdead')).toBe('hash: expected exactly 4 bytes, got 2.');
        expect(validateSpecArg(spec, 'place', 3, '[1,')).toBe('ids: is not valid JSON.');
        expect(validateSpecArg(spec, 'place', 1, 'Market')).toBeNull();
        expect(validateSpecArg(spec, 'place', 6, 'anything')).toBeNull();
    });

    it('checks the argument count', () => {
        expect(() => specArgsToScVals(spec, 'place', args('{}'))).toThrow('place takes 7 argument(s), got 1.');
    });
});

describe('examples and placeholders', () => {
    it('produces an example every structured input accepts', () => {
        const fn = spec.getFunc('place');
        fn.inputs().forEach((inp, i) => {
            const example = exampleValue(spec, inp.type());
            const text = isTextInput(spec, inp.type()) ? String(example) : JSON.stringify(example);
            expect(validateSpecArg(spec, 'place', i, text)).toBeNull();
        });
        expect(exampleValue(spec, udt('Order'))).toEqual({ owner: ADDR, amount: '1000', memo: 'text' });
        expect(placeholderFor(spec, option(T.scSpecTypeAddress()))).toBe('G… or C… address (empty for none)');
    });
});

describe('results and errors', () => {
    it('decodes results with the contract types', () => {
        const [order] = specArgsToScVals(spec, 'place', args(JSON.stringify({ owner: ADDR, amount: 9, memo: 'x' }), '"Market"', '1', '[]', '{}', '0x00000000', ''));
        expect(specResultToNative(spec, 'place', order)).toEqual({ owner: ADDR, amount: 9n, memo: 'x' });
    });

    it('names a declared contract error', () => {
        expect(describeContractError(spec, 'HostError: Error(Contract, #3)')).toBe('InsufficientBalance (#3): Not enough funds');
        expect(describeContractError(spec, 'HostError: Error(Contract, #9)')).toBeUndefined();
        expect(describeContractError(spec, 'HostError: Error(Budget, ExceededLimit)')).toBeUndefined();
    });
});
