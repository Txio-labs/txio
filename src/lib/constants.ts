
import { Network, ChainId } from "../types";
import { APTOS_REST_METHODS } from "../services/aptosRest";
import { HORIZON_METHODS } from "../services/stellar/horizon";

// Default Sui fullnode endpoint per network. Mirrors `Network::sui_url` on the
// backend (backend/api/src/model/network.rs). `Record<Network, ...>` forces
// this map to stay exhaustive as networks are added.
//
// Sui deprecated JSON-RPC on the official public fullnodes
// (fullnode.{mainnet,testnet,devnet}.sui.io) — they now return
// "Method not found. JSON-RPC on public fullnodes has been deprecated."
// for every method. Mainnet/testnet point at PublicNode's Sui JSON-RPC
// mirror instead, which still serves the protocol this app is built on.
// Devnet has no known public JSON-RPC mirror right now (devnet resets too
// often for third parties to bother hosting one) — it's left pointing at
// the official, now-broken URL so failures there are obvious rather than
// silently routed to the wrong network.
export const NETWORKS: Record<Network, string> = {
  mainnet: 'https://sui-rpc.publicnode.com',
  testnet: 'https://sui-testnet-rpc.publicnode.com',
  devnet: 'https://fullnode.devnet.sui.io:443',
  localnet: 'http://127.0.0.1:9000',
};

// Built-in secondary mirrors, tried after user-configured custom endpoints
// and the primary NETWORKS default. BlockVision rate-limits browser traffic
// (HTTP 429), so it must not sit in front of the primary.
// PublicNode fronts through Cloudflare and is occasionally unreachable from
// specific networks/ISPs/extensions even though it's not down globally —
// this gives Sui mainnet/testnet calls somewhere else to go automatically
// instead of a hard failure. Only added where independently verified live.
export const NETWORKS_FALLBACK: Partial<Record<Network, string>> = {
  mainnet: 'https://sui-mainnet-endpoint.blockvision.org',
  testnet: 'https://sui-testnet-endpoint.blockvision.org',
};

// Default public RPC endpoints for non-Sui chains, keyed by network.
// eth.llamarpc.com (HTTP 525) and rpc.sepolia.org (HTTP 404) stopped serving;
// PublicNode answers browser-origin JSON-RPC with CORS for both.
export const EVM_NETWORKS: Record<Network, string> = {
  mainnet: 'https://ethereum-rpc.publicnode.com',
  testnet: 'https://ethereum-sepolia-rpc.publicnode.com',
  devnet: 'https://ethereum-sepolia-rpc.publicnode.com',
  localnet: 'http://127.0.0.1:8545',
};

// `soroban-rpc.stellar.org` / `soroban-rpc.testnet.stellar.org` no longer
// resolve (NXDOMAIN) — Stellar's Soroban RPC now lives at sorobanrpc.com.
// Stellar has no "devnet": the app's devnet slot is Futurenet, Stellar's
// network for upcoming protocol features. Localnet is a standalone
// quickstart node (`stellar container start local`).
export const STELLAR_NETWORKS: Record<Network, string> = {
  mainnet: 'https://mainnet.sorobanrpc.com',
  testnet: 'https://soroban-testnet.stellar.org',
  devnet: 'https://rpc-futurenet.stellar.org',
  localnet: 'http://127.0.0.1:8000/rpc',
};

/** Stellar's own name for each app network. */
export const STELLAR_NETWORK_NAMES: Record<Network, string> = {
  mainnet: 'Mainnet',
  testnet: 'Testnet',
  devnet: 'Futurenet',
  localnet: 'Local',
};

/** Network passphrases. Signatures and transaction hashes depend on them. */
export const STELLAR_PASSPHRASES: Record<Network, string> = {
  mainnet: 'Public Global Stellar Network ; September 2015',
  testnet: 'Test SDF Network ; September 2015',
  devnet: 'Test SDF Future Network ; October 2022',
  localnet: 'Standalone Network ; February 2017',
};

/** Friendbot funds new accounts on the test networks. */
export const STELLAR_FRIENDBOT_URLS: Partial<Record<Network, string>> = {
  testnet: 'https://friendbot.stellar.org',
  devnet: 'https://friendbot-futurenet.stellar.org',
  localnet: 'http://127.0.0.1:8000/friendbot',
};

/** stellar.expert path segment; it indexes only mainnet and testnet. */
const STELLAR_EXPERT_PATHS: Partial<Record<Network, string>> = { mainnet: 'public', testnet: 'testnet' };

/** stellar.expert link for a tx/account/contract, or undefined on networks it does not index. */
export const stellarExpertUrl = (network: Network, kind: 'tx' | 'account' | 'contract', id: string): string | undefined => {
  const path = STELLAR_EXPERT_PATHS[network];
  return path ? `https://stellar.expert/explorer/${path}/${kind}/${id}` : undefined;
};

