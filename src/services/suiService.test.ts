import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
    executeChainRpc,
    resolveSuiAddress
} from './suiService';

const fetchMock = vi.fn<typeof fetch>();

const jsonResponse = (
    body: unknown,
    status = 200
) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json'
        }
    });

describe('resolveSuiAddress', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('caches a resolved SuiNS address within the TTL', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                jsonrpc: '2.0',
                id: 1,
                result: '0x111111'
            })
        );

        const firstResult = await resolveSuiAddress(
            'mainnet',
            'cache-test-unique.sui'
        );

        const secondResult = await resolveSuiAddress(
            'mainnet',
            'cache-test-unique.sui'
        );

        expect(firstResult).toBe('0x111111');
        expect(secondResult).toBe('0x111111');
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('re-resolves a SuiNS name after the cache expires', async () => {
        vi.useFakeTimers();

        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    jsonrpc: '2.0',
                    id: 1,
                    result: '0x111111'
                })
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    jsonrpc: '2.0',
                    id: 1,
                    result: '0x222222'
                })
            );

        const firstResult = await resolveSuiAddress(
            'mainnet',
            'expiration-test-unique.sui'
        );

        expect(firstResult).toBe('0x111111');
        expect(fetchMock).toHaveBeenCalledOnce();

        vi.advanceTimersByTime(5 * 60 * 1000 + 1);

        const secondResult = await resolveSuiAddress(
            'mainnet',
            'expiration-test-unique.sui'
        );

        expect(secondResult).toBe('0x222222');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
describe('executeChainRpc on Soroban RPC', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('resolves a "latest-N" startLedger against the latest ledger when the request runs', async () => {
        fetchMock.mockImplementation(async (_url, init) => {
            const { method } = JSON.parse(String(init?.body));
            return jsonResponse({ jsonrpc: '2.0', id: 1, result: method === 'getLatestLedger' ? { sequence: 5000 } : { events: [] } });
        });

        await executeChainRpc('stellar', 'testnet', 'getEvents', [{ startLedger: 'latest-1000', filters: [] }]);

        const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
        expect(bodies.map((b) => b.method)).toEqual(['getLatestLedger', 'getEvents']);
        expect(bodies[1].params).toEqual({ startLedger: 4000, filters: [] });
    });

    it('leaves a numeric startLedger alone', async () => {
        fetchMock.mockImplementation(async () => jsonResponse({ jsonrpc: '2.0', id: 1, result: { events: [] } }));

        await executeChainRpc('stellar', 'testnet', 'getEvents', [{ startLedger: 123 }]);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).params).toEqual({ startLedger: 123 });
    });
});
