/**
 * Cairo Studio's converters. Each takes the starknet.js module (loaded lazily
 * by the page) so nothing here pulls the SDK into the first-load bundle, and
 * each throws a ToolError with a message the page can show as-is.
 */
import type * as Starknet from 'starknet';
import { FIELD_PRIME } from './values';

type Sdk = typeof Starknet;

export class ToolError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ToolError';
    }
}

const hex = (n: bigint) => `0x${n.toString(16)}`;

const parseNumber = (text: string, what: string): bigint => {
    const v = text.trim();
    if (/^\d+$/.test(v) || /^0x[0-9a-fA-F]+$/.test(v)) return BigInt(v);
    throw new ToolError(`Enter ${what} as a decimal or 0x hex number.`);
};

/** Entry point or event selector: sn_keccak of the name, as Starknet computes it. */
export const selectorOf = (sdk: Sdk, name: string): { hex: string; decimal: string } => {
    const n = name.trim();
    if (!n) throw new ToolError('Enter a function or event name.');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) throw new ToolError('A Cairo name has letters, digits and underscores, and does not start with a digit.');
    const value = BigInt(sdk.hash.getSelectorFromName(n));
    return { hex: hex(value), decimal: value.toString() };
};

export interface FeltView {
    hex: string;
    decimal: string;
    /** The felt read as a Cairo short string, when every byte is printable ASCII. */
    shortString: string | null;
}

/** Converts a felt given as decimal, hex or short-string text. */
export const convertFelt = (sdk: Sdk, text: string): FeltView => {
    const v = text.trim();
    if (!v) throw new ToolError('Enter a felt: decimal, 0x hex, or text up to 31 characters.');
    let value: bigint;
    if (/^\d+$/.test(v) || /^0x[0-9a-fA-F]+$/.test(v)) value = BigInt(v);
    else {
        if (!sdk.shortString.isShortString(v)) throw new ToolError('Text must be ASCII and at most 31 characters to fit in a felt.');
        value = BigInt(sdk.shortString.encodeShortString(v));
    }
    if (value >= FIELD_PRIME) throw new ToolError('This number is not below the Starknet field prime, so it is not a felt.');
    // A short string is the felt's big-endian bytes; show it only when every byte is printable ASCII.
    let shortString: string | null = null;
    if (value > 0n) {
        const digits = value.toString(16);
        const bytes = (digits.length % 2 ? `0${digits}` : digits).match(/../g)!.map((b) => parseInt(b, 16));
        shortString = bytes.every((b) => b >= 0x20 && b <= 0x7e) ? String.fromCharCode(...bytes) : null;
    }
    return { hex: hex(value), decimal: value.toString(), shortString };
};

/** Splits a u256 into its two u128 felts, as Cairo serializes it (low first). */
export const splitU256 = (sdk: Sdk, text: string): { low: string; high: string; lowHex: string; highHex: string } => {
    const value = parseNumber(text, 'a u256');
    if (value >= 1n << 256n) throw new ToolError('This number does not fit in a u256.');
    const { low, high } = sdk.uint256.bnToUint256(value);
    return { low: BigInt(low).toString(), high: BigInt(high).toString(), lowHex: hex(BigInt(low)), highHex: hex(BigInt(high)) };
};

/** Joins low and high u128 felts back into a u256. */
export const joinU256 = (sdk: Sdk, lowText: string, highText: string): { decimal: string; hex: string } => {
    const low = parseNumber(lowText, 'low');
    const high = parseNumber(highText, 'high');
    if (low >= 1n << 128n || high >= 1n << 128n) throw new ToolError('low and high must each fit in a u128.');
    const value = sdk.uint256.uint256ToBN({ low, high });
    return { decimal: value.toString(), hex: hex(value) };
};

/** Serializes text as a Cairo ByteArray: data length, 31-byte words, pending word, pending word length. */
export const encodeByteArray = (sdk: Sdk, text: string): string[] => {
    if (!/^[\x00-\x7f]*$/.test(text)) throw new ToolError('Only ASCII text can be encoded here (a starknet.js limitation).');
    const ba = sdk.byteArray.byteArrayFromString(text);
    return [hex(BigInt(ba.data.length)), ...ba.data.map((w) => hex(BigInt(w))), hex(BigInt(ba.pending_word)), hex(BigInt(ba.pending_word_len))];
};

/** Reads a serialized ByteArray (felts separated by commas, spaces or new lines) back into text. */
export const decodeByteArray = (sdk: Sdk, feltsText: string): string => {
    const felts = feltsText
        .split(/[\s,[\]"]+/)
        .filter(Boolean)
        .map((f) => parseNumber(f, 'each felt'));
    if (felts.length < 3) throw new ToolError('A ByteArray has at least 3 felts: data length, pending word, pending word length.');
    const count = Number(felts[0]);
    if (felts.length !== count + 3) throw new ToolError(`The first felt says ${count} data word${count === 1 ? '' : 's'}, so expected ${count + 3} felts, got ${felts.length}.`);
    const pendingLen = Number(felts[count + 2]);
    if (pendingLen > 30) throw new ToolError('The pending word length must be 0 to 30.');
    return sdk.byteArray.stringFromByteArray({
        data: felts.slice(1, count + 1).map(hex),
        pending_word: hex(felts[count + 1]),
        pending_word_len: pendingLen,
    });
};

/** Validates a contract address or class hash and gives its padded 64-digit form. */
export const checkAddress = (sdk: Sdk, text: string): { padded: string; decimal: string } => {
    const v = text.trim();
    if (!/^0x[0-9a-fA-F]{1,64}$/.test(v)) throw new ToolError('Enter 0x followed by up to 64 hex digits.');
    try {
        const padded = sdk.validateAndParseAddress(v);
        return { padded, decimal: BigInt(v).toString() };
    } catch {
        throw new ToolError('Not a valid Starknet address: it must be below 2^251.');
    }
};