// Stellar's Horizon REST API — NOT the same service as Soroban RPC above.
// Soroban RPC only understands smart-contract/ledger operations; plain
// account balances, account details, and payment history live on Horizon
// (GET /accounts/{address}). Mirrors the CLI's SorobanAdapter::horizon_url.
// Devnet is Futurenet (see STELLAR_NETWORKS); localnet is the quickstart
// node, which serves Horizon at its root.
export const STELLAR_HORIZON_URLS: Record<Network, string> = {
  mainnet: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
  devnet: 'https://horizon-futurenet.stellar.org',
  localnet: 'http://127.0.0.1:8000',
};

// api.mainnet-beta.solana.com / api.testnet.solana.com return HTTP 403
// "Access forbidden" for any request carrying a browser Origin header —
// they're documented as not intended for app traffic. PublicNode's mirrors
// serve the same JSON-RPC without that block. Devnet's official endpoint
// has no such restriction (it's meant for dev/faucet use) and PublicNode
// doesn't host a devnet mirror, so it's left as-is.
export const SOLANA_NETWORKS: Record<Network, string> = {
  mainnet: 'https://solana-rpc.publicnode.com',
  testnet: 'https://solana-testnet-rpc.publicnode.com',
  devnet: 'https://api.devnet.solana.com',
  localnet: 'http://127.0.0.1:8899',
};

// Starknet JSON-RPC (spec 0.10). PublicNode serves mainnet and Sepolia with
// CORS and no API key (verified live). Starknet has no public devnet, so
// devnet maps to Sepolia like EVM does. Localnet is starknet-devnet's
// default RPC address.
export const STARKNET_NETWORKS: Record<Network, string> = {
  mainnet: 'https://starknet-rpc.publicnode.com',
  testnet: 'https://starknet-sepolia-rpc.publicnode.com',
  devnet: 'https://starknet-sepolia-rpc.publicnode.com',
  localnet: 'http://127.0.0.1:5050/rpc',
};

// Aptos fullnode REST API endpoints (NOT JSON-RPC — Aptos exposes a REST
// API, so this is intentionally not part of resolveChainRpcUrl/
// resolveChainCustomRpcUrl in appConfig.ts, which speak JSON-RPC). No public
// localnet endpoint exists; a local Aptos node's default REST port is used.
export const APTOS_NETWORKS: Record<Network, string> = {
  mainnet: 'https://fullnode.mainnet.aptoslabs.com/v1',
  testnet: 'https://fullnode.testnet.aptoslabs.com/v1',
  devnet: 'https://fullnode.devnet.aptoslabs.com/v1',
  localnet: 'http://127.0.0.1:8080/v1',
};

// Chains the RPC Method Builder can target, in display order.
export const RPC_CHAINS: ReadonlyArray<{ id: ChainId; label: string }> = [
  { id: 'sui', label: 'Sui' },
  { id: 'evm', label: 'Ethereum / EVM' },
  { id: 'stellar', label: 'Stellar' },
  { id: 'solana', label: 'Solana' },
  { id: 'aptos', label: 'Aptos' },
  { id: 'starknet', label: 'Starknet' },
];

export const DEFAULT_RPC_CHAIN: ChainId = 'sui';

// Curated, verified EVM-compatible mainnets a request can target when
// chain === 'evm'. All of these speak the same eth_* JSON-RPC methods, so
// this is a "which network" selector orthogonal to ChainId, not a new
// execution path — see `evmChainId` on RequestItem.rpcParams. Sourced from
// chainid.network's public chain registry; every RPC URL below was tested
// live and confirmed to return a real eth_chainId response with no API key.
export interface EvmChainInfo {
  id: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
}

