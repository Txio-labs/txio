import type { ConnectedWallet } from '@/wallet/types';
import type { Network } from '@/types';
import { executeChainRpc } from './suiService';

export interface TxHistoryItem {
  hash: string;
  timestamp: number | null; // unix seconds, null if unknown
  direction: 'in' | 'out' | 'self' | 'unknown';
  counterparty: string | null; // the other address, if determinable
  amount: string | null; // human-formatted amount + symbol, e.g. "12.5 XLM", null if not parseable
  status: 'success' | 'failed' | 'unknown';
  explorerUrl: string | null;
}

export interface TransactionHistoryResult {
  items: TxHistoryItem[];
  source: 'horizon' | 'sui-rpc' | 'etherscan' | 'eth-logs-fallback' | 'solana-rpc' | 'unsupported';
  warning?: string;
}

const STELLAR_HORIZON_URLS: Record<string, string> = {
  public: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
};

const errorMessage = (error: unknown): string =>
  error instanceof Error && error.message.trim() ? error.message : 'Unknown error.';

/**
 * Stellar: Horizon's plain transaction-list endpoint gives us the envelope
 * (hash, timestamp, success, source account) but not the decoded payment
 * operations — getting a real counterparty/amount would need a second call
 * per transaction to /transactions/{hash}/operations, which is out of scope
 * for v1. Direction is therefore inferred only from whether OUR address is
 * the transaction's source account (the fee-payer/sequence-holder), which is
 * not the same thing as "sender of the payment" for multi-op transactions —
 * good enough as a rough signal, not a full decode.
 */
async function getStellarHistory(wallet: ConnectedWallet, network: Network): Promise<TransactionHistoryResult> {
  try {
    const isTestnet = wallet.chain.network === 'testnet';
    const horizonUrl = isTestnet ? STELLAR_HORIZON_URLS.testnet : STELLAR_HORIZON_URLS.public;
    const url = `${horizonUrl}/accounts/${encodeURIComponent(wallet.address)}/transactions?order=desc&limit=20&include_failed=true`;

    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (response.status === 404) {
      return { items: [], source: 'horizon' };
    }
    if (!response.ok) {
      throw new Error(`Horizon request failed with status ${response.status}.`);
    }

    const data = await response.json();
    const records: any[] = Array.isArray(data?._embedded?.records) ? data._embedded.records : [];

    const explorerBase = isTestnet
      ? 'https://stellar.expert/explorer/testnet/tx/'
      : 'https://stellar.expert/explorer/public/tx/';

    const items: TxHistoryItem[] = records.map((record) => {
      const timestamp = record.created_at ? Math.floor(new Date(record.created_at).getTime() / 1000) : null;
      const direction: TxHistoryItem['direction'] =
        record.source_account === wallet.address ? 'out' : 'in';

      return {
        hash: record.hash,
        timestamp,
        direction,
        counterparty: null,
        amount: null,
        status: record.successful === false ? 'failed' : 'success',
        explorerUrl: record.hash ? `${explorerBase}${record.hash}` : null,
      };
    });

    return { items, source: 'horizon' };
  } catch (error) {
    return { items: [], source: 'horizon', warning: `Failed to load transaction history: ${errorMessage(error)}` };
  }
}

async function getSuiHistory(wallet: ConnectedWallet, network: Network): Promise<TransactionHistoryResult> {
  try {
    const { result } = await executeChainRpc(
      'sui',
      network,
      'suix_queryTransactionBlocks',
      [
        {
          filter: { FromOrToAddress: { addr: wallet.address } },
          options: { showEffects: true, showInput: true },
        },
        null,
        20,
        true,
      ]
    );

    const data: any[] = Array.isArray(result?.data) ? result.data : [];

    const explorerNetwork =
      wallet.chain.network === 'mainnet'
        ? 'mainnet'
        : wallet.chain.network === 'devnet'
          ? 'devnet'
          : 'testnet';

    const items: TxHistoryItem[] = data.map((tx) => {
      const sender: string | undefined = tx?.transaction?.data?.sender;
      const direction: TxHistoryItem['direction'] =
        sender === undefined ? 'unknown' : sender === wallet.address ? 'out' : 'in';
      const timestampMs = tx?.timestampMs ? Number(tx.timestampMs) : null;

      return {
        hash: tx.digest,
        timestamp: timestampMs !== null && !Number.isNaN(timestampMs) ? Math.floor(timestampMs / 1000) : null,
        direction,
        counterparty: null,
        amount: null,
        status: tx?.effects?.status?.status === 'success'
          ? 'success'
          : tx?.effects?.status?.status === 'failure'
            ? 'failed'
            : 'unknown',
        explorerUrl: tx.digest ? `https://suiscan.xyz/${explorerNetwork}/tx/${tx.digest}` : null,
      };
    });

    return { items, source: 'sui-rpc' };
  } catch (error) {
    return { items: [], source: 'sui-rpc', warning: `Failed to load transaction history: ${errorMessage(error)}` };
  }
}

const parseEvmChainId = (caip2: string): number | null => {
  const match = /^eip155:(\d+)$/.exec(caip2);
  return match ? Number(match[1]) : null;
};

