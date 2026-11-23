import type { ConnectedWallet } from '@/wallet/types';
import type { ChainId, Network } from '@/types';
import { APTOS_NETWORKS, STELLAR_HORIZON_URLS, STELLAR_NETWORKS, getEvmChain, stellarExpertUrl } from '@/lib/constants';
import { executeChainRpc, resolveChainRpcUrl } from './suiService';

export interface TxHistoryItem {
  hash: string;
  timestamp: number | null; // unix seconds, null if unknown
  direction: 'in' | 'out' | 'self' | 'unknown';
  counterparty: string | null; // the other address, if determinable
  amount: string | null; // human-formatted amount + symbol, e.g. "12.5 XLM", null if not parseable
  status: 'success' | 'failed' | 'unknown';
  explorerUrl: string | null;
  /** Short label for what the transaction did, e.g. "payment" or "0x1::coin::transfer". */
  label?: string | null;
}

export type HistorySource =
  | 'horizon'
  | 'sui-rpc'
  | 'sui-graphql'
  | 'soroban-rpc'
  | 'etherscan'
  | 'blockscout'
  | 'eth-logs-fallback'
  | 'solana-rpc'
  | 'aptos-indexer'
  | 'aptos-rest'
  | 'starknet-rpc'
  | 'unsupported';

export interface TransactionHistoryResult {
  items: TxHistoryItem[];
  source: HistorySource;
  warning?: string;
}

/** Look up the recent transactions of any address, on any supported chain. */
export interface HistoryQuery {
  chain: ChainId;
  address: string;
  network: Network;
  /** EVM only: which EVM chain. Defaults to Ethereum mainnet, or Sepolia off mainnet. */
  evmChainId?: number;
  limit?: number;
}

const DEFAULT_LIMIT = 20;

const errorMessage = (error: unknown): string =>
  error instanceof Error && error.message.trim() ? error.message : 'Unknown error.';

const formatUnits = (raw: bigint | number | string, decimals: number, maxFraction = 4): string => {
  let value: bigint;
  try {
    value = typeof raw === 'bigint' ? raw : BigInt(String(raw).split('.')[0]);
  } catch {
    return String(raw);
  }
  const negative = value < BigInt(0);
  if (negative) value = -value;
  const base = BigInt(10) ** BigInt(decimals);
  const whole = value / base;
  let fraction = (value % base).toString().padStart(decimals, '0').slice(0, maxFraction).replace(/0+$/, '');
  if (decimals === 0) fraction = '';
  return `${negative ? '-' : ''}${whole.toString()}${fraction ? `.${fraction}` : ''}`;
};

/* -------------------------------------------------------------------- Stellar */


/**
 * Stellar: Horizon's payments feed gives counterparty and amount for payments,
 * account creations and path payments. Accounts whose activity is only
 * non-payment operations fall back to the plain transaction list.
 */
/**
 * Soroban contracts (C... addresses) are not indexed by Horizon. Soroban RPC
 * keeps about seven days of contract events; each distinct transaction that
 * emitted an event from the contract is listed, newest first.
 */
async function getSorobanContractHistory(contractId: string, network: Network, limit: number): Promise<TransactionHistoryResult> {
  const rpc = STELLAR_NETWORKS[network];
  const call = async (method: string, params?: unknown) => {
    const response = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!response.ok) throw new Error(`Soroban RPC request failed with status ${response.status}.`);
    const data = await response.json();
    if (data?.error) throw new Error(data.error.message ?? 'Soroban RPC error.');
    return data.result;
  };
  try {
    const health = await call('getHealth');
    const byTx = new Map<string, any>();
    let cursor: string | undefined;
    for (let page = 0; page < 5; page++) {
      const result = await call('getEvents', {
        ...(cursor ? {} : { startLedger: health.oldestLedger }),
        filters: [{ type: 'contract', contractIds: [contractId] }],
        pagination: { limit: 200, ...(cursor ? { cursor } : {}) },
      });
      const events: any[] = Array.isArray(result?.events) ? result.events : [];
      for (const e of events) if (e?.txHash) byTx.set(e.txHash, e);
      if (events.length < 200 || !result?.cursor) break;
      cursor = result.cursor;
    }
    const items: TxHistoryItem[] = Array.from(byTx.values())
      .reverse()
      .slice(0, limit)
      .map((e) => ({
        hash: e.txHash,
        timestamp: e.ledgerClosedAt ? Math.floor(Date.parse(e.ledgerClosedAt) / 1000) : null,
        direction: 'unknown',
        counterparty: null,
        amount: null,
        status: e.inSuccessfulContractCall === false ? 'failed' : 'success',
        explorerUrl: stellarExpertUrl(network, 'tx', e.txHash) ?? null,
        label: e.type ? `${e.type} event` : null,
      }));
    return {
      items,
      source: 'soroban-rpc',
      warning: items.length === 0 ? 'No contract events in the RPC retention window (about the last 7 days).' : undefined,
    };
  } catch (error) {
    return { items: [], source: 'soroban-rpc', warning: `Failed to load transaction history: ${errorMessage(error)}` };
  }
}

