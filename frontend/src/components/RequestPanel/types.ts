import { RequestItem, RequestType, Network, RPCHealthMetric, EnvironmentVariable } from '../../types';

export interface RequestPanelProps {
  request: RequestItem;
  network: Network;
  onChange: (updatedReq: RequestItem) => void;
  onSend: () => void;
  onExecute?: () => void;
  activeAddress: string | null;
  envVars: EnvironmentVariable[];
  isReadOnly?: boolean;
}

export interface BuilderTabProps {
  request: RequestItem;
  network: Network;
  activeAddress: string | null;
  envVars: EnvironmentVariable[];
  isReadOnly?: boolean;
  onChange: (updatedReq: RequestItem) => void;
}

export type ActiveTab = 'builder' | 'raw' | 'tests' | 'hooks' | 'code';