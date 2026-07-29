import React from 'react';
import { BrainCircuit, Construction, AlertTriangle } from 'lucide-react';

interface AnalysisTabProps {
  activeRequestId: string;
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({ activeRequestId }) => {
  if (!activeRequestId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3">
          <BrainCircuit size={20} className="text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">
          No Request Selected
        </h3>
        <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">
          Open a request to view analysis details.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-xl p-4">
        <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Construction size={14} className="text-amber-400"/> Transaction Analysis
        </h3>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <AlertTriangle size={14} className="text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time transaction analysis is not yet available. This feature will provide
              AI-driven risk assessment, gas estimation, and security checks for your requests.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Coming Soon</h3>
        <div className="bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg p-3 opacity-60">
          <div className="text-xs text-slate-500">Transaction risk scoring</div>
        </div>
        <div className="bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg p-3 opacity-60">
          <div className="text-xs text-slate-500">Gas fee estimation</div>
        </div>
        <div className="bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg p-3 opacity-60">
          <div className="text-xs text-slate-500">Package verification</div>
        </div>
        <div className="bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg p-3 opacity-60">
          <div className="text-xs text-slate-500">Failure diagnosis</div>
        </div>
      </div>
    </div>
  );
};
