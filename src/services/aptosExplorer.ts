import { APTOS_NETWORKS } from '@/lib/constants';
import type { Network } from '@/types';

export type AptosExplorerTarget = { kind: 'tx'; id: string } | { kind: 'address'; id: string };

export interface AptosTransactionSummary {
  hash: string;
  version: string | null;
  type: string | null;
  success: boolean | null;
  timestamp: string | null;
  sender: string | null;
  functionName: string | null;
  feeOctas: string | null;
  vmStatus: string | null;
}

export interface AptosAccountDetail {
  address: string;
  sequenceNumber: string | null;
  authenticationKey: string | null;
  aptBalanceOctas: string | null;
  transactions: AptosTransactionSummary[];
}

/**
 * `0x` + 1-64 hex. Aptos hashes and account addresses are both 32 bytes, so a
 * 64-digit value is ambiguous: `resolveAptosQuery` tries it as a transaction first.
 */
export const parseAptosExplorerQuery = (input: string): string | null => {
  const value = input.trim();
  return /^0x[0-9a-fA-F]{1,64}$/.test(value) ? value.toLowerCase() : null;
};

const base = (network: Network) => APTOS_NETWORKS[network];

/** GET on the fullnode. Null on 404; other failures throw with the fullnode's message. */
const get = async (network: Network, path: string): Promise<any | null> => {
  const response = await fetch(`${base(network)}${path}`, { headers: { Accept: 'application/json' } });
  if (response.status === 404) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? `Aptos fullnode returned HTTP ${response.status}.`);
  return data;
};

const post = async (network: Network, path: string, body: unknown): Promise<any> => {
  const response = await fetch(`${base(network)}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? `Aptos fullnode returned HTTP ${response.status}.`);
  return data;
};

const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

export const mapAptosTransaction = (raw: any): AptosTransactionSummary | null => {
  if (!raw?.hash) return null;
  const gasUsed = str(raw.gas_used);
  const gasPrice = str(raw.gas_unit_price);
  return {
    hash: String(raw.hash),
    version: str(raw.version),
    type: str(raw.type),
    success: typeof raw.success === 'boolean' ? raw.success : null,
    // Aptos timestamps are microseconds.
    timestamp: raw.timestamp ? new Date(Number(raw.timestamp) / 1000).toISOString() : null,
    sender: str(raw.sender),
    functionName: raw.payload?.function ?? null,
    feeOctas: gasUsed !== null && gasPrice !== null ? (BigInt(gasUsed) * BigInt(gasPrice)).toString() : null,
    vmStatus: str(raw.vm_status),
  };
};

export const getAptosTransaction = async (network: Network, hash: string): Promise<AptosTransactionSummary | null> =>
  mapAptosTransaction(await get(network, `/transactions/by_hash/${hash}`));

/** Balance of the native APT coin, in octas (1 APT = 10^8). */
const aptBalance = async (network: Network, address: string): Promise<string | null> => {
  try {
    const result = await post(network, '/view', {
      function: '0x1::coin::balance',
      type_arguments: ['0x1::aptos_coin::AptosCoin'],
      arguments: [address],
    });
    return Array.isArray(result) && result[0] !== undefined ? String(result[0]) : null;
  } catch {
    // Accounts that never held APT (or have no CoinStore) report no balance.
    return null;
  }
};

export const getAptosAccount = async (network: Network, address: string): Promise<AptosAccountDetail | null> => {
  const [account, balance, txs] = await Promise.all([
    get(network, `/accounts/${address}`),
    aptBalance(network, address),
    get(network, `/accounts/${address}/transactions?limit=20`).catch(() => []),
  ]);
  if (!account) return null;
  return {
    address,
    sequenceNumber: str(account.sequence_number),
    authenticationKey: str(account.authentication_key),
    aptBalanceOctas: balance,
    transactions: ((txs ?? []) as any[]).map(mapAptosTransaction).filter((t): t is AptosTransactionSummary => t !== null),
  };
};

/** Newest transactions on the network, for the landing page. */
export const getAptosLatestTransactions = async (network: Network): Promise<AptosTransactionSummary[]> => {
  const ledger = await get(network, '/');
  const latest = Number(ledger?.ledger_version ?? 0);
  if (!latest) return [];
  const start = Math.max(0, latest - 60);
  const txs = (await get(network, `/transactions?start=${start}&limit=60`)) ?? [];
  return (txs as any[])
    .map(mapAptosTransaction)
    .filter((t): t is AptosTransactionSummary => t !== null && t.type === 'user_transaction')
    .slice(-20)
    .reverse();
};

export const formatOctas = (raw: string | null): string => {
  if (raw === null) return '—';
  let value: bigint;
  try {
    value = BigInt(raw);
  } catch {
    return raw;
  }
  const whole = value / BigInt(100_000_000);
  const fraction = (value % BigInt(100_000_000)).toString().padStart(8, '0').slice(0, 6).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
};

/** Resolves a query: a transaction when the hash exists, otherwise an account. */
export const resolveAptosQuery = async (network: Network, value: string): Promise<AptosExplorerTarget | null> => {
  const id = parseAptosExplorerQuery(value);
  if (!id) return null;
  if (id.length === 66) {
    const tx = await getAptosTransaction(network, id);
    if (tx) return { kind: 'tx', id };
  }
  return { kind: 'address', id };
};
