import { describe, expect, it } from 'vitest';
import { mapAccountTransaction, netGasMist } from './suiAccount';
import { parseSuiExplorerQuery } from './suiExplorer';

const ME = '0x' + '11'.repeat(32);
const OTHER = '0x' + '22'.repeat(32);

describe('netGasMist', () => {
  it('nets computation and storage against the rebate, exactly', () => {
    expect(netGasMist({ computationCost: '1000', storageCost: '500', storageRebate: '300' })).toBe('1200');
  });

  it('returns null when fields are missing or not integers', () => {
    expect(netGasMist(null)).toBeNull();
    expect(netGasMist({ computationCost: 'abc' })).toBeNull();
  });
});

describe('mapAccountTransaction', () => {
  const node = (sender: string, status: string) => ({
    digest: 'D1',
    sender: { address: sender },
    effects: {
      timestamp: '2026-11-20T10:00:00Z',
      status,
      checkpoint: { sequenceNumber: '42' },
      gasEffects: { gasSummary: { computationCost: '10', storageCost: '5', storageRebate: '1' } },
    },
  });

  it('marks sent when the account is the sender, affected otherwise', () => {
    expect(mapAccountTransaction(node(ME, 'SUCCESS'), ME)?.role).toBe('sent');
    expect(mapAccountTransaction(node(OTHER, 'SUCCESS'), ME)?.role).toBe('affected');
  });

  it('maps status and fee', () => {
    const ok = mapAccountTransaction(node(ME, 'SUCCESS'), ME);
    expect(ok).toMatchObject({ success: true, checkpoint: '42', feeMist: '14' });
    expect(mapAccountTransaction(node(ME, 'FAILURE'), ME)?.success).toBe(false);
    expect(mapAccountTransaction(node(ME, 'WEIRD'), ME)?.success).toBeNull();
  });

  it('drops nodes without a digest', () => {
    expect(mapAccountTransaction({ effects: {} }, ME)).toBeNull();
  });
});

describe('account search prefix', () => {
  it('parses account: prefixed addresses as accounts, not objects', () => {
    expect(parseSuiExplorerQuery(`account: ${ME}`)).toEqual({ kind: 'address', id: ME });
  });

  it('still treats a bare hex id as an object', () => {
    expect(parseSuiExplorerQuery(ME)).toEqual({ kind: 'object', id: ME });
  });
});
