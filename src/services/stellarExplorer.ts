import { STELLAR_HORIZON_URLS } from '@/lib/constants';
import type { Network } from '@/types';
import { horizonErrorMessage } from './stellar/horizon';

// Stellar explorer data, read straight from Horizon (the REST API that holds
// accounts, payments and transaction history). Soroban RPC is not used here.

export type StellarExplorerTarget = { kind: 'tx'; id: string } | { kind: 'address'; id: string };

/** G... (account) or C... (contract) address: 56 base32 characters. */
const ADDRESS_RE = /^[GC][A-Z2-7]{55}$/;
/** Transaction hash: 64 hex characters. */
const HASH_RE = /^[0-9a-fA-F]{64}$/;

export const parseStellarExplorerQuery = (input: string): StellarExplorerTarget | null => {
  const value = input.trim();
  if (ADDRESS_RE.test(value)) return { kind: 'address', id: value };
  if (HASH_RE.test(value)) return { kind: 'tx', id: value.toLowerCase() };
  return null;
};

/** Stroops (1e-7 XLM) to a fixed 7-decimal XLM string. Exact, no floats. */
export const stroopsToXlm = (stroops: string | number): string => {
  const value = BigInt(stroops);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / 10_000_000n;
  const frac = (abs % 10_000_000n).toString().padStart(7, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
};

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const records = (data: unknown): Record<string, unknown>[] => {
  const list = (data as { _embedded?: { records?: unknown } } | null)?._embedded?.records;
  return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
};

export const horizonGet = async (network: Network, path: string): Promise<{ status: number; data: unknown }> => {
  const base = STELLAR_HORIZON_URLS[network].replace(/\/$/, '');
  const res = await fetch(`${base}${path}`, { headers: { Accept: 'application/json' } });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    // Non-JSON body: keep the raw text for the error message.
  }
  if (!res.ok && res.status !== 404) {
    throw new Error(horizonErrorMessage(data, res.status));
  }
  return { status: res.status, data };
};

export interface StellarBalance {
  assetType: string;
  code: string;
  issuer?: string;
  balance: string;
  limit?: string;
  buyingLiabilities: string;
  sellingLiabilities: string;
}

export interface StellarSigner {
  key: string;
  weight: number;
  type: string;
}

export interface StellarAccount {
  id: string;
  sequence: string;
  subentryCount: number;
  homeDomain?: string;
  sponsoringCount: number;
  sponsoredCount: number;
  lastModifiedLedger: number;
  flags: { authRequired: boolean; authRevocable: boolean; authImmutable: boolean; authClawbackEnabled: boolean };
  thresholds: { low: number; medium: number; high: number };
  signers: StellarSigner[];
  balances: StellarBalance[];
}

export const mapStellarAccount = (raw: Record<string, unknown>): StellarAccount => {
  const flags = (raw.flags ?? {}) as Record<string, unknown>;
  const thresholds = (raw.thresholds ?? {}) as Record<string, unknown>;
  const balances = Array.isArray(raw.balances) ? (raw.balances as Record<string, unknown>[]) : [];
  const signers = Array.isArray(raw.signers) ? (raw.signers as Record<string, unknown>[]) : [];
  return {
    id: str(raw.account_id),
    sequence: str(raw.sequence, '0'),
    subentryCount: num(raw.subentry_count),
    homeDomain: str(raw.home_domain) || undefined,
    sponsoringCount: num(raw.num_sponsoring),
    sponsoredCount: num(raw.num_sponsored),
    lastModifiedLedger: num(raw.last_modified_ledger),
    flags: {
      authRequired: flags.auth_required === true,
      authRevocable: flags.auth_revocable === true,
      authImmutable: flags.auth_immutable === true,
      authClawbackEnabled: flags.auth_clawback_enabled === true,
    },
    thresholds: {
      low: num(thresholds.low_threshold),
      medium: num(thresholds.med_threshold),
      high: num(thresholds.high_threshold),
    },
    signers: signers.map((s) => ({ key: str(s.key), weight: num(s.weight), type: str(s.type) })),
    balances: balances.map((b) => {
      const native = b.asset_type === 'native';
      return {
        assetType: str(b.asset_type),
        code: native ? 'XLM' : str(b.asset_code, 'Unknown'),
        issuer: native ? undefined : str(b.asset_issuer) || undefined,
        balance: str(b.balance, '0'),
        limit: str(b.limit) || undefined,
        buyingLiabilities: str(b.buying_liabilities, '0'),
        sellingLiabilities: str(b.selling_liabilities, '0'),
      };
    }),
  };
};

/** Account record, or null when the account is not on the ledger yet. */
export const getStellarAccount = async (network: Network, address: string): Promise<StellarAccount | null> => {
  const { status, data } = await horizonGet(network, `/accounts/${encodeURIComponent(address)}`);
  if (status === 404 || !data || typeof data !== 'object') return null;
  return mapStellarAccount(data as Record<string, unknown>);
};

