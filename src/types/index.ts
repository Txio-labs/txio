// Canonical network identifiers. These lowercase strings are the wire
// contract shared with the backend `Network` enum (see
// backend/api/src/model/network.rs) and the CLI. Keep this union,
// `ALL_NETWORKS`, and `isNetwork` in sync — they are the frontend's single
// source of truth.
export type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

// Every supported network, in canonical order. Iterate this instead of
// hardcoding string arrays so new networks flow through the UI automatically.
export const ALL_NETWORKS: readonly Network[] = [
  'mainnet',
  'testnet',
  'devnet',
  'localnet'
];

// Runtime guard that narrows an untrusted string to `Network`. Used at the
// API boundary so unknown values are rejected rather than silently accepted.
export const isNetwork = (
  value: string | null | undefined
): value is Network =>
  typeof value === 'string' &&
  (ALL_NETWORKS as readonly string[]).includes(value);

// Chains the RPC Method Builder can target. Kept in sync with
// `WalletChainFamily` (wallet/types.ts), which the wallet layer already uses.
export type ChainId = 'sui' | 'evm' | 'stellar' | 'solana';

export type FeatureId = 'dashboard' | 'rpc' | 'ptb' | 'move' | 'playground' | 'workspace_overview' | 'history' | 'settings' | 'new_request' | 'new_collection' | 'profile' | 'account' | 'ai_chat' | 'runner' | 'collections' | 'docs' | 'ecosystem' | 'features' | 'help' | 'integrations' | 'infrastructure' | 'partners';


export interface TabItem {
  id: string;
  type: FeatureId;
  title: string;
  data?: any;
  isDirty?: boolean;
  workspaceId?: string; // Added for workspace persistence
}

export interface Workspace {
  id: string;
  name: string;
  type: 'Personal' | 'Team';
  activeEnvId: string;
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
  network?: Network | 'all'; // Extended for network scope
  workspaceId?: string; // Added for workspace isolation
}

export interface Environment {
  id: string;
  name: string;
  variables: Record<string, string>;
}

export type SuiExplorer = 'suiscan' | 'suiexplorer' | 'suivision';
export type EvmExplorer = 'family' | 'blockscout';
export type StellarExplorer = 'stellarexpert' | 'stellarchain';
export type SolanaExplorer = 'solanaexplorer' | 'solscan' | 'solanafm';

export interface AppSettings {
    theme: 'dark' | 'light';
    showLineNumbers: boolean;
    autoSave: boolean;
    telemetry: boolean;
    /** Custom Sui RPC endpoint overrides, per network. */
    customRpc: Record<Network, string>;
    /** Custom EVM RPC endpoint overrides, per network. */
    evmCustomRpc: Record<Network, string>;
    /** Custom Stellar/Soroban RPC endpoint overrides, per network. */
    stellarCustomRpc: Record<Network, string>;
    /** Custom Solana RPC endpoint overrides, per network. */
    solanaCustomRpc: Record<Network, string>;
    /** Preferred Sui block explorer. */
    explorer: SuiExplorer;
    /** Preferred EVM explorer family: chain-native (Etherscan-family) or Blockscout. */
    evmExplorer: EvmExplorer;
    /** Preferred Stellar block explorer. */
    stellarExplorer: StellarExplorer;
    /** Preferred Solana block explorer. */
    solanaExplorer: SolanaExplorer;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

// --- Assertions & Hooks ---

export type TestCategory = 'response' | 'transaction' | 'object' | 'event';
export type TestOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';

export interface Assertion {
  id: string;
  category: TestCategory;
  target: string; // specific field: 'http_status', 'json_path', 'gas_used', 'abort_code', etc.
  operator: TestOperator;
  value?: string;
  enabled: boolean;
}

// Result of evaluating a single Assertion against a request/response cycle.
export interface AssertionResult {
  id: string;
  category: TestCategory;
  target: string;
  operator: TestOperator;
  expected?: string;
  actual: string;
  passed: boolean;
  message: string;
}

export interface Hook {
  id: string;
  type: 'pre' | 'post';
  action: 'fetch_object' | 'set_env' | 'cleanup';
  key?: string;
  value?: string;
  enabled: boolean;
}

// --- RPC & Request Types ---

export interface SuiRpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: any;
}

export enum RequestType {
  RPC = 'RPC',
  TRANSACTION = 'TRANSACTION'
}

export type TransactionKind = 'MoveCall' | 'TransferSui' | 'TransferObject';

export type MoveParamType = 'u8' | 'u16' | 'u32' | 'u64' | 'u128' | 'u256' | 'bool' | 'address' | 'string' | 'object' | 'vector<u8>' | 'vector<address>';

export interface BuilderArg {
    id: string;
    type: MoveParamType;
    value: string;
}

export interface MoveCallParams {
  packageId: string;
  module: string;
  function: string;
  typeArguments: string[];
  arguments: BuilderArg[];
  gasBudget: string;
  gasPrice?: string;
}

export interface TransferParams {
  recipient: string;
  amount?: string;
  objectId?: string;
}