async function getStellarHistory(address: string, network: Network, limit: number): Promise<TransactionHistoryResult> {
  if (/^C[A-Z2-7]{55}$/.test(address)) {
    return getSorobanContractHistory(address, network, limit);
  }
  const horizon = STELLAR_HORIZON_URLS[network];
  try {
    const payRes = await fetch(
      `${horizon}/accounts/${encodeURIComponent(address)}/payments?order=desc&limit=${limit}&include_failed=true`,
      { headers: { Accept: 'application/json' } }
    );
    if (payRes.status === 404) {
      return { items: [], source: 'horizon', warning: 'This account does not exist on this Stellar network yet.' };
    }
    if (!payRes.ok) throw new Error(`Horizon request failed with status ${payRes.status}.`);
    const payData = await payRes.json();
    const payments: any[] = Array.isArray(payData?._embedded?.records) ? payData._embedded.records : [];

    if (payments.length > 0) {
      const items: TxHistoryItem[] = payments.map((p) => {
        const asset = p.asset_type === 'native' ? 'XLM' : p.asset_code ?? p.asset_type ?? '';
        let from: string | null = p.from ?? null;
        let to: string | null = p.to ?? null;
        let amount: string | null = p.amount ? `${p.amount} ${asset}`.trim() : null;
        if (p.type === 'create_account') {
          from = p.funder ?? null;
          to = p.account ?? null;
          amount = p.starting_balance ? `${p.starting_balance} XLM` : null;
        }
        const direction: TxHistoryItem['direction'] =
          from === address && to === address ? 'self' : from === address ? 'out' : to === address ? 'in' : 'unknown';
        return {
          hash: p.transaction_hash,
          timestamp: p.created_at ? Math.floor(new Date(p.created_at).getTime() / 1000) : null,
          direction,
          counterparty: direction === 'out' ? to : direction === 'in' ? from : null,
          amount,
          status: p.transaction_successful === false ? 'failed' : 'success',
          explorerUrl: p.transaction_hash ? (stellarExpertUrl(network, 'tx', p.transaction_hash) ?? null) : null,
          label: String(p.type ?? '').replace(/_/g, ' ') || null,
        };
      });
      return { items, source: 'horizon' };
    }

    const txRes = await fetch(
      `${horizon}/accounts/${encodeURIComponent(address)}/transactions?order=desc&limit=${limit}&include_failed=true`,
      { headers: { Accept: 'application/json' } }
    );
    if (!txRes.ok) throw new Error(`Horizon request failed with status ${txRes.status}.`);
    const txData = await txRes.json();
    const records: any[] = Array.isArray(txData?._embedded?.records) ? txData._embedded.records : [];
    return {
      source: 'horizon',
      items: records.map((r) => ({
        hash: r.hash,
        timestamp: r.created_at ? Math.floor(new Date(r.created_at).getTime() / 1000) : null,
        direction: r.source_account === address ? 'out' : 'in',
        counterparty: r.source_account !== address ? r.source_account ?? null : null,
        amount: null,
        status: r.successful === false ? 'failed' : 'success',
        explorerUrl: r.hash ? (stellarExpertUrl(network, 'tx', r.hash) ?? null) : null,
        label: r.operation_count ? `${r.operation_count} operation${r.operation_count === 1 ? '' : 's'}` : null,
      })),
    };
  } catch (error) {
    return { items: [], source: 'horizon', warning: `Failed to load transaction history: ${errorMessage(error)}` };
  }
}

/* ------------------------------------------------------------------------ Sui */

// Public Sui fullnodes have turned JSON-RPC off; history comes from Sui GraphQL.
const SUI_GRAPHQL: Partial<Record<Network, string>> = {
  mainnet: 'https://graphql.mainnet.sui.io/graphql',
  testnet: 'https://graphql.testnet.sui.io/graphql',
  devnet: 'https://graphql.devnet.sui.io/graphql',
};

const SUI_COIN = /^0x0*2::sui::SUI$/;

const normalizeSuiAddress = (address: string): string => {
  const hex = address.trim().toLowerCase().replace(/^0x/, '');
  return /^[0-9a-f]{1,64}$/.test(hex) ? `0x${hex.padStart(64, '0')}` : address.trim();
};

const SUI_HISTORY_QUERY = `query History($a: SuiAddress!, $n: Int!) {
  address(address: $a) {
    transactions(last: $n, relation: AFFECTED) {
      nodes {
        digest
        sender { address }
        effects { status timestamp balanceChanges { nodes { owner { address } amount coinType { repr } } } }
        kind { __typename ... on ProgrammableTransaction { commands(first: 3) { nodes { __typename ... on MoveCallCommand { function { name module { name } } } } } } }
      }
    }
  }
}`;

