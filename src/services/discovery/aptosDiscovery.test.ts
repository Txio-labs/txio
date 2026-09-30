import { describe, it, expect, vi, afterEach } from 'vitest';
import { aptosDiscoveryAdapter, isAptosAddress, parseAptosModules, type AptosModuleAbiResponse } from './aptosDiscovery';
import { DiscoveryError } from './types';

const coinModule: AptosModuleAbiResponse = {
    abi: {
        address: '0x1',
        name: 'coin',
        exposed_functions: [
            {
                name: 'transfer',
                visibility: 'public',
                is_entry: true,
                is_view: false,
                generic_type_params: [{ constraints: [] }],
                params: ['&signer', 'address', 'u64'],
                return: []
            },
            {
                name: 'balance',
                visibility: 'public',
                is_entry: false,
                is_view: true,
                generic_type_params: [{ constraints: [] }],
                params: ['address'],
                return: ['u64']
            }
        ]
    }
};

describe('parseAptosModules', () => {
    it('keeps entry flags, generics and marks the signer as wallet-supplied', () => {
        const [mod] = parseAptosModules([coinModule]);
        const transfer = mod.functions.find((f) => f.name === 'transfer')!;
        expect(mod.name).toBe('coin');
        expect(transfer.isEntry).toBe(true);
        expect(transfer.typeParameters).toEqual([{ name: 'T0', constraints: [] }]);
        expect(transfer.parameters[0]).toMatchObject({ type: '&signer', kind: 'system', resolution: 'wallet', required: false });
        expect(transfer.parameters[1]).toMatchObject({ type: 'address', kind: 'address', resolution: 'user_input' });
        expect(mod.functions.find((f) => f.name === 'balance')!.isEntry).toBe(false);
    });

    it('skips items that carry no ABI', () => {
        expect(parseAptosModules([{}, coinModule])).toHaveLength(1);
    });
});

describe('isAptosAddress', () => {
    it('accepts short and full hex addresses only', () => {
        expect(isAptosAddress('0x1')).toBe(true);
        expect(isAptosAddress(`0x${'a'.repeat(64)}`)).toBe(true);
        expect(isAptosAddress('1')).toBe(false);
        expect(isAptosAddress('0xzz')).toBe(false);
        expect(isAptosAddress(`0x${'a'.repeat(65)}`)).toBe(false);
    });
});

describe('aptosDiscoveryAdapter.discoverPackage', () => {
    afterEach(() => vi.unstubAllGlobals());

    const respond = (body: unknown, init: { status?: number; cursor?: string } = {}) =>
        new Response(JSON.stringify(body), {
            status: init.status ?? 200,
            headers: init.cursor ? { 'x-aptos-cursor': init.cursor } : {}
        });

    it('rejects a malformed address before any network call', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        await expect(aptosDiscoveryAdapter.discoverPackage('nope', 'mainnet')).rejects.toMatchObject({ code: 'INVALID_IDENTIFIER' });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('follows the pagination cursor', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(respond([coinModule], { cursor: 'next' }))
            .mockResolvedValueOnce(respond([{ abi: { ...coinModule.abi!, name: 'other' } }]));
        vi.stubGlobal('fetch', fetchMock);
        const pkg = await aptosDiscoveryAdapter.discoverPackage('0x1', 'mainnet');
        expect(pkg.modules.map((m) => m.name)).toEqual(['coin', 'other']);
        expect(String(fetchMock.mock.calls[1][0])).toContain('start=next');
    });

    it('reports an empty account and a missing account distinctly', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(respond([])));
        await expect(aptosDiscoveryAdapter.discoverPackage('0x1', 'testnet')).rejects.toMatchObject({ code: 'NOT_FOUND' });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(respond({}, { status: 404 })));
        await expect(aptosDiscoveryAdapter.discoverPackage('0x2', 'testnet')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('maps network failure to RPC_FAILURE', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
        const error = await aptosDiscoveryAdapter.discoverPackage('0x1', 'mainnet').catch((e) => e);
        expect(error).toBeInstanceOf(DiscoveryError);
        expect(error.code).toBe('RPC_FAILURE');
    });
});
