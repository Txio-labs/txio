import React from 'react';
import { Lightbulb, Check, X as XIcon, Clock } from 'lucide-react';
import { HistoryItem, RequestItem, RequestType } from '../../../types';

interface AnalysisTabProps {
  request?: RequestItem;
  lastRun: HistoryItem | null;
}

// Heuristic only — this app has no real static-analysis engine. A method
// name convention is the one honest signal available without executing it:
// read-only RPC methods are near-universally prefixed `get`/`is`/`has`/`list`
// across Sui/EVM/Solana/Stellar, and PTB/Move-call requests are inherently
// state-changing by construction.
function isLikelyMutating(request: RequestItem): boolean {
  if (request.type === RequestType.TRANSACTION) return true;
  const method = request.rpcParams?.method?.toLowerCase() ?? '';
  return !/^(get|is|has|list|find|query|simulate)/.test(method) && method !== '';
}

const CHAIN_LABELS: Record<string, string> = {
  sui: 'Sui',
  evm: 'EVM',
  solana: 'Solana',
  stellar: 'Stellar'
};

export const AnalysisTab: React.FC<AnalysisTabProps> = ({ request, lastRun }) => {
  if (!request) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] flex items-center justify-center mb-4">
          <Lightbulb size={22} className="text-slate-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">No request open</h3>
        <p className="text-xs leading-6 text-slate-500 max-w-[240px]">
          Open a request to see its method, chain, and last run result here.
        </p>
      </div>
    );
  }

  const chainLabel = CHAIN_LABELS[request.rpcParams?.chain ?? 'sui'] ?? request.rpcParams?.chain;
  const mutating = isLikelyMutating(request);
  const paramCount = request.type === RequestType.RPC
    ? (request.rpcParams?.params?.length ?? 0)
    : request.moveParams?.arguments?.length ?? 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-xl p-4">
        <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Lightbulb size={14} className="text-amber-400" /> Request Summary
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          <span className="text-slate-900 dark:text-white font-mono bg-slate-200/60 dark:bg-white/10 px-1 rounded">
            {request.type === RequestType.RPC
              ? request.rpcParams?.method || 'No method set'
              : `${request.moveParams?.module || '?'}::${request.moveParams?.function || '?'}`}
          </span>{' '}
          on <span className="text-slate-700 dark:text-slate-200 font-medium">{chainLabel}</span>
          {request.network ? <> · {request.network}</> : null}.{' '}
          {paramCount > 0 ? `${paramCount} parameter${paramCount === 1 ? '' : 's'} configured.` : 'No parameters configured.'}
        </p>
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
              mutating
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {mutating ? 'Likely state-changing' : 'Likely read-only'}
          </span>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Last Run</h3>
        {lastRun ? (
          <div className="bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-xl p-4 flex gap-3">
            {lastRun.status < 400 ? (
              <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
            ) : (
              <XIcon size={16} className="text-red-500 mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {lastRun.status < 400 ? 'Succeeded' : 'Failed'} · status {lastRun.status}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <Clock size={10} /> {lastRun.duration}ms · {new Date(lastRun.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-xl p-4 text-xs text-slate-500">
            This request hasn&rsquo;t been executed yet.
          </div>
        )}
      </div>
    </div>
  );
};
