
import { Network, ChainId } from "../types";

// Default Sui fullnode endpoint per network. Mirrors `Network::sui_url` on the
// backend (backend/api/src/model/network.rs). `Record<Network, ...>` forces
// this map to stay exhaustive as networks are added.
export const NETWORKS: Record<Network, string> = {
  mainnet: 'https://fullnode.mainnet.sui.io:443',
  testnet: 'https://fullnode.testnet.sui.io:443',
  devnet: 'https://fullnode.devnet.sui.io:443',
  localnet: 'http://127.0.0.1:9000',
};

// Chains the RPC Method Builder can target, in display order.
export const RPC_CHAINS: ReadonlyArray<{ id: ChainId; label: string }> = [
  { id: 'sui', label: 'Sui' },
  { id: 'evm', label: 'Ethereum / EVM' },
  { id: 'stellar', label: 'Stellar' },
];

export const DEFAULT_RPC_CHAIN: ChainId = 'sui';

// RPC method suggestions, keyed by chain. `Record<ChainId, ...>` keeps this
// exhaustive as chains are added.
export const COMMON_RPC_METHODS: Record<ChainId, string[]> = {
  sui: [
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
    'sui_dryRunTransactionBlock',
  ],
  evm: [
    'eth_blockNumber',
    'eth_chainId',
    'eth_getBalance',
    'eth_getCode',
    'eth_getTransactionByHash',
    'eth_getTransactionReceipt',
    'eth_getTransactionCount',
    'eth_getBlockByNumber',
    'eth_call',
    'eth_estimateGas',
    'eth_gasPrice',
    'eth_getLogs',
    'net_version',
  ],
  stellar: [
    'getHealth',
    'getNetwork',
    'getLatestLedger',
    'getLedgerEntries',
    'getTransaction',
    'getTransactions',
    'getEvents',
    'getFeeStats',
    'getVersionInfo',
    'simulateTransaction',
    'sendTransaction',
  ],
};

// Sui RPC methods where params[0] is an owner address (eligible for SuiNS auto-resolution).
// Only meaningful for the 'sui' chain — SuiNS has no equivalent on EVM/Stellar.
export const ADDRESS_FIRST_PARAM_METHODS: ReadonlySet<string> = new Set([
  'suix_getOwnedObjects',
  'suix_getAllBalances',
  'suix_getAllCoins',
  'suix_getBalance',
  'suix_getCoins',
  'suix_getStakes',
]);

// Pre-filled parameter templates for known RPC methods, keyed by chain.
// Used when the user picks a method with empty params and via the "Insert template" action.
export const RPC_METHOD_TEMPLATES: Readonly<Record<ChainId, Readonly<Record<string, ReadonlyArray<unknown>>>>> = {
  sui: {
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
  },
  evm: {
    eth_blockNumber: [],
    eth_chainId: [],
    eth_getBalance: ['<0x wallet address>', 'latest'],
    eth_getCode: ['<0x contract address>', 'latest'],
    eth_getTransactionByHash: ['<0x tx hash>'],
    eth_getTransactionReceipt: ['<0x tx hash>'],
    eth_getTransactionCount: ['<0x wallet address>', 'latest'],
    eth_getBlockByNumber: ['latest', false],
    eth_call: [{ to: '<0x contract address>', data: '<0x calldata>' }, 'latest'],
    eth_estimateGas: [{ to: '<0x contract address>', data: '<0x calldata>' }],
    eth_gasPrice: [],
    eth_getLogs: [{ address: '<0x contract address>', fromBlock: 'latest', toBlock: 'latest' }],
    net_version: [],
  },
  stellar: {
    getHealth: [],
    getNetwork: [],
    getLatestLedger: [],
    getLedgerEntries: [{ keys: ['<base64 ledger key>'] }],
    getTransaction: ['<tx hash>'],
    getTransactions: [{ startLedger: 0, pagination: { limit: 10 } }],
    getEvents: [{ startLedger: 0, filters: [], pagination: { limit: 10 } }],
    getFeeStats: [],
    getVersionInfo: [],
    simulateTransaction: [{ transaction: '<base64 tx envelope>' }],
    sendTransaction: [{ transaction: '<base64 tx envelope>' }],
  },
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
