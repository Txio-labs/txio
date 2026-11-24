import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/store', () => ({ useAppStore: () => ({ network: 'mainnet' }) }));

const mocks = vi.hoisted(() => ({
  getEvmTransaction: vi.fn(),
  getEvmAddress: vi.fn(),
  getEvmLatestTransactions: vi.fn(),
}));
vi.mock('@/services/evmExplorer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/evmExplorer')>();
  return { ...actual, ...mocks };
});

import { EvmExplorerFeature } from './EvmExplorer';
const { getEvmTransaction, getEvmAddress, getEvmLatestTransactions } = mocks;

const HASH = `0x${'ab'.repeat(32)}`;
const ADDR = `0x${'cd'.repeat(20)}`;

const renderWith = (initialQuery = '') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EvmExplorerFeature initialQuery={initialQuery} chainId={1} />
    </QueryClientProvider>
  );
};

describe('EvmExplorerFeature', () => {
  it('shows transaction value, status and token transfers', async () => {
    getEvmTransaction.mockResolvedValue({
      tx: {
        hash: HASH, status: 'success', blockNumber: '5', timestamp: null, from: ADDR, to: null,
        createdContract: null, valueWei: '1500000000000000000', gasUsed: '21000', gasPriceWei: '1000000000',
        feeWei: '21000000000000', method: null, txTypes: [], revertReason: null,
      },
      tokenTransfers: [{ from: ADDR, to: ADDR, tokenAddress: null, symbol: 'USDT', decimals: 6, value: '2500000' }],
    });
    renderWith(HASH);
    await waitFor(() => expect(screen.getByText('1.5 ETH')).toBeInTheDocument());
    expect(screen.getByText('success')).toBeInTheDocument();
    expect(screen.getByText('2.5 USDT')).toBeInTheDocument();
    expect(getEvmTransaction).toHaveBeenCalledWith(1, HASH);
  });

  it('shows balances and tokens for an address', async () => {
    getEvmAddress.mockResolvedValue({
      address: { address: ADDR, coinBalanceWei: '2000000000000000000', isContract: false, ensName: null, exchangeRate: null, transactionsCount: null },
      tokens: [{ tokenAddress: '0xc0', name: 'WETH', symbol: 'WETH', decimals: 18, valueRaw: '1000000000000000000' }],
      transactions: [],
    });
    renderWith(ADDR);
    await waitFor(() => expect(screen.getByText('2 ETH')).toBeInTheDocument());
    expect(screen.getByText('WETH')).toBeInTheDocument();
    expect(screen.getByText('No transactions.')).toBeInTheDocument();
  });

  it('shows the latest transactions on the landing page', async () => {
    getEvmLatestTransactions.mockResolvedValue([
      { hash: HASH, status: 'success', timestamp: null, from: ADDR, to: ADDR, valueWei: '0', method: 'transfer' },
    ]);
    renderWith();
    await waitFor(() => expect(screen.getByText('transfer')).toBeInTheDocument());
  });

  it('rejects input that is neither a hash nor an address', () => {
    renderWith();
    fireEvent.change(screen.getByLabelText('EVM search'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByText(/Enter a transaction hash/)).toBeInTheDocument();
  });
});