async function getSuiHistory(rawAddress: string, network: Network, limit: number): Promise<TransactionHistoryResult> {
  if (rawAddress.trim().toLowerCase().endsWith('.sui')) {
    return { items: [], source: 'sui-graphql', warning: 'Enter the 0x address. SuiNS names are not resolved for history yet.' };
  }
  const address = normalizeSuiAddress(rawAddress);
  const endpoint = SUI_GRAPHQL[network];
  const explorerNetwork = network === 'mainnet' ? 'mainnet' : network === 'devnet' ? 'devnet' : 'testnet';
  if (!endpoint) {
    return getSuiHistoryJsonRpc(address, network, limit);
  }
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SUI_HISTORY_QUERY, variables: { a: address, n: Math.min(limit, 50) } }),
    });
    if (!response.ok) throw new Error(`Sui GraphQL request failed with status ${response.status}.`);
    const data = await response.json();
    if (data?.errors?.length) throw new Error(data.errors[0]?.message ?? 'Sui GraphQL error.');
    const nodes: any[] = data?.data?.address?.transactions?.nodes ?? [];
    const items: TxHistoryItem[] = nodes
      .slice()
      .reverse()
      .map((tx) => {
        const sender: string | undefined = tx?.sender?.address;
        const changes: any[] = tx?.effects?.balanceChanges?.nodes ?? [];
        const mine = changes.find((c) => c?.owner?.address === address && SUI_COIN.test(c?.coinType?.repr ?? ''));
        const delta = mine ? BigInt(mine.amount) : null;
        const direction: TxHistoryItem['direction'] =
          sender === undefined ? 'unknown' : sender === address ? 'out' : 'in';
        const call = (tx?.kind?.commands?.nodes ?? []).find((c: any) => c?.__typename === 'MoveCallCommand')?.function;
        const ts = tx?.effects?.timestamp ? Date.parse(tx.effects.timestamp) : NaN;
        return {
          hash: tx.digest,
          timestamp: Number.isNaN(ts) ? null : Math.floor(ts / 1000),
          direction,
          counterparty: direction === 'in' ? sender ?? null : null,
          amount: delta !== null ? `${formatUnits(delta, 9)} SUI` : null,
          status: tx?.effects?.status === 'SUCCESS' ? 'success' : tx?.effects?.status === 'FAILURE' ? 'failed' : 'unknown',
          explorerUrl: tx.digest ? `https://suiscan.xyz/${explorerNetwork}/tx/${tx.digest}` : null,
          label: call ? `${call.module?.name}::${call.name}` : tx?.kind?.__typename?.replace(/Transaction$/, '') ?? null,
        };
      });
    return { items, source: 'sui-graphql' };
  } catch (error) {
    return { items: [], source: 'sui-graphql', warning: `Failed to load transaction history: ${errorMessage(error)}` };
  }
}

/** Localnet and custom fullnodes still speak JSON-RPC. */
async function getSuiHistoryJsonRpc(address: string, network: Network, limit: number): Promise<TransactionHistoryResult> {
  const options = { showEffects: true, showInput: true, showBalanceChanges: true };
  const query = (filter: Record<string, unknown>) =>
    executeChainRpc('sui', network, 'suix_queryTransactionBlocks', [{ filter, options }, null, limit, true]).then(
      ({ result }) => (Array.isArray(result?.data) ? (result.data as any[]) : [])
    );
  try {
    const [sent, received] = await Promise.allSettled([query({ FromAddress: address }), query({ ToAddress: address })]);
    if (sent.status === 'rejected' && received.status === 'rejected') throw sent.reason;
    const byDigest = new Map<string, any>();
    for (const tx of [...(sent.status === 'fulfilled' ? sent.value : []), ...(received.status === 'fulfilled' ? received.value : [])]) {
      if (tx?.digest) byDigest.set(tx.digest, tx);
    }
    const items: TxHistoryItem[] = Array.from(byDigest.values())
      .sort((x, y) => Number(y.timestampMs ?? 0) - Number(x.timestampMs ?? 0))
      .slice(0, limit)
      .map((tx) => {
        const sender: string | undefined = tx?.transaction?.data?.sender;
        const change = (tx?.balanceChanges as any[] | undefined)?.find((c) => c?.owner?.AddressOwner === address && SUI_COIN.test(c?.coinType ?? ''));
        const ms = tx?.timestampMs ? Number(tx.timestampMs) : NaN;
        return {
          hash: tx.digest,
          timestamp: Number.isNaN(ms) ? null : Math.floor(ms / 1000),
          direction: sender === undefined ? 'unknown' : sender === address ? 'out' : 'in',
          counterparty: sender && sender !== address ? sender : null,
          amount: change ? `${formatUnits(BigInt(change.amount), 9)} SUI` : null,
          status: tx?.effects?.status?.status === 'success' ? 'success' : tx?.effects?.status?.status === 'failure' ? 'failed' : 'unknown',
          explorerUrl: null,
          label: null,
        };
      });
    return { items, source: 'sui-rpc' };
  } catch (error) {
    return { items: [], source: 'sui-rpc', warning: `Failed to load transaction history: ${errorMessage(error)}` };
  }
}

/* ------------------------------------------------------------------------ EVM */

