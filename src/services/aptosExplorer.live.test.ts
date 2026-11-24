import { describe, expect, it } from 'vitest';
import { getAptosAccount, getAptosLatestTransactions, getAptosTransaction } from './aptosExplorer';

// Real Aptos fullnode. Run with: LIVE=1 npx vitest run src/services/aptosExplorer.live.test.ts
const live = process.env.LIVE === '1';

describe.skipIf(!live)('aptosExplorer against live fullnode (mainnet)', () => {
  it('reads a known user transaction', async () => {
    const hash = '0xe676e9945a2841bbe28539e7f8c840b673d610b6fcf8587c212e61bb918236bc';
    const tx = await getAptosTransaction('mainnet', hash);
    expect(tx?.hash).toBe(hash);
    expect(tx?.success).toBe(true);
    expect(tx?.functionName).toContain('::');
  }, 60000);

  it('reads an account with its APT balance', async () => {
    const account = await getAptosAccount('mainnet', '0xa73c82d937f156140b4f0e53e2d213829c0b27180c1b1de14eeca9d42a4484f5');
    expect(account?.sequenceNumber).toBe('1');
    expect(account?.aptBalanceOctas).not.toBeNull();
  }, 60000);

  it('lists latest user transactions', async () => {
    const txs = await getAptosLatestTransactions('mainnet');
    expect(txs.every((t) => t.type === 'user_transaction')).toBe(true);
  }, 60000);
});
