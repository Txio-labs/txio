import type { Network } from '@/types';
import { normalizeSuiAddress, suiGraphqlRequest } from './suiGraphql';

export type SuiExplorerTarget =
  | { kind: 'tx'; id: string }
  | { kind: 'object'; id: string }
  | { kind: 'package'; id: string }
  | { kind: 'checkpoint'; id: string }
  | { kind: 'coin'; id: string }
  | { kind: 'address'; id: string };

export interface SuiCheckpointSummary {
  sequenceNumber: string;
  digest: string | null;
  timestamp: string | null;
  epoch: string | null;
  networkTotalTransactions: string | null;
}

export interface SuiCheckpointDetail extends SuiCheckpointSummary {
  previousDigest: string | null;
  transactions: { digest: string; sender: string | null; status: SuiTransactionDetail['status'] }[];
}

export interface SuiEventSummary {
  sender: string | null;
  timestamp: string | null;
  eventType: string;
  moduleName: string | null;
  packageId: string | null;
  transactionDigest: string | null;
  json: unknown;
}

export interface SuiCoinDetail {
  coinType: string;
  address: string | null;
  symbol: string | null;
  name: string | null;
  decimals: number | null;
  description: string | null;
  iconUrl: string | null;
}

export interface SuiTransactionDetail {
  digest: string;
  sender: string | null;
  status: 'success' | 'failed' | 'unknown';
  timestamp: string | null;
  checkpoint: string | null;
  epoch: string | null;
  kind: string | null;
  gas: { computation: string; storage: string; rebate: string; budget: string | null; price: string | null };
  balanceChanges: { owner: string | null; amount: string; coinType: string }[];
  events: { sender: string | null; type: string; timestamp: string | null; json: unknown }[];
}

export type SuiOwner =
  | { kind: 'address'; address: string }
  | { kind: 'shared'; initialSharedVersion: string | null }
  | { kind: 'immutable' }
  | { kind: 'unknown' };

export interface SuiObjectDetail {
  objectId: string;
  version: string | null;
  digest: string | null;
  owner: SuiOwner;
  type: string | null;
  fields: unknown;
  previousTransactionDigest: string | null;
}

export interface SuiPackageDetail {
  packageId: string;
  version: string | null;
  modules: string[];
}

/** Digests are base58 of 32 bytes (43-44 characters). Object and package ids are hex. */
const DIGEST = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
const HEX_ID = /^0x[0-9a-fA-F]{1,64}$/;

const CHECKPOINT = /^\d{1,12}$/;
const COIN_TYPE = /^0x[0-9a-fA-F]{1,64}::[A-Za-z_][A-Za-z0-9_]*::[A-Za-z_][A-Za-z0-9_]*$/;

/** What a search box entry refers to. Null when it is none of the supported forms. */
export const parseSuiExplorerQuery = (input: string): SuiExplorerTarget | null => {
  const value = input.trim();
  if (!value) return null;
  // A bare 0x… is ambiguous (object id or address), so accounts use an explicit prefix.
  const account = /^account:\s*(0x[0-9a-fA-F]{1,64})$/i.exec(value);
  if (account) return { kind: 'address', id: normalizeSuiAddress(account[1]) };
  if (COIN_TYPE.test(value)) {
    const [address, module, name] = value.split('::');
    return { kind: 'coin', id: `${normalizeSuiAddress(address)}::${module}::${name}` };
  }
  if (CHECKPOINT.test(value)) return { kind: 'checkpoint', id: value };
  if (HEX_ID.test(value)) return { kind: 'object', id: normalizeSuiAddress(value) };
  if (DIGEST.test(value)) return { kind: 'tx', id: value };
  return null;
};

const TX_QUERY = `query Tx($d: String!) {
  transaction(digest: $d) {
    digest
    sender { address }
    gasInput { gasPrice gasBudget }
    kind { __typename }
    effects {
      status
      timestamp
      checkpoint { sequenceNumber }
      epoch { epochId }
      gasEffects { gasSummary { computationCost storageCost storageRebate } }
      balanceChanges { nodes { owner { address } amount coinType { repr } } }
      events(first: 50) { nodes { sender { address } timestamp contents { json type { repr } } } }
    }
  }
}`;

