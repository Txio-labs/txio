import { RequestItem, RequestType, Network, RPCHealthMetric, EnvironmentVariable, AssertionResult } from '../../types';
import { RequestOutcome, TxProgress } from './response/types';

export interface RequestPanelProps {
  request: RequestItem;
  network: Network;
  isLoading: boolean;
  onChange: (updatedReq: RequestItem) => void;
  onSend: () => void;
  onExecute?: () => void;
  activeAddress: string | null;
  envVars: EnvironmentVariable[];
  isReadOnly?: boolean;
  testResults?: AssertionResult[];
  outcome?: RequestOutcome | null;
  txProgress?: TxProgress | null;
}

export interface BuilderTabProps {
  request: RequestItem;
  network: Network;
  activeAddress: string | null;
  envVars: EnvironmentVariable[];
  isReadOnly?: boolean;
  onChange: (updatedReq: RequestItem) => void;
}

export type ActiveTab =
  | 'builder'
  | 'headers'
  | 'auth'
  | 'raw'
  | 'transaction'
  | 'advanced'
  | 'tests'
  | 'hooks'
  | 'code';
