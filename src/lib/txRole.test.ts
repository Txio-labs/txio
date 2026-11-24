import { describe, expect, it } from 'vitest';
import { txRole } from './txRole';
import { feePayerOf } from '../services/solanaExplorer';

const ME = '0xAbC1000000000000000000000000000000000001';
const OTHER = '0x0000000000000000000000000000000000000002';

describe('txRole', () => {
  it('is sent when the account is the sender, ignoring case', () => {
    expect(txRole(ME, ME.toLowerCase())).toBe('sent');
  });

  it('is received when the account is the recipient', () => {
    expect(txRole(ME, OTHER, ME)).toBe('received');
  });

  it('is affected when the account is neither and nothing is known about the recipient', () => {
    expect(txRole(ME, OTHER)).toBe('affected');
    expect(txRole(ME, OTHER, OTHER)).toBe('affected');
  });

  it('is affected, not received, when the recipient is unknown for this chain', () => {
    expect(txRole(ME, null, undefined)).toBe('affected');
  });
});

describe('feePayerOf', () => {
  it('reads the first account key of a json-encoded transaction', () => {
    expect(feePayerOf({ transaction: { message: { accountKeys: ['PAYER', 'OTHER'] } } })).toBe('PAYER');
  });

  it('returns null when the shape is missing', () => {
    expect(feePayerOf(null)).toBeNull();
    expect(feePayerOf({ transaction: { message: {} } })).toBeNull();
  });
});
