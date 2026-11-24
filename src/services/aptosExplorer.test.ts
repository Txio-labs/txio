import { describe, expect, it } from 'vitest';
import { formatOctas, mapAptosTransaction, parseAptosExplorerQuery } from './aptosExplorer';

describe('parseAptosExplorerQuery', () => {
  it('accepts 0x + 1-64 hex and lowercases it', () => {
    expect(parseAptosExplorerQuery('0x1')).toBe('0x1');
    expect(parseAptosExplorerQuery(`0x${'AB'.repeat(32)}`)).toBe(`0x${'ab'.repeat(32)}`);
  });

  it('rejects other input', () => {
    expect(parseAptosExplorerQuery('1234')).toBeNull();
    expect(parseAptosExplorerQuery(`0x${'g'.repeat(10)}`)).toBeNull();
    expect(parseAptosExplorerQuery(`0x${'a'.repeat(65)}`)).toBeNull();
  });
});

describe('mapAptosTransaction', () => {
  it('maps a user transaction with fee and function name', () => {
    const tx = mapAptosTransaction({
      hash: '0xh',
      version: '8202790000',
      type: 'user_transaction',
      success: true,
      timestamp: '1795528757187984',
      sender: '0xs',
      gas_used: '552',
      gas_unit_price: '100',
      vm_status: 'Executed successfully',
      payload: { function: '0x1::coin::transfer' },
    });
    expect(tx).toMatchObject({
      hash: '0xh',
      type: 'user_transaction',
      success: true,
      sender: '0xs',
      functionName: '0x1::coin::transfer',
      feeOctas: '55200',
      vmStatus: 'Executed successfully',
    });
    expect(tx?.timestamp).toBe(new Date(1795528757187.984).toISOString());
  });

  it('returns null without a hash', () => {
    expect(mapAptosTransaction({})).toBeNull();
  });
});

describe('formatOctas', () => {
  it('converts octas to APT', () => {
    expect(formatOctas('2760435661780')).toBe('27604.356617');
    expect(formatOctas('100000000')).toBe('1');
    expect(formatOctas(null)).toBe('—');
  });
});
