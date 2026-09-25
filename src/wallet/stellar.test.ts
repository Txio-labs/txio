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
import { connectStellarWallet, signStellarTransaction } from './stellar';

describe('connectStellarWallet', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete window.albedo;
        delete window.xBullSDK;
        delete window.rabet;
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

describe('signStellarTransaction (xBull)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete window.xBullSDK;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('signs via xBullSDK.signXDR and returns the signed XDR', async () => {
        const signXDR = vi.fn().mockResolvedValue('SIGNED_XDR_STRING');
        window.xBullSDK = { signXDR };

        const signed = await signStellarTransaction(
            'xbull',
            'UNSIGNED_XDR',
            'Test SDF Network ; September 2015',
            'GXBULLPUBLICKEY'
        );

        expect(signXDR).toHaveBeenCalledWith('UNSIGNED_XDR', {
            network: 'Test SDF Network ; September 2015',
            publicKey: 'GXBULLPUBLICKEY'
        });
        expect(signed).toBe('SIGNED_XDR_STRING');
    });

    it('accepts a { signedXDR } response shape from xBullSDK.signXDR', async () => {
        window.xBullSDK = {
            signXDR: vi.fn().mockResolvedValue({ signedXDR: 'SIGNED_XDR_OBJECT' })
        };

        const signed = await signStellarTransaction('xbull', 'UNSIGNED_XDR', 'network', 'GADDR');
        expect(signed).toBe('SIGNED_XDR_OBJECT');
    });

    it('throws when xBull declines to sign', async () => {
        window.xBullSDK = { signXDR: vi.fn().mockResolvedValue(undefined) };

        await expect(
            signStellarTransaction('xbull', 'UNSIGNED_XDR', 'network', 'GADDR')
        ).rejects.toThrow(/declined to sign/i);
    });

    it('throws when xBull is not installed', async () => {
        await expect(
            signStellarTransaction('xbull', 'UNSIGNED_XDR', 'network', 'GADDR')
        ).rejects.toThrow(/not installed|does not support signing/i);
    });

    it('rejects wallets with no signing support', async () => {
        await expect(
            signStellarTransaction('albedo', 'UNSIGNED_XDR', 'network', 'GADDR')
        ).rejects.toThrow(/does not support signing/i);
    });
});