/** Date of the account's first operation (its creation), or undefined if unknown. */
export const getStellarAccountCreatedAt = async (network: Network, address: string): Promise<string | undefined> => {
  const { status, data } = await horizonGet(
    network,
    `/accounts/${encodeURIComponent(address)}/operations?order=asc&limit=1`
  );
  if (status === 404) return undefined;
  return str(records(data)[0]?.created_at) || undefined;
};

export interface StellarPayment {
  id: string;
  type: string;
  from: string;
  to: string;
  direction: 'in' | 'out' | 'other';
  assetCode: string;
  amount: string;
  createdAt: string;
  txHash: string;
}

/** Whether the payment moved value into (`in`) or out of (`out`) this account. */
export const paymentDirection = (payment: { from: string; to: string }, account: string): 'in' | 'out' | 'other' => {
  if (payment.from === account && payment.to !== account) return 'out';
  if (payment.to === account && payment.from !== account) return 'in';
  return 'other';
};

const mapPayment = (raw: Record<string, unknown>, account: string): StellarPayment => {
  const from = str(raw.from);
  const to = str(raw.to);
  const native = raw.asset_type === 'native';
  return {
    id: str(raw.id),
    type: str(raw.type),
    from,
    to,
    direction: paymentDirection({ from, to }, account),
    assetCode: native ? 'XLM' : str(raw.asset_code, 'Unknown'),
    amount: str(raw.amount, '0'),
    createdAt: str(raw.created_at),
    txHash: str(raw.transaction_hash),
  };
};

/** Recent payments to and from an account, newest first. */
export const getStellarAccountPayments = async (network: Network, address: string, limit = 20): Promise<StellarPayment[]> => {
  const { status, data } = await horizonGet(
    network,
    `/accounts/${encodeURIComponent(address)}/payments?order=desc&limit=${Math.min(Math.max(limit, 1), 200)}&include_failed=true`
  );
  if (status === 404) return [];
  return records(data).map((r) => mapPayment(r, address));
};

export interface StellarTransactionSummary {
  hash: string;
  successful: boolean;
  ledger: number;
  createdAt: string;
  sourceAccount: string;
  feeCharged: string;
  operationCount: number;
  memo?: string;
}

const mapTransaction = (raw: Record<string, unknown>): StellarTransactionSummary => ({
  hash: str(raw.hash),
  successful: raw.successful === true,
  ledger: num(raw.ledger),
  createdAt: str(raw.created_at),
  sourceAccount: str(raw.source_account),
  feeCharged: str(raw.fee_charged, '0'),
  operationCount: num(raw.operation_count),
  memo: str(raw.memo) || undefined,
});

/** Recent transactions where the account is the source, newest first. */
export const getStellarAccountTransactions = async (
  network: Network,
  address: string,
  limit = 20
): Promise<StellarTransactionSummary[]> => {
  const { status, data } = await horizonGet(
    network,
    `/accounts/${encodeURIComponent(address)}/transactions?order=desc&limit=${Math.min(Math.max(limit, 1), 200)}&include_failed=true`
  );
  if (status === 404) return [];
  return records(data).map(mapTransaction);
};

export interface StellarOperation {
  id: string;
  type: string;
  sourceAccount: string;
  createdAt: string;
  summary: string;
}

const describeOperation = (raw: Record<string, unknown>): string => {
  const type = str(raw.type);
  if (type === 'payment' || type === 'path_payment_strict_send' || type === 'path_payment_strict_receive') {
    const asset = raw.asset_type === 'native' ? 'XLM' : str(raw.asset_code, 'Unknown');
    return `${str(raw.amount, '0')} ${asset} to ${str(raw.to)}`;
  }
  if (type === 'create_account') return `Create ${str(raw.account)} with ${str(raw.starting_balance, '0')} XLM`;
  if (type === 'account_merge') return `Merge into ${str(raw.into)}`;
  return type;
};

export interface StellarTransaction {
  hash: string;
  successful: boolean;
  ledger: number;
  createdAt: string;
  sourceAccount: string;
  feeCharged: string;
  operationCount: number;
  memoType: string;
  memo?: string;
  envelopeXdr: string;
  resultXdr: string;
  resultMetaXdr: string;
  operations: StellarOperation[];
}

/** Transaction with its operations, or null when the hash is not on the ledger. */
export const getStellarTransaction = async (network: Network, hash: string): Promise<StellarTransaction | null> => {
  const id = encodeURIComponent(hash);
  const tx = await horizonGet(network, `/transactions/${id}`);
  if (tx.status === 404 || !tx.data || typeof tx.data !== 'object') return null;
  const raw = tx.data as Record<string, unknown>;
  const ops = await horizonGet(network, `/transactions/${id}/operations?limit=200`);
  return {
    ...mapTransaction(raw),
    memoType: str(raw.memo_type, 'none'),
    memo: str(raw.memo) || undefined,
    envelopeXdr: str(raw.envelope_xdr),
    resultXdr: str(raw.result_xdr),
    resultMetaXdr: str(raw.result_meta_xdr),
    operations: records(ops.data).map((o) => ({
      id: str(o.id),
      type: str(o.type),
      sourceAccount: str(o.source_account),
      createdAt: str(o.created_at),
      summary: describeOperation(o),
    })),
  };
};
