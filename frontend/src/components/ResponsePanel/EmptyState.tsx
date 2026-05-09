import React from 'react';
import { Zap } from 'lucide-react';

export const EmptyState: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-700 bg-[#050505] select-none">
      <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-slate-800 border border-white/5">
        <Zap size={32} />
      </div>
      <p className="text-sm font-bold text-slate-600 tracking-tight">
        Response Pending Execution
      </p>
      <p className="text-[10px] text-slate-700 mt-2 uppercase tracking-widest">
        Workspace Idling
      </p>
    </div>
  );
};