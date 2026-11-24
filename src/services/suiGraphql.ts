import type { Network } from '@/types';

// Public Sui fullnodes have turned JSON-RPC off; account data comes from Sui GraphQL.
export const SUI_GRAPHQL_URLS: Partial<Record<Network, string>> = {
  mainnet: 'https://graphql.mainnet.sui.io/graphql',
  testnet: 'https://graphql.testnet.sui.io/graphql',
  devnet: 'https://graphql.devnet.sui.io/graphql',
};

export const SUI_NATIVE_COIN_TYPE = '0x2::sui::SUI';
const PAGE_SIZE = 50;
const TIMEOUT_MS = 10000;

export interface SuiCoinBalance {
  coinType: string;
  totalBalance: string; // raw base units, decimal string
  decimals: number;
  symbol: string;
  name: string | null;
  formatted: string;
}

export interface SuiOwnedObject {
  objectId: string;
  version: string | null;
  digest: string | null;
  type: string | null;
  fields: unknown;
}

export interface SuiAssets {
  balances: SuiCoinBalance[];
  objects: SuiOwnedObject[];
}

export class SuiGraphqlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SuiGraphqlError';
  }
}

const ACCOUNT_QUERY = `query Assets($a: SuiAddress!, $n: Int!) {
  address(address: $a) {
    balances(first: $n) { nodes { coinType { repr } totalBalance } }
    objects(first: $n) { nodes { address version digest contents { type { repr } json } } }
  }
}`;

const COIN_METADATA_QUERY = `query CoinMeta($t: String!) {
  coinMetadata(coinType: $t) { decimals symbol name }
}`;

export const normalizeSuiAddress = (address: string): string => {
  const hex = address.trim().toLowerCase().replace(/^0x/, '');
  return /^[0-9a-f]{1,64}$/.test(hex) ? `0x${hex.padStart(64, '0')}` : address.trim();
};

export const formatRawAmount = (raw: string, decimals: number, maxFraction = 4): string => {
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
  const fraction = decimals === 0 ? '' : (value % base).toString().padStart(decimals, '0').slice(0, maxFraction).replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole.toString()}${fraction ? `.${fraction}` : ''}`;
};

/** Short display symbol from a coin type like `0xabc::usdc::USDC`. */
const symbolFromCoinType = (coinType: string): string => {
  const parts = coinType.split('::');
  return parts[parts.length - 1] || coinType;
};

export const suiGraphqlRequest = async <T = any>(
  network: Network,
  query: string,
  variables: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch
): Promise<T> => {
  const endpoint = SUI_GRAPHQL_URLS[network];
  if (!endpoint) {
    throw new SuiGraphqlError(`Sui GraphQL is not available on ${network}.`);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new SuiGraphqlError(`Sui GraphQL request failed with status ${response.status}.`);
    }
    const data = await response.json();
    if (data?.errors?.length) {
      throw new SuiGraphqlError(data.errors[0]?.message ?? 'Sui GraphQL error.');
    }
    return data as T;
  } finally {
    clearTimeout(timeoutId);
  }
};

/** Metadata for one coin type. Null when the chain has none registered. */
const getCoinMetadata = async (network: Network, coinType: string, fetchImpl?: typeof fetch) => {
  const data = await suiGraphqlRequest(network, COIN_METADATA_QUERY, { t: coinType }, fetchImpl);
  const meta = data?.data?.coinMetadata;
  if (!meta) return null;
  return {
    decimals: Number(meta.decimals ?? 0),
    symbol: typeof meta.symbol === 'string' && meta.symbol ? meta.symbol : symbolFromCoinType(coinType),
    name: typeof meta.name === 'string' && meta.name ? meta.name : null,
  };
};

/**
 * Every coin balance and owned object of a Sui address, read from GraphQL.
 * Coin decimals and symbols come from coin metadata; coins without metadata
 * keep their raw amount and a symbol taken from the coin type.
 */
export const getSuiAssets = async (
  network: Network,
  rawAddress: string,
  fetchImpl?: typeof fetch
): Promise<SuiAssets> => {
  const address = normalizeSuiAddress(rawAddress);
  const data = await suiGraphqlRequest(network, ACCOUNT_QUERY, { a: address, n: PAGE_SIZE }, fetchImpl);
  const account = data?.data?.address;

  const rawBalances: { coinType: string; totalBalance: string }[] = (account?.balances?.nodes ?? [])
    .map((b: any) => ({ coinType: String(b?.coinType?.repr ?? ''), totalBalance: String(b?.totalBalance ?? '0') }))
    .filter((b: { coinType: string }) => b.coinType);

  const metas = await Promise.all(
    rawBalances.map((b) =>
      b.coinType === SUI_NATIVE_COIN_TYPE
        ? Promise.resolve({ decimals: 9, symbol: 'SUI', name: 'Sui' })
        : getCoinMetadata(network, b.coinType, fetchImpl).catch(() => null)
    )
  );

  const balances: SuiCoinBalance[] = rawBalances.map((b, i) => {
    const meta = metas[i];
    const decimals = meta?.decimals ?? 0;
    const symbol = meta?.symbol ?? symbolFromCoinType(b.coinType);
    return {
      coinType: b.coinType,
      totalBalance: b.totalBalance,
      decimals,
      symbol,
      name: meta?.name ?? null,
      formatted: `${formatRawAmount(b.totalBalance, decimals)} ${symbol}`,
    };
  });

  const objects: SuiOwnedObject[] = (account?.objects?.nodes ?? []).map((o: any) => ({
    objectId: String(o?.address ?? ''),
    version: o?.version != null ? String(o.version) : null,
    digest: o?.digest ?? null,
    type: o?.contents?.type?.repr ?? null,
    fields: o?.contents?.json ?? null,
  }));

  return { balances, objects };
};
