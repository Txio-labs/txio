import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectAptosWallet, restoreAptosWallet } from './aptos';

describe('Aptos Wallet', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // @ts-expect-error test double
        delete window.aptos;
        // @ts-expect-error test double
        delete window.martian;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('connectAptosWallet', () => {
        it('connects Petra when provider is present', async () => {
            // @ts-expect-error test double
            window.aptos = {
                connect: vi.fn().mockResolvedValue({ address: '0xpetra123' })
            };

            const wallet = await connectAptosWallet('petra');
            expect(wallet).toMatchObject({
                id: 'petra',
                name: 'Petra',
                address: '0xpetra123',
                family: 'aptos'
            });
        });

        it('connects Martian when provider is present', async () => {
            // @ts-expect-error test double
            window.martian = {
                connect: vi.fn().mockResolvedValue({ address: '0xmartian456' })
            };

            const wallet = await connectAptosWallet('martian');
            expect(wallet).toMatchObject({
                id: 'martian',
                name: 'Martian',
                address: '0xmartian456',
                family: 'aptos'
            });
        });

        it('fails fast if wallet is not installed', async () => {
            await expect(connectAptosWallet('petra')).rejects.toThrow(
                /Petra is not installed/i
            );
        });

        it('rejects unsupported wallet ids', async () => {
            // @ts-expect-error intentional bad id
            await expect(connectAptosWallet('unknown-wallet')).rejects.toThrow(
                /not supported/i
            );
        });
    });

    describe('restoreAptosWallet (silent restoration)', () => {
        it('restores connected wallet silently when isConnected and account are available', async () => {
            // @ts-expect-error test double
            window.aptos = {
                isConnected: vi.fn().mockResolvedValue(true),
                account: vi.fn().mockResolvedValue({ address: '0xpetra_restored' }),
                connect: vi.fn()
            };

            const wallet = await restoreAptosWallet('petra');
            expect(wallet).toMatchObject({
                id: 'petra',
                address: '0xpetra_restored',
                family: 'aptos'
            });
            expect((window as any).aptos.connect).not.toHaveBeenCalled();
        });

        it('returns null if isConnected returns false', async () => {
            // @ts-expect-error test double
            window.aptos = {
                isConnected: vi.fn().mockResolvedValue(false),
                account: vi.fn(),
                connect: vi.fn()
            };

            const wallet = await restoreAptosWallet('petra');
            expect(wallet).toBeNull();
            expect((window as any).aptos.connect).not.toHaveBeenCalled();
        });

        it('returns null and NEVER calls connect() if silent check is unavailable', async () => {
            const connectMock = vi.fn().mockResolvedValue({ address: '0xpopup_address' });
            // @ts-expect-error test double: provider only exposes connect, no isConnected / account
            window.aptos = {
                connect: connectMock
            };

            const wallet = await restoreAptosWallet('petra');
            expect(wallet).toBeNull();
            expect(connectMock).not.toHaveBeenCalled();
        });

        it('returns null when provider is missing', async () => {
            const wallet = await restoreAptosWallet('petra');
            expect(wallet).toBeNull();
        });
    });
});
