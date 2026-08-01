import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@stellar/freighter-api', () => ({
    getAddress: vi.fn(),
    isConnected: vi.fn(),
    requestAccess: vi.fn()
}));

vi.mock('@lobstrco/signer-extension-api', () => ({
    getPublicKey: vi.fn(),
    isConnected: vi.fn()
}));

import { requestAccess } from '@stellar/freighter-api';
import { connectStellarWallet } from './stellar';

describe('connectStellarWallet', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // @ts-expect-error test double
        delete window.albedo;
        // @ts-expect-error test double
        delete window.xBullSDK;
        // @ts-expect-error test double
        delete window.rabet;
        // @ts-expect-error test double
        delete window.hana;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('connects xBull via xBullSDK instead of Freighter', async () => {
        const connect = vi.fn().mockResolvedValue(undefined);
        const getPublicKeys = vi
            .fn()
            .mockResolvedValue([{ publicKey: 'GXBULLPUBLICKEY' }]);

        // @ts-expect-error test double
        window.xBullSDK = { connect, getPublicKeys };

        const wallet = await connectStellarWallet('xbull');

        expect(connect).toHaveBeenCalled();
        expect(getPublicKeys).toHaveBeenCalled();
        expect(requestAccess).not.toHaveBeenCalled();
        expect(wallet).toMatchObject({
            id: 'xbull',
            name: 'xBull',
            address: 'GXBULLPUBLICKEY',
            family: 'stellar'
        });
    });

    it('connects Albedo via window.albedo.publicKey', async () => {
        // @ts-expect-error test double
        window.albedo = {
            publicKey: vi
                .fn()
                .mockResolvedValue({ pubkey: 'GALBEDOPUBLICKEY' })
        };

        const wallet = await connectStellarWallet('albedo');

        expect(requestAccess).not.toHaveBeenCalled();
        expect(wallet).toMatchObject({
            id: 'albedo',
            address: 'GALBEDOPUBLICKEY'
        });
    });

    it('connects Rabet via window.rabet.connect', async () => {
        // @ts-expect-error test double
        window.rabet = {
            connect: vi
                .fn()
                .mockResolvedValue({ publicKey: 'GRABETPUBLICKEY' })
        };

        const wallet = await connectStellarWallet('rabet');

        expect(requestAccess).not.toHaveBeenCalled();
        expect(wallet).toMatchObject({
            id: 'rabet',
            address: 'GRABETPUBLICKEY'
        });
    });

    it('connects Hana via window.hana.getPublicKey', async () => {
        // @ts-expect-error test double
        window.hana = {
            getPublicKey: vi
                .fn()
                .mockResolvedValue('GHANAPUBLICKEY')
        };

        const wallet = await connectStellarWallet('hana-wallet');

        expect(requestAccess).not.toHaveBeenCalled();
        expect(wallet).toMatchObject({
            id: 'hana-wallet',
            name: 'Hana',
            address: 'GHANAPUBLICKEY'
        });
    });

    it('fails fast for missing xBull instead of hanging on Freighter', async () => {
        await expect(
            connectStellarWallet('xbull')
        ).rejects.toThrow(/xBull is not installed/i);
        expect(requestAccess).not.toHaveBeenCalled();
    });

    it('rejects unknown stellar wallet ids', async () => {
        await expect(
            // @ts-expect-error intentional bad id
            connectStellarWallet('not-a-wallet')
        ).rejects.toThrow(/not supported/i);
        expect(requestAccess).not.toHaveBeenCalled();
    });

    it('times out hanging wallet SDK calls', async () => {
        vi.useFakeTimers();

        // @ts-expect-error test double
        window.xBullSDK = {
            connect: () => new Promise(() => undefined)
        };

        const pending = connectStellarWallet('xbull');
        const expectation = expect(pending).rejects.toThrow(
            /timed out/i
        );

        await vi.advanceTimersByTimeAsync(30_000);
        await expectation;
        expect(requestAccess).not.toHaveBeenCalled();
    });
});
