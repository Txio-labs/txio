import { describe, it, expect, vi, afterEach } from 'vitest';
import { HORIZON_METHODS, callHorizon, horizonErrorMessage, isHorizonMethod } from './horizon';

describe('callHorizon', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('maps horizon_getAssets onto the assets path and omits an empty issuer', async () => {
        const fetchMock = vi.fn().mockImplementation(async () => new Response('{}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        await callHorizon('https://h', 'horizon_getAssets', ['USDC', '', 10]);
        expect(fetchMock.mock.calls[0][0]).toBe('https://h/assets?asset_code=USDC&limit=10');
    });

    it('returns the parsed JSON body with status', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"x"}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const res = await callHorizon('https://h', 'horizon_getAssets', ['USDC', 'GABC', 5]);
        expect(res).toMatchObject({ ok: true, status: 200, data: { id: 'x' } });
    });

    it('rejects unknown methods and missing params before any request', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        await expect(callHorizon('https://h', 'horizon_getAccount', [])).rejects.toThrow(/Unknown Horizon method/);
        await expect(callHorizon('https://h', 'getHealth', [])).rejects.toThrow(/Unknown Horizon method/);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('knows its own methods only', () => {
        expect(isHorizonMethod('horizon_getAssets')).toBe(true);
        expect(isHorizonMethod('horizon_getAccount')).toBe(false);
        expect(isHorizonMethod('toString')).toBe(false);
        expect(Object.keys(HORIZON_METHODS)).toEqual(['horizon_getAssets']);
        for (const spec of Object.values(HORIZON_METHODS)) expect(Array.isArray(spec.template)).toBe(true);
    });

    it('surfaces the problem+json detail', () => {
        expect(horizonErrorMessage({ title: 'Resource Missing', detail: 'The resource does not exist.' }, 404)).toBe(
            'The resource does not exist.'
        );
        expect(horizonErrorMessage({ title: 'Bad Request' }, 400)).toBe('Bad Request');
        expect(horizonErrorMessage(null, 503)).toBe('Horizon returned HTTP 503.');
    });
});
