// @vitest-environment node
// starknet.js checks `instanceof Uint8Array`, which fails across jsdom's realm; this file needs no DOM.
import { describe, expect, it } from 'vitest';
import * as sdk from 'starknet';
import { checkAddress, convertFelt, decodeByteArray, encodeByteArray, joinU256, selectorOf, splitU256 } from './tools';

describe('Cairo Studio tools', () => {
    it('computes selectors as Starknet does', () => {
        // Known on chain: the STRK token's balanceOf entry point and the Transfer event key.
        expect(selectorOf(sdk, 'balanceOf').hex).toBe('0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e');
        expect(selectorOf(sdk, 'Transfer').hex).toBe('0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9');
        expect(() => selectorOf(sdk, '1bad')).toThrow(/does not start with a digit/);
    });

    it('converts felts between decimal, hex and short strings', () => {
        expect(convertFelt(sdk, 'hello')).toEqual({ hex: '0x68656c6c6f', decimal: '448378203247', shortString: 'hello' });
        expect(convertFelt(sdk, '0x534e5f4d41494e').shortString).toBe('SN_MAIN');
        expect(convertFelt(sdk, '1').shortString).toBeNull();
        expect(() => convertFelt(sdk, (2n ** 251n + 17n * 2n ** 192n + 1n).toString())).toThrow(/field prime/);
        expect(() => convertFelt(sdk, 'x'.repeat(32))).toThrow(/at most 31/);
    });

    it('splits and joins u256 as two u128 felts, low first', () => {
        const big = (2n ** 128n + 5n).toString();
        expect(splitU256(sdk, big)).toEqual({ low: '5', high: '1', lowHex: '0x5', highHex: '0x1' });
        expect(joinU256(sdk, '5', '1').decimal).toBe(big);
        expect(() => splitU256(sdk, (2n ** 256n).toString())).toThrow(/does not fit/);
        expect(() => joinU256(sdk, (2n ** 128n).toString(), '0')).toThrow(/u128/);
    });

    it('round-trips ByteArrays, including a full 31-byte word', () => {
        const text = 'Exactly thirty-one bytes long!! and a tail';
        const felts = encodeByteArray(sdk, text);
        expect(felts[0]).toBe('0x1');
        expect(felts).toHaveLength(4);
        expect(decodeByteArray(sdk, felts.join(', '))).toBe(text);
        expect(encodeByteArray(sdk, '')).toEqual(['0x0', '0x0', '0x0']);
        expect(decodeByteArray(sdk, '0x0 0x68656c6c6f 0x5')).toBe('hello');
        expect(() => decodeByteArray(sdk, '0x2 0x1 0x0')).toThrow(/expected 5 felts, got 3/);
        expect(() => encodeByteArray(sdk, 'é')).toThrow(/ASCII/);
    });

    it('validates addresses and pads them to 64 hex digits', () => {
        expect(checkAddress(sdk, '0x1').padded).toBe(`0x${'0'.repeat(63)}1`);
        expect(() => checkAddress(sdk, `0x${'f'.repeat(64)}`)).toThrow(/below 2\^251/);
        expect(() => checkAddress(sdk, 'abc')).toThrow(/0x followed by/);
    });
});
