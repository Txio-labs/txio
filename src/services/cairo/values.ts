/**
 * Cairo values between the user and starknet.js.
 *
 * Users type JSON (numbers as decimal or 0x hex strings, objects for structs,
 * {"Variant": value} for enums). starknet.js CallData needs JS values, and
 * for enums its own classes (CairoOption, CairoResult, CairoCustomEnum).
 * `toCallValue` does that conversion, checking ranges on the way so an error
 * names the field and the type it expected. `fromDecoded` goes back: it turns
 * what CallData.parse returns into JSON a user can read.
 *
 * No encoding happens here. Felts are produced by CallData.compile only.
 */
import type * as Starknet from 'starknet';
import { shortType, type ParsedAbi } from './abi';

type Sdk = Pick<typeof Starknet, 'CairoOption' | 'CairoOptionVariant' | 'CairoResult' | 'CairoResultVariant' | 'CairoCustomEnum' | 'cairo'>;

/** Starknet field prime: felts are below it. */
export const FIELD_PRIME = (1n << 251n) + 17n * (1n << 192n) + 1n;
/** Contract addresses and class hashes are below 2^251. */
const ADDRESS_BOUND = 1n << 251n;

export type CairoTypeInfo =
    | { kind: 'bool' }
    | { kind: 'felt' }
    | { kind: 'uint'; bits: number }
    | { kind: 'int'; bits: number }
    | { kind: 'u256' }
    | { kind: 'address' }
    | { kind: 'class_hash' }
    | { kind: 'eth_address' }
    | { kind: 'bytes31' }
    | { kind: 'byte_array' }
    | { kind: 'array'; element: string }
    | { kind: 'tuple'; elements: string[] }
    | { kind: 'option'; inner: string }
    | { kind: 'result'; ok: string; err: string }
    | { kind: 'struct'; name: string; members: { name: string; type: string }[] }
    | { kind: 'enum'; name: string; variants: { name: string; type: string }[] }
    | { kind: 'unit' }
    | { kind: 'unknown'; type: string };

/** Splits "A, B<C, D>, (E, F)" at top-level commas. */
const splitTopLevel = (text: string): string[] => {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of text) {
        if (ch === '<' || ch === '(') depth++;
        if (ch === '>' || ch === ')') depth--;
        if (ch === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
        } else current += ch;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
};

/** The generic argument of "core::array::Array::<T>" style types. */
const genericArgs = (type: string): string[] | null => {
    const start = type.indexOf('<');
    if (start === -1 || !type.endsWith('>')) return null;
    return splitTopLevel(type.slice(start + 1, -1));
};

export const describeType = (type: string, abi?: Pick<ParsedAbi, 'structs' | 'enums'>): CairoTypeInfo => {
    const t = type.trim();
    if (t === '()') return { kind: 'unit' };
    if (t.startsWith('(') && t.endsWith(')')) return { kind: 'tuple', elements: splitTopLevel(t.slice(1, -1)) };

    const short = shortType(t.replace(/<.*$/, ''));
    const base = t.replace(/::?<.*$/, '');
    switch (short) {
        case 'bool':
            return { kind: 'bool' };
        case 'felt252':
        case 'felt':
            return { kind: 'felt' };
        case 'u8':
        case 'u16':
        case 'u32':
        case 'u64':
        case 'u128':
            return { kind: 'uint', bits: Number(short.slice(1)) };
        case 'usize':
            return { kind: 'uint', bits: 32 };
        case 'i8':
        case 'i16':
        case 'i32':
        case 'i64':
        case 'i128':
            return { kind: 'int', bits: Number(short.slice(1)) };
        case 'u256':
            return { kind: 'u256' };
        case 'ContractAddress':
            return { kind: 'address' };
        case 'ClassHash':
            return { kind: 'class_hash' };
        case 'EthAddress':
            return { kind: 'eth_address' };
        case 'bytes31':
            return { kind: 'bytes31' };
        case 'ByteArray':
            return { kind: 'byte_array' };
        default:
            break;
    }
    const args = genericArgs(t);
    if (args && (base.endsWith('::Array') || base.endsWith('::Span') || base === 'Array' || base === 'Span')) {
        return { kind: 'array', element: args[0] };
    }
    if (args && (base.endsWith('::Option') || base === 'Option')) return { kind: 'option', inner: args[0] };
    if (args && (base.endsWith('::Result') || base === 'Result')) return { kind: 'result', ok: args[0], err: args[1] };
    // Cairo 0 arrays are written "felt*".
    if (t.endsWith('*')) return { kind: 'array', element: t.slice(0, -1) };

    const struct = abi?.structs.find((s) => s.name === t);
    if (struct) return { kind: 'struct', name: t, members: struct.members };
    const en = abi?.enums.find((e) => e.name === t);
    if (en) return { kind: 'enum', name: t, variants: en.variants };
    return { kind: 'unknown', type: t };
};

