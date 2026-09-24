
import { Network, ChainId } from "../types";

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

// Built-in secondary mirrors, tried after any user-configured custom
// endpoints and before the primary NETWORKS default fails over to nothing.
// PublicNode fronts through Cloudflare and is occasionally unreachable from
// specific networks/ISPs/extensions even though it's not down globally —
// this gives Sui mainnet/testnet calls somewhere else to go automatically
// instead of a hard failure. Only added where independently verified live.
export const NETWORKS_FALLBACK: Partial<Record<Network, string>> = {
  mainnet: 'https://sui-mainnet-endpoint.blockvision.org',
  testnet: 'https://sui-testnet-endpoint.blockvision.org',
};

// Default public RPC endpoints for non-Sui chains, keyed by network.
export const EVM_NETWORKS: Record<Network, string> = {
  mainnet: 'https://eth.llamarpc.com',
  testnet: 'https://rpc.sepolia.org',
  devnet: 'https://rpc.sepolia.org',
  localnet: 'http://127.0.0.1:8545',
};

// `soroban-rpc.stellar.org` / `soroban-rpc.testnet.stellar.org` no longer
// resolve (NXDOMAIN) — Stellar's Soroban RPC now lives at sorobanrpc.com.
export const STELLAR_NETWORKS: Record<Network, string> = {
  mainnet: 'https://mainnet.sorobanrpc.com',
  testnet: 'https://soroban-testnet.stellar.org',
  devnet: 'https://soroban-testnet.stellar.org',
  localnet: 'http://127.0.0.1:8000',
};

// Stellar's Horizon REST API — NOT the same service as Soroban RPC above.
// Soroban RPC only understands smart-contract/ledger operations; plain
// account balances, account details, and payment history live on Horizon
// (GET /accounts/{address}). Mirrors the CLI's SorobanAdapter::horizon_url.
// No public Horizon mirror exists for devnet/localnet — those return
// undefined so callers can surface a clear "not available" error instead of
// silently hitting a dead/wrong host.
export const STELLAR_HORIZON_URLS: Partial<Record<Network, string>> = {
  mainnet: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
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

// RPC method suggestions, keyed by chain. Partial (not `Record<ChainId, ...>`)
// because not every ChainId speaks JSON-RPC with known methods — Aptos
// exposes a REST API rather than JSON-RPC (see APTOS_NETWORKS above) and
// Cardano has no adapter yet, so both are intentionally absent. Callers
// (RPCBuilder.tsx, RawEditor.tsx, CommandPalette.tsx) fall back to an empty
// list rather than crashing on the missing entry.
export const COMMON_RPC_METHODS: Partial<Record<ChainId, string[]>> = {
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
  ],
  solana: [
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
// Partial for the same reason as COMMON_RPC_METHODS above — Aptos/Cardano
// have no entry here yet.
export const RPC_METHOD_TEMPLATES: Readonly<Partial<Record<ChainId, Readonly<Record<string, ReadonlyArray<unknown>>>>>> = {
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
  // Soroban RPC takes a single params OBJECT per call, not a positional
  // array — unlike Sui/EVM. Each template here is that one object; the
  // request-sending code unwraps it before building the JSON-RPC body
  // (see the `chain === 'stellar'` branch in executeChainRpc).
  stellar: {
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
    getTransactions: [{ startLedger: 0, pagination: { limit: 10 } }],
    getEvents: [{ startLedger: 0, filters: [], pagination: { limit: 10 } }],
    getFeeStats: [{}],
    getVersionInfo: [{}],
    simulateTransaction: [{ transaction: '<base64 tx envelope>' }],
    sendTransaction: [{ transaction: '<base64 tx envelope>' }],
  },
  solana: {
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
