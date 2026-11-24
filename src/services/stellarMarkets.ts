import type { Network } from '@/types';
import { horizonGet } from './stellarExplorer';

// Stellar assets, DEX order books and trades, and liquidity pools, all read
// from Horizon. Prices and volumes come from Horizon trade aggregations.

const ISSUER_RE = /^G[A-Z2-7]{55}$/;
const CODE_RE = /^[A-Za-z0-9]{1,12}$/;

export interface StellarAssetRef {
  type: 'native' | 'credit_alphanum4' | 'credit_alphanum12';
  code: string;
  issuer?: string;
}

/** "XLM" for the native asset, or "CODE:G..." for an issued asset. */
export const parseAssetRef = (input: string): StellarAssetRef | null => {
  const value = input.trim();
  if (value.toUpperCase() === 'XLM') return { type: 'native', code: 'XLM' };
  const [code, issuer, ...rest] = value.split(':');
  if (rest.length || !code || !issuer) return null;
  if (!CODE_RE.test(code) || !ISSUER_RE.test(issuer)) return null;
  return { type: code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12', code, issuer };
};

/** Horizon query string for one side of a pair, e.g. `base_asset_type=native`. */
const assetParams = (prefix: string, asset: StellarAssetRef): string =>
  asset.type === 'native'
    ? `${prefix}_asset_type=native`
    : `${prefix}_asset_type=${asset.type}&${prefix}_asset_code=${encodeURIComponent(asset.code)}&${prefix}_asset_issuer=${asset.issuer}`;

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const records = (data: unknown): Record<string, unknown>[] => {
  const list = (data as { _embedded?: { records?: unknown } } | null)?._embedded?.records;
  return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
};
const clampLimit = (n: number) => Math.min(Math.max(Math.trunc(n) || 10, 1), 200);

export interface StellarAssetInfo {
  code: string;
  issuer: string;
  type: string;
  supply: string;
  holders: number;
  flags: { authRequired: boolean; authRevocable: boolean; authClawbackEnabled: boolean };
  claimableBalancesAmount: string;
  liquidityPoolsAmount: string;
}

export const getStellarAssets = async (network: Network, asset: StellarAssetRef, limit = 10): Promise<StellarAssetInfo[]> => {
  const query = `asset_code=${encodeURIComponent(asset.code)}${asset.issuer ? `&asset_issuer=${asset.issuer}` : ''}&limit=${clampLimit(limit)}`;
  const { status, data } = await horizonGet(network, `/assets?${query}`);
  if (status === 404) return [];
  return records(data).map((r) => {
    const flags = (r.flags ?? {}) as Record<string, unknown>;
    return {
      code: str(r.asset_code),
      issuer: str(r.asset_issuer),
      type: str(r.asset_type),
      supply: str(r.amount, '0'),
      holders: num(r.num_accounts),
      flags: {
        authRequired: flags.auth_required === true,
        authRevocable: flags.auth_revocable === true,
        authClawbackEnabled: flags.auth_clawback_enabled === true,
      },
      claimableBalancesAmount: str(r.claimable_balances_amount, '0'),
      liquidityPoolsAmount: str(r.liquidity_pools_amount, '0'),
    };
  });
};

export interface StellarAssetHolder {
  account: string;
  balance: string;
}

/** Accounts holding an issued asset, largest balance first. */
export const getStellarAssetHolders = async (network: Network, asset: StellarAssetRef, limit = 20): Promise<StellarAssetHolder[]> => {
  if (!asset.issuer) return [];
  const { status, data } = await horizonGet(
    network,
    `/accounts?asset=${encodeURIComponent(`${asset.code}:${asset.issuer}`)}&order=desc&limit=${clampLimit(limit)}`
  );
  if (status === 404) return [];
  return records(data).map((r) => {
    const balances = Array.isArray(r.balances) ? (r.balances as Record<string, unknown>[]) : [];
    const match = balances.find((b) => b.asset_code === asset.code && b.asset_issuer === asset.issuer);
    return { account: str(r.id), balance: str(match?.balance, '0') };
  });
};

export interface StellarOrderBook {
  bids: { price: string; amount: string }[];
  asks: { price: string; amount: string }[];
}

const mapLevels = (raw: unknown): { price: string; amount: string }[] =>
  (Array.isArray(raw) ? (raw as Record<string, unknown>[]) : []).map((l) => ({
    price: str(l.price, '0'),
    amount: str(l.amount, '0'),
  }));

/** Order book for a pair. `bids` buy the base asset, `asks` sell it. */
export const getStellarOrderBook = async (
  network: Network,
  base: StellarAssetRef,
  counter: StellarAssetRef,
  limit = 20
): Promise<StellarOrderBook> => {
  // Horizon's order book is selling/buying: asks sell base for counter.
  const { data } = await horizonGet(
    network,
    `/order_book?${assetParams('selling', base)}&${assetParams('buying', counter)}&limit=${clampLimit(limit)}`
  );
  const book = (data ?? {}) as Record<string, unknown>;
  return { bids: mapLevels(book.bids), asks: mapLevels(book.asks) };
};

export interface StellarTrade {
  id: string;
  ledgerCloseTime: string;
  baseAmount: string;
  counterAmount: string;
  price: string;
  baseIsSeller: boolean;
}

/** Recent trades for a pair, newest first. Price is counter per base. */
export const getStellarTrades = async (
  network: Network,
  base: StellarAssetRef,
  counter: StellarAssetRef,
  limit = 20
): Promise<StellarTrade[]> => {
  const { status, data } = await horizonGet(
    network,
    `/trades?${assetParams('base', base)}&${assetParams('counter', counter)}&order=desc&limit=${clampLimit(limit)}`
  );
  if (status === 404) return [];
  return records(data).map((r) => {
    const price = (r.price ?? {}) as Record<string, unknown>;
    const n = num(price.n, 0);
    const d = num(price.d, 1);
    return {
      id: str(r.id),
      ledgerCloseTime: str(r.ledger_close_time),
      baseAmount: str(r.base_amount, '0'),
      counterAmount: str(r.counter_amount, '0'),
      price: d ? (n / d).toPrecision(7) : '0',
      baseIsSeller: r.base_is_seller === true,
    };
  });
};

export interface StellarCandle {
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  baseVolume: string;
  counterVolume: string;
  trades: number;
}

/** Trade aggregations (candles) for a pair. Resolution is in milliseconds. */
export const getStellarCandles = async (
  network: Network,
  base: StellarAssetRef,
  counter: StellarAssetRef,
  resolutionMs: number,
  startMs: number,
  endMs: number
): Promise<StellarCandle[]> => {
  const { status, data } = await horizonGet(
    network,
    `/trade_aggregations?${assetParams('base', base)}&${assetParams('counter', counter)}` +
      `&resolution=${Math.trunc(resolutionMs)}&start_time=${Math.trunc(startMs)}&end_time=${Math.trunc(endMs)}&order=asc&limit=200`
  );
  if (status === 404) return [];
  return records(data).map((r) => ({
    timestamp: num(r.timestamp),
    open: str(r.open, '0'),
    high: str(r.high, '0'),
    low: str(r.low, '0'),
    close: str(r.close, '0'),
    baseVolume: str(r.base_volume, '0'),
    counterVolume: str(r.counter_volume, '0'),
    trades: num(r.trade_count),
  }));
};

export interface StellarPriceSummary {
  last: string | null;
  change24hPct: number | null;
  change7dPct: number | null;
  volume24h: string;
}

const DAY_MS = 86_400_000;

/**
 * Last price and 24h / 7d change, from daily candles. Percent change is a
 * display figure, computed with floats; prices themselves stay as strings.
 */
export const summarizePrice = (candles: StellarCandle[], nowMs: number): StellarPriceSummary => {
  if (candles.length === 0) return { last: null, change24hPct: null, change7dPct: null, volume24h: '0' };
  const last = candles[candles.length - 1];
  const pct = (from: number, to: number) => (from ? ((to - from) / from) * 100 : null);
  const closeAt = (msAgo: number) => {
    const target = nowMs - msAgo;
    const candle = [...candles].reverse().find((c) => c.timestamp <= target);
    return candle ? Number(candle.close) : null;
  };
  const prev24 = closeAt(DAY_MS);
  const prev7 = closeAt(7 * DAY_MS);
  return {
    last: last.close,
    change24hPct: prev24 === null ? null : pct(prev24, Number(last.close)),
    change7dPct: prev7 === null ? null : pct(prev7, Number(last.close)),
    volume24h: last.counterVolume,
  };
};

export interface StellarPool {
  id: string;
  feeBp: number;
  totalShares: string;
  totalTrustlines: number;
  reserves: { asset: string; amount: string }[];
}

const mapPool = (r: Record<string, unknown>): StellarPool => ({
  id: str(r.id),
  feeBp: num(r.fee_bp),
  totalShares: str(r.total_shares, '0'),
  totalTrustlines: num(r.total_trustlines),
  reserves: (Array.isArray(r.reserves) ? (r.reserves as Record<string, unknown>[]) : []).map((x) => ({
    asset: str(x.asset),
    amount: str(x.amount, '0'),
  })),
});

export const getStellarPools = async (network: Network, limit = 20): Promise<StellarPool[]> => {
  const { status, data } = await horizonGet(network, `/liquidity_pools?order=desc&limit=${clampLimit(limit)}`);
  if (status === 404) return [];
  return records(data).map(mapPool);
};

export const getStellarPool = async (network: Network, id: string): Promise<StellarPool | null> => {
  const { status, data } = await horizonGet(network, `/liquidity_pools/${encodeURIComponent(id)}`);
  if (status === 404 || !data || typeof data !== 'object') return null;
  return mapPool(data as Record<string, unknown>);
};

/** Accounts holding shares of a pool. */
export const getStellarPoolHolders = async (network: Network, id: string, limit = 20): Promise<StellarAssetHolder[]> => {
  const { status, data } = await horizonGet(
    network,
    `/accounts?liquidity_pool=${encodeURIComponent(id)}&order=desc&limit=${clampLimit(limit)}`
  );
  if (status === 404) return [];
  return records(data).map((r) => {
    const balances = Array.isArray(r.balances) ? (r.balances as Record<string, unknown>[]) : [];
    const share = balances.find((b) => b.liquidity_pool_id === id);
    return { account: str(r.id), balance: str(share?.balance, '0') };
  });
};

/** Trades that routed through a pool, newest first. */
export const getStellarPoolTrades = async (network: Network, id: string, limit = 20): Promise<StellarTrade[]> => {
  const { status, data } = await horizonGet(
    network,
    `/liquidity_pools/${encodeURIComponent(id)}/trades?order=desc&limit=${clampLimit(limit)}`
  );
  if (status === 404) return [];
  return records(data).map((r) => {
    const price = (r.price ?? {}) as Record<string, unknown>;
    const n = num(price.n, 0);
    const d = num(price.d, 1);
    return {
      id: str(r.id),
      ledgerCloseTime: str(r.ledger_close_time),
      baseAmount: str(r.base_amount, '0'),
      counterAmount: str(r.counter_amount, '0'),
      price: d ? (n / d).toPrecision(7) : '0',
      baseIsSeller: r.base_is_seller === true,
    };
  });
};
