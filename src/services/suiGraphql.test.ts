import { describe, expect, it, vi } from 'vitest';
import { formatRawAmount, getSuiAssets, normalizeSuiAddress, SUI_NATIVE_COIN_TYPE } from './suiGraphql';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('suiGraphql', () => {
  it('pads short hex addresses to 64 characters', () => {
    expect(normalizeSuiAddress('0x2')).toBe(`0x${'0'.repeat(63)}2`);
  });

  it('formats raw amounts with decimals and trims trailing zeros', () => {
    expect(formatRawAmount('1500000000', 9)).toBe('1.5');
    expect(formatRawAmount('1000000', 6)).toBe('1');
    expect(formatRawAmount('123', 0)).toBe('123');
  });

  it('returns balances with metadata and owned objects from one account query', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (body.query.includes('coinMetadata')) {
        return jsonResponse({
          data: { coinMetadata: { decimals: 6, symbol: 'USDC', name: 'USD Coin' } },
        });
      }
      return jsonResponse({
        data: {
          address: {
            balances: {
              nodes: [
                { coinType: { repr: SUI_NATIVE_COIN_TYPE }, totalBalance: '2500000000' },
                { coinType: { repr: '0xabc::usdc::USDC' }, totalBalance: '3000000' },
              ],
            },
            objects: {
              nodes: [
                {
                  address: '0x123',
                  version: 7,
                  digest: 'dig',
                  contents: { type: { repr: '0x2::coin::Coin<0x2::sui::SUI>' }, json: { balance: '1' } },
                },
              ],
            },
          },
        },
      });
    });

    const assets = await getSuiAssets('testnet', '0x2', fetchMock as unknown as typeof fetch);

    expect(assets.balances).toHaveLength(2);
    expect(assets.balances[0]).toMatchObject({ symbol: 'SUI', decimals: 9, formatted: '2.5 SUI' });
    expect(assets.balances[1]).toMatchObject({ symbol: 'USDC', name: 'USD Coin', formatted: '3 USDC' });
    expect(assets.objects).toEqual([
      {
        objectId: '0x123',
        version: '7',
        digest: 'dig',
        type: '0x2::coin::Coin<0x2::sui::SUI>',
        fields: { balance: '1' },
      },
    ]);
  });

  it('falls back to the coin-type symbol when metadata is missing', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (body.query.includes('coinMetadata')) return jsonResponse({ data: { coinMetadata: null } });
      return jsonResponse({
        data: { address: { balances: { nodes: [{ coinType: { repr: '0xdead::foo::BAR' }, totalBalance: '42' }] }, objects: { nodes: [] } } },
      });
    });

    const assets = await getSuiAssets('mainnet', '0x2', fetchMock as unknown as typeof fetch);
    expect(assets.balances[0]).toMatchObject({ symbol: 'BAR', decimals: 0, formatted: '42 BAR' });
  });

  it('surfaces GraphQL errors instead of returning empty assets', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ errors: [{ message: 'bad address' }] }));
    await expect(getSuiAssets('mainnet', '0x2', fetchMock as unknown as typeof fetch)).rejects.toThrow('bad address');
  });

  it('refuses networks without a GraphQL endpoint', async () => {
    await expect(getSuiAssets('localnet', '0x2')).rejects.toThrow('not available on localnet');
  });
});
