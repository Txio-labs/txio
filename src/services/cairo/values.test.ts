// @vitest-environment node
// starknet.js checks `instanceof Uint8Array`, which fails across jsdom's realm; this file needs no DOM.
import { describe, expect, it } from 'vitest';
import * as starknet from 'starknet';
import strkAbi from './fixtures/strk-abi.json';
import { AbiParseError, callableFunctions, extractAbi, parseAbi } from './abi';
import { CairoValueError, describeType, exampleValue, fromDecoded, toCallValue } from './values';

const selectorOf = (name: string) => starknet.hash.getSelectorFromName(name);

// Each type in the spec's Part 5.2 list, with a value and the readable form it decodes back to.
const CASES: { type: string; input: unknown; decoded: unknown }[] = [
    { type: 'core::felt252', input: '0x1234', decoded: '0x1234' },
    { type: 'core::felt252', input: 'hello', decoded: '0x68656c6c6f' },
    { type: 'core::integer::u8', input: '255', decoded: '255' },
    { type: 'core::integer::u16', input: 65535, decoded: '65535' },
    { type: 'core::integer::u32', input: '0xffffffff', decoded: '4294967295' },
    { type: 'core::integer::u64', input: '18446744073709551615', decoded: '18446744073709551615' },
    { type: 'core::integer::u128', input: (2n ** 128n - 1n).toString(), decoded: (2n ** 128n - 1n).toString() },
    { type: 'core::integer::u256', input: (2n ** 200n + 7n).toString(), decoded: (2n ** 200n + 7n).toString() },
    { type: 'core::integer::u256', input: { low: '5', high: '1' }, decoded: (5n + (1n << 128n)).toString() },
    { type: 'core::integer::i8', input: '-128', decoded: '-128' },
    { type: 'core::integer::i128', input: '-170141183460469231731687303715884105728', decoded: '-170141183460469231731687303715884105728' },
    { type: 'core::bool', input: true, decoded: true },
    { type: 'core::bool', input: 'false', decoded: false },
    { type: 'core::starknet::contract_address::ContractAddress', input: '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', decoded: '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7' },
    { type: 'core::starknet::class_hash::ClassHash', input: '0x123abc', decoded: '0x123abc' },
    { type: 'core::starknet::eth_address::EthAddress', input: '0xae0ee0a63a2ce6baeeffe56e7714fb4efe48d419', decoded: '0xae0ee0a63a2ce6baeeffe56e7714fb4efe48d419' },
    { type: 'core::byte_array::ByteArray', input: 'A ByteArray longer than thirty-one bytes: two full words and a pending one', decoded: 'A ByteArray longer than thirty-one bytes: two full words and a pending one' },
    { type: 'core::byte_array::ByteArray', input: '', decoded: '' },
    { type: 'core::array::Array::<core::integer::u32>', input: ['1', 2, '0x3'], decoded: ['1', '2', '3'] },
    { type: 'core::array::Span::<core::felt252>', input: [], decoded: [] },
    { type: '(core::integer::u8, core::felt252)', input: ['7', '0x9'], decoded: ['7', '0x9'] },
    { type: 'demo::Point', input: { x: '1', y: '-2' }, decoded: { x: '1', y: '-2' } },
    {
        type: 'demo::Shape',
        input: { name: 'triangle', points: [{ x: 0, y: 0 }, { x: 1, y: -1 }], tag: { Done: '9' } },
        // A felt given as text is a short string; it decodes as the felt, in hex.
        decoded: { name: '0x747269616e676c65', points: [{ x: '0', y: '0' }, { x: '1', y: '-1' }], tag: { Done: '9' } },
    },
    { type: 'demo::Status', input: 'Pending', decoded: { Pending: null } },
    { type: 'demo::Status', input: { Done: '42' }, decoded: { Done: '42' } },
    { type: 'core::option::Option::<core::integer::u64>', input: { Some: '5' }, decoded: { Some: '5' } },
    { type: 'core::option::Option::<core::integer::u64>', input: null, decoded: { None: null } },
    { type: 'core::result::Result::<core::integer::u32, core::felt252>', input: { Ok: '1' }, decoded: { Ok: '1' } },
    { type: 'core::result::Result::<core::integer::u32, core::felt252>', input: { Err: '0x2' }, decoded: { Err: '0x2' } },
];

const fnName = (i: number) => `echo_${i}`;

