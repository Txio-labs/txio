import { describe, it, expect } from 'vitest';
import { coerceAptosArg } from './aptosAdapter';
import type { BuilderArg } from '../../types';
import { moveParamTypeForAptos } from '../../components/RequestPanel/builders/AptosTransactionBuilder';

const arg = (type: BuilderArg['type'], value: string): BuilderArg => ({ id: 'x', type, value });

describe('coerceAptosArg', () => {
    it('range-checks unsigned integers', () => {
        expect(coerceAptosArg(arg('u8', '255'))).toBe(255);
        expect(() => coerceAptosArg(arg('u8', '256'))).toThrow(/too large for u8/);
        expect(() => coerceAptosArg(arg('u64', '18446744073709551616'))).toThrow(/too large for u64/);
        expect(coerceAptosArg(arg('u64', '18446744073709551615'))).toBe('18446744073709551615');
        expect(() => coerceAptosArg(arg('u32', '-1'))).toThrow(/whole number/);
    });

    it('validates addresses and objects', () => {
        expect(coerceAptosArg(arg('address', '0x1'))).toBe('0x1');
        expect(() => coerceAptosArg(arg('address', 'alice'))).toThrow(/valid address/);
        expect(() => coerceAptosArg(arg('object', '0xZZ'))).toThrow(/valid address/);
    });

    it('accepts hex or JSON arrays for vector<u8>, JSON arrays for vector<address>', () => {
        expect(coerceAptosArg(arg('vector<u8>', '0xdeadbeef'))).toBe('0xdeadbeef');
        expect(coerceAptosArg(arg('vector<u8>', '[1,2,3]'))).toEqual([1, 2, 3]);
        expect(() => coerceAptosArg(arg('vector<u8>', '0xabc'))).toThrow();
        expect(coerceAptosArg(arg('vector<address>', '["0x1","0x2"]'))).toEqual(['0x1', '0x2']);
        expect(() => coerceAptosArg(arg('vector<address>', '0x1'))).toThrow();
    });

    it('parses json and bool, keeps strings verbatim', () => {
        expect(coerceAptosArg(arg('json', '[1,2]'))).toEqual([1, 2]);
        expect(coerceAptosArg(arg('json', 'null'))).toBeNull();
        expect(() => coerceAptosArg(arg('json', '{'))).toThrow(/valid JSON/);
        expect(coerceAptosArg(arg('bool', 'true'))).toBe(true);
        expect(() => coerceAptosArg(arg('bool', 'yes'))).toThrow();
        expect(coerceAptosArg(arg('string', ' spaced '))).toBe(' spaced ');
    });
});

describe('moveParamTypeForAptos', () => {
    it('maps on-chain types to input kinds', () => {
        expect(moveParamTypeForAptos('u64')).toBe('u64');
        expect(moveParamTypeForAptos('0x1::string::String')).toBe('string');
        expect(moveParamTypeForAptos('0x1::object::Object<0x1::fungible_asset::Metadata>')).toBe('object');
        expect(moveParamTypeForAptos('vector<u64>')).toBe('json');
        expect(moveParamTypeForAptos('0x1::option::Option<u64>')).toBe('json');
        expect(moveParamTypeForAptos('vector<u8>')).toBe('vector<u8>');
    });
});
