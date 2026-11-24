import { describe, expect, it } from 'vitest';
import type { TxHistoryItem } from '@/services/transactionHistory';
import { formatTotal, historyTotals } from './historyTotals';

const item = (direction: TxHistoryItem['direction'], amount: string | null): TxHistoryItem => ({
  hash: `${direction}-${amount}`,
  timestamp: 1,
  direction,
  counterparty: null,
  amount,
  status: 'success',
  explorerUrl: null,
  label: 'payment',
});

describe('historyTotals', () => {
  it('sums received and sent amounts separately, per asset', () => {
    const totals = historyTotals([
      item('in', '245.1300000 USDC'),
      item('in', '10.7000000 USDC'),
      item('in', '545.1999000 XLM'),
      item('out', '1979.6160000 USDC'),
    ]);
    expect(totals.in.map((t) => t.asset)).toEqual(['XLM', 'USDC']);
    expect(totals.in[0].amount).toBeCloseTo(545.1999, 6);
    expect(totals.in[1].amount).toBeCloseTo(255.83, 6);
    expect(totals.out).toHaveLength(1);
    expect(totals.out[0].amount).toBeCloseTo(1979.616, 6);
  });

  it('leaves out self transfers, unknown directions and rows without an amount', () => {
    const totals = historyTotals([item('self', '5 XLM'), item('unknown', '5 XLM'), item('in', null), item('out', 'n/a')]);
    expect(totals).toEqual({ in: [], out: [] });
  });

  it('formats a total with its asset', () => {
    expect(formatTotal({ asset: 'USDC', amount: 1234.5 })).toBe('1,234.5 USDC');
  });
});
