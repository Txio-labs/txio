import { describe, expect, it } from 'vitest';
import { detectLookup, explorerTabFor } from './lookup';

const G = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const C = 'CDGZ2RFCKEQUFZZPWJ5WRKPCD35QUWKEWDKAQW3SL2HYSS4YAK67WPL3';

describe('detectLookup', () => {
  it('recognises Stellar G and C addresses', () => {
    expect(detectLookup(G)?.candidates).toEqual(['stellar']);
    expect(detectLookup(C)?.candidates).toEqual(['stellar']);
  });

  it('treats a bare 64-hex value as a Stellar transaction hash', () => {
    expect(detectLookup('ab'.repeat(32))?.candidates).toEqual(['stellar']);
  });

  it('marks 0x + 40 hex as EVM or Starknet', () => {
    expect(detectLookup('0x' + '1'.repeat(40))?.candidates).toEqual(['evm', 'starknet']);
  });

  it('offers Sui, Aptos, Starknet, and EVM for 0x + 64 hex', () => {
    expect(detectLookup('0x' + 'a'.repeat(64))?.candidates).toEqual(['sui', 'aptos', 'starknet', 'evm']);
  });

  it('offers Sui, Aptos and Starknet for a short 0x value', () => {
    expect(detectLookup('0x1')?.candidates).toEqual(['sui', 'aptos', 'starknet']);
  });

  it('marks long base58 as a Solana signature', () => {
    expect(detectLookup('z'.repeat(88))?.candidates).toEqual(['solana']);
  });

  it('offers Solana or Sui for 43–44 base58 characters', () => {
    expect(detectLookup('z'.repeat(44))?.candidates).toEqual(['solana', 'sui']);
    expect(detectLookup('z'.repeat(36))?.candidates).toEqual(['solana']);
  });

  it('trims whitespace around the query', () => {
    expect(detectLookup(`  ${G}  `)).toEqual({ query: G, candidates: ['stellar'] });
  });

  it('returns null for empty or unsupported input', () => {
    expect(detectLookup('')).toBeNull();
    expect(detectLookup('   ')).toBeNull();
    expect(detectLookup('hello world')).toBeNull();
    expect(detectLookup('0' + 'z'.repeat(43))).toBeNull(); // '0' is not base58
  });
});

describe('explorerTabFor', () => {
  it('opens each chain in its own explorer tab', () => {
    expect(explorerTabFor('sui').featureId).toBe('explorer');
    expect(explorerTabFor('stellar').featureId).toBe('stellar_explorer');
    expect(explorerTabFor('solana').featureId).toBe('solana_explorer');
    expect(explorerTabFor('aptos').featureId).toBe('aptos_explorer');
    expect(explorerTabFor('starknet').featureId).toBe('starknet_explorer');
  });

  it('starts EVM on mainnet', () => {
    expect(explorerTabFor('evm')).toEqual({ featureId: 'evm_explorer', data: { chainId: 1 } });
  });
});
