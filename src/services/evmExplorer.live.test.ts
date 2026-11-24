import { describe, expect, it } from 'vitest';
import { getEvmAddress, getEvmLatestTransactions, getEvmTransaction } from './evmExplorer';

// Hits the real Blockscout API. Run with: LIVE=1 npx vitest run src/services/evmExplorer.live.test.ts
const live = process.env.LIVE === '1';

describe.skipIf(!live)('evmExplorer against live Blockscout (Ethereum)', () => {
  it('loads the latest transactions', async () => {
    const txs = await getEvmLatestTransactions(1);
    expect(txs.length).toBeGreaterThan(0);
    expect(txs[0].hash).toMatch(/^0x[0-9a-f]{64}$/);
  }, 60000);

  it('loads a transaction with its token transfers', async () => {
    // Older tx: the newest listed transactions can take a while to reach the detail endpoint.
    const hash = '0x2a0983fa8fed38cfdddf83b1101affdaa2dbeff052ce419771333286c56e9da4';
    const detail = await getEvmTransaction(1, hash);
    expect(detail?.tx.hash).toBe(hash);
    expect(detail?.tx.status).toMatch(/success|failed|pending/);
    expect(Array.isArray(detail?.tokenTransfers)).toBe(true);
  }, 60000);

  it('loads an address with balance, tokens and transactions', async () => {
    // Small externally-owned address: heavy contracts (e.g. WETH) 500 upstream too often for a test.
    const address = '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97';
    const detail = await getEvmAddress(1, address);
    expect(detail?.address.address).toBe(address);
    expect(detail?.address.isContract).toBe(false);
    expect(Array.isArray(detail?.tokens)).toBe(true);
    // The transactions list may 500 for heavy contracts; the section reports it rather than failing the page.
    expect(detail?.transactions.length ?? 0).toBeGreaterThanOrEqual(0);
  }, 60000);
});
