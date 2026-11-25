import { describe, it, expect, vi, afterEach } from 'vitest';
import { HORIZON_METHODS, callHorizon, horizonErrorMessage, isHorizonMethod } from './horizon';

const G = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

describe('callHorizon', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('maps a named method onto its REST path', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"x"}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const res = await callHorizon('https://horizon-testnet.stellar.org/', 'horizon_getAccountPayments', [G, 500]);
        expect(fetchMock.mock.calls[0][0]).toBe(
            `https://horizon-testnet.stellar.org/accounts/${G}/payments?order=desc&limit=200&include_failed=true`
        );
        expect(res).toMatchObject({ ok: true, status: 200, data: { id: 'x' } });
    });

    it('hits the root for horizon_getRoot and omits an empty issuer', async () => {
        const fetchMock = vi.fn().mockImplementation(async () => new Response('{}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        await callHorizon('https://h', 'horizon_getRoot', []);
        await callHorizon('https://h', 'horizon_getAssets', ['USDC', '', 10]);
        expect(fetchMock.mock.calls[0][0]).toBe('https://h');
        expect(fetchMock.mock.calls[1][0]).toBe('https://h/assets?asset_code=USDC&limit=10');
    });

    it('rejects unknown methods and missing params before any request', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        await expect(callHorizon('https://h', 'getHealth', [])).rejects.toThrow(/Unknown Horizon method/);
        await expect(callHorizon('https://h', 'horizon_getAccount', [])).rejects.toThrow(/Missing account/);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('knows its own methods only', () => {
        expect(isHorizonMethod('horizon_getFeeStats')).toBe(true);
        expect(isHorizonMethod('getFeeStats')).toBe(false);
        expect(isHorizonMethod('toString')).toBe(false);
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
