import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchStellarClassicAssets, formatTokenAmount } from './assets';

const G = `G${'A'.repeat(55)}`;

describe('formatTokenAmount', () => {
  it('scales by decimals and trims trailing zeros', () => {
    expect(formatTokenAmount('1500000', 6)).toBe('1.5');
    expect(formatTokenAmount('12345678901', 7)).toBe('1234.5678');
  });

  it('shows the raw amount when decimals are unknown', () => {
    expect(formatTokenAmount('42', null)).toBe('42');
  });

  it('keeps the sign for negative values', () => {
    expect(formatTokenAmount('-2500', 2)).toBe('-25');
  });
});

describe('fetchStellarClassicAssets', () => {
  afterEach(() => vi.restoreAllMocks());

  it('maps native, trustline and pool balances from Horizon', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            balances: [
              { asset_type: 'native', balance: '10.0000000' },
              { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: G, balance: '3.5000000' },
              { asset_type: 'liquidity_pool_shares', liquidity_pool_id: 'abcdef123456', balance: '1.0000000' },
            ],
          }),
          { status: 200 }
        )
      )
    );

    const assets = await fetchStellarClassicAssets(G, 'testnet');
    expect(assets).toEqual([
      { kind: 'native', code: 'XLM', issuer: null, balance: '10.0000000' },
      { kind: 'classic', code: 'USDC', issuer: G, balance: '3.5000000' },
      { kind: 'liquidity_pool', code: 'Pool abcdef12', issuer: null, balance: '1.0000000' },
    ]);
  });

  it('returns no assets for an unfunded account', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
    expect(await fetchStellarClassicAssets(G, 'testnet')).toEqual([]);
  });
});
