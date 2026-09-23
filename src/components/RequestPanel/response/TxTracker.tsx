import React from 'react';
import { AlertCircle, Check, CheckCircle2, Circle, ExternalLink, Loader2 } from 'lucide-react';
import { RequestOutcome, TxProgress, TxStage } from './types';

interface TxTrackerProps {
  outcome: RequestOutcome | null;
  progress: TxProgress | null;
  isLoading: boolean;
}

const STAGES: { id: TxStage; label: string }[] = [
  { id: 'awaiting-signature', label: 'Awaiting signature' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'included', label: 'Included in a block' },
  { id: 'confirmed', label: 'Confirmed' }
];

const toText = (value: unknown) =>
  typeof value === 'string' ? value : JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));

interface DecodedEvent {
  event?: string;
  args?: Record<string, unknown> | unknown[];
  address?: string;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between gap-4 text-xs">
    <span className="text-slate-500 shrink-0">{label}</span>
    <span className="font-mono text-slate-800 dark:text-slate-200 text-right break-all">{children}</span>
  </div>
);

/**
 * Result card under a transaction form. For simulations it shows the
 * preview (or the failure reason); for signed transactions it tracks
 * submitted → included → confirmed and then shows the decoded receipt.
 */
export const TxTracker: React.FC<TxTrackerProps> = ({ outcome, progress, isLoading }) => {
  if (!outcome && !progress && !isLoading) return null;

  const result = (outcome?.result ?? {}) as Record<string, unknown>;
  const explorerUrl = progress?.explorerUrl ?? (typeof result.explorerUrl === 'string' ? result.explorerUrl : undefined);
  const hash = progress?.hash ?? (typeof result.hash === 'string' ? result.hash : undefined);
  const failed = Boolean(outcome?.error) || progress?.stage === 'failed';

  // Simulation (no signing involved).
  if (!progress) {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-4 py-3 text-xs text-slate-500">
          <Loader2 size={14} className="animate-spin" /> Simulating against current chain state…
        </div>
      );
    }
    if (!outcome) return null;
    const ok = !outcome.error && outcome.status < 400;
    return (
      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden" role="status">
        <div
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold ${
            ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}
        >
          {ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {ok ? 'Simulated successfully' : 'Simulation failed'}
          <span className="ml-auto font-normal opacity-70">{outcome.duration} ms</span>
        </div>
        <div className="p-4 space-y-2">
          {outcome.error && <p className="text-xs text-rose-600 dark:text-rose-400 break-words">{outcome.error}</p>}
          {'decoded' in result && <Row label="Return value">{toText(result.decoded)}</Row>}
          {'returnValue' in result && <Row label="Return value">{toText(result.returnValue)}</Row>}
          {'gasEstimate' in result && result.gasEstimate != null && <Row label="Gas estimate">{toText(result.gasEstimate)}</Row>}
          {'unitsConsumed' in result && result.unitsConsumed != null && <Row label="Compute units">{toText(result.unitsConsumed)}</Row>}
          {'minResourceFee' in result && <Row label="Resource fee">{toText(result.minResourceFee)} stroops</Row>}
          {Array.isArray(result.logs) && result.logs.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500">Program logs ({result.logs.length})</summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-50 dark:bg-near-black p-2 text-[11px] text-slate-600 dark:text-slate-400">
                {(result.logs as string[]).join('\n')}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  // Signed transaction.
  const reached = STAGES.findIndex((s) => s.id === progress.stage);
  const events = Array.isArray(result.events) ? (result.events as DecodedEvent[]) : [];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden" role="status">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Transaction</span>
        {outcome && !isLoading && (
          <span
            className={`ml-auto rounded px-2 py-0.5 text-[10px] font-bold ${
              failed ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {failed ? 'Failed' : 'Success'}
          </span>
        )}
      </div>

      <ol className="px-4 py-3 space-y-2">
        {STAGES.map((stage, i) => {
          const done = !failed && (i < reached || (i === reached && stage.id === 'confirmed'));
          const active = i === reached && !done && !failed;
          const failedHere = failed && i === Math.max(reached, 0);
          return (
            <li key={stage.id} className="flex items-center gap-2 text-xs">
              {failedHere ? (
                <AlertCircle size={14} className="text-rose-500" />
              ) : done ? (
                <Check size={14} className="text-emerald-500" />
              ) : active ? (
                <Loader2 size={14} className="animate-spin text-electric-violet" />
              ) : (
                <Circle size={14} className="text-slate-300 dark:text-slate-700" />
              )}
              <span className={done || active ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}>{stage.label}</span>
            </li>
          );
        })}
      </ol>

      {(hash || outcome) && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-200 dark:border-white/10 pt-3">
          {outcome?.error && <p className="text-xs text-rose-600 dark:text-rose-400 break-words">{outcome.error}</p>}
          {hash && <Row label="Hash">{hash}</Row>}
          {'blockNumber' in result && <Row label="Block">{toText(result.blockNumber)}</Row>}
          {'ledger' in result && <Row label="Ledger">{toText(result.ledger)}</Row>}
          {'gasPaid' in result && <Row label="Gas paid">{toText(result.gasPaid)}</Row>}
          {'returnValue' in result && result.returnValue != null && <Row label="Return value">{toText(result.returnValue)}</Row>}
          {events.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Events ({events.length})</div>
              {events.map((e, i) => (
                <div key={i} className="rounded-lg bg-slate-50 dark:bg-near-black px-3 py-2 text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all">
                  <span className="font-semibold text-slate-900 dark:text-white">{e.event ?? `Log from ${e.address}`}</span>
                  {e.args && <span className="text-slate-500"> {toText(e.args)}</span>}
                </div>
              ))}
            </div>
          )}
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-electric-violet hover:underline"
            >
              View on explorer <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}
    </div>
  );
};