export class CairoValueError extends Error {
    constructor(
        readonly path: string,
        readonly expected: string,
        detail: string
    ) {
        super(`${path}: ${detail} (expected ${expected})`);
        this.name = 'CairoValueError';
    }
}

const toBigInt = (value: unknown, path: string, expected: string): bigint => {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') {
        if (!Number.isSafeInteger(value)) throw new CairoValueError(path, expected, `${value} is not an exact integer; pass large numbers as strings`);
        return BigInt(value);
    }
    if (typeof value === 'string') {
        const v = value.trim();
        if (/^-?\d+$/.test(v) || /^0x[0-9a-fA-F]+$/.test(v)) return BigInt(v);
    }
    throw new CairoValueError(path, expected, `${JSON.stringify(value)} is not a decimal or 0x hex number`);
};

const inRange = (n: bigint, min: bigint, maxExclusive: bigint, path: string, expected: string): bigint => {
    if (n < min || n >= maxExclusive) throw new CairoValueError(path, expected, `${n} is out of range`);
    return n;
};

const typeLabel = (type: string) => shortType(type);

/**
 * Converts user JSON for `type` into the value starknet.js CallData.compile
 * takes. `path` names the field in errors, e.g. "recipient" or "calls[2].to".
 */
export const toCallValue = (type: string, input: unknown, abi: Pick<ParsedAbi, 'structs' | 'enums'>, sdk: Sdk, path = 'value'): unknown => {
    const info = describeType(type, abi);
    const expected = typeLabel(type);
    switch (info.kind) {
        case 'bool':
            if (input === true || input === 'true') return true;
            if (input === false || input === 'false') return false;
            throw new CairoValueError(path, expected, `${JSON.stringify(input)} is not true or false`);
        case 'felt': {
            // A felt may also be given as a short string ('hello'): CallData encodes text that is not a number.
            if (typeof input === 'string' && !/^(-?\d+|0x[0-9a-fA-F]+)$/.test(input.trim())) {
                if (input.length > 31) throw new CairoValueError(path, expected, 'text longer than 31 characters does not fit in a felt; use a ByteArray');
                return input;
            }
            return inRange(toBigInt(input, path, expected), 0n, FIELD_PRIME, path, expected);
        }
        case 'uint':
            return inRange(toBigInt(input, path, expected), 0n, 1n << BigInt(info.bits), path, expected);
        case 'int': {
            const half = 1n << BigInt(info.bits - 1);
            return inRange(toBigInt(input, path, expected), -half, half, path, expected);
        }
        case 'u256': {
            if (input && typeof input === 'object' && 'low' in input && 'high' in input) {
                const { low, high } = input as { low: unknown; high: unknown };
                const lo = inRange(toBigInt(low, `${path}.low`, 'u128'), 0n, 1n << 128n, `${path}.low`, 'u128');
                const hi = inRange(toBigInt(high, `${path}.high`, 'u128'), 0n, 1n << 128n, `${path}.high`, 'u128');
                return lo + (hi << 128n);
            }
            return inRange(toBigInt(input, path, expected), 0n, 1n << 256n, path, expected);
        }
        case 'address':
        case 'class_hash':
            return inRange(toBigInt(input, path, expected), 0n, ADDRESS_BOUND, path, expected);
        case 'eth_address':
            return inRange(toBigInt(input, path, expected), 0n, 1n << 160n, path, expected);
        case 'bytes31':
            if (typeof input !== 'string' || new TextEncoder().encode(input).length > 31) {
                throw new CairoValueError(path, expected, 'pass text of at most 31 bytes');
            }
            return input;
        case 'byte_array':
            if (typeof input !== 'string') throw new CairoValueError(path, expected, `${JSON.stringify(input)} is not text`);
            // Cairo allows any bytes, but starknet.js 10.8 encodes ByteArray from ASCII text only.
                    if (!/^[\x00-\x7f]*$/.test(input)) {
                throw new CairoValueError(path, expected, 'only ASCII text can be encoded here (a starknet.js limitation); non-ASCII characters are not supported yet');
            }
            return input;
        case 'array':
            if (!Array.isArray(input)) throw new CairoValueError(path, expected, `${JSON.stringify(input)} is not a JSON array`);
            return input.map((item, i) => toCallValue(info.element, item, abi, sdk, `${path}[${i}]`));
        case 'tuple': {
            if (!Array.isArray(input) || input.length !== info.elements.length) {
                throw new CairoValueError(path, expected, `pass a JSON array of ${info.elements.length} values`);
            }
            return sdk.cairo.tuple(...(input.map((item, i) => toCallValue(info.elements[i], item, abi, sdk, `${path}[${i}]`)) as never[]));
        }
        case 'unit':
            return {};
        case 'struct': {
            if (!input || typeof input !== 'object' || Array.isArray(input)) {
                throw new CairoValueError(path, expected, `pass an object with ${info.members.map((m) => m.name).join(', ')}`);
            }
            const out: Record<string, unknown> = {};
            for (const m of info.members) {
                if (!(m.name in (input as object))) throw new CairoValueError(`${path}.${m.name}`, typeLabel(m.type), 'missing');
                out[m.name] = toCallValue(m.type, (input as Record<string, unknown>)[m.name], abi, sdk, `${path}.${m.name}`);
            }
            const extra = Object.keys(input).filter((k) => !info.members.some((m) => m.name === k));
            if (extra.length) throw new CairoValueError(path, expected, `unknown field ${extra.join(', ')}`);
            return out;
        }
        case 'option': {
            if (input === null || (input && typeof input === 'object' && 'None' in input)) {
                return new sdk.CairoOption(sdk.CairoOptionVariant.None);
            }
            if (input && typeof input === 'object' && 'Some' in input) {
                return new sdk.CairoOption(sdk.CairoOptionVariant.Some, toCallValue(info.inner, (input as { Some: unknown }).Some, abi, sdk, `${path}.Some`));
            }
            throw new CairoValueError(path, expected, 'pass {"Some": value}, {"None": {}} or null');
        }
        case 'result': {
            if (input && typeof input === 'object' && 'Ok' in input) {
                return new sdk.CairoResult(sdk.CairoResultVariant.Ok, toCallValue(info.ok, (input as { Ok: unknown }).Ok, abi, sdk, `${path}.Ok`));
            }
            if (input && typeof input === 'object' && 'Err' in input) {
                return new sdk.CairoResult(sdk.CairoResultVariant.Err, toCallValue(info.err, (input as { Err: unknown }).Err, abi, sdk, `${path}.Err`));
            }
            throw new CairoValueError(path, expected, 'pass {"Ok": value} or {"Err": value}');
        }
        case 'enum': {
            // A unit variant can be given by name alone: "Pending".
            const [variantName, value] =
                typeof input === 'string'
                    ? [input, {}]
                    : input && typeof input === 'object' && !Array.isArray(input) && Object.keys(input).length === 1
                      ? Object.entries(input)[0]
                      : [null, null];
            const variant = info.variants.find((v) => v.name === variantName);
            if (!variant) {
                throw new CairoValueError(path, expected, `pass {"Variant": value} with one of ${info.variants.map((v) => v.name).join(', ')}`);
            }
            const content: Record<string, unknown> = {};
            for (const v of info.variants) content[v.name] = undefined;
            content[variant.name] = toCallValue(variant.type, value, abi, sdk, `${path}.${variant.name}`);
            return new sdk.CairoCustomEnum(content);
        }
        case 'unknown':
        default:
            throw new CairoValueError(path, expected, 'this type is not in the ABI, so TXIO cannot encode it');
    }
};

