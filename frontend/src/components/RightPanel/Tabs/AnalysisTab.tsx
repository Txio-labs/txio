import React from 'react';
import { Lightbulb, Check } from 'lucide-react';

export const AnalysisTab: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="bg-black border border-white/10 rounded-xl p-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Lightbulb size={14} className="text-amber-400"/> Transaction Insight
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          The current request <span className="text-white font-mono bg-white/10 px-1 rounded">Swap SUI/USDC</span> involves a Move Call to the <span className="text-sui-400">DeepBook</span> package.
          It will likely mutate 2 objects and consume approximately <span className="text-amber-500 font-mono">0.005 SUI</span> in gas fees.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Failure Diagnosis</h3>
        <div className="bg-black border border-white/10 rounded-xl p-4 flex gap-3 opacity-60">
          <Check size={16} className="text-emerald-500 mt-0.5"/>
          <div>
            <div className="text-xs font-bold text-slate-300">No Errors Detected</div>
            <div className="text-[10px] text-slate-500 mt-1">Pre-flight simulation suggests this transaction will succeed.</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Security Checks</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 bg-black border border-white/10 rounded-lg">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-xs text-slate-300">Package Verification</span>
            <span className="ml-auto text-[10px] bg-emerald-900/20 text-emerald-400 px-2 py-0.5 rounded">Verified</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-black border border-white/10 rounded-lg">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
            <span className="text-xs text-slate-300">Gas Budget</span>
            <span className="ml-auto text-[10px] text-slate-500">Auto-calculated</span>
          </div>
        </div>
      </div>
    </div>
  );
};