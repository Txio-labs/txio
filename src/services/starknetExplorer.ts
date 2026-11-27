import { executeChainRpc, SuiRpcError } from './suiService';
import type { Network } from '@/types';
import { getStrkBalance, STRK_DECIMALS } from './starknet';

export type StarknetExplorerTarget = { kind: 'tx'; id: string } | { kind: 'address'; id: string };

export interface StarknetTransactionDetail {
  hash: string;
  type: string | null;
  senderAddress: string | null;
  nonce: string | null;
  version: string | null;
  executionStatus: string | null;
  finalityStatus: string | null;
  blockNumber: number | null;
  feeFri: string | null;
  eventCount: number;
  calldataLength: number | null;
  revertReason: string | null;
}

export interface StarknetAddressDetail {
  address: string;
  nonce: string | null;
  classHash: string | null;
  strkBalanceFri: string | null;
  deployed: boolean;
}

/** Starknet RPC errors that mean "no such thing on this network": 20 CONTRACT_NOT_FOUND, 24 BLOCK_NOT_FOUND, 28 CLASS_HASH_NOT_FOUND, 29 TXN_HASH_NOT_FOUND. */
const NOT_FOUND_CODES = new Set([20, 24, 28, 29]);

/**
 * Returns the result, or `null` when the node says the entity does not exist.
 * Goes through the shared RPC engine, so custom endpoints and failover apply.
 */
const call = async (network: Network, method: string, params: unknown[]): Promise<any | null> => {
  try {
    return (await executeChainRpc('starknet', network, method, params)).result;
  } catch (err) {
    if (err instanceof SuiRpcError && err.rpcCode !== undefined && NOT_FOUND_CODES.has(err.rpcCode)) return null;
    throw err;
  }
};

const toDecimal = (hex: unknown): string | null => {
  if (typeof hex !== 'string' || !/^0x[0-9a-fA-F]+$/.test(hex)) return null;
  return BigInt(hex).toString();
};

/** A Starknet felt: `0x` + up to 64 hex digits. Transaction hashes and addresses share that shape. */
export const parseStarknetExplorerQuery = (input: string): string | null => {
  const value = input.trim();
  return /^0x[0-9a-fA-F]{1,64}$/.test(value) ? value.toLowerCase() : null;
};

export const mapStarknetTransaction = (hash: string, tx: any, receipt: any): StarknetTransactionDetail | null => {
  if (!tx && !receipt) return null;
  const fee = receipt?.actual_fee;
  return {
    hash,
    type: tx?.type ?? receipt?.type ?? null,
    senderAddress: tx?.sender_address ?? null,
    nonce: tx?.nonce ?? null,
    version: tx?.version ?? null,
    executionStatus: receipt?.execution_status ?? null,
    finalityStatus: receipt?.finality_status ?? null,
    blockNumber: typeof receipt?.block_number === 'number' ? receipt.block_number : null,
    feeFri: toDecimal(typeof fee === 'string' ? fee : fee?.amount) ?? null,
    eventCount: Array.isArray(receipt?.events) ? receipt.events.length : 0,
    calldataLength: Array.isArray(tx?.calldata) ? tx.calldata.length : null,
    revertReason: receipt?.revert_reason ?? null,
  };
};

export const getStarknetTransaction = async (network: Network, hash: string): Promise<StarknetTransactionDetail | null> => {
  const [tx, receipt] = await Promise.all([
    call(network, 'starknet_getTransactionByHash', [hash]),
    call(network, 'starknet_getTransactionReceipt', [hash]),
  ]);
  return mapStarknetTransaction(hash, tx, receipt);
};

export const getStarknetAddress = async (network: Network, address: string): Promise<StarknetAddressDetail | null> => {
  const [nonce, classHash, balance] = await Promise.all([
    call(network, 'starknet_getNonce', ['latest', address]),
    call(network, 'starknet_getClassHashAt', ['latest', address]),
    getStrkBalance(network, address).then((b) => b.toString()).catch(() => null),
  ]);
  if (nonce === null && classHash === null && balance === null) return null;
  return {
    address,
    nonce: toDecimal(nonce),
    classHash: typeof classHash === 'string' ? classHash : null,
    strkBalanceFri: balance,
    deployed: classHash !== null,
  };
};

/** Transaction hashes of the latest block, for the landing page. */
export const getStarknetLatestBlock = async (network: Network): Promise<{ blockNumber: number; transactions: string[] } | null> => {
  const block = await call(network, 'starknet_getBlockWithTxHashes', ['latest']);
  if (!block) return null;
  return {
    blockNumber: Number(block.block_number ?? 0),
    transactions: ((block.transactions ?? []) as unknown[]).map(String).slice(-20).reverse(),
  };
};

/** Formats a fri (10^-18 STRK) amount, e.g. "1500000000000000000" -> "1.5". */
export const formatFri = (raw: string | null): string => {
  if (raw === null) return '—';
  const value = BigInt(raw);
  const unit = BigInt(10) ** BigInt(STRK_DECIMALS);
  const whole = value / unit;
  const fraction = (value % unit).toString().padStart(STRK_DECIMALS, '0').slice(0, 6).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
};

/** A felt is looked up as a transaction first, then as an account. */
export const resolveStarknetQuery = async (network: Network, value: string): Promise<StarknetExplorerTarget | null> => {
  const id = parseStarknetExplorerQuery(value);
  if (!id) return null;
  if (await getStarknetTransaction(network, id)) return { kind: 'tx', id };
  if (await getStarknetAddress(network, id)) return { kind: 'address', id };
  return { kind: 'address', id };
};