const hex = (n: bigint) => `0x${n.toString(16)}`;

/**
 * Turns a value CallData.parse returned into readable JSON, using the type:
 * addresses and felts as 0x hex, integers as decimal strings (exact for
 * u256), structs as objects, enums as {"Variant": value}.
 */
export const fromDecoded = (type: string, value: unknown, abi: Pick<ParsedAbi, 'structs' | 'enums'>): unknown => {
    const info = describeType(type, abi);
    const big = (v: unknown) => (typeof v === 'bigint' ? v : BigInt(v as string | number));
    switch (info.kind) {
        case 'bool':
            return Boolean(value);
        case 'felt':
        case 'address':
        case 'class_hash':
        case 'eth_address':
            return hex(big(value));
        case 'uint':
        case 'int':
        case 'u256':
            return big(value).toString();
        case 'bytes31':
        case 'byte_array':
            return String(value);
        case 'array':
            return (value as unknown[]).map((v) => fromDecoded(info.element, v, abi));
        case 'tuple': {
            const obj = value as Record<string, unknown>;
            return info.elements.map((t, i) => fromDecoded(t, obj[i] ?? obj[String(i)], abi));
        }
        case 'unit':
            return null;
        case 'struct': {
            const obj = value as Record<string, unknown>;
            return Object.fromEntries(info.members.map((m) => [m.name, fromDecoded(m.type, obj[m.name], abi)]));
        }
        case 'option': {
            const opt = value as { isSome(): boolean; unwrap(): unknown };
            return opt.isSome() ? { Some: fromDecoded(info.inner, opt.unwrap(), abi) } : { None: null };
        }
        case 'result': {
            const res = value as { isOk(): boolean; unwrap(): unknown };
            return res.isOk() ? { Ok: fromDecoded(info.ok, res.unwrap(), abi) } : { Err: fromDecoded(info.err, res.unwrap(), abi) };
        }
        case 'enum': {
            const en = value as { activeVariant(): string; unwrap(): unknown };
            const name = en.activeVariant();
            const variant = info.variants.find((v) => v.name === name);
            return { [name]: variant ? fromDecoded(variant.type, en.unwrap(), abi) : en.unwrap() };
        }
        default:
            return typeof value === 'bigint' ? value.toString() : value;
    }
};