const EVM_TX_EXPLORERS: Record<number, string> = {
  1: 'https://etherscan.io/tx/',
  10: 'https://optimistic.etherscan.io/tx/',
  25: 'https://cronoscan.com/tx/',
  56: 'https://bscscan.com/tx/',
  100: 'https://gnosisscan.io/tx/',
  137: 'https://polygonscan.com/tx/',
  250: 'https://ftmscan.com/tx/',
  288: 'https://bobascan.com/tx/',
  324: 'https://explorer.zksync.io/tx/',
  1101: 'https://zkevm.polygonscan.com/tx/',
  1284: 'https://moonscan.io/tx/',
  5000: 'https://mantlescan.xyz/tx/',
  143: 'https://monadscan.com/tx/',
  8453: 'https://basescan.org/tx/',
  42161: 'https://arbiscan.io/tx/',
  42220: 'https://celoscan.io/tx/',
  43114: 'https://snowtrace.io/tx/',
  59144: 'https://lineascan.build/tx/',
  81457: 'https://blastscan.io/tx/',
  534352: 'https://scrollscan.com/tx/',
  7777777: 'https://explorer.zora.energy/tx/',
  11155111: 'https://sepolia.etherscan.io/tx/',
};

/**
 * Keyless, Etherscan-compatible Blockscout APIs, used when no Etherscan key is set.
 * Only hosts verified to answer without a browser challenge are listed.
 */
const BLOCKSCOUT_APIS: Record<number, string> = {
  1: 'https://eth.blockscout.com',
  324: 'https://zksync.blockscout.com',
  42220: 'https://celo.blockscout.com',
  11155111: 'https://eth-sepolia.blockscout.com',
};

const EVM_NATIVE_SYMBOL: Record<number, string> = {
  25: 'CRO',
  143: 'MON',
  10143: 'MON',
  56: 'BNB',
  100: 'xDAI',
  137: 'POL',
  250: 'FTM',
  1284: 'GLMR',
  5000: 'MNT',
  42220: 'CELO',
  43114: 'AVAX',
};

const parseEvmChainId = (caip2: string): number | null => {
  const match = /^eip155:(\d+)$/.exec(caip2);
  return match ? Number(match[1]) : null;
};

const ERC20_TRANSFER = 'event Transfer(address indexed from, address indexed to, uint256 value)';
// Public RPCs cap eth_getLogs ranges very differently (Monad: 100 blocks,
// Linea: 10,000+), so windows grow until the RPC refuses or enough are found.
const EVM_LOG_WINDOWS = [BigInt(100), BigInt(1_000), BigInt(10_000), BigInt(50_000)];

/**
 * Keyless fallback for chains without a reachable explorer API: ERC-20
 * Transfer logs to and from the address, read from the chain's own RPC over
 * recent blocks. Native-currency transfers and plain contract calls emit no
 * log, so they are not listed; the warning says so.
 */
async function getEvmLogsHistory(address: string, chainId: number, chainName: string, limit: number): Promise<TransactionHistoryResult> {
  try {
    const { createPublicClient, http, parseAbiItem, erc20Abi, getAddress } = await import('viem');
    const { wagmiConfig } = await import('@/wallet/config');
    const { EVM_CHAINS: RPC_CHAINS } = await import('@/lib/constants');
    const chain = wagmiConfig.chains.find((c) => c.id === chainId);
    const rpcUrl = RPC_CHAINS.find((c) => c.id === chainId)?.rpcUrl ?? chain?.rpcUrls.default.http[0];
    if (!rpcUrl) return { items: [], source: 'unsupported', warning: `No RPC is configured for ${chainName}.` };
    const client = createPublicClient({ transport: http(rpcUrl) });
    const me = getAddress(address);
    const event = parseAbiItem(ERC20_TRANSFER);
    const latest = await client.getBlockNumber();

    type TransferLog = {
      address: `0x${string}`;
      blockNumber: bigint | null;
      transactionHash: `0x${string}` | null;
      args: { from?: string; to?: string; value?: bigint };
    };
    let logs: TransferLog[] = [];
    let scanned = BigInt(0);
    for (const span of EVM_LOG_WINDOWS) {
      const fromBlock = latest > span ? latest - span : BigInt(0);
      try {
        const [sent, received] = await Promise.all([
          client.getLogs({ event, args: { from: me }, fromBlock, toBlock: latest }),
          client.getLogs({ event, args: { to: me }, fromBlock, toBlock: latest }),
        ]);
        logs = [...sent, ...received] as unknown as TransferLog[];
        scanned = latest - fromBlock;
      } catch {
        break; // The RPC caps the block range; keep what the smaller window found.
      }
      if (new Set(logs.map((l) => l.transactionHash)).size >= limit || fromBlock === BigInt(0)) break;
    }

    const sorted = logs.sort((a, b) => Number((b.blockNumber ?? BigInt(0)) - (a.blockNumber ?? BigInt(0))));
    const byTx = new Map<string, (typeof sorted)[number]>();
    for (const log of sorted) if (log.transactionHash && !byTx.has(log.transactionHash)) byTx.set(log.transactionHash, log);
    const picked = [...byTx.values()].slice(0, limit);

    const tokens = [...new Set(picked.map((l) => l.address))];
    const meta = new Map<string, { symbol: string; decimals: number }>();
    await Promise.all(
      tokens.map(async (token) => {
        try {
          const [symbol, decimals] = await Promise.all([
            client.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' } as never) as Promise<string>,
            client.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' } as never) as Promise<number>,
          ]);
          meta.set(token, { symbol, decimals: Number(decimals) });
        } catch {
          // Not a standard ERC-20 (e.g. an NFT); amount stays raw.
        }
      })
    );
    const times = new Map<bigint, number | null>();
    await Promise.all(
      [...new Set(picked.map((l) => l.blockNumber))].filter((b): b is bigint => b !== null).map(async (n) => {
        try {
          times.set(n, Number((await client.getBlock({ blockNumber: n })).timestamp));
        } catch {
          times.set(n, null);
        }
      })
    );
    const explorer = EVM_TX_EXPLORERS[chainId] ?? (chain?.blockExplorers?.default.url ? `${chain.blockExplorers.default.url.replace(/\/$/, '')}/tx/` : null);

    const items: TxHistoryItem[] = picked.map((log) => {
      const from = String(log.args.from ?? '');
      const to = String(log.args.to ?? '');
      const direction: TxHistoryItem['direction'] = from === me ? (to === me ? 'self' : 'out') : 'in';
      const token = meta.get(log.address);
      const value = log.args.value ?? BigInt(0);
      return {
        hash: log.transactionHash ?? '',
        timestamp: log.blockNumber !== null ? times.get(log.blockNumber) ?? null : null,
        direction,
        counterparty: direction === 'in' ? from : to,
        amount: token ? `${formatUnits(value, token.decimals)} ${token.symbol}` : `${value.toString()} (${log.address})`,
        status: 'success',
        explorerUrl: explorer && log.transactionHash ? `${explorer}${log.transactionHash}` : null,
        label: 'token transfer',
      };
    });
    if (scanned === BigInt(0)) {
      return {
        items: [],
        source: 'unsupported',
        warning: `${chainName}'s public RPC refused log queries, and no keyless explorer API is known for it. Set NEXT_PUBLIC_ETHERSCAN_API_KEY to load history.`,
      };
    }
    return {
      items,
      source: 'eth-logs-fallback',
      warning: `Showing token transfers from the last ${scanned.toLocaleString()} ${chainName} blocks, read from the chain's RPC. Native ${EVM_NATIVE_SYMBOL[chainId] ?? 'ETH'} transfers and other calls need an explorer API key (NEXT_PUBLIC_ETHERSCAN_API_KEY).`,
    };
  } catch (error) {
    return { items: [], source: 'eth-logs-fallback', warning: `Failed to load transaction history: ${errorMessage(error)}` };
  }
}

