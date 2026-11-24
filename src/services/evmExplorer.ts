import { formatUnits } from 'viem';
import { BLOCKSCOUT_APIS, EVM_NATIVE_SYMBOL } from './transactionHistory';

export type EvmExplorerTarget = { kind: 'tx'; id: string } | { kind: 'address'; id: string };

export interface EvmTransactionDetail {
  hash: string;
  status: 'success' | 'failed' | 'pending';
  blockNumber: string | null;
  timestamp: string | null;
  from: string | null;
  to: string | null;
  createdContract: string | null;
  valueWei: string;
  gasUsed: string | null;
  gasPriceWei: string | null;
  feeWei: string | null;
  method: string | null;
  txTypes: string[];
  revertReason: string | null;
}

export interface EvmTokenTransfer {
  from: string | null;
  to: string | null;
  tokenAddress: string | null;
  symbol: string | null;
  decimals: number | null;
  value: string;
}

export interface EvmAddressDetail {
  address: string;
  coinBalanceWei: string;
  isContract: boolean;
  ensName: string | null;
  exchangeRate: string | null;
  transactionsCount: string | null;
}

export interface EvmTokenHolding {
  tokenAddress: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  valueRaw: string;
}

export interface EvmListedTransaction {
  hash: string;
  status: EvmTransactionDetail['status'];
  timestamp: string | null;
  from: string | null;
  to: string | null;
  valueWei: string;
  method: string | null;
}

/** `0x` + 64 hex is a transaction hash; `0x` + 40 hex is an address. */
export const parseEvmExplorerQuery = (input: string): EvmExplorerTarget | null => {
  const value = input.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(value)) return { kind: 'tx', id: value.toLowerCase() };
  if (/^0x[0-9a-fA-F]{40}$/.test(value)) return { kind: 'address', id: value };
  return null;
};

/** Blockscout returns addresses as `{ hash, ... }` objects in some places and strings in others. */
const addressOf = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { hash?: unknown }).hash === 'string') {
    return (value as { hash: string }).hash;
  }
  return null;
};

const toStr = (value: unknown): string | null => (value === null || value === undefined ? null : String(value));

const statusOf = (raw: any): EvmTransactionDetail['status'] => {
  if (raw?.status === null || raw?.status === undefined) return 'pending';
  if (raw.result === 'success' || raw.status === 'ok') return 'success';
  return 'failed';
};

export const mapEvmTransaction = (raw: any): EvmTransactionDetail | null => {
  if (!raw?.hash) return null;
  const gasUsed = toStr(raw.gas_used);
  const gasPrice = toStr(raw.gas_price);
  let fee: string | null = toStr(raw.fee?.value ?? raw.fee);
  if (fee === null && gasUsed !== null && gasPrice !== null) {
    fee = (BigInt(gasUsed) * BigInt(gasPrice)).toString();
  }
  return {
    hash: String(raw.hash),
    status: statusOf(raw),
    blockNumber: toStr(raw.block_number),
    timestamp: toStr(raw.timestamp),
    from: addressOf(raw.from),
    to: addressOf(raw.to),
    createdContract: addressOf(raw.created_contract),
    valueWei: toStr(raw.value) ?? '0',
    gasUsed,
    gasPriceWei: gasPrice,
    feeWei: fee,
    method: raw.method ?? null,
    txTypes: Array.isArray(raw.transaction_types) ? raw.transaction_types.map(String) : [],
    revertReason: raw.revert_reason ? String(raw.revert_reason) : null,
  };
};

export const mapEvmTokenTransfer = (raw: any): EvmTokenTransfer => {
  const decimals = raw?.total?.decimals ?? raw?.token?.decimals;
  return {
    from: addressOf(raw?.from),
    to: addressOf(raw?.to),
    tokenAddress: addressOf(raw?.token?.address_hash) ?? addressOf(raw?.token?.address),
    symbol: raw?.token?.symbol ?? null,
    decimals: decimals === undefined || decimals === null ? null : Number(decimals),
    value: toStr(raw?.total?.value) ?? '0',
  };
};

export const mapEvmAddress = (raw: any): EvmAddressDetail | null => {
  if (!raw?.hash) return null;
  return {
    address: String(raw.hash),
    coinBalanceWei: toStr(raw.coin_balance) ?? '0',
    isContract: Boolean(raw.is_contract),
    ensName: raw.ens_domain_name ?? null,
    exchangeRate: toStr(raw.exchange_rate),
    transactionsCount: toStr(raw.transactions_count),
  };
};

