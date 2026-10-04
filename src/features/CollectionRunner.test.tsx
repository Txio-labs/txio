import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mocks = vi.hoisted(() => ({ executeChainRpc: vi.fn(), simulateMoveCall: vi.fn(), simulateTransaction: vi.fn() }));

// The real store hands out one stable snapshot; a fresh object per render would
// make the runner see a "new" collection every time.
const snapshot = vi.hoisted(() => ({
    collections: [
        {
            id: 'c1', type: 'collection', name: 'Smoke',
            children: [
                { id: 'r1', type: 'request', name: 'Balance', requestData: { id: 'r1', name: 'Balance', type: 'rpc', rpcParams: { method: 'suix_getAllBalances', params: [], chain: 'sui' }, moveParams: {} } },
                { id: 'r2', type: 'request', name: 'Gas', requestData: { id: 'r2', name: 'Gas', type: 'rpc', rpcParams: { method: 'eth_gasPrice', params: [], chain: 'evm' }, moveParams: {} } }
            ]
        }
    ],
    currentWorkspaceId: '', network: 'mainnet', envVariables: []
}));
vi.mock('@/lib/store', () => ({ useAppStore: () => snapshot }));
vi.mock('@/wallet', () => ({ useWallet: () => ({ linkedWallets: {} }) }));
vi.mock('@/lib/terminalLog', () => ({ ensureTerminalOpen: vi.fn() }));
vi.mock('../services/suiService', () => ({ executeChainRpc: mocks.executeChainRpc, simulateMoveCall: mocks.simulateMoveCall }));
vi.mock('../services/transactionService', () => ({ simulateTransaction: mocks.simulateTransaction }));

import { CollectionRunner } from './CollectionRunner';

describe('CollectionRunner', () => {
    beforeEach(() => {
        mocks.executeChainRpc.mockReset();
        mocks.executeChainRpc.mockResolvedValue({ result: {}, status: 200, duration: 4 });
    });

    it('keeps the classic single-network sequential run and offers exports afterwards', async () => {
        render(<CollectionRunner collectionId="c1" />);
        expect(screen.queryByText('Network')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /run collection/i }));
        await waitFor(() => expect(screen.getByText(/JSON/)).toBeTruthy());
        expect(mocks.executeChainRpc).toHaveBeenCalledTimes(2);
        expect(screen.getByText(/Markdown/)).toBeTruthy();
    });

    it('runs the collection once per selected network and skips repeat EVM cells', async () => {
        render(<CollectionRunner collectionId="c1" />);
        fireEvent.click(screen.getByRole('button', { name: 'testnet' }));
        expect(screen.getByText('Network')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /run collection/i }));
        await waitFor(() => expect(screen.getByText(/Markdown/)).toBeTruthy());
        // Sui on both networks + EVM once = 3 executions; the second EVM cell is skipped.
        expect(mocks.executeChainRpc).toHaveBeenCalledTimes(3);
        expect(screen.getByText(/1 Skipped/)).toBeTruthy();
    });

    it('keeps at least one network selected and can switch to parallel', () => {
        render(<CollectionRunner collectionId="c1" />);
        fireEvent.click(screen.getByRole('button', { name: 'mainnet' }));
        expect(screen.getByRole('button', { name: 'mainnet' }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: 'Parallel' }));
        expect(screen.getByLabelText(/concurrency/i)).toBeTruthy();
    });
});
