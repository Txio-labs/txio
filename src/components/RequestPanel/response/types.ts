// Snapshot of the outcome of the last request execution, lifted from
// features/RPCBuilder.tsx's executeCall/executeRealTransaction (which already
// derive { result, duration, status } from executeChainRpc / simulateMoveCall
// / signAndExecuteMoveCall — see src/services/suiService.ts). This is the
// single source of truth the new Response panel renders; nothing here is
// fabricated.
// Live progress of a signed transaction, from wallet prompt to confirmation.
export type TxStage = 'awaiting-signature' | 'submitted' | 'included' | 'confirmed' | 'failed';

export interface TxProgress {
  stage: TxStage;
  hash?: string;
  explorerUrl?: string;
}

export interface RequestOutcome {
  status: number;
  duration: number;
  timestamp: number;
  result?: unknown;
  error?: string;
}