/** A JSON value a user can start from for `type`: placeholders for numbers, the real shape for structs and enums. */
export const exampleValue = (type: string, abi: Pick<ParsedAbi, 'structs' | 'enums'>, depth = 0): unknown => {
    if (depth > 6) return null;
    const info = describeType(type, abi);
    switch (info.kind) {
        case 'bool':
            return false;
        case 'felt':
        case 'uint':
        case 'int':
        case 'u256':
            return '0';
        case 'address':
        case 'class_hash':
            return '0x0';
        case 'eth_address':
            return '0x0';
        case 'bytes31':
        case 'byte_array':
            return '';
        case 'array':
            return [];
        case 'tuple':
            return info.elements.map((t) => exampleValue(t, abi, depth + 1));
        case 'unit':
            return {};
        case 'struct':
            return Object.fromEntries(info.members.map((m) => [m.name, exampleValue(m.type, abi, depth + 1)]));
        case 'option':
            return { None: {} };
        case 'result':
            return { Ok: exampleValue(info.ok, abi, depth + 1) };
        case 'enum': {
            const first = info.variants[0];
            return first ? { [first.name]: exampleValue(first.type, abi, depth + 1) } : {};
        }
        default:
            return null;
    }
};

/** Whether a type is entered in a single text field (as opposed to JSON). */
export const isScalarType = (type: string, abi: Pick<ParsedAbi, 'structs' | 'enums'>): boolean => {
    const kind = describeType(type, abi).kind;
    return ['felt', 'uint', 'int', 'u256', 'address', 'class_hash', 'eth_address', 'bytes31', 'byte_array', 'bool'].includes(kind);
};

/**
 * Reads one argument as a user typed it: scalars as text (numbers, addresses,
 * short strings, ByteArray text, true/false), everything else as JSON.
 */
export const argFromText = (type: string, text: string, abi: Pick<ParsedAbi, 'structs' | 'enums'>, path = 'value'): unknown => {
    if (isScalarType(type, abi)) return describeType(type, abi).kind === 'byte_array' ? text : text.trim();
    const trimmed = text.trim();
    if (!trimmed) throw new CairoValueError(path, shortType(type), 'enter a JSON value');
    try {
        return JSON.parse(trimmed);
    } catch {
        throw new CairoValueError(path, shortType(type), `"${text}" is not valid JSON`);
    }
};
