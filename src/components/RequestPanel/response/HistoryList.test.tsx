import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HistoryList } from './HistoryList';
import type { TxHistoryItem } from '@/services/transactionHistory';

const items: TxHistoryItem[] = [
  {
    hash: '2e164dc7f45132534935a79c3174fa603927cbe60b6b48df2529a348728f02f4',
    timestamp: 1795430531,
    direction: 'out',
    counterparty: 'GB3JS2AJZ3FKIGVOOPXDEYYR3XOHQA474WGCYAMNFSGX6OW5HGWCKUZW',
    amount: '0.1500000 XLM',
    status: 'success',
    explorerUrl: 'https://stellar.expert/explorer/public/tx/2e16',
    label: 'payment',
  },
  {
    hash: 'dac9c263e873d6b5e66d2cc4d0e2d665b501c67ab868335251d10d81bfd69d1a',
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

  it('shows the full record when Details is opened', () => {
    render(<HistoryList items={items} />);
    expect(screen.queryByText(items[0].hash)).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Details' })[0]);
    expect(screen.getByText(items[0].hash)).toBeInTheDocument();
    expect(screen.getByText(items[0].counterparty as string)).toBeInTheDocument();
    expect(screen.getByText('2026-11-23 10:42:11 UTC')).toBeInTheDocument();
  });

  it('labels the counterparty of a received payment as From', () => {
    const received: TxHistoryItem[] = [{ ...items[0], direction: 'in', counterparty: 'GD6ERGKBPEZJGS2DJ2N24RIPX3F3BPJ4UUBCJLS763L2JXBHJQWVU6KZ' }];
    render(<HistoryList items={received} />);
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.queryByText('Counterparty')).toBeNull();
  });
});