async function getEvmHistory(wallet: ConnectedWallet, network: Network): Promise<TransactionHistoryResult> {
  const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;

  if (!apiKey) {
    return {
      items: [],
      source: 'eth-logs-fallback',
      warning:
        'Set NEXT_PUBLIC_ETHERSCAN_API_KEY for EVM transaction history — a keyless log-based fallback only covers ERC-20 transfers, not plain transfers, and is not implemented in v1.',
    };
  }

  try {
    const chainId = parseEvmChainId(wallet.chain.id);
    if (!chainId) {
      throw new Error(`Could not parse an EVM chain id from "${wallet.chain.id}".`);
    }

    const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=txlist&address=${wallet.address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=20&apikey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Etherscan request failed with status ${response.status}.`);
    }

    const data = await response.json();

    // status "0" with message "No transactions found" is a valid empty
    // result, not an error — only treat it as a failure when result isn't
    // the expected array shape.
    if (data.status !== '1' && !Array.isArray(data.result)) {
      throw new Error(typeof data?.message === 'string' && data.message ? data.message : 'Etherscan returned an error.');
    }

    const explorerChain = getEvmExplorerBase(chainId);

    const results: any[] = Array.isArray(data.result) ? data.result : [];

    const items: TxHistoryItem[] = results.map((tx) => {
      const from = typeof tx.from === 'string' ? tx.from : '';
      const to = typeof tx.to === 'string' ? tx.to : '';
      const isOut = from.toLowerCase() === wallet.address.toLowerCase();
      const direction: TxHistoryItem['direction'] = isOut
        ? to.toLowerCase() === wallet.address.toLowerCase()
          ? 'self'
          : 'out'
        : 'in';

      let amount: string | null = null;
      if (typeof tx.value === 'string' && /^\d+$/.test(tx.value)) {
        const eth = Number(tx.value) / 1e18;
        amount = `${eth.toFixed(4)} ETH`;
      }

      return {
        hash: tx.hash,
        timestamp: tx.timeStamp ? Number(tx.timeStamp) : null,
        direction,
        counterparty: isOut ? (to || null) : (from || null),
        amount,
        status: tx.isError === '1' ? 'failed' : 'success',
        explorerUrl: tx.hash && explorerChain ? `${explorerChain}${tx.hash}` : null,
      };
    });

    return { items, source: 'etherscan' };
  } catch (error) {
    return { items: [], source: 'etherscan', warning: `Failed to load transaction history: ${errorMessage(error)}` };
  }
}

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
  8453: 'https://basescan.org/tx/',
  42161: 'https://arbiscan.io/tx/',
  42220: 'https://celoscan.io/tx/',
  43114: 'https://snowtrace.io/tx/',
  59144: 'https://lineascan.build/tx/',
  81457: 'https://blastscan.io/tx/',
  534352: 'https://scrollscan.com/tx/',
  7777777: 'https://explorer.zora.energy/tx/',
};

const getEvmExplorerBase = (chainId: number): string | null => EVM_TX_EXPLORERS[chainId] ?? null;

async function getSolanaHistory(wallet: ConnectedWallet, network: Network): Promise<TransactionHistoryResult> {
  try {
    // executeChainRpc only special-cases 'sui' and 'stellar' internally —
    // for any other chain (including 'solana') it falls through to the
    // generic JSON-RPC POST path with positional array params, which is
    // exactly the shape Solana's JSON-RPC expects, so this reuses it directly
    // rather than hand-rolling a fetch call.
    const { result } = await executeChainRpc('solana', network, 'getSignaturesForAddress', [
      wallet.address,
      { limit: 20 },
    ]);

    const signatures: any[] = Array.isArray(result) ? result : [];
    const isMainnet = wallet.chain.network === 'mainnet-beta';
    const clusterQuery = isMainnet ? '' : `?cluster=${wallet.chain.network}`;

    const items: TxHistoryItem[] = signatures.map((entry) => ({
      hash: entry.signature,
      timestamp: typeof entry.blockTime === 'number' ? entry.blockTime : null,
      direction: 'unknown',
      counterparty: null,
      amount: null,
      status: entry.err === null || entry.err === undefined ? 'success' : 'failed',
      explorerUrl: entry.signature
        ? `https://explorer.solana.com/tx/${entry.signature}${clusterQuery}`
        : null,
    }));

    return { items, source: 'solana-rpc' };
  } catch (error) {
    return { items: [], source: 'solana-rpc', warning: `Failed to load transaction history: ${errorMessage(error)}` };
  }
}

export async function getTransactionHistory(
  wallet: ConnectedWallet,
  network: Network
): Promise<TransactionHistoryResult> {
  switch (wallet.family) {
    case 'stellar':
      return getStellarHistory(wallet, network);
    case 'sui':
      return getSuiHistory(wallet, network);
    case 'evm':
      return getEvmHistory(wallet, network);
    case 'solana':
      return getSolanaHistory(wallet, network);
    case 'aptos':
      return {
        items: [],
        source: 'unsupported',
        warning: 'Aptos transaction history is not yet implemented.',
      };
    default:
      return { items: [], source: 'unsupported', warning: 'Transaction history is not supported for this wallet.' };
  }
}
