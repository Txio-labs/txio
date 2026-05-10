
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
