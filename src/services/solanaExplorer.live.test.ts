import { describe, expect, it } from 'vitest';
import { getSolanaAccount, getSolanaNetworkInfo, getSolanaTransaction } from './solanaExplorer';

// Real Solana RPC. Run with: LIVE=1 npx vitest run src/services/solanaExplorer.live.test.ts
const live = process.env.LIVE === '1';

describe.skipIf(!live)('solanaExplorer against live RPC (mainnet)', () => {
  it('reads the network slot and epoch', async () => {
    const info = await getSolanaNetworkInfo('mainnet');
    expect(info.slot).toBeGreaterThan(0);
    expect(info.epoch).toBeGreaterThan(0);
  }, 60000);

  it('reads an account and its recent signatures', async () => {
    const account = await getSolanaAccount('mainnet', 'Vote111111111111111111111111111111111111111');
    expect(account?.address).toBe('Vote111111111111111111111111111111111111111');
    expect(account?.signatures.length).toBeGreaterThan(0);
  }, 60000);

  it('reads a transaction with parsed accounts and instructions', async () => {
    const account = await getSolanaAccount('mainnet', 'Vote111111111111111111111111111111111111111');
    const sig = account!.signatures[0].signature;
    const tx = await getSolanaTransaction('mainnet', sig);
    expect(tx?.signature).toBe(sig);
    expect(tx?.accounts.length).toBeGreaterThan(0);
  }, 60000);
});
