import type { Network } from '@/types';
import { STELLAR_HORIZON_URLS, STELLAR_PASSPHRASES } from '@/lib/constants';
import { resolveChainRpcUrl } from '../suiService';

export interface StellarClassicAsset {
  kind: 'native' | 'classic' | 'liquidity_pool';
  code: string;
  issuer: string | null;
  /** Decimal string, already in whole units as Horizon reports it. */
  balance: string;
}

export interface Sep41Metadata {
  symbol: string | null;
  decimals: number | null;
}

const loadSdk = () => import('@stellar/stellar-sdk');

/** Trustlines and native balance of a `G...` account, straight from Horizon. */
export const fetchStellarClassicAssets = async (address: string, network: Network): Promise<StellarClassicAsset[]> => {
  const response = await fetch(`${STELLAR_HORIZON_URLS[network]}/accounts/${encodeURIComponent(address)}`, {
    headers: { Accept: 'application/json' },
  });
  // Not funded yet: no account on the ledger, so no trustlines either.
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Horizon request failed with status ${response.status}.`);
  const data = await response.json();
  const balances: any[] = Array.isArray(data?.balances) ? data.balances : [];
  return balances.map((b): StellarClassicAsset => {
    if (b.asset_type === 'native') return { kind: 'native', code: 'XLM', issuer: null, balance: String(b.balance) };
    if (b.asset_type === 'liquidity_pool_shares') {
      return {
        kind: 'liquidity_pool',
        code: `Pool ${String(b.liquidity_pool_id ?? '').slice(0, 8)}`,
        issuer: null,
        balance: String(b.balance),
      };
    }
    return { kind: 'classic', code: String(b.asset_code), issuer: b.asset_issuer ?? null, balance: String(b.balance) };
  });
};

const metadataCache = new Map<string, Promise<Sep41Metadata | null>>();

/**
 * `symbol()` and `decimals()` of a SEP-41 token, read by simulating the calls.
 * Simulation needs no signature and no funded account: a throwaway keypair
 * stands in as source. Results are cached per network and contract.
 */
export const fetchSep41Metadata = (contractId: string, network: Network): Promise<Sep41Metadata | null> => {
  const key = `${network}:${contractId}`;
  const cached = metadataCache.get(key);
  if (cached) return cached;

  const pending = (async () => {
    const sdk = await loadSdk();
    const server = new sdk.rpc.Server(resolveChainRpcUrl('stellar', network));
    const account = new sdk.Account(sdk.Keypair.random().publicKey(), '0');
    const contract = new sdk.Contract(contractId);

    const read = async (fn: 'symbol' | 'decimals'): Promise<unknown> => {
      const tx = new sdk.TransactionBuilder(account, {
        fee: sdk.BASE_FEE,
        networkPassphrase: STELLAR_PASSPHRASES[network],
      })
        .addOperation(contract.call(fn))
        .setTimeout(30)
        .build();
      const sim = await server.simulateTransaction(tx);
      if (!sdk.rpc.Api.isSimulationSuccess(sim) || !sim.result) return null;
      return sdk.scValToNative(sim.result.retval);
    };

    const [symbol, decimals] = await Promise.all([read('symbol'), read('decimals')]);
    if (symbol === null && decimals === null) return null;
    return {
      symbol: typeof symbol === 'string' && symbol ? symbol : null,
      decimals: typeof decimals === 'number' ? decimals : null,
    };
  })();

  // Failures are not cached, so a later render can retry.
  pending.catch(() => metadataCache.delete(key));
  metadataCache.set(key, pending);
  return pending;
};

/** Whole units from a raw base-unit string, e.g. ("1500000", 6) -> "1.5". */
export const formatTokenAmount = (raw: string, decimals: number | null): string => {
  if (decimals === null) return raw;
  let value: bigint;
  try {
    value = BigInt(raw);
  } catch {
    return raw;
  }
  const negative = value < BigInt(0);
  if (negative) value = -value;
  const base = BigInt(10) ** BigInt(decimals);
  const whole = value / base;
  const fraction = decimals === 0 ? '' : (value % base).toString().padStart(decimals, '0').slice(0, 4).replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole.toString()}${fraction ? `.${fraction}` : ''}`;
};
