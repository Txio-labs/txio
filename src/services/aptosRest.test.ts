import { describe, it, expect, vi, afterEach } from 'vitest';
import { APTOS_REST_METHODS, aptosErrorMessage, callAptosRest } from './aptosRest';

describe('callAptosRest', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('maps a named method onto its REST path', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('"11120868786"', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const res = await callAptosRest('https://node/v1/', 'getAccountBalance', ['0x1', '0x1::aptos_coin::AptosCoin']);
        expect(fetchMock.mock.calls[0][0]).toBe('https://node/v1/accounts/0x1/balance/0x1%3A%3Aaptos_coin%3A%3AAptosCoin');
        expect(res).toMatchObject({ ok: true, status: 200, data: '11120868786' });
    });

    it('POSTs the view payload as the body', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('["1"]', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const payload = { function: '0x1::coin::balance', type_arguments: [], arguments: ['0x1'] };
        await callAptosRest('https://node/v1', 'view', [payload]);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://node/v1/view');
        expect(init.method).toBe('POST');
        expect(JSON.parse(init.body)).toEqual(payload);
    });

    it('rejects unknown methods and missing params before any request', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        await expect(callAptosRest('https://node/v1', 'eth_call', [])).rejects.toThrow(/Unknown Aptos method/);
        await expect(callAptosRest('https://node/v1', 'getAccount', [])).rejects.toThrow(/Missing address/);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('exposes a template for every method', () => {
        for (const spec of Object.values(APTOS_REST_METHODS)) expect(Array.isArray(spec.template)).toBe(true);
    });

    it('surfaces the fullnode error message', () => {
        expect(aptosErrorMessage({ message: 'Block(1) has been pruned' }, 410)).toBe('Block(1) has been pruned');
        expect(aptosErrorMessage('plain text reason', 400)).toBe('plain text reason');
        expect(aptosErrorMessage('', 500)).toBe('Aptos fullnode returned HTTP 500.');
    });
});
