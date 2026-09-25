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

const xbullConnect = vi.fn();
const xbullSign = vi.fn();
const xbullCloseConnections = vi.fn();

vi.mock('@creit.tech/xbull-wallet-connect', () => ({
    xBullWalletConnect: vi.fn().mockImplementation(function (this: unknown) {
        Object.assign(this as object, {
            connect: xbullConnect,
            sign: xbullSign,
            closeConnections: xbullCloseConnections
        });
    })
}));

import { requestAccess } from '@stellar/freighter-api';
import { closeXBullBridge, connectStellarWallet, signStellarTransaction } from './stellar';

describe('connectStellarWallet', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete window.albedo;
        delete window.rabet;
        delete window.hana;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('connects xBull via the xBullWalletConnect bridge instead of Freighter', async () => {
        xbullConnect.mockResolvedValue('GXBULLPUBLICKEY');

        const wallet = await connectStellarWallet('xbull');

        expect(xbullConnect).toHaveBeenCalled();
        expect(requestAccess).not.toHaveBeenCalled();
        expect(wallet).toMatchObject({
            id: 'xbull',
            name: 'xBull',
            address: 'GXBULLPUBLICKEY',
            family: 'stellar'
        });
    });

    it('closes any prior xBull bridge before starting a new connect attempt', async () => {
        xbullConnect.mockResolvedValue('GXBULLPUBLICKEY');

        await connectStellarWallet('xbull');
        await connectStellarWallet('xbull');

        expect(xbullCloseConnections).toHaveBeenCalledTimes(2);
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

    it('throws when xBull returns no public key', async () => {
        xbullConnect.mockResolvedValue(undefined);

        await expect(
            connectStellarWallet('xbull')
        ).rejects.toThrow(/did not return a public key/i);
        expect(requestAccess).not.toHaveBeenCalled();
    });

    it('rejects unknown stellar wallet ids', async () => {
        await expect(
            // @ts-expect-error intentional bad id
            connectStellarWallet('not-a-wallet')
        ).rejects.toThrow(/not supported/i);
        expect(requestAccess).not.toHaveBeenCalled();
    });

    it('times out a hanging xBull connect call', async () => {
        vi.useFakeTimers();

        xbullConnect.mockImplementation(() => new Promise(() => undefined));

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
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('signs via the xBullWalletConnect bridge and returns the signed XDR', async () => {
        xbullSign.mockResolvedValue('SIGNED_XDR_STRING');

        const signed = await signStellarTransaction(
            'xbull',
            'UNSIGNED_XDR',
            'Test SDF Network ; September 2015',
            'GXBULLPUBLICKEY'
        );

        expect(xbullSign).toHaveBeenCalledWith({
            xdr: 'UNSIGNED_XDR',
            publicKey: 'GXBULLPUBLICKEY',
            network: 'Test SDF Network ; September 2015'
        });
        expect(signed).toBe('SIGNED_XDR_STRING');
    });

    it('throws when xBull declines to sign', async () => {
        xbullSign.mockResolvedValue(undefined);

        await expect(
            signStellarTransaction('xbull', 'UNSIGNED_XDR', 'network', 'GADDR')
        ).rejects.toThrow(/declined to sign/i);
    });

    it('reuses the same bridge instance connect() established for a later sign()', async () => {
        xbullConnect.mockResolvedValue('GXBULLPUBLICKEY');
        xbullSign.mockResolvedValue('SIGNED_XDR');

        const { xBullWalletConnect } = await import('@creit.tech/xbull-wallet-connect');

        await connectStellarWallet('xbull');
        await signStellarTransaction('xbull', 'UNSIGNED_XDR', 'network', 'GXBULLPUBLICKEY');

        // connect() creates one bridge; sign() must reuse it, not construct another.
        expect(vi.mocked(xBullWalletConnect)).toHaveBeenCalledTimes(1);
    });

    it('closeXBullBridge() closes and drops the bridge so the next call creates a fresh one', async () => {
        xbullConnect.mockResolvedValue('GXBULLPUBLICKEY');

        const { xBullWalletConnect } = await import('@creit.tech/xbull-wallet-connect');

        await connectStellarWallet('xbull');
        closeXBullBridge();
        await signStellarTransaction('xbull', 'UNSIGNED_XDR', 'network', 'GXBULLPUBLICKEY');

        expect(xbullCloseConnections).toHaveBeenCalled();
        expect(vi.mocked(xBullWalletConnect)).toHaveBeenCalledTimes(2);
    });

    it('rejects wallets with no signing support', async () => {
        await expect(
            signStellarTransaction('albedo', 'UNSIGNED_XDR', 'network', 'GADDR')
        ).rejects.toThrow(/does not support signing/i);
    });
});