// A Cairo 1 ABI shaped like the compiler's output: core types declared as structs and enums.
const SYNTHETIC_ABI = [
    { type: 'struct', name: 'core::integer::u256', members: [{ name: 'low', type: 'core::integer::u128' }, { name: 'high', type: 'core::integer::u128' }] },
    {
        type: 'struct',
        name: 'core::byte_array::ByteArray',
        members: [
            { name: 'data', type: 'core::array::Array::<core::bytes_31::bytes31>' },
            { name: 'pending_word', type: 'core::felt252' },
            { name: 'pending_word_len', type: 'core::integer::u32' },
        ],
    },
    { type: 'struct', name: 'core::starknet::eth_address::EthAddress', members: [{ name: 'address', type: 'core::felt252' }] },
    { type: 'struct', name: 'core::array::Span::<core::felt252>', members: [{ name: 'snapshot', type: '@core::array::Array::<core::felt252>' }] },
    { type: 'enum', name: 'core::bool', variants: [{ name: 'False', type: '()' }, { name: 'True', type: '()' }] },
    { type: 'struct', name: 'demo::Point', members: [{ name: 'x', type: 'core::integer::u32' }, { name: 'y', type: 'core::integer::i16' }] },
    { type: 'enum', name: 'demo::Status', variants: [{ name: 'Pending', type: '()' }, { name: 'Done', type: 'core::integer::u64' }] },
    {
        type: 'struct',
        name: 'demo::Shape',
        members: [
            { name: 'name', type: 'core::felt252' },
            { name: 'points', type: 'core::array::Array::<demo::Point>' },
            { name: 'tag', type: 'demo::Status' },
        ],
    },
    { type: 'enum', name: 'core::option::Option::<core::integer::u64>', variants: [{ name: 'Some', type: 'core::integer::u64' }, { name: 'None', type: '()' }] },
    {
        type: 'enum',
        name: 'core::result::Result::<core::integer::u32, core::felt252>',
        variants: [{ name: 'Ok', type: 'core::integer::u32' }, { name: 'Err', type: 'core::felt252' }],
    },
    {
        type: 'interface',
        name: 'demo::IEcho',
        items: CASES.map((c, i) => ({
            type: 'function',
            name: fnName(i),
            inputs: [{ name: 'v', type: c.type }],
            outputs: [{ type: c.type }],
            state_mutability: 'view',
        })),
    },
    { type: 'impl', name: 'EchoImpl', interface_name: 'demo::IEcho' },
    {
        type: 'event',
        name: 'demo::Echoed',
        kind: 'struct',
        members: [
            { name: 'who', type: 'core::starknet::contract_address::ContractAddress', kind: 'key' },
            { name: 'value', type: 'core::felt252', kind: 'data' },
        ],
    },
];

describe('Cairo value round trip through starknet.js', () => {
    const abi = parseAbi(SYNTHETIC_ABI, selectorOf);
    const callData = new starknet.CallData(abi.raw as never);

    it.each(CASES.map((c, i) => [i, c.type, c] as const))('%i %s', (i, _type, c) => {
        const value = toCallValue(c.type, c.input, abi, starknet, 'v');
        const felts = callData.compile(fnName(i), { v: value } as never);
        expect(felts.every((f) => /^\d+$/.test(f))).toBe(true);
        const parsed = callData.parse(fnName(i), felts);
        expect(fromDecoded(c.type, parsed, abi)).toEqual(c.decoded);
    });

    it('encodes u256 as two felts, low first', () => {
        const value = toCallValue('core::integer::u256', { low: '5', high: '1' }, abi, starknet);
        const i = CASES.findIndex((c) => c.type === 'core::integer::u256');
        expect(callData.compile(fnName(i), { v: value } as never)).toEqual(['5', '1']);
    });

    it('encodes a ByteArray as data length, 31-byte words, pending word and its length', () => {
        const i = CASES.findIndex((c) => c.type === 'core::byte_array::ByteArray');
        const felts = callData.compile(fnName(i), { v: toCallValue('core::byte_array::ByteArray', 'hello', abi, starknet) } as never);
        expect(felts).toEqual(['0', BigInt('0x68656c6c6f').toString(), '5']);
    });
});

