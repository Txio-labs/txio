import type { TxHistoryItem } from '@/services/transactionHistory';

export type AssetTotal = { asset: string; amount: number };

/** Splits "245.13 USDC" into its number and asset. Returns null when the amount has no number. */
const parseAmount = (amount: string): { value: number; asset: string } | null => {
  const match = /^(-?\d[\d,]*(?:\.\d+)?)\s*(.*)$/.exec(amount.trim());
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? { value, asset: match[2].trim() || 'units' } : null;
};

/**
 * Sums received ("in") and sent ("out") amounts per asset across the loaded items.
 * Self transfers, unknown directions and rows without an amount are left out.
 */
export function historyTotals(items: TxHistoryItem[]): { in: AssetTotal[]; out: AssetTotal[] } {
  const totals = { in: new Map<string, number>(), out: new Map<string, number>() };
  for (const item of items) {
    if (item.direction !== 'in' && item.direction !== 'out') continue;
    if (!item.amount) continue;
    const parsed = parseAmount(item.amount);
    if (!parsed) continue;
    const map = totals[item.direction];
    map.set(parsed.asset, (map.get(parsed.asset) ?? 0) + parsed.value);
  }
  const toList = (map: Map<string, number>): AssetTotal[] =>
    [...map.entries()].map(([asset, amount]) => ({ asset, amount })).sort((a, b) => b.amount - a.amount);
  return { in: toList(totals.in), out: toList(totals.out) };
}

export const formatTotal = (total: AssetTotal): string =>
  `${total.amount.toLocaleString('en-GB', { maximumFractionDigits: 7 })} ${total.asset}`;
