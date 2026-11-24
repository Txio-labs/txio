import { describe, expect, it } from 'vitest';
import { formatFri, mapStarknetTransaction, parseStarknetExplorerQuery } from './starknetExplorer';

describe('parseStarknetExplorerQuery', () => {
  it('accepts a 0x felt and lowercases it', () => {
    expect(parseStarknetExplorerQuery('0xABC')).toBe('0xabc');
    expect(parseStarknetExplorerQuery(`0x${'1'.repeat(64)}`)).toBe(`0x${'1'.repeat(64)}`);
  });

  it('rejects non-hex and over-long values', () => {
    expect(parseStarknetExplorerQuery('abc')).toBeNull();
    expect(parseStarknetExplorerQuery(`0x${'1'.repeat(65)}`)).toBeNull();
  });
});

describe('mapStarknetTransaction', () => {
  it('maps tx and receipt fields, fee from the hex amount', () => {
    const tx = mapStarknetTransaction('0xh', { type: 'INVOKE', sender_address: '0xs', nonce: '0x36d11', version: '0x3', calldata: ['0x1', '0x2'] }, {
      execution_status: 'SUCCEEDED',
      finality_status: 'ACCEPTED_ON_L2',
      block_number: 18469690,
      actual_fee: { amount: '0xe56018d334b50c0', unit: 'FRI' },
      events: [{}, {}, {}],
    });
    expect(tx).toMatchObject({
      type: 'INVOKE',
      senderAddress: '0xs',
      executionStatus: 'SUCCEEDED',
      blockNumber: 18469690,
      feeFri: BigInt('0xe56018d334b50c0').toString(),
      eventCount: 3,
      calldataLength: 2,
    });
  });

  it('returns null when neither tx nor receipt exists', () => {
    expect(mapStarknetTransaction('0xh', null, null)).toBeNull();
  });
});

describe('formatFri', () => {
  it('converts fri to STRK', () => {
    expect(formatFri('1500000000000000000')).toBe('1.5');
    expect(formatFri('1')).toBe('0');
    expect(formatFri(null)).toBe('—');
  });
});