const OBJECT_QUERY = `query Obj($a: SuiAddress!) {
  object(address: $a) {
    address
    version
    digest
    owner { __typename ... on AddressOwner { address { address } } ... on Shared { initialSharedVersion } }
    asMoveObject { contents { type { repr } json } }
    previousTransaction { digest }
  }
}`;

const PACKAGE_QUERY = `query Pkg($a: SuiAddress!) {
  object(address: $a) {
    address
    version
    asMovePackage { modules(first: 50) { nodes { name } } }
  }
}`;

const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

const statusOf = (s: unknown): SuiTransactionDetail['status'] =>
  s === 'SUCCESS' ? 'success' : s === 'FAILURE' ? 'failed' : 'unknown';

/** Maps a `transactionBlock` GraphQL node to the view model. Null when the node is missing. */
export const mapSuiTransaction = (node: any): SuiTransactionDetail | null => {
  if (!node?.digest) return null;
  const effects = node.effects ?? {};
  const summary = effects.gasEffects?.gasSummary ?? {};
  return {
    digest: String(node.digest),
    sender: node.sender?.address ?? null,
    status: statusOf(effects.status),
    timestamp: str(effects.timestamp),
    checkpoint: str(effects.checkpoint?.sequenceNumber),
    epoch: str(effects.epoch?.epochId),
    kind: node.kind?.__typename ? String(node.kind.__typename).replace(/Transaction$/, '') : null,
    gas: {
      computation: str(summary.computationCost) ?? '0',
      storage: str(summary.storageCost) ?? '0',
      rebate: str(summary.storageRebate) ?? '0',
      budget: str(node.gasInput?.gasBudget),
      price: str(node.gasInput?.gasPrice),
    },
    balanceChanges: (effects.balanceChanges?.nodes ?? []).map((c: any) => ({
      owner: c?.owner?.address ?? null,
      amount: String(c?.amount ?? '0'),
      coinType: String(c?.coinType?.repr ?? ''),
    })),
    events: (effects.events?.nodes ?? []).map((e: any) => ({
      sender: e?.sender?.address ?? null,
      type: String(e?.contents?.type?.repr ?? ''),
      timestamp: str(e?.timestamp),
      json: e?.contents?.json ?? null,
    })),
  };
};

export const mapSuiOwner = (raw: any): SuiOwner => {
  switch (raw?.__typename) {
    case 'AddressOwner':
      return { kind: 'address', address: String(raw.address?.address ?? '') };
    case 'Shared':
      return { kind: 'shared', initialSharedVersion: str(raw.initialSharedVersion) };
    case 'Immutable':
      return { kind: 'immutable' };
    default:
      return { kind: 'unknown' };
  }
};

export const mapSuiObject = (node: any): SuiObjectDetail | null => {
  if (!node?.address) return null;
  return {
    objectId: String(node.address),
    version: str(node.version),
    digest: str(node.digest),
    owner: mapSuiOwner(node.owner),
    type: node.asMoveObject?.contents?.type?.repr ?? null,
    fields: node.asMoveObject?.contents?.json ?? null,
    previousTransactionDigest: node.previousTransaction?.digest ?? null,
  };
};

export const mapSuiPackage = (node: any): SuiPackageDetail | null => {
  if (!node?.address || !node.asMovePackage) return null;
  return {
    packageId: String(node.address),
    version: str(node.version),
    modules: (node.asMovePackage.modules?.nodes ?? []).map((m: any) => String(m.name)),
  };
};

export const getSuiTransaction = async (network: Network, digest: string): Promise<SuiTransactionDetail | null> => {
  const data = await suiGraphqlRequest(network, TX_QUERY, { d: digest });
  return mapSuiTransaction(data?.data?.transaction);
};

/** Object detail, or null when the id is unknown. */
export const getSuiObject = async (network: Network, id: string): Promise<SuiObjectDetail | null> => {
  const data = await suiGraphqlRequest(network, OBJECT_QUERY, { a: normalizeSuiAddress(id) });
  return mapSuiObject(data?.data?.object);
};

/** Package detail, or null when the id is not a package (or not found). */
export const getSuiPackage = async (network: Network, id: string): Promise<SuiPackageDetail | null> => {
  const data = await suiGraphqlRequest(network, PACKAGE_QUERY, { a: normalizeSuiAddress(id) });
  return mapSuiPackage(data?.data?.object);
};