async function getEvmHistory(address: string, network: Network, limit: number, evmChainId?: number): Promise<TransactionHistoryResult> {
  const chainId = evmChainId ?? (network === 'mainnet' ? 1 : 11155111);
  const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  const blockscout = BLOCKSCOUT_APIS[chainId];
  const source: HistorySource = apiKey ? 'etherscan' : 'blockscout';
  const chainName = chainId === 11155111 ? 'Sepolia' : getEvmChain(chainId).name;

  if (!apiKey && !blockscout) {
    return getEvmLogsHistory(address, chainId, chainName, limit);
  }

  const qs = `module=account&action=txlist&address=${encodeURIComponent(address)}&startblock=0&endblock=99999999&sort=desc&page=1&offset=${limit}`;
  const url = apiKey ? `https://api.etherscan.io/v2/api?chainid=${chainId}&${qs}&apikey=${apiKey}` : `${blockscout}/api?${qs}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${apiKey ? 'Etherscan' : 'Blockscout'} request failed with status ${response.status}.`);
    const data = await response.json();
    // status "0" with "No transactions found" is a valid empty result.
    if (data.status !== '1' && !Array.isArray(data.result)) {
      throw new Error(typeof data?.message === 'string' && data.message ? data.message : 'The explorer API returned an error.');
    }
    const explorer = EVM_TX_EXPLORERS[chainId] ?? (blockscout ? `${blockscout}/tx/` : null);
    const symbol = EVM_NATIVE_SYMBOL[chainId] ?? 'ETH';
    const me = address.toLowerCase();
    const results: any[] = Array.isArray(data.result) ? data.result : [];

    const items: TxHistoryItem[] = results.map((tx) => {
      const from = typeof tx.from === 'string' ? tx.from.toLowerCase() : '';
      const to = typeof tx.to === 'string' ? tx.to.toLowerCase() : '';
      const direction: TxHistoryItem['direction'] = from === me ? (to === me ? 'self' : 'out') : 'in';
      const amount = typeof tx.value === 'string' && /^\d+$/.test(tx.value) ? `${formatUnits(tx.value, 18)} ${symbol}` : null;
      const fn = typeof tx.functionName === 'string' && tx.functionName ? tx.functionName.split('(')[0] : null;
      return {
        hash: tx.hash,
        timestamp: tx.timeStamp ? Number(tx.timeStamp) : null,
        direction,
        counterparty: direction === 'out' ? tx.to || (tx.contractAddress ? `${tx.contractAddress} (created)` : null) : tx.from || null,
        amount,
        status: tx.isError === '1' || tx.txreceipt_status === '0' ? 'failed' : 'success',
        explorerUrl: tx.hash && explorer ? `${explorer}${tx.hash}` : null,
        label: fn || (tx.input && tx.input !== '0x' ? 'contract call' : 'transfer'),
      };
    });
    return { items, source };
  } catch (error) {
    return { items: [], source, warning: `Failed to load transaction history: ${errorMessage(error)}` };
  }
}

