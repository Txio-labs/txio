export type Network = 'mainnet' | 'testnet' | 'devnet';

export type FeatureId = 'dashboard' | 'rpc' | 'ptb' | 'move' | 'playground' | 'history' | 'settings' | 'new_request' | 'profile' | 'ai_chat' | 'runner';

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

export interface AppSettings {
    theme: 'dark' | 'light';
    showLineNumbers: boolean;
    autoSave: boolean;
    telemetry: boolean;
    customRpc: Record<Network, string>;
    explorer: 'suiscan' | 'suiexplorer' | 'suivision';
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

export interface RequestItem {
  id: string;
  type: RequestType;
  name: string;
  rpcParams: {
    method: string;
    params: any[];
  };
  txType?: TransactionKind;
  moveParams: MoveCallParams;
  transferParams?: TransferParams;
  isLoading?: boolean;
  status?: number;
  timestamp?: number;
  localVars?: EnvironmentVariable[];
  tests?: Assertion[]; // Added
  hooks?: Hook[]; // Added
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
  isExpanded?: boolean;
  children?: CollectionNode[];
  isShared?: boolean;
  requestData?: RequestItem;
  workspaceId?: string; // Added for workspace filtering
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

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bannerUrl?: string;
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
  type: 'request' | 'team' | 'system';
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
