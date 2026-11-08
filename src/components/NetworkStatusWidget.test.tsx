import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockAppStore } = vi.hoisted(() => ({
  mockAppStore: { network: 'mainnet' },
}));

const openTab = vi.fn();
const getChainRpcHealth = vi.fn();

vi.mock('@/lib/store', () => ({
  useAppStore: () => mockAppStore,
  appStore: {
    openTab: (...args: unknown[]) => openTab(...args),
  },
}));

vi.mock('@/services/suiService', () => ({
  getChainRpcHealth: (...args: unknown[]) => getChainRpcHealth(...args),
}));

import { NetworkStatusWidget } from './NetworkStatusWidget';

describe('NetworkStatusWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders every supported chain', async () => {
    getChainRpcHealth.mockResolvedValue({
      endpoint: 'https://example.org',
      latency: [88],
      successRate: 1,
      status: 'healthy',
      blockHeight: 100,
    });

    render(<NetworkStatusWidget />);

    for (const label of ['Sui', 'Ethereum / EVM', 'Stellar', 'Solana', 'Aptos']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    await waitFor(() => expect(getChainRpcHealth).toHaveBeenCalledTimes(5));
  });

  it('shows real latency and a Healthy status once health checks resolve', async () => {
    getChainRpcHealth.mockResolvedValue({
      endpoint: 'https://example.org',
      latency: [88],
      successRate: 1,
      status: 'healthy',
      blockHeight: 100,
    });

    render(<NetworkStatusWidget />);

    await waitFor(() => {
      expect(screen.getAllByText('Healthy').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('88ms').length).toBeGreaterThan(0);
  });

  it('shows Down when a health check fails', async () => {
    getChainRpcHealth.mockRejectedValue(new Error('network error'));

    render(<NetworkStatusWidget />);

    await waitFor(() => {
      expect(screen.getAllByText('Down').length).toBeGreaterThan(0);
    });
  });

  it('navigates to the networks tab from the header action', () => {
    getChainRpcHealth.mockResolvedValue({
      endpoint: 'https://example.org',
      latency: [1],
      successRate: 1,
      status: 'healthy',
      blockHeight: 1,
    });

    render(<NetworkStatusWidget />);
    fireEvent.click(screen.getByText('Networks'));

    expect(openTab).toHaveBeenCalledWith('infrastructure');
  });
});
