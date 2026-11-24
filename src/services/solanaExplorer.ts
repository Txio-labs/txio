import { SOLANA_NETWORKS } from '@/lib/constants';
import type { Network } from '@/types';
import { resolveChainRpcUrl } from './suiService';

export type SolanaExplorerTarget = { kind: 'tx'; id: string } | { kind: 'address'; id: string };

export interface SolanaTransactionDetail {
  signature: string;
  status: 'success' | 'failed';
  slot: number | null;
  blockTime: string | null;
  feeLamports: string | null;
  computeUnits: string | null;
  error: string | null;
  accounts: { pubkey: string; signer: boolean; writable: boolean; preLamports: string | null; postLamports: string | null }[];
  instructions: { program: string | null; type: string | null }[];
  logs: string[];
}

export interface SolanaAccountDetail {
  address: string;
  lamports: string;
  executable: boolean;
  owner: string | null;
  tokenAccounts: { account: string; mint: string; amount: string; decimals: number | null }[];
  tokenError: string | null;
  signatures: { signature: string; slot: number; blockTime: string | null; failed: boolean }[];
}

export interface SolanaNetworkInfo {
  slot: number;
  epoch: number | null;
  slotIndex: number | null;
  slotsInEpoch: number | null;
}

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

/** Signatures are 64 bytes (87-88 base58 chars); addresses are 32 bytes (32-44 chars). */
export const parseSolanaExplorerQuery = (input: string): SolanaExplorerTarget | null => {
  const value = input.trim();
  if (!BASE58.test(value)) return null;
  if (value.length >= 85 && value.length <= 90) return { kind: 'tx', id: value };
  if (value.length >= 32 && value.length <= 44) return { kind: 'address', id: value };
  return null;
};

const rpcUrl = (network: Network) => resolveChainRpcUrl('solana', network) || SOLANA_NETWORKS[network];

/** One JSON-RPC call. Throws on transport errors and on RPC-level errors. */
const rpc = async (network: Network, method: string, params: unknown[]): Promise<any> => {
  const response = await fetch(rpcUrl(network), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`Solana RPC ${method} failed with status ${response.status}.`);
  const data = await response.json();
  if (data?.error) throw new Error(data.error.message ?? `Solana RPC ${method} error.`);
  return data.result;
};

const keyOf = (k: any): { pubkey: string; signer: boolean; writable: boolean } =>
  typeof k === 'string'
    ? { pubkey: k, signer: false, writable: false }
    : { pubkey: String(k.pubkey), signer: Boolean(k.signer), writable: Boolean(k.writable) };

export const mapSolanaTransaction = (signature: string, raw: any): SolanaTransactionDetail | null => {
  if (!raw) return null;
  const meta = raw.meta ?? {};
  const keys: any[] = raw.transaction?.message?.accountKeys ?? [];
  const pre: unknown[] = meta.preBalances ?? [];
  const post: unknown[] = meta.postBalances ?? [];
  const instructions: any[] = raw.transaction?.message?.instructions ?? [];
  const toTime = (t: unknown) => (typeof t === 'number' ? new Date(t * 1000).toISOString() : null);
  return {
    signature,
    status: meta.err === null || meta.err === undefined ? 'success' : 'failed',
    slot: typeof raw.slot === 'number' ? raw.slot : null,
    blockTime: toTime(raw.blockTime),
    feeLamports: meta.fee !== undefined ? String(meta.fee) : null,
    computeUnits: meta.computeUnitsConsumed !== undefined ? String(meta.computeUnitsConsumed) : null,
    error: meta.err ? JSON.stringify(meta.err) : null,
    accounts: keys.map((k, i) => ({
      ...keyOf(k),
      preLamports: pre[i] !== undefined ? String(pre[i]) : null,
      postLamports: post[i] !== undefined ? String(post[i]) : null,
    })),
    instructions: instructions.map((ix) => ({
      program: ix.program ?? ix.programId ?? null,
      type: ix.parsed?.type ?? null,
    })),
    logs: Array.isArray(meta.logMessages) ? meta.logMessages.map(String) : [],
  };
};

export const getSolanaTransaction = async (network: Network, signature: string): Promise<SolanaTransactionDetail | null> => {
  const raw = await rpc(network, 'getTransaction', [
    signature,
    { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
  ]);
  return mapSolanaTransaction(signature, raw);
};

/** Token accounts need `getTokenAccountsByOwner`. Public mainnet RPCs block it, so the error is reported, not thrown. */
const tokenAccountsOf = async (network: Network, address: string) => {
  try {
    const result = await rpc(network, 'getTokenAccountsByOwner', [
      address,
      { programId: TOKEN_PROGRAM },
      { encoding: 'jsonParsed' },
    ]);
    const accounts = ((result?.value ?? []) as any[]).map((entry) => {
      const info = entry.account?.data?.parsed?.info ?? {};
      return {
        account: String(entry.pubkey),
        mint: String(info.mint ?? ''),
        amount: String(info.tokenAmount?.amount ?? '0'),
        decimals: typeof info.tokenAmount?.decimals === 'number' ? info.tokenAmount.decimals : null,
      };
    });
    return { tokenAccounts: accounts.filter((a) => a.amount !== '0'), tokenError: null };
  } catch (error) {
    return { tokenAccounts: [], tokenError: (error as Error).message };
  }
};

export const getSolanaAccount = async (network: Network, address: string): Promise<SolanaAccountDetail | null> => {
  const [info, tokens, signatures] = await Promise.all([
    rpc(network, 'getAccountInfo', [address, { encoding: 'jsonParsed' }]),
    tokenAccountsOf(network, address),
    rpc(network, 'getSignaturesForAddress', [address, { limit: 20 }]).catch(() => []),
  ]);
  const value = info?.value;
  const lamports = value ? String(value.lamports) : '0';
  return {
    address,
    lamports,
    executable: Boolean(value?.executable),
    owner: value?.owner ?? null,
    tokenAccounts: tokens.tokenAccounts,
    tokenError: tokens.tokenError,
    signatures: ((signatures ?? []) as any[]).map((s) => ({
      signature: String(s.signature),
      slot: Number(s.slot),
      blockTime: typeof s.blockTime === 'number' ? new Date(s.blockTime * 1000).toISOString() : null,
      failed: s.err !== null && s.err !== undefined,
    })),
  };
};

export const getSolanaNetworkInfo = async (network: Network): Promise<SolanaNetworkInfo> => {
  const [slot, epoch] = await Promise.all([rpc(network, 'getSlot', []), rpc(network, 'getEpochInfo', [])]);
  return {
    slot: Number(slot),
    epoch: typeof epoch?.epoch === 'number' ? epoch.epoch : null,
    slotIndex: typeof epoch?.slotIndex === 'number' ? epoch.slotIndex : null,
    slotsInEpoch: typeof epoch?.slotsInEpoch === 'number' ? epoch.slotsInEpoch : null,
  };
};

export const lamportsToSol = (lamports: string): string => {
  let value: bigint;
  try {
    value = BigInt(lamports);
  } catch {
    return lamports;
  }
  const whole = value / BigInt(1_000_000_000);
  const fraction = (value % BigInt(1_000_000_000)).toString().padStart(9, '0').slice(0, 6).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
};

export { TOKEN_PROGRAM };