describe('field-level errors', () => {
    const abi = parseAbi(SYNTHETIC_ABI, selectorOf);
    const fail = (type: string, input: unknown) => {
        try {
            toCallValue(type, input, abi, starknet, 'arg');
        } catch (err) {
            return (err as CairoValueError).message;
        }
        return 'no error';
    };

    it('names the field and expected type', () => {
        expect(fail('core::integer::u8', '256')).toBe('arg: 256 is out of range (expected u8)');
        expect(fail('core::integer::i8', '-129')).toBe('arg: -129 is out of range (expected i8)');
        expect(fail('core::starknet::contract_address::ContractAddress', `0x${'8'.repeat(63)}`)).toMatch(/out of range \(expected ContractAddress\)/);
        expect(fail('demo::Point', { x: '1' })).toBe('arg.y: missing (expected i16)');
        expect(fail('demo::Point', { x: '1', y: '2', z: '3' })).toBe('arg: unknown field z (expected Point)');
        expect(fail('demo::Shape', { name: 'a', points: [{ x: 'nope', y: 0 }], tag: 'Pending' })).toBe(
            'arg.points[0].x: "nope" is not a decimal or 0x hex number (expected u32)'
        );
        expect(fail('demo::Status', { Lost: 1 })).toMatch(/one of Pending, Done/);
        expect(fail('core::felt252', 'x'.repeat(32))).toMatch(/longer than 31 characters/);
        expect(fail('core::integer::u64', 1e20)).toMatch(/not an exact integer/);
        expect(fail('demo::Unknown', 1)).toMatch(/not in the ABI/);
        expect(fail('core::byte_array::ByteArray', 'ünicode')).toMatch(/only ASCII text/);
    });
});

describe('ABI parsing', () => {
    it('reads the live STRK token ABI: interfaces, view and external functions, events', () => {
        const abi = parseAbi(strkAbi, selectorOf);
        expect(abi.cairoVersion).toBe(1);
        const fns = callableFunctions(abi);
        const balanceOf = fns.find((f) => f.name === 'balanceOf');
        expect(balanceOf).toMatchObject({ mutability: 'view', selector: '0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e' });
        expect(fns.find((f) => f.name === 'transfer')?.mutability).toBe('external');
        expect(abi.entryPoints.some((e) => e.kind === 'constructor')).toBe(true);
        expect(abi.entryPoints.some((e) => e.kind === 'l1_handler')).toBe(true);
        const transferEvent = abi.events.find((e) => e.name.endsWith('::Transfer') && e.kind === 'struct');
        expect(transferEvent?.selector).toBe(selectorOf('Transfer'));
        expect(abi.interfaces.length).toBeGreaterThan(0);
    });

    it('accepts the ABI array, its JSON text, a class object and a Scarb artifact', () => {
        const arr = SYNTHETIC_ABI;
        expect(extractAbi(arr)).toBe(arr);
        expect(extractAbi(JSON.stringify(arr))).toEqual(arr);
        expect(extractAbi({ sierra_program: [], abi: JSON.stringify(arr) })).toEqual(arr);
        expect(extractAbi(JSON.stringify({ sierra_program: [], abi: arr }))).toEqual(arr);
    });

    it('explains what is wrong with a bad ABI', () => {
        const err = (input: unknown) => {
            try {
                extractAbi(input);
            } catch (e) {
                expect(e).toBeInstanceOf(AbiParseError);
                return (e as Error).message;
            }
            return 'no error';
        };
        expect(err('')).toMatch(/Paste an ABI/);
        expect(err('{nope')).toBe('This is not valid JSON.');
        expect(err({ hello: 1 })).toMatch(/Expected an ABI array/);
        expect(err([])).toBe('The ABI is empty.');
        expect(err([{ name: 'x' }])).toBe('ABI item 0 has no "type" field.');
    });

    it('parses Cairo 0 ABIs, including keys/data events', () => {
        const abi = parseAbi(
            [
                { type: 'function', name: 'get', inputs: [{ name: 'k', type: 'felt' }], outputs: [{ name: 'v', type: 'felt' }], stateMutability: 'view' },
                { type: 'event', name: 'set', keys: [], data: [{ name: 'k', type: 'felt' }] },
            ],
            selectorOf
        );
        expect(abi.cairoVersion).toBe(0);
        expect(abi.entryPoints[0]).toMatchObject({ name: 'get', mutability: 'view' });
        expect(abi.events[0]).toMatchObject({ kind: 'cairo0', members: [{ name: 'k', kind: 'data' }] });
    });
});

describe('type description and examples', () => {
    const abi = parseAbi(SYNTHETIC_ABI, selectorOf);
    it('describes generics, tuples and ABI types', () => {
        expect(describeType('core::array::Array::<demo::Point>', abi)).toEqual({ kind: 'array', element: 'demo::Point' });
        expect(describeType('(core::integer::u8, (core::felt252, core::bool))', abi)).toEqual({
            kind: 'tuple',
            elements: ['core::integer::u8', '(core::felt252, core::bool)'],
        });
        expect(describeType('core::result::Result::<core::integer::u32, core::felt252>', abi)).toEqual({
            kind: 'result',
            ok: 'core::integer::u32',
            err: 'core::felt252',
        });
        expect(describeType('felt*', abi)).toEqual({ kind: 'array', element: 'felt' });
    });

    it('gives a starting value with the real shape', () => {
        expect(exampleValue('demo::Shape', abi)).toEqual({ name: '0', points: [], tag: { Pending: {} } });
    });
});
