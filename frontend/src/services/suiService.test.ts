import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
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