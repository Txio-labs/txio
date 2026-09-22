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

  it('renders the monitored chains and the configured-later chains as "Not configured"', async () => {
    getChainRpcHealth.mockResolvedValue({
      endpoint: 'https://example.org',
      latency: [88],
      successRate: 1,
      status: 'healthy',
      blockHeight: 100,
    });

    render(<NetworkStatusWidget />);

    expect(screen.getByText('Ethereum Mainnet')).toBeInTheDocument();
    expect(screen.getByText('Sui Mainnet')).toBeInTheDocument();
    expect(screen.getByText('Stellar Mainnet')).toBeInTheDocument();

    expect(screen.getByText('Solana Mainnet')).toBeInTheDocument();
    expect(screen.getByText('Bitcoin Mainnet')).toBeInTheDocument();
    expect(screen.getAllByText('Not configured').length).toBeGreaterThanOrEqual(4);
  });

  it('shows real latency and an Online status once health checks resolve', async () => {
    getChainRpcHealth.mockResolvedValue({
      endpoint: 'https://example.org',
      latency: [88],
      successRate: 1,
      status: 'healthy',
      blockHeight: 100,
    });

    render(<NetworkStatusWidget />);

    await waitFor(() => {
      expect(screen.getAllByText('Online').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('88ms').length).toBeGreaterThan(0);
  });

  it('shows Offline when a health check fails', async () => {
    getChainRpcHealth.mockRejectedValue(new Error('network error'));

    render(<NetworkStatusWidget />);

    await waitFor(() => {
      expect(screen.getAllByText('Offline').length).toBeGreaterThan(0);
    });
  });

  it('navigates to the infrastructure tab when "View all" is clicked', () => {
    getChainRpcHealth.mockResolvedValue({
      endpoint: 'https://example.org',
      latency: [1],
      successRate: 1,
      status: 'healthy',
      blockHeight: 1,
    });

    render(<NetworkStatusWidget />);
    fireEvent.click(screen.getByText('View all'));

    expect(openTab).toHaveBeenCalledWith('infrastructure');
  });
});
