import type { Network } from '@/types';
import { normalizeSuiAddress, SUI_NATIVE_COIN_TYPE, suiGraphqlRequest } from './suiGraphql';

// Sui account data from GraphQL: SUI balance, owned objects, and transactions
// the account sent or was affected by. Schema names checked against mainnet.

const SUMMARY_QUERY = `query AccountSummary($a: SuiAddress!, $c: String!, $n: Int!) {
  address(address: $a) {
    balance(coinType: $c) { totalBalance }
    objects(first: $n) { nodes { address version digest } }
  }
}`;

const TX_QUERY = `query AccountTxs($a: SuiAddress!, $n: Int!, $r: AddressTransactionRelationship) {
  address(address: $a) {
    transactions(first: $n, relation: $r) {
      nodes {
        digest
        sender { address }
        effects {
          timestamp
          status
          checkpoint { sequenceNumber }
          gasEffects { gasSummary { computationCost storageCost storageRebate } }
        }
      }
    }
  }
}`;

export interface SuiAccountSummary {
  address: string;
  suiBalanceMist: string;
  objects: { address: string; version: string; digest: string }[];
}

export interface SuiAccountTransaction {
  digest: string;
  timestamp: string | null;
  success: boolean | null;
  checkpoint: string | null;
  sender: string;
  /** `sent` when the account is the sender, otherwise `affected`. */
  role: 'sent' | 'affected';
  /** Gas paid by the sender, in MIST. Null when the gas fields are missing. */
  feeMist: string | null;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/** Net gas in MIST: computation + storage - storage rebate. Exact integer math. */
export const netGasMist = (summary: Record<string, unknown> | null | undefined): string | null => {
  if (!summary) return null;
  try {
    const comp = BigInt(str(summary.computationCost) ?? '0');
    const storage = BigInt(str(summary.storageCost) ?? '0');
    const rebate = BigInt(str(summary.storageRebate) ?? '0');
    return (comp + storage - rebate).toString();
  } catch {
    return null;
  }
};

export const mapAccountTransaction = (node: any, account: string): SuiAccountTransaction | null => {
  const digest = str(node?.digest);
  if (!digest) return null;
  const sender = str(node?.sender?.address) ?? '';
  const effects = node?.effects ?? {};
  const status = str(effects.status);
  return {
    digest,
    timestamp: str(effects.timestamp),
    success: status === 'SUCCESS' ? true : status === 'FAILURE' ? false : null,
    checkpoint: str(effects.checkpoint?.sequenceNumber),
    sender,
    role: sender && normalizeSuiAddress(sender) === normalizeSuiAddress(account) ? 'sent' : 'affected',
    feeMist: netGasMist(effects.gasEffects?.gasSummary),
  };
};

export const getSuiAccountSummary = async (network: Network, address: string, objectLimit = 20): Promise<SuiAccountSummary | null> => {
  const a = normalizeSuiAddress(address);
  const res = await suiGraphqlRequest(network, SUMMARY_QUERY, { a, c: SUI_NATIVE_COIN_TYPE, n: Math.min(Math.max(objectLimit, 1), 50) });
  const node = res?.data?.address;
  if (!node) return null;
  return {
    address: a,
    suiBalanceMist: str(node.balance?.totalBalance) ?? '0',
    objects: (node.objects?.nodes ?? []).map((o: any) => ({
      address: str(o.address) ?? '',
      version: String(o.version ?? ''),
      digest: str(o.digest) ?? '',
    })),
  };
};

export const getSuiAccountTransactions = async (
  network: Network,
  address: string,
  relation: 'SENT' | 'AFFECTED',
  limit = 20
): Promise<SuiAccountTransaction[]> => {
  const a = normalizeSuiAddress(address);
  const res = await suiGraphqlRequest(network, TX_QUERY, { a, n: Math.min(Math.max(limit, 1), 50), r: relation });
  const nodes: any[] = res?.data?.address?.transactions?.nodes ?? [];
  return nodes.map((n) => mapAccountTransaction(n, a)).filter((t): t is SuiAccountTransaction => t !== null);
};
