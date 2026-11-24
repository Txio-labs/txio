import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/store', () => ({ useAppStore: () => ({ network: 'testnet' }) }));

const mocks = vi.hoisted(() => ({
  getSuiTransaction: vi.fn(),
  getSuiPackage: vi.fn(),
  getSuiObject: vi.fn(),
  getSuiCheckpoint: vi.fn(),
  getSuiCheckpoints: vi.fn(),
  getSuiEvents: vi.fn(),
  getSuiCoin: vi.fn(),
}));
vi.mock('@/services/suiExplorer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/suiExplorer')>();
  return { ...actual, ...mocks };
});

import { SuiExplorerFeature } from './SuiExplorer';
const { getSuiTransaction, getSuiPackage, getSuiObject, getSuiCheckpoint, getSuiCheckpoints, getSuiEvents, getSuiCoin } = mocks;

const renderWith = (initialQuery = '') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SuiExplorerFeature initialQuery={initialQuery} />
    </QueryClientProvider>
  );
};

describe('SuiExplorerFeature', () => {
  it('shows transaction status, gas and balance changes for a digest', async () => {
    getSuiTransaction.mockResolvedValue({
      digest: 'DIGEST',
      sender: '0xabc',
      status: 'success',
      timestamp: null,
      checkpoint: '42',
      epoch: '3',
      kind: 'Programmable',
      gas: { computation: '1000000', storage: '0', rebate: '0', budget: '5000000', price: '1000' },
      balanceChanges: [{ owner: '0xabc', amount: '-1500000000', coinType: '0x2::sui::SUI' }],
      events: [],
    });

    renderWith('FfhSmXE9bYtGZ7wrxtwJ2Eq3ZEw3uZxwUVhgSbwgtTmU');

    await waitFor(() => expect(screen.getByText('Balance changes (1)')).toBeInTheDocument());
    expect(screen.getByText('success')).toBeInTheDocument();
    expect(screen.getByText('-1.5 SUI')).toBeInTheDocument();
    expect(getSuiTransaction).toHaveBeenCalledWith('testnet', 'FfhSmXE9bYtGZ7wrxtwJ2Eq3ZEw3uZxwUVhgSbwgtTmU');
  });

  it('rejects input that is neither a digest nor an id', () => {
    renderWith();
    fireEvent.change(screen.getByLabelText('Sui search'), { target: { value: 'not valid!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByText(/Enter a transaction digest/)).toBeInTheDocument();
  });

  it('checks packages before plain objects for an id', async () => {
    getSuiPackage.mockResolvedValue({ packageId: '0x2', version: '1', modules: ['coin', 'sui'] });
    renderWith('0x2');
    await waitFor(() => expect(screen.getByText('coin')).toBeInTheDocument());
    expect(screen.getByText('coin')).toBeInTheDocument();
    expect(getSuiObject).not.toHaveBeenCalled();
  });

  it('shows the live feed on the landing page', async () => {
    getSuiCheckpoints.mockResolvedValue([{ sequenceNumber: '77', digest: 'x', timestamp: null, epoch: '9', networkTotalTransactions: '1' }]);
    getSuiEvents.mockResolvedValue([
      { sender: null, timestamp: null, eventType: '0xp::store::Recorded', moduleName: 'store', packageId: '0xp', transactionDigest: 'TXD', json: null },
    ]);
    renderWith();
    await waitFor(() => expect(screen.getByText('#77')).toBeInTheDocument());
    expect(screen.getByText('0xp::store::Recorded')).toBeInTheDocument();
  });

  it('shows a checkpoint with its transactions', async () => {
    getSuiCheckpoint.mockResolvedValue({
      sequenceNumber: '410202450',
      digest: 'CKD',
      previousDigest: 'PRV',
      timestamp: null,
      epoch: '1293',
      networkTotalTransactions: '4339132754',
      transactions: [{ digest: 'TXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', sender: null, status: 'success' }],
    });
    renderWith('410202450');
    await waitFor(() => expect(screen.getByText('Transactions (1)')).toBeInTheDocument());
    expect(getSuiCheckpoint).toHaveBeenCalledWith('testnet', '410202450');
  });

  it('shows coin metadata for a coin type', async () => {
    getSuiCoin.mockResolvedValue({ coinType: '0x2::sui::SUI', address: '0xf', symbol: 'SUI', name: 'Sui', decimals: 9, description: null, iconUrl: null });
    renderWith('0x2::sui::SUI');
    await waitFor(() => expect(screen.getByText('Decimals')).toBeInTheDocument());
    expect(screen.getByText('Sui')).toBeInTheDocument();
  });
});
