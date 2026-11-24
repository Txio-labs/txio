import { describe, expect, it } from 'vitest';
import { parseAssetRef, summarizePrice, type StellarCandle } from './stellarMarkets';

const ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const DAY = 86_400_000;

const candle = (timestamp: number, close: string, counterVolume = '1'): StellarCandle => ({
  timestamp,
  open: close,
  high: close,
  low: close,
  close,
  baseVolume: '0',
  counterVolume,
  trades: 1,
});

describe('parseAssetRef', () => {
  it('parses XLM and issued assets, choosing the Horizon asset type by code length', () => {
    expect(parseAssetRef('xlm')).toEqual({ type: 'native', code: 'XLM' });
    expect(parseAssetRef(`USDC:${ISSUER}`)).toEqual({ type: 'credit_alphanum4', code: 'USDC', issuer: ISSUER });
    expect(parseAssetRef(`LONGCODE123:${ISSUER}`)).toEqual({ type: 'credit_alphanum12', code: 'LONGCODE123', issuer: ISSUER });
  });

  it('rejects malformed input', () => {
    expect(parseAssetRef('')).toBeNull();
    expect(parseAssetRef('USDC')).toBeNull();
    expect(parseAssetRef(`USDC:GBAD`)).toBeNull();
    expect(parseAssetRef(`US-DC:${ISSUER}`)).toBeNull();
    expect(parseAssetRef(`A:${ISSUER}:extra`)).toBeNull();
  });
});

describe('summarizePrice', () => {
  const now = 10 * DAY;
  it('returns no price for empty candles', () => {
    expect(summarizePrice([], now)).toEqual({ last: null, change24hPct: null, change7dPct: null, volume24h: '0' });
  });

  it('computes 24h and 7d change from the closes at those times', () => {
    const candles = [
      candle(now - 8 * DAY, '1.0'),
      candle(now - 7 * DAY, '2.0'),
      candle(now - DAY, '3.0'),
      candle(now, '3.3', '42'),
    ];
    const s = summarizePrice(candles, now);
    expect(s.last).toBe('3.3');
    expect(s.change24hPct).toBeCloseTo(10, 6);
    expect(s.change7dPct).toBeCloseTo(65, 6);
    expect(s.volume24h).toBe('42');
  });

  it('reports null change when there is no earlier candle', () => {
    const s = summarizePrice([candle(now, '5.0')], now);
    expect(s.change24hPct).toBeNull();
    expect(s.change7dPct).toBeNull();
  });
});