export const EVM_CHAINS: ReadonlyArray<EvmChainInfo> = [
  { id: 1, name: 'Ethereum', rpcUrl: 'https://cloudflare-eth.com', explorerUrl: 'https://etherscan.io' },
  { id: 10, name: 'OP Mainnet', rpcUrl: 'https://mainnet.optimism.io', explorerUrl: 'https://optimistic.etherscan.io' },
  { id: 25, name: 'Cronos', rpcUrl: 'https://evm.cronos.org', explorerUrl: 'https://cronoscan.com' },
  { id: 56, name: 'BNB Smart Chain', rpcUrl: 'https://bsc-dataseed1.bnbchain.org', explorerUrl: 'https://bscscan.com' },
  { id: 100, name: 'Gnosis', rpcUrl: 'https://rpc.gnosischain.com', explorerUrl: 'https://gnosisscan.io' },
  { id: 143, name: 'Monad', rpcUrl: 'https://rpc.monad.xyz', explorerUrl: 'https://monadscan.com' },
  { id: 137, name: 'Polygon', rpcUrl: 'https://polygon.drpc.org', explorerUrl: 'https://polygonscan.com' },
  { id: 250, name: 'Fantom Opera', rpcUrl: 'https://fantom.drpc.org', explorerUrl: 'https://ftmscan.com' },
  { id: 288, name: 'Boba Network', rpcUrl: 'https://mainnet.boba.network', explorerUrl: 'https://bobascan.com' },
  { id: 324, name: 'zkSync Era', rpcUrl: 'https://mainnet.era.zksync.io', explorerUrl: 'https://explorer.zksync.io' },
  { id: 1101, name: 'Polygon zkEVM', rpcUrl: 'https://zkevm-rpc.com', explorerUrl: 'https://zkevm.polygonscan.com' },
  { id: 1284, name: 'Moonbeam', rpcUrl: 'https://moonbeam.drpc.org', explorerUrl: 'https://moonscan.io' },
  { id: 5000, name: 'Mantle', rpcUrl: 'https://rpc.mantle.xyz', explorerUrl: 'https://mantlescan.xyz' },
  { id: 8453, name: 'Base', rpcUrl: 'https://mainnet.base.org', explorerUrl: 'https://basescan.org' },
  { id: 42161, name: 'Arbitrum One', rpcUrl: 'https://arb1.arbitrum.io/rpc', explorerUrl: 'https://arbiscan.io' },
  { id: 42220, name: 'Celo', rpcUrl: 'https://forno.celo.org', explorerUrl: 'https://celoscan.io' },
  { id: 43114, name: 'Avalanche C-Chain', rpcUrl: 'https://api.avax.network/ext/bc/C/rpc', explorerUrl: 'https://snowtrace.io' },
  { id: 59144, name: 'Linea', rpcUrl: 'https://rpc.linea.build', explorerUrl: 'https://lineascan.build' },
  { id: 81457, name: 'Blast', rpcUrl: 'https://rpc.blast.io', explorerUrl: 'https://blastscan.io' },
  { id: 534352, name: 'Scroll', rpcUrl: 'https://rpc.scroll.io', explorerUrl: 'https://scrollscan.com' },
  { id: 7777777, name: 'Zora', rpcUrl: 'https://rpc.zora.energy', explorerUrl: 'https://explorer.zora.energy' },
];

export const DEFAULT_EVM_CHAIN_ID = 1;

export const getEvmChain = (id: number | undefined): EvmChainInfo =>
  EVM_CHAINS.find((c) => c.id === id) ?? EVM_CHAINS[0];

// RPC method suggestions, keyed by chain. Aptos is REST, so its "methods"
// are named endpoints mapped to URLs in services/aptosRest.ts. Callers
// (RPCBuilder.tsx, RawEditor.tsx, CommandPalette.tsx) fall back to an empty
// list for a chain with no entry.
export const COMMON_RPC_METHODS: Partial<Record<ChainId, string[]>> = {
  sui: [
    'getAddressTransactions',
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
    'getAddressTransactions',
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
    'getAddressTransactions',
    'getBalance',
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
    ...Object.keys(HORIZON_METHODS),
  ],
  solana: [
    'getAddressTransactions',
    'getBalance',
    'getAccountInfo',
    'getTransaction',
    'getSignaturesForAddress',
    'getTokenAccountsByOwner',
    'getBlockHeight',
    'getLatestBlockhash',
    'getEpochInfo',
    'getSupply',
    'getSlot',
    'getVersion',
    'getHealth',
    'sendTransaction',
  ],
  aptos: [...Object.keys(APTOS_REST_METHODS), 'getAddressTransactions'],
  starknet: [
    'getAddressTransactions',
    'starknet_blockNumber',
    'starknet_chainId',
    'starknet_specVersion',
    'starknet_syncing',
    'starknet_getBlockWithTxHashes',
    'starknet_getTransactionByHash',
    'starknet_getTransactionReceipt',
    'starknet_getTransactionStatus',
    'starknet_getNonce',
    'starknet_getClassHashAt',
    'starknet_getClassAt',
    'starknet_getStorageAt',
    'starknet_call',
    'starknet_getEvents',
  ],
};

// Sui RPC methods where params[0] is an owner address (eligible for SuiNS auto-resolution).
// Only meaningful for the 'sui' chain — SuiNS has no equivalent on EVM/Stellar.
export const ADDRESS_FIRST_PARAM_METHODS: ReadonlySet<string> = new Set([
  'getAddressTransactions',
  'suix_getOwnedObjects',
  'suix_getAllBalances',
  'suix_getAllCoins',
  'suix_getBalance',
  'suix_getCoins',
  'suix_getStakes',
]);