// A single account reference within a Solana instruction — mirrors
// @solana/web3.js's AccountMeta shape (pubkey/isSigner/isWritable).
export interface SolanaAccountMeta {
  id: string;
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

// Params for a single-instruction Solana transaction, built and signed via
// the connected wallet from the RPC Builder's Transaction mode. Kept
// separate from MoveCallParams/RequestType.TRANSACTION (the Sui PTB path)
// since Solana instructions have a completely different shape (program ID +
// account list + raw instruction data, no modules/functions/type args).
export interface SolanaTxParams {
  programId: string;
  accounts: SolanaAccountMeta[];
  // Instruction data, encoded as the string the user typed — interpreted
  // per `dataEncoding` at send time.
  data: string;
  dataEncoding: 'hex' | 'base64' | 'utf8';
}

export interface RequestItem {
  id: string;
  type: RequestType;
  name: string;
  network?: Network;
  rpcParams: {
    method: string;
    params: any[];
    chain?: ChainId; // Defaults to 'sui' when absent (pre-multi-chain requests).
    // Which EVM chain to target when chain === 'evm' (e.g. 1 for Ethereum,
    // 8453 for Base). Defaults to Ethereum mainnet (1) when absent — all EVM
    // chains speak the same eth_* JSON-RPC methods, so this is purely a
    // "which network" selector, not a different execution path.
    evmChainId?: number;
  };
  txType?: TransactionKind;
  moveParams: MoveCallParams;
  transferParams?: TransferParams;
  // Present only for the RPC Builder's Solana "Transaction" mode — a
  // single-instruction transaction to sign and send via the connected
  // Solana wallet, independent of the Sui-specific PTB/RequestType.TRANSACTION
  // path.
  solanaTxParams?: SolanaTxParams;
  isLoading?: boolean;
  status?: number;
  timestamp?: number;
  localVars?: EnvironmentVariable[];
  tests?: Assertion[]; // Added
  hooks?: Hook[]; // Added
  // Present once this request has been saved into a collection — lets the
  // request builder know whether "Save to Collection" should create a new
  // saved request or update the existing one, and which collection it's in.
  collectionId?: string;
  // The last response body persisted with this saved request (backend
  // field `last_response`), shown when reopening a saved request that was
  // previously run and saved. Purely a reference snapshot, not live data.
  lastResponse?: unknown;
}

export interface HistoryItem extends RequestItem {
  timestamp: number;
  status: number;
  duration: number;
  network: Network;
  userInitials?: string;
  workspaceId?: string; // Added for workspace filtering
}

export interface RequestHistoryItem {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: number;
}

export interface CollectionNode {
  id: string;
  type: 'collection' | 'folder' | 'request';
  name: string;
  description?: string;
  isExpanded?: boolean;
  children?: CollectionNode[];
  isShared?: boolean;
  requestData?: RequestItem;
  workspaceId?: string; // Added for workspace filtering
}

// A user-created transaction recipe template (Recipes page). `id` is a real
// Mongo id for persisted templates, or a `local-*` id for built-in seed
// templates that only exist client-side and cannot be deleted via the API.
export interface RecipeTemplate {
  id: string;
  title: string;
  type: string;
  description?: string;
  payload?: Record<string, unknown>;
  isBuiltIn?: boolean;
}

// --- PTB Visualizer Types ---

export type NodeType = 'transaction' | 'transfer' | 'splitCoins' | 'mergeCoins' | 'moveCall' | 'object';

export interface PTBNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: Record<string, any>;
  inputs: string[]; // Connection IDs
  outputs: string[]; // Connection IDs
}

export interface PTBConnection {
  id: string;
  sourceId: string; // Node ID
  targetId: string; // Node ID
  sourceHandle?: string;
  targetHandle?: string;
}

export interface PTBGraph {
  nodes: PTBNode[];
  connections: PTBConnection[];
}

// --- Dashboard Types ---

export interface RPCHealthMetric {
  endpoint: string;
  latency: number[]; // History of latency
  successRate: number;
  status: 'healthy' | 'degraded' | 'down';
  blockHeight: number;
}

export interface DashboardTransaction {
  id: string;
  digest: string;
  sender: string;
  type: 'MoveCall' | 'Transfer' | 'Publish';
  gas: string;
  timestamp: number;
}

export interface ObjectSnapshot {
  id: string;
  type: string;
  version: string;
  owner: string;
}

// --- Team & Recipes ---

export interface Recipe {
  id: string;
  name: string;
  description: string;
  tags: string[];
  template: string; // JSON template
}

export interface TeamUser {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
}

export interface NotificationPreferences {
  emailDigests: boolean;
  emailSecurityAlerts: boolean;
  inAppActivityAlerts: boolean;
  inAppProductUpdates: boolean;
}

export interface GitHubAccount {
  id: string;
  login: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bannerUrl?: string;
  notificationPreferences?: NotificationPreferences;
  githubAccount?: GitHubAccount;
  googleLinked?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarColor?: string;
}

export interface ActivityLog {
  id: string;
  type: 'request' | 'team' | 'system' | 'error';
  userName: string;
  action: string;
  target: string;
  timestamp: number;
}

export interface Comment {
  id: string;
  userName: string;
  userAvatarColor?: string;
  content: string;
  timestamp: number;
}

// --- Session Tracking ---

/** A live sign-in session returned by GET /auth/sessions. */
export interface ActiveSession {
  /** MongoDB ObjectId of the session document — used as the revocation key. */
  id: string;
  /** Human-readable device label, e.g. "Chrome on macOS". */
  device_label: string;
  /** IP address recorded at sign-in time. */
  ip_address: string;
  /** ISO-8601 timestamp of when the session was created. */
  created_at: string;
  /** ISO-8601 timestamp of the last known activity. */
  last_active_at: string;
  /** True when this entry corresponds to the currently active JWT. */
  is_current: boolean;
}