const CHECKPOINTS_QUERY = `query Checkpoints($n: Int!) {
  checkpoints(last: $n) {
    nodes { sequenceNumber digest timestamp networkTotalTransactions epoch { epochId } }
  }
}`;

const CHECKPOINT_QUERY = `query Checkpoint($n: UInt53!) {
  checkpoint(sequenceNumber: $n) {
    sequenceNumber digest previousCheckpointDigest timestamp networkTotalTransactions epoch { epochId }
    transactions(last: 50) { nodes { digest sender { address } effects { status } } }
  }
}`;

const EVENTS_QUERY = `query Events($n: Int!) {
  events(last: $n) {
    nodes {
      sender { address }
      timestamp
      transactionModule { package { address } name }
      contents { type { repr } json }
      transaction { digest }
    }
  }
}`;

const COIN_QUERY = `query Coin($t: String!) {
  coinMetadata(coinType: $t) { address decimals symbol name description iconUrl }
}`;

export const mapSuiCheckpointSummary = (node: any): SuiCheckpointSummary | null => {
  if (node?.sequenceNumber == null) return null;
  return {
    sequenceNumber: String(node.sequenceNumber),
    digest: str(node.digest),
    timestamp: str(node.timestamp),
    epoch: str(node.epoch?.epochId),
    networkTotalTransactions: str(node.networkTotalTransactions),
  };
};

export const mapSuiCheckpoint = (node: any): SuiCheckpointDetail | null => {
  const summary = mapSuiCheckpointSummary(node);
  if (!summary) return null;
  return {
    ...summary,
    previousDigest: str(node.previousCheckpointDigest),
    transactions: (node.transactions?.nodes ?? []).map((t: any) => ({
      digest: String(t?.digest ?? ''),
      sender: t?.sender?.address ?? null,
      status: statusOf(t?.effects?.status),
    })),
  };
};

export const mapSuiEvent = (node: any): SuiEventSummary => ({
  sender: node?.sender?.address ?? null,
  timestamp: str(node?.timestamp),
  eventType: String(node?.contents?.type?.repr ?? ''),
  moduleName: node?.transactionModule?.name ?? null,
  packageId: node?.transactionModule?.package?.address ?? null,
  transactionDigest: node?.transaction?.digest ?? null,
  json: node?.contents?.json ?? null,
});

export const mapSuiCoin = (coinType: string, node: any): SuiCoinDetail | null => {
  if (!node) return null;
  return {
    coinType,
    address: node.address ?? null,
    symbol: node.symbol || null,
    name: node.name || null,
    decimals: typeof node.decimals === 'number' ? node.decimals : null,
    description: node.description || null,
    iconUrl: node.iconUrl || null,
  };
};

/** Newest checkpoints first. */
export const getSuiCheckpoints = async (network: Network, limit = 20): Promise<SuiCheckpointSummary[]> => {
  const data = await suiGraphqlRequest(network, CHECKPOINTS_QUERY, { n: Math.min(limit, 50) });
  return (data?.data?.checkpoints?.nodes ?? [])
    .map(mapSuiCheckpointSummary)
    .filter((c: SuiCheckpointSummary | null): c is SuiCheckpointSummary => c !== null)
    .reverse();
};

export const getSuiCheckpoint = async (network: Network, sequenceNumber: string): Promise<SuiCheckpointDetail | null> => {
  const data = await suiGraphqlRequest(network, CHECKPOINT_QUERY, { n: Number(sequenceNumber) });
  return mapSuiCheckpoint(data?.data?.checkpoint);
};

/** Newest events first. */
export const getSuiEvents = async (network: Network, limit = 20): Promise<SuiEventSummary[]> => {
  const data = await suiGraphqlRequest(network, EVENTS_QUERY, { n: Math.min(limit, 50) });
  return (data?.data?.events?.nodes ?? []).map(mapSuiEvent).reverse();
};

export const getSuiCoin = async (network: Network, coinType: string): Promise<SuiCoinDetail | null> => {
  const data = await suiGraphqlRequest(network, COIN_QUERY, { t: coinType });
  return mapSuiCoin(coinType, data?.data?.coinMetadata);
};
