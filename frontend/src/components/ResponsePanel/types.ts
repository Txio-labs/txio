import { RequestItem, Assertion } from '../../types';

export interface ResponsePanelProps {
  requestId?: string;
  request?: RequestItem;
  response: any;
  status?: number;
  duration?: number;
  isLoading: boolean;
  error?: string;
  endpoint?: string;
}

export type ViewMode = 'pretty' | 'table' | 'raw' | 'gas';
export type ContentTab = 'body' | 'meta' | 'events' | 'effects';

export interface TestResult extends Assertion {
  passed: boolean;
  actual?: any;
}