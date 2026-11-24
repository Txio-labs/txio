import { describe, expect, it } from 'vitest';
import {
  mapStellarAccount,
  parseStellarExplorerQuery,
  paymentDirection,
  stroopsToXlm,
} from './stellarExplorer';

const G = 'GBDU6GG4JYHWBRC4RJBNZ2DHX7WS3WSWHTJPGV7VHZYLYOI7G3UIUTEN';
const C = 'CDGZ2RFCKEQUFZZPWJ5WRKPCD35QUWKEWDKAQW3SL2HYSS4YAK67WPL3';
const HASH = 'AB'.repeat(32);

describe('parseStellarExplorerQuery', () => {
  it('accepts G and C addresses and 64-hex hashes', () => {
    expect(parseStellarExplorerQuery(G)).toEqual({ kind: 'address', id: G });
    expect(parseStellarExplorerQuery(C)).toEqual({ kind: 'address', id: C });
    expect(parseStellarExplorerQuery(` ${HASH} `)).toEqual({ kind: 'tx', id: HASH.toLowerCase() });
  });

  it('rejects everything else', () => {
    expect(parseStellarExplorerQuery('')).toBeNull();
    expect(parseStellarExplorerQuery('GABC')).toBeNull();
    expect(parseStellarExplorerQuery(G.toLowerCase())).toBeNull();
    expect(parseStellarExplorerQuery('X' + G.slice(1))).toBeNull();
  });
});

describe('stroopsToXlm', () => {
  it('formats stroops exactly with 7 decimals', () => {
    expect(stroopsToXlm('100')).toBe('0.0000100');
    expect(stroopsToXlm(10_000_000)).toBe('1.0000000');
    expect(stroopsToXlm('179679999999999')).toBe('17967999.9999999');
  });
});

describe('paymentDirection', () => {
  it('is out when the account sends, in when it receives', () => {
    expect(paymentDirection({ from: G, to: C }, G)).toBe('out');
    expect(paymentDirection({ from: C, to: G }, G)).toBe('in');
  });

  it('is other when the account is on neither side', () => {
    expect(paymentDirection({ from: C, to: C }, G)).toBe('other');
  });
});

describe('mapStellarAccount', () => {
  it('maps flags, thresholds, signers and balances from Horizon fields', () => {
    const acc = mapStellarAccount({
      account_id: G,
      sequence: '123',
      subentry_count: 2,
      home_domain: 'example.org',
      num_sponsoring: 0,
      num_sponsored: 1,
      last_modified_ledger: 999,
      flags: { auth_required: true, auth_revocable: false, auth_immutable: false, auth_clawback_enabled: true },
      thresholds: { low_threshold: 1, med_threshold: 2, high_threshold: 3 },
      signers: [{ key: G, weight: 1, type: 'ed25519_public_key' }],
      balances: [
        { asset_type: 'native', balance: '10.0000000', buying_liabilities: '0.0000000', selling_liabilities: '0.0000000' },
        {
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: C,
          balance: '5.0000000',
          limit: '100.0000000',
          buying_liabilities: '0.0000000',
          selling_liabilities: '0.0000000',
        },
      ],
    });
    expect(acc.homeDomain).toBe('example.org');
    expect(acc.flags.authRequired).toBe(true);
    expect(acc.flags.authClawbackEnabled).toBe(true);
    expect(acc.thresholds).toEqual({ low: 1, medium: 2, high: 3 });
    expect(acc.signers[0]).toEqual({ key: G, weight: 1, type: 'ed25519_public_key' });
    expect(acc.balances[0]).toMatchObject({ code: 'XLM', balance: '10.0000000', issuer: undefined });
    expect(acc.balances[1]).toMatchObject({ code: 'USDC', issuer: C, limit: '100.0000000' });
  });

  it('tolerates missing optional fields', () => {
    const acc = mapStellarAccount({ account_id: G });
    expect(acc.balances).toEqual([]);
    expect(acc.signers).toEqual([]);
    expect(acc.homeDomain).toBeUndefined();
    expect(acc.flags.authRequired).toBe(false);
  });
});
