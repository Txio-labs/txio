import { describe, it, expect, vi, afterEach } from 'vitest';
import { encodeErrorResult, parseAbi } from 'viem';
import {
    abiFunctions,
    describeEvmError,
    fetchVerifiedAbi,
    formatReadResult,
    functionSignature,
    parseAbiJson,
    readSavedContracts,
    saveContract
} from './evmContract';

const erc20 = parseAbi([
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function deposit() payable',
    'error InsufficientBalance(uint256 available, uint256 required)'
]);

afterEach(() => vi.unstubAllGlobals());

describe('parseAbiJson', () => {
    it('accepts a bare ABI or a compiler artifact', () => {
        expect(parseAbiJson(JSON.stringify(erc20))).toHaveLength(5);
        expect(parseAbiJson(JSON.stringify({ contractName: 'X', abi: erc20 }))).toHaveLength(5);
    });

    it('rejects anything else with a clear message', () => {
        expect(() => parseAbiJson('nope')).toThrow(/valid JSON/);
        expect(() => parseAbiJson('{"foo":1}')).toThrow(/ABI array/);
    });
});

describe('abiFunctions', () => {
    it('splits free reads from writes that need a transaction', () => {
        const { read, write } = abiFunctions(erc20);
        expect(read.map((f) => f.name)).toEqual(['balanceOf', 'decimals']);
        expect(write.map((f) => f.name)).toEqual(['transfer', 'deposit']);
        expect(functionSignature(write[0])).toBe('transfer(address to, uint256 amount)');
    });
});

describe('describeEvmError', () => {
    it('decodes custom errors declared in the ABI', () => {
        const data = encodeErrorResult({ abi: erc20, errorName: 'InsufficientBalance', args: [BigInt(5), BigInt(10)] });
        const err = { shortMessage: 'Execution reverted', cause: { data } };
        expect(describeEvmError(err, erc20)).toBe('Reverted: InsufficientBalance(5, 10)');
    });

    it('falls back to the revert reason, then the message', () => {
        expect(describeEvmError({ shortMessage: 'x', cause: { reason: 'ERC20: insufficient allowance' } })).toBe(
            'Reverted: ERC20: insufficient allowance'
        );
        expect(describeEvmError({ shortMessage: 'HTTP request failed' })).toBe('HTTP request failed');
    });
});

describe('formatReadResult', () => {
    it('shows token amounts in token units when decimals are known', () => {
        expect(formatReadResult(BigInt('4210550000'), { decimals: 6, symbol: 'USDC' })).toBe('4210.55 USDC (4210550000)');
        expect(formatReadResult(BigInt(7))).toBe('7');
        expect(formatReadResult([BigInt(1), true])).toContain('"1"');
    });
});

describe('fetchVerifiedAbi', () => {
    it('loads the ABI from Sourcify', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ abi: erc20 }) });
        vi.stubGlobal('fetch', fetchMock);
        await expect(fetchVerifiedAbi(8453, '0xabc')).resolves.toEqual(erc20);
        expect(fetchMock.mock.calls[0][0]).toBe('https://sourcify.dev/server/v2/contract/8453/0xabc?fields=abi');
    });

    it('explains what to do when the contract is not verified', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
        await expect(fetchVerifiedAbi(1, '0xabc')).rejects.toThrow(/Paste or upload/);
    });
});

describe('saved contracts', () => {
    it('remembers contracts per chain + address, newest first, without duplicates', () => {
        saveContract({ chainId: 1, address: '0xAAA', name: 'A', abi: '[]' });
        saveContract({ chainId: 8453, address: '0xBBB', name: 'B', abi: '[]' });
        saveContract({ chainId: 1, address: '0xaaa', name: 'A2', abi: '[]' });
        expect(readSavedContracts().map((c) => c.name)).toEqual(['A2', 'B']);
    });
});