// Pre-filled parameter templates for known RPC methods, keyed by chain.
// Used when the user picks a method with empty params and via the "Insert template" action.
// Partial: a chain without templates simply offers none.
export const RPC_METHOD_TEMPLATES: Readonly<Partial<Record<ChainId, Readonly<Record<string, ReadonlyArray<unknown>>>>>> = {
  sui: {
    getAddressTransactions: ['<owner address or name.sui>', { limit: 20 }],
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
    getAddressTransactions: ['<0x wallet address>', { limit: 20 }],
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
  // Soroban RPC takes a single params OBJECT per call, not a positional
  // array — unlike Sui/EVM. Each template here is that one object; the
  // request-sending code unwraps it before building the JSON-RPC body
  // (see the `chain === 'stellar'` branch in executeChainRpc).
  stellar: {
    getAddressTransactions: [{ address: '<G... account or C... contract address>', limit: 20 }],
    // Not a real Soroban RPC method — Soroban RPC can't read plain account
    // balances at all. This is a convenience alias the frontend resolves
    // against Stellar's Horizon REST API instead (see the
    // `chain === 'stellar' && method === 'getBalance'` branch in
    // executeChainRpc). Takes a bare address string, not a params object,
    // since it never reaches the Soroban JSON-RPC wire format.
    getBalance: ['<G... Stellar address>'],
    getHealth: [{}],
    getNetwork: [{}],
    getLatestLedger: [{}],
    getLedgerEntries: [{ keys: ['<base64 ledger key>'] }],
    getTransaction: [{ hash: '<tx hash>' }],
    // startLedger can't have a static default — Soroban RPC nodes only
    // retain a rolling recent-ledger window, so any fixed number here would
    // eventually (often immediately) fall outside it and fail with "start
    // ledger must be between the oldest ledger and the latest ledger".
    // RPCBuilder resolves this to the real latest ledger via getLatestLedger
    // right after inserting the template; this string is only what briefly
    // shows before that resolves (or if it fails).
    getTransactions: [{ startLedger: '<resolving latest ledger…>', pagination: { limit: 10 } }],
    getEvents: [{ startLedger: '<resolving latest ledger…>', filters: [], pagination: { limit: 10 } }],
    getFeeStats: [{}],
    getVersionInfo: [{}],
    simulateTransaction: [{ transaction: '<base64 tx envelope>' }],
    sendTransaction: [{ transaction: '<base64 tx envelope>' }],
    // Horizon REST reads (see services/stellar/horizon.ts): positional params, not one object.
    ...Object.fromEntries(Object.entries(HORIZON_METHODS).map(([name, m]) => [name, m.template])),
  },
  solana: {
    getAddressTransactions: ['<base58 wallet address>', { limit: 20 }],
    getBalance: ['<base58 wallet address>'],
    getAccountInfo: ['<base58 address>', { encoding: 'jsonParsed' }],
    getTransaction: ['<base58 tx signature>', { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
    getSignaturesForAddress: ['<base58 address>', { limit: 10 }],
    getTokenAccountsByOwner: ['<base58 owner address>', { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }],
    getBlockHeight: [],
    getLatestBlockhash: [],
    getEpochInfo: [],
    getSupply: [],
    getSlot: [],
    getVersion: [],
    getHealth: [],
    sendTransaction: ['<base64 signed transaction>'],
  },
  aptos: {
    ...Object.fromEntries(Object.entries(APTOS_REST_METHODS).map(([name, m]) => [name, m.template])),
    getAddressTransactions: ['<0x account address>', { limit: 20 }],
  },
  // Block ids are "latest", "pre_confirmed", or { block_number } / { block_hash }.
  starknet: {
    getAddressTransactions: ['<0x account address>', { limit: 20 }],
    starknet_blockNumber: [],
    starknet_chainId: [],
    starknet_specVersion: [],
    starknet_syncing: [],
    starknet_getBlockWithTxHashes: ['latest'],
    starknet_getTransactionByHash: ['<0x tx hash>'],
    starknet_getTransactionReceipt: ['<0x tx hash>'],
    starknet_getTransactionStatus: ['<0x tx hash>'],
    starknet_getNonce: ['latest', '<0x contract address>'],
    starknet_getClassHashAt: ['latest', '<0x contract address>'],
    starknet_getClassAt: ['latest', '<0x contract address>'],
    starknet_getStorageAt: ['<0x contract address>', '<0x storage key>', 'latest'],
    // Defaults to the STRK token's balanceOf(<account>) on mainnet.
    starknet_call: [
      {
        contract_address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
        entry_point_selector: '0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e',
        calldata: ['<0x account address>'],
      },
      'latest',
    ],
    starknet_getEvents: [{ filter: { address: '<0x contract address>', from_block: 'latest', to_block: 'latest', chunk_size: 10 } }],
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
