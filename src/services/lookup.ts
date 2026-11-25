import type { ChainId } from '@/types';

// Works out which chain(s) a pasted address or transaction hash could belong
// to, from its format alone. Several formats overlap (for example a 0x…
// 64-hex value could be a Sui address, an Aptos address, a Starknet address or
// an EVM transaction), so a lookup can return more than one candidate.

export type LookupChain = Extract<ChainId, 'sui' | 'evm' | 'stellar' | 'solana' | 'aptos' | 'starknet'>;

export interface LookupMatch {
  query: string;
  candidates: LookupChain[];
}

const STELLAR_ADDRESS = /^[GC][A-Z2-7]{55}$/;
const HEX_64 = /^[0-9a-fA-F]{64}$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const PREFIXED_HEX = /^0x[0-9a-fA-F]{1,64}$/;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

export const detectLookup = (input: string): LookupMatch | null => {
  const query = input.trim();
  if (!query) return null;

  if (STELLAR_ADDRESS.test(query)) return { query, candidates: ['stellar'] };
  // A bare 64-hex string (no 0x) is a Stellar transaction hash.
  if (HEX_64.test(query)) return { query, candidates: ['stellar'] };

  if (EVM_ADDRESS.test(query)) return { query, candidates: ['evm', 'starknet'] };
  if (PREFIXED_HEX.test(query)) {
    // 0x + 64 hex is also an EVM transaction hash.
    const candidates: LookupChain[] = ['sui', 'aptos', 'starknet'];
    if (query.length === 66) candidates.push('evm');
    return { query, candidates };
  }

  // Base58: Solana addresses (32–44) and signatures (87–88); Sui digests (43–44).
  if (BASE58.test(query)) {
    if (query.length >= 87 && query.length <= 88) return { query, candidates: ['solana'] };
    if (query.length >= 43 && query.length <= 44) return { query, candidates: ['solana', 'sui'] };
    if (query.length >= 32 && query.length <= 42) return { query, candidates: ['solana'] };
  }

  return null;
};

export const CHAIN_LABEL: Record<LookupChain, string> = {
  sui: 'Sui',
  evm: 'EVM',
  stellar: 'Stellar',
  solana: 'Solana',
  aptos: 'Aptos',
  starknet: 'Starknet',
};

/** The explorer tab that shows a query for a chain. */
export const explorerTabFor = (chain: LookupChain): { featureId: string; data: Record<string, unknown> } => {
  switch (chain) {
    case 'sui':
      return { featureId: 'explorer', data: {} };
    case 'evm':
      // Mainnet by default; the EVM explorer lets the user switch chains.
      return { featureId: 'evm_explorer', data: { chainId: 1 } };
    case 'stellar':
      return { featureId: 'stellar_explorer', data: {} };
    case 'solana':
      return { featureId: 'solana_explorer', data: {} };
    case 'aptos':
      return { featureId: 'aptos_explorer', data: {} };
    case 'starknet':
      return { featureId: 'starknet_explorer', data: {} };
  }
};
