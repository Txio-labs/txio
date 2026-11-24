import { describe, expect, it } from 'vitest';
import { getStarknetLatestBlock, getStarknetTransaction } from './starknetExplorer';

// Real Starknet RPC. Run with: LIVE=1 npx vitest run src/services/starknetExplorer.live.test.ts
const live = process.env.LIVE === '1';

describe.skipIf(!live)('starknetExplorer against live RPC (mainnet)', () => {
  it('reads the latest block and one of its transactions', async () => {
    const block = await getStarknetLatestBlock('mainnet');
    expect(block?.blockNumber).toBeGreaterThan(0);
    const hash = block!.transactions[0];
    const tx = await getStarknetTransaction('mainnet', hash);
    expect(tx?.hash).toBe(hash);
    expect(tx?.executionStatus).toMatch(/SUCCEEDED|REVERTED/);
  }, 60000);
});
