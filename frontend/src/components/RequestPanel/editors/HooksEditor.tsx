import React from 'react';
import { Plus, Workflow } from 'lucide-react';
import { appStore } from '@/lib/store';

export const HooksEditor: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-slate-200">Pre-Run Hooks</h3>
          <button 
            onClick={() => appStore.showToast('Hooks not implemented', 'info')} 
            className="text-xs text-sui-400 hover:text-white"
          >
            <Plus size={12}/> Add
          </button>
        </div>
        <div className="bg-black border border-white/10 rounded-lg p-4 text-xs text-slate-500 italic">
          Run scripts before request execution (e.g. fetch fresh object ID).
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-slate-200">Post-Run Hooks</h3>
          <button 
            onClick={() => appStore.showToast('Hooks not implemented', 'info')} 
            className="text-xs text-sui-400 hover:text-white"
          >
            <Plus size={12}/> Add
          </button>
        </div>
        <div className="bg-black border border-white/10 rounded-lg p-4 text-xs text-slate-500 italic">
          Run scripts after execution (e.g. store output to env var).
        </div>
      </div>
    </div>
  );
};