import { describe, expect, it } from 'vitest';
import { lamportsToSol, mapSolanaTransaction, parseSolanaExplorerQuery } from './solanaExplorer';

const SIG = '5'.repeat(88);
const ADDR = 'Vote111111111111111111111111111111111111111';

describe('parseSolanaExplorerQuery', () => {
  it('tells signatures (85-90 chars) from addresses (32-44 chars)', () => {
    expect(parseSolanaExplorerQuery(SIG)).toEqual({ kind: 'tx', id: SIG });
    expect(parseSolanaExplorerQuery(` ${ADDR} `)).toEqual({ kind: 'address', id: ADDR });
  });

  it('rejects non-base58 input and odd lengths', () => {
    expect(parseSolanaExplorerQuery('0OIl')).toBeNull();
    expect(parseSolanaExplorerQuery('abc')).toBeNull();
    expect(parseSolanaExplorerQuery('x'.repeat(60))).toBeNull();
  });
});

describe('mapSolanaTransaction', () => {
  it('maps status, fee, balances per account and parsed instructions', () => {
    const tx = mapSolanaTransaction(SIG, {
      slot: 10,
      blockTime: 1700000000,
      meta: {
        err: null,
        fee: 5000,
        computeUnitsConsumed: 150,
        preBalances: [1000, 0],
        postBalances: [900, 100],
        logMessages: ['Program log: hi'],
      },
      transaction: {
        message: {
          accountKeys: [{ pubkey: ADDR, signer: true, writable: true }, 'SysvarRent111111111111111111111111111111111'],
          instructions: [{ program: 'system', programId: '11111111111111111111111111111111111111111', parsed: { type: 'transfer' } }],
        },
      },
    });
    expect(tx).toMatchObject({
      status: 'success',
      slot: 10,
      feeLamports: '5000',
      computeUnits: '150',
      logs: ['Program log: hi'],
    });
    expect(tx?.blockTime).toBe('2023-11-14T22:13:20.000Z');
    expect(tx?.accounts[0]).toEqual({ pubkey: ADDR, signer: true, writable: true, preLamports: '1000', postLamports: '900' });
    expect(tx?.accounts[1].signer).toBe(false);
    expect(tx?.instructions[0]).toEqual({ program: 'system', type: 'transfer' });
  });

  it('marks an errored transaction failed and keeps the error text', () => {
    const tx = mapSolanaTransaction(SIG, { meta: { err: { InstructionError: [0, 'Custom'] } }, transaction: { message: {} } });
    expect(tx?.status).toBe('failed');
    expect(tx?.error).toContain('InstructionError');
  });

  it('returns null when there is no transaction', () => {
    expect(mapSolanaTransaction(SIG, null)).toBeNull();
  });
});

describe('lamportsToSol', () => {
  it('converts lamports to SOL without float error', () => {
    expect(lamportsToSol('1500000000')).toBe('1.5');
    // Display precision is 6 decimals; sub-micro-SOL amounts round down to 0.
    expect(lamportsToSol('1')).toBe('0');
    expect(lamportsToSol('2000000000')).toBe('2');
  });
});
