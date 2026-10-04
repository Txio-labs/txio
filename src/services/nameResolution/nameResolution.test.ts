import { describe, it, expect, vi, afterEach } from 'vitest';
import { NAME_RESOLUTION_FAILED, NameResolutionFailed, findNames, resolveNamesDeep, resolveRequestNames, type NameResolver } from './index';
import { splitAptosName, aptosNamesResolver } from './aptosNames';
import { federationServerFromToml, isPublicHttps } from './federation';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { RequestItem, RequestType } from '../../types';

const pattern = /[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.eth/;
const fake: NameResolver = {
    chain: 'evm',
    pattern,
    async resolve(name) {
        if (name === 'bad.eth') throw new Error('nope');
        return '0xAAAA';
    }
};
const ctx = { network: 'mainnet' as const };

describe('findNames', () => {
    it('keeps whole tokens only', () => {
        expect(findNames(pattern, 'alice.eth').map((m) => m.name)).toEqual(['alice.eth']);
        expect(findNames(pattern, 'send alice.eth now').map((m) => m.name)).toEqual(['alice.eth']);
        expect(findNames(pattern, 'alice.eth2')).toEqual([]);
        expect(findNames(pattern, 'alice.eth.evil.com')).toEqual([]);
        expect(findNames(pattern, 'bob@alice.eth')).toEqual([]);
        expect(findNames(pattern, 'https://x.io/alice.eth')).toEqual([]);
    });
});

describe('resolveNamesDeep', () => {
    it('replaces at any depth and resolves each name once', async () => {
        const spy = vi.spyOn(fake, 'resolve');
        const out = await resolveNamesDeep({ a: ['alice.eth', { b: [['x alice.eth y']] }], n: 1, s: 'plain' }, fake, ctx);
        expect(out).toEqual({ a: ['0xAAAA', { b: [['x 0xAAAA y']] }], n: 1, s: 'plain' });
        expect(spy).toHaveBeenCalledTimes(1);
        spy.mockRestore();
    });

    it('fails with code -32001 and never returns a partial result', async () => {
        const error = await resolveNamesDeep(['alice.eth', 'bad.eth'], fake, ctx).catch((e) => e);
        expect(error).toBeInstanceOf(NameResolutionFailed);
        expect(error.code).toBe(NAME_RESOLUTION_FAILED);
        expect(error.message).toContain('bad.eth');
    });
});

const tx = (chain: 'evm' | 'sui' | 'aptos', extra: Partial<RequestItem>): RequestItem => ({
    id: 'r',
    name: 'r',
    type: RequestType.TRANSACTION,
    rpcParams: { method: '', params: [], chain },
    moveParams: { ...DEFAULT_MOVE_CALL },
    ...extra
});

describe('resolveRequestNames', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('leaves other chains untouched: a .eth string in a Sui request is not resolved', async () => {
        const request = tx('sui', { moveParams: { ...DEFAULT_MOVE_CALL, packageId: 'alice.eth' } });
        const out = await resolveRequestNames(request, 'mainnet', 'sui');
        expect(out.request).toBe(request);
        expect(out.resolutions).toEqual([]);
    });

    it('resolves Aptos names in arguments (but never in string-typed ones) and reports them', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(new Response(JSON.stringify([{ vec: ['0x00000000000000000000000000000000000000000000000000000000000000aa'] }])))
        );
        const request = tx('aptos', {
            aptosTxParams: {
                moduleAddress: '0x1',
                module: 'coin',
                function: 'transfer',
                typeArguments: [],
                arguments: [
                    { id: '1', type: 'address', value: 'alice.apt' },
                    { id: '2', type: 'string', value: 'alice.apt' },
                    { id: '3', type: 'u64', value: '5' }
                ]
            }
        });
        const out = await resolveRequestNames(request, 'mainnet', 'aptos');
        expect(out.request.aptosTxParams!.arguments.map((a) => a.value)).toEqual([
            '0x00000000000000000000000000000000000000000000000000000000000000aa',
            'alice.apt',
            '5'
        ]);
        expect(out.resolutions).toEqual([{ name: 'alice.apt', address: '0x00000000000000000000000000000000000000000000000000000000000000aa' }]);
    });

    it('an unregistered Aptos name fails with -32001 and the string is not sent', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{ vec: [] }]))));
        const request = tx('aptos', {
            aptosTxParams: {
                moduleAddress: '0x1', module: 'coin', function: 'transfer', typeArguments: [],
                arguments: [{ id: '1', type: 'address', value: 'ghost.apt' }]
            }
        });
        const error = await resolveRequestNames(request, 'mainnet', 'aptos').catch((e) => e);
        expect(error.code).toBe(-32001);
    });

    it('rejects Aptos names on networks without a name service', async () => {
        await expect(aptosNamesResolver.resolve('a.apt', { network: 'devnet' })).rejects.toThrow(/not available on devnet/);
    });
});

describe('helpers', () => {
    it('splits Aptos names', () => {
        expect(splitAptosName('alice.apt')).toEqual({ domain: 'alice' });
        expect(splitAptosName('pay.alice.apt')).toEqual({ domain: 'alice', subdomain: 'pay' });
        expect(splitAptosName('a.b.c.apt')).toBeNull();
    });
    it('parses federation config and vets URLs', () => {
        expect(federationServerFromToml('X=1\nFEDERATION_SERVER="https://fed.example.org/f"\n')).toBe('https://fed.example.org/f');
        expect(isPublicHttps('https://fed.example.org/f')).toBe(true);
        for (const bad of ['http://fed.example.org', 'https://127.0.0.1/x', 'https://localhost/x', 'https://intranet/x', 'nonsense']) {
            expect(isPublicHttps(bad)).toBe(false);
        }
    });
});
