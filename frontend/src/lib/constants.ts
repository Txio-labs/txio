
import { Network } from "../types";

export const NETWORKS: Record<Network, string> = {
  mainnet: 'https://fullnode.mainnet.sui.io:443',
  testnet: 'https://fullnode.testnet.sui.io:443',
  devnet: 'https://fullnode.devnet.sui.io:443',
};

export const COMMON_RPC_METHODS = [
  'suix_getOwnedObjects',
  'sui_getObject',
  'sui_getTransactionBlock',
  'sui_getTotalTransactionBlocks',
  'suix_getAllBalances',
  'suix_getAllCoins',
  'suix_getCoinMetadata',
  'sui_getChainIdentifier',
  'sui_getLatestCheckpointSequenceNumber',
  'suix_resolveNameServiceAddress',
  'sui_getProtocolConfig',
  'suix_getReferenceGasPrice',
  'sui_dryRunTransactionBlock'
];

// Sui RPC methods where params[0] is an owner address (eligible for SuiNS auto-resolution).
export const ADDRESS_FIRST_PARAM_METHODS: ReadonlySet<string> = new Set([
  'suix_getOwnedObjects',
  'suix_getAllBalances',
  'suix_getAllCoins',
  'suix_getBalance',
  'suix_getCoins',
  'suix_getStakes',
]);

// Pre-filled parameter templates for known Sui RPC methods.
// Used when the user picks a method with empty params and via the "Insert template" action.
export const RPC_METHOD_TEMPLATES: Readonly<Record<string, ReadonlyArray<unknown>>> = {
  suix_getOwnedObjects: [
    '<owner address or name.sui>',
    { options: { showType: true, showContent: true, showDisplay: true } },
  ],
  sui_getObject: [
    '<object id>',
    { showType: true, showContent: true, showOwner: true, showDisplay: true },
  ],
  sui_getTransactionBlock: [
    '<tx digest>',
    { showInput: true, showEvents: true, showEffects: true, showBalanceChanges: true },
  ],
  sui_getTotalTransactionBlocks: [],
  suix_getAllBalances: ['<owner address or name.sui>'],
  suix_getAllCoins: ['<owner address or name.sui>', null, 50],
  suix_getCoinMetadata: ['0x2::sui::SUI'],
  suix_getBalance: ['<owner address or name.sui>', '0x2::sui::SUI'],
  suix_getCoins: ['<owner address or name.sui>', '0x2::sui::SUI', null, 50],
  suix_getStakes: ['<owner address or name.sui>'],
  sui_getChainIdentifier: [],
  sui_getLatestCheckpointSequenceNumber: [],
  suix_resolveNameServiceAddress: ['<name.sui>'],
  sui_getProtocolConfig: [],
  suix_getReferenceGasPrice: [],
  sui_dryRunTransactionBlock: ['<base64 bcs bytes>'],
};

export const MOVE_TYPES = [
    'u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'bool', 'address', 'string', 'object', 'vector<u8>', 'vector<address>'
];

export const DEFAULT_MOVE_CALL = {
  packageId: '0x2',
  module: 'coin',
  function: 'join',
  typeArguments: ['0x2::sui::SUI'],
  arguments: [], // Empty BuilderArg array
  gasBudget: '10000000',
};

export const DEFAULT_TRANSFER = {
    recipient: '',
    amount: '1000000000', // 1 SUI
    objectId: ''
};
