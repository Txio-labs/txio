import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HistoryList } from './HistoryList';
import type { TxHistoryItem } from '@/services/transactionHistory';

const items: TxHistoryItem[] = [
  {
    hash: '2e16',
    timestamp: 1795430531,
    direction: 'out',
    counterparty: 'GB3JS2AJZ3FKIGVOOPXDEYYR3XOHQA474WGCYAMNFSGX6OW5HGWCKUZW',
    amount: '0.1500000 XLM',
    status: 'success',
    explorerUrl: 'https://stellar.expert/explorer/public/tx/2e16',
    label: 'payment',
  },
  {
    hash: 'dac9',
    timestamp: 1795430481,
    direction: 'self',
    counterparty: null,
    amount: '0.0000000 USDC',
    status: 'failed',
    explorerUrl: null,
    label: 'path payment strict send',
  },
];

describe('HistoryList', () => {
  it('shows each transaction with its amount, status and explorer link', () => {
    render(<HistoryList items={items} />);
    expect(screen.getByText('2 transactions')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('0.1500000 XLM')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in explorer' })).toHaveAttribute('href', 'https://stellar.expert/explorer/public/tx/2e16');
    expect(screen.getByText(/23 Nov, 10:42 UTC/)).toBeInTheDocument();
  });

  it('shows the warning when there are no transactions', () => {
    render(<HistoryList items={[]} warning="Horizon is unreachable." />);
    expect(screen.getByText('Horizon is unreachable.')).toBeInTheDocument();
  });
});