/* --------------------------------------------------------------------- Solana */

async function getSolanaHistory(address: string, network: Network, limit: number): Promise<TransactionHistoryResult> {
  try {
    const { result } = await executeChainRpc('solana', network, 'getSignaturesForAddress', [address, { limit }]);
    const signatures: any[] = Array.isArray(result) ? result : [];
    const cluster = network === 'mainnet' ? '' : `?cluster=${network === 'localnet' ? 'custom' : network}`;
    const items: TxHistoryItem[] = signatures.map((entry) => ({
      hash: entry.signature,
      timestamp: typeof entry.blockTime === 'number' ? entry.blockTime : null,
      direction: 'unknown',
      counterparty: null,
      amount: null,
      status: entry.err === null || entry.err === undefined ? 'success' : 'failed',
      explorerUrl: entry.signature ? `https://explorer.solana.com/tx/${entry.signature}${cluster}` : null,
      label: typeof entry.memo === 'string' && entry.memo ? entry.memo : entry.confirmationStatus ?? null,
    }));
    return { items, source: 'solana-rpc' };
  } catch (error) {
    return { items: [], source: 'solana-rpc', warning: `Failed to load transaction history: ${errorMessage(error)}` };
  }
}

/* ---------------------------------------------------------------------- Aptos */

const normalizeAptosAddress = (address: string): string => {
  const hex = address.trim().toLowerCase().replace(/^0x/, '');
  return /^[0-9a-f]{1,64}$/.test(hex) ? `0x${hex.padStart(64, '0')}` : address.trim();
};

const aptosGraphqlUrl = (network: Network): string | null =>
  network === 'localnet' ? null : `https://api.${network}.aptoslabs.com/v1/graphql`;

function aptosItem(tx: any, address: string, network: Network): TxHistoryItem {
  const sender = typeof tx?.sender === 'string' ? normalizeAptosAddress(tx.sender) : null;
  const fn: string | null = tx?.payload?.function ?? null;
  const isTransfer = typeof fn === 'string' && /::(coin|aptos_account|primary_fungible_store)::transfer/.test(fn);
  const args: any[] = Array.isArray(tx?.payload?.arguments) ? tx.payload.arguments : [];
  const recipient = isTransfer && typeof args[0] === 'string' ? normalizeAptosAddress(args[0]) : null;
  const direction: TxHistoryItem['direction'] = sender === address ? (recipient === address ? 'self' : 'out') : 'in';
  const amount = isTransfer && args[1] !== undefined && /aptos_coin|aptos_account::transfer$/.test(`${fn}${JSON.stringify(tx?.payload?.type_arguments ?? [])}`)
    ? `${formatUnits(String(args[1]), 8)} APT`
    : null;
  return {
    hash: tx.hash,
    timestamp: tx.timestamp ? Math.floor(Number(tx.timestamp) / 1_000_000) : null,
    direction,
    counterparty: direction === 'out' ? recipient : sender,
    amount,
    status: tx.success === false ? 'failed' : tx.success === true ? 'success' : 'unknown',
    explorerUrl: tx.version ? `https://explorer.aptoslabs.com/txn/${tx.version}?network=${network}` : null,
    label: fn,
  };
}

/**
 * Aptos: the indexer lists every transaction that touched the account (sent
 * and received); each is then read from the fullnode REST API. When the
 * indexer is unavailable, the REST API's sent-transactions list is used.
 */