export const mapEvmTokenHolding = (item: any): EvmTokenHolding | null => {
  const address = addressOf(item?.token?.address_hash);
  if (!address) return null;
  const decimals = item.token.decimals;
  return {
    tokenAddress: address,
    name: item.token.name ?? null,
    symbol: item.token.symbol ?? null,
    decimals: decimals === undefined || decimals === null ? null : Number(decimals),
    valueRaw: toStr(item.value) ?? '0',
  };
};

export const mapEvmListedTransaction = (raw: any): EvmListedTransaction | null => {
  if (!raw?.hash) return null;
  return {
    hash: String(raw.hash),
    status: statusOf(raw),
    timestamp: toStr(raw.timestamp),
    from: addressOf(raw.from),
    to: addressOf(raw.to),
    valueWei: toStr(raw.value) ?? '0',
    method: raw.method ?? null,
  };
};

/** Formats a raw base-unit amount with its decimals, e.g. ("1500000", 6) -> "1.5". */
export const formatEvmAmount = (raw: string, decimals: number | null): string => {
  if (decimals === null) return raw;
  try {
    const text = formatUnits(BigInt(raw), decimals);
    return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
  } catch {
    return raw;
  }
};

export const evmNativeSymbol = (chainId: number): string => EVM_NATIVE_SYMBOL[chainId] ?? 'ETH';

const apiBase = (chainId: number): string => {
  const base = BLOCKSCOUT_APIS[chainId];
  if (!base) throw new Error(`Explorer data is not available for chain ${chainId}.`);
  return `${base}/api/v2`;
};

/** GET against the chain's Blockscout v2 API. Null on 404 (unknown hash or address). */
const bsGet = async (chainId: number, path: string): Promise<any | null> => {
  const response = await fetch(`${apiBase(chainId)}${path}`, { headers: { Accept: 'application/json' } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Explorer request failed with status ${response.status}.`);
  return response.json();
};

export const getEvmTransaction = async (chainId: number, hash: string) => {
  const raw = await bsGet(chainId, `/transactions/${hash}`);
  const tx = mapEvmTransaction(raw);
  if (!tx) return null;
  const transfers = await bsGet(chainId, `/transactions/${hash}/token-transfers`);
  return {
    tx,
    tokenTransfers: ((transfers?.items ?? []) as any[]).map(mapEvmTokenTransfer),
  };
};

export const getEvmAddress = async (chainId: number, address: string) => {
  const raw = await bsGet(chainId, `/addresses/${address}`);
  const detail = mapEvmAddress(raw ? { ...raw, hash: raw.hash ?? address } : null);
  if (!detail) return null;
  // Each section fails on its own: a heavy contract can 500 on its history
  // while balances and tokens still load.
  const [tokens, txs] = await Promise.allSettled([
    bsGet(chainId, `/addresses/${address}/token-balances`),
    bsGet(chainId, `/addresses/${address}/transactions`),
  ]);
  return {
    address: detail,
    tokens:
      tokens.status === 'fulfilled'
        ? ((tokens.value ?? []) as any[]).map(mapEvmTokenHolding).filter((t): t is EvmTokenHolding => t !== null)
        : [],
    tokensError: tokens.status === 'rejected' ? (tokens.reason as Error).message : null,
    transactions:
      txs.status === 'fulfilled'
        ? ((txs.value?.items ?? []) as any[]).map(mapEvmListedTransaction).filter((t): t is EvmListedTransaction => t !== null)
        : [],
    transactionsError: txs.status === 'rejected' ? (txs.reason as Error).message : null,
  };
};

/** Newest transactions on the chain, for the landing page. */
export const getEvmLatestTransactions = async (chainId: number): Promise<EvmListedTransaction[]> => {
  const raw = await bsGet(chainId, `/transactions?filter=validated`);
  return ((raw?.items ?? []) as any[]).map(mapEvmListedTransaction).filter((t): t is EvmListedTransaction => t !== null).slice(0, 20);
};

/** Only Blockscout-backed chains are supported so far. */
export const evmExplorerSupported = (chainId: number): boolean => Boolean(BLOCKSCOUT_APIS[chainId]);