async function getAptosHistory(rawAddress: string, network: Network, limit: number): Promise<TransactionHistoryResult> {
  const address = normalizeAptosAddress(rawAddress);
  const rest = resolveChainRpcUrl('aptos', network);
  const gql = aptosGraphqlUrl(network);

  if (gql) {
    try {
      const response = await fetch(gql, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:
            'query History($a: String!, $n: Int!) { account_transactions(where: {account_address: {_eq: $a}}, order_by: {transaction_version: desc}, limit: $n) { transaction_version } }',
          variables: { a: address, n: limit },
        }),
      });
      if (!response.ok) throw new Error(`Indexer request failed with status ${response.status}.`);
      const data = await response.json();
      if (data?.errors?.length) throw new Error(data.errors[0]?.message ?? 'Indexer error.');
      const versions: Array<number | string> = (data?.data?.account_transactions ?? []).map((r: any) => r.transaction_version);
      const txs = await Promise.all(
        versions.map((v) =>
          fetch(`${rest}/transactions/by_version/${v}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      );
      return { items: txs.filter(Boolean).map((tx) => aptosItem(tx, address, network)), source: 'aptos-indexer' };
    } catch {
      // Fall through to the REST list of sent transactions.
    }
  }

  try {
    const response = await fetch(`${rest}/accounts/${address}/transactions?limit=${limit}`);
    if (response.status === 404) return { items: [], source: 'aptos-rest', warning: 'This account does not exist on this Aptos network yet.' };
    if (!response.ok) throw new Error(`Aptos REST request failed with status ${response.status}.`);
    const txs: any[] = await response.json();
    return {
      items: txs.reverse().map((tx) => aptosItem(tx, address, network)),
      source: 'aptos-rest',
      warning: 'Showing transactions sent by this account. Received transfers need the Aptos indexer, which did not respond.',
    };
  } catch (error) {
    return { items: [], source: 'aptos-rest', warning: `Failed to load transaction history: ${errorMessage(error)}` };
  }
}

/* ------------------------------------------------------------------- Starknet */

// Starknet RPC has no "transactions of an account" call. Every v3 transaction
// pays its fee in STRK, so the STRK contract's Transfer events where the
// account is the sender list every transaction it sent; Transfer events where
// it is the receiver add incoming STRK. Events come oldest-first per window,
// so windows walk back from the chain head until enough are found.
const STARKNET_HISTORY_WINDOWS = [5_000, 50_000, 500_000];
const STARKNET_MAX_PAGES = 10;

type StarknetTransferEvent = { tx: string; block: number; from: string; to: string; amount: bigint };

async function starknetTransfers(network: Network, keys: string[][], fromBlock: number): Promise<StarknetTransferEvent[]> {
  const { getStarknetProvider, STRK_TOKEN_ADDRESS } = await import('./starknet');
  const provider = await getStarknetProvider(network);
  const out: StarknetTransferEvent[] = [];
  let token: string | undefined;
  for (let page = 0; page < STARKNET_MAX_PAGES; page++) {
    const res = await provider.getEvents({
      address: STRK_TOKEN_ADDRESS,
      from_block: { block_number: fromBlock },
      to_block: 'latest',
      keys,
      chunk_size: 1000,
      continuation_token: token,
    });
    for (const e of res.events as any[]) {
      const [low = '0x0', high = '0x0'] = e.data ?? [];
      out.push({
        tx: e.transaction_hash,
        block: Number(e.block_number ?? 0),
        from: e.keys?.[1] ?? '',
        to: e.keys?.[2] ?? '',
        amount: BigInt(low) + (BigInt(high) << BigInt(128)),
      });
    }
    token = res.continuation_token;
    if (!token) break;
  }
  return out;
}

const sameFelt = (a: string, b: string) => {
  try {
    return BigInt(a) === BigInt(b);
  } catch {
    return false;
  }
};

async function getStarknetHistory(address: string, network: Network, limit: number): Promise<TransactionHistoryResult> {
  if (network === 'localnet') {
    return { items: [], source: 'starknet-rpc', warning: 'History is not available for a local Starknet node.' };
  }
  try {
    const { getStarknetProvider, starknetTxExplorerUrl } = await import('./starknet');
    const { hash: snHash } = await import('starknet');
    const provider = await getStarknetProvider(network);
    const transfer = snHash.getSelectorFromName('Transfer');
    const latest = await provider.getBlockNumber();

    let events: StarknetTransferEvent[] = [];
    for (const span of STARKNET_HISTORY_WINDOWS) {
      const from = Math.max(0, latest - span);
      const [sent, received] = await Promise.all([
        starknetTransfers(network, [[transfer], [address]], from),
        starknetTransfers(network, [[transfer], [], [address]], from),
      ]);
      events = [...sent, ...received];
      if (new Set(events.map((e) => e.tx)).size >= limit || from === 0) break;
    }

    // Newest first, one row per transaction.
    const byTx = new Map<string, StarknetTransferEvent[]>();
    for (const e of events.sort((a, b) => b.block - a.block)) byTx.set(e.tx, [...(byTx.get(e.tx) ?? []), e]);
    const txs = [...byTx].slice(0, limit);

    const blockTimes = new Map<number, number | null>();
    await Promise.all(
      [...new Set(txs.map(([, evs]) => evs[0].block))].map(async (n) => {
        try {
          const block = (await provider.getBlockWithTxHashes(n)) as { timestamp?: number };
          blockTimes.set(n, block.timestamp ?? null);
        } catch {
          blockTimes.set(n, null);
        }
      })
    );

    const items = await Promise.all(
      txs.map(async ([tx, evs]): Promise<TxHistoryItem> => {
        let status: TxHistoryItem['status'] = 'unknown';
        let fee: bigint | null = null;
        let sender: string | null = null;
        try {
          const receipt = (await provider.getTransactionReceipt(tx)) as any;
          status = receipt.execution_status === 'REVERTED' ? 'failed' : receipt.execution_status === 'SUCCEEDED' ? 'success' : 'unknown';
          fee = receipt.actual_fee?.amount != null ? BigInt(receipt.actual_fee.amount) : null;
        } catch {
          // Keep the row; status stays unknown.
        }
        // Drop the fee payment (the account's own transfer equal to the fee) so the
        // row shows what the transaction moved, not what it cost.
        const feeIndex = fee === null ? -1 : evs.findIndex((e) => sameFelt(e.from, address) && e.amount === fee);
        const moves = evs.filter((_, i) => i !== feeIndex);
        const main = moves[0];
        if (evs.some((e) => sameFelt(e.from, address))) sender = address;
        const direction: TxHistoryItem['direction'] = !main
          ? sender ? 'out' : 'unknown'
          : sameFelt(main.from, address) && sameFelt(main.to, address)
            ? 'self'
            : sameFelt(main.from, address)
              ? 'out'
              : 'in';
        return {
          hash: tx,
          timestamp: blockTimes.get(evs[0].block) ?? null,
          direction,
          counterparty: main ? (direction === 'in' ? main.from : main.to) : null,
          amount: main ? `${formatUnits(main.amount, 18)} STRK` : null,
          status,
          explorerUrl: starknetTxExplorerUrl(network, tx) ?? null,
          label: main ? 'STRK transfer' : 'contract call',
        };
      })
    );

    return {
      items,
      source: 'starknet-rpc',
      warning:
        items.length < limit
          ? `Showing activity from the last ${STARKNET_HISTORY_WINDOWS[STARKNET_HISTORY_WINDOWS.length - 1].toLocaleString()} blocks: transactions this account sent, and STRK it received.`
          : undefined,
    };
  } catch (error) {
    return { items: [], source: 'starknet-rpc', warning: `Failed to load transaction history: ${errorMessage(error)}` };
  }
}

/* ---------------------------------------------------------------------- Entry */

const CHAIN_NAMES: Record<string, string> = { sui: 'Sui', evm: 'EVM', solana: 'Solana', aptos: 'Aptos', stellar: 'Stellar', starknet: 'Starknet' };

/** Which chains an address string could belong to, judging by its format. */
export function guessAddressChains(address: string): ChainId[] {
  const a = address.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return ['evm'];
  if (/^0x[0-9a-fA-F]{1,64}$/.test(a)) return ['sui', 'aptos', 'starknet'];
  if (/\.sui$/i.test(a)) return ['sui'];
  if (/^[GC][A-Z2-7]{55}$/.test(a)) return ['stellar'];
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return ['solana'];
  return [];
}

const ADDRESS_FORMAT: Record<string, { test: (a: string) => boolean; expected: string }> = {
  evm: { test: (a) => /^0x[0-9a-fA-F]{40}$/.test(a), expected: 'a 0x address with 40 hex characters' },
  sui: { test: (a) => /^0x[0-9a-fA-F]{1,64}$/.test(a) || /\.sui$/i.test(a), expected: 'a 0x address (up to 64 hex characters) or a name.sui' },
  aptos: { test: (a) => /^0x[0-9a-fA-F]{1,64}$/.test(a), expected: 'a 0x address (up to 64 hex characters)' },
  stellar: { test: (a) => /^[GC][A-Z2-7]{55}$/.test(a), expected: 'a G… account or C… contract address' },
  solana: { test: (a) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a), expected: 'a base58 address' },
  starknet: { test: (a) => /^0x[0-9a-fA-F]{1,64}$/.test(a), expected: 'a 0x address (up to 64 hex characters)' },
};

/** A readable reason the address can't be used on `chain`, or null when it fits. */
export function invalidAddressReason(chain: ChainId, address: string): string | null {
  const format = ADDRESS_FORMAT[chain];
  if (!format || format.test(address.trim())) return null;
  const others = guessAddressChains(address).filter((c) => c !== chain);
  const hint = others.length ? ` It looks like ${others.map((c) => `${c === 'aptos' || c === 'evm' ? 'an' : 'a'} ${CHAIN_NAMES[c]}`).join(' or ')} address; switch the chain to ${others.map((c) => CHAIN_NAMES[c]).join(' or ')}.` : '';
  return `Invalid address: ${CHAIN_NAMES[chain]} expects ${format.expected}.${hint}`;
}

export async function getAddressHistory(query: HistoryQuery): Promise<TransactionHistoryResult> {
  const address = query.address.trim();
  const limit = query.limit ?? DEFAULT_LIMIT;
  if (!address) return { items: [], source: 'unsupported', warning: 'Invalid address: enter an address.' };
  const invalid = invalidAddressReason(query.chain, address);
  if (invalid) return { items: [], source: 'unsupported', warning: invalid };
  switch (query.chain) {
    case 'stellar':
      return getStellarHistory(address, query.network, limit);
    case 'sui':
      return getSuiHistory(address, query.network, limit);
    case 'evm':
      return getEvmHistory(address, query.network, limit, query.evmChainId);
    case 'solana':
      return getSolanaHistory(address, query.network, limit);
    case 'aptos':
      return getAptosHistory(address, query.network, limit);
    case 'starknet':
      return getStarknetHistory(address, query.network, limit);
    default:
      return { items: [], source: 'unsupported', warning: 'Transaction history is not supported for this chain.' };
  }
}

/** The network a connected wallet is actually on, mapped to Txio's network names. */
function walletNetwork(wallet: ConnectedWallet, fallback: Network): Network {
  const n = String(wallet.chain?.network ?? '').toLowerCase();
  if (n.includes('main') || n === 'public' || n === 'mainnet-beta') return 'mainnet';
  if (n.includes('test')) return 'testnet';
  if (n.includes('dev')) return 'devnet';
  if (n.includes('local')) return 'localnet';
  return fallback;
}

export async function getTransactionHistory(wallet: ConnectedWallet, network: Network): Promise<TransactionHistoryResult> {
  const chain = wallet.family as ChainId;
  const evmChainId = wallet.family === 'evm' ? parseEvmChainId(wallet.chain.id) ?? undefined : undefined;
  return getAddressHistory({
    chain,
    address: wallet.address,
    network: wallet.family === 'evm' ? network : walletNetwork(wallet, network),
    evmChainId,
  });
}
