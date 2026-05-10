import React, { useState } from 'react';
import { Box, Power, Eye, EyeOff, X, Plus } from 'lucide-react';
import { EnvironmentVariable } from '../../types';

interface EnvironmentListProps {
  envVariables: EnvironmentVariable[];
  onUpdateEnv: (vars: EnvironmentVariable[]) => void;
}

export const EnvironmentList: React.FC<EnvironmentListProps> = ({
  envVariables,
  onUpdateEnv
}) => {
  const [visibleValues, setVisibleValues] = useState<Record<number, boolean>>({});

  const updateEnvVar = (index: number, updates: Partial<EnvironmentVariable>) => {
    const newVars = [...envVariables];
    newVars[index] = { ...newVars[index], ...updates };
    onUpdateEnv(newVars);
  };

  const deleteEnvVar = (index: number) => {
    const newVars = envVariables.filter((_, i) => i !== index);
    onUpdateEnv(newVars);
  };

  const toggleValueVisibility = (index: number) => {
    setVisibleValues(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const addNewVariable = () => {
    onUpdateEnv([...envVariables, { key: '', value: '', enabled: true, network: 'all' }]);
  };

  return (
    <div className="px-2 pb-20 space-y-3">
      <div className="px-1 py-2 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-white/5 mb-2">
        <span>Global Variables</span>
        <span>{envVariables.length} active</span>
      </div>

      {envVariables.map((v, i) => (
        <div 
          key={i} 
          className={`
            group rounded-xl border transition-all duration-200 relative overflow-hidden
            ${v.enabled 
              ? 'bg-white/[0.02] border-white/10 hover:border-white/20' 
              : 'bg-transparent border-white/5 opacity-50 grayscale'}
          `}
        >
          <div className={`absolute left-0 top-0 bottom-0 w-0.5 transition-colors ${v.enabled ? 'bg-sui-500' : 'bg-slate-800'}`}></div>

          <div className="flex flex-col gap-1 p-2 pl-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input 
                  className={`bg-transparent text-[11px] font-bold font-mono outline-none uppercase tracking-tight min-w-0 flex-1 placeholder:text-slate-700 ${v.enabled ? 'text-sui-300' : 'text-slate-500'}`}
                  placeholder="VARIABLE_NAME"
                  value={v.key}
                  onChange={(e) => updateEnvVar(i, { key: e.target.value.toUpperCase() })}
                />
              </div>
              
              <div className="flex items-center gap-1">
                <div className="relative">
                  <select 
                    className={`appearance-none bg-black border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase outline-none cursor-pointer hover:border-white/20 transition-colors ${
                      v.network === 'mainnet' ? 'text-emerald-400' :
                      v.network === 'testnet' ? 'text-amber-400' :
                      v.network === 'devnet' ? 'text-blue-400' : 'text-slate-400'
                    }`}
                    value={v.network || 'all'}
                    onChange={(e) => updateEnvVar(i, { network: e.target.value as any })}
                  >
                    <option value="all">ALL</option>
                    <option value="mainnet">MAIN</option>
                    <option value="testnet">TEST</option>
                    <option value="devnet">DEV</option>
                  </select>
                </div>
                
                <button 
                  onClick={() => updateEnvVar(i, { enabled: !v.enabled })}
                  className={`p-1 rounded transition-colors ${v.enabled ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-400'}`}
                  title={v.enabled ? "Disable" : "Enable"}
                >
                  <Power size={10} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-black/40 rounded border border-white/5 focus-within:border-white/10 transition-colors">
              <input 
                type={visibleValues[i] ? "text" : "password"}
                className="w-full bg-transparent px-2 py-1.5 text-[10px] font-mono text-slate-300 outline-none placeholder:text-slate-700"
                placeholder="Value"
                value={v.value}
                onChange={(e) => updateEnvVar(i, { value: e.target.value })}
              />
              <button 
                onClick={() => toggleValueVisibility(i)} 
                className="p-1.5 text-slate-600 hover:text-slate-300 transition-colors"
              >
                {visibleValues[i] ? <EyeOff size={10} /> : <Eye size={10} />}
              </button>
            </div>
          </div>
          
          <button 
            onClick={() => deleteEnvVar(i)} 
            className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 bg-red-900/80 text-white rounded-bl-lg transition-all hover:pr-2 hover:pb-2 shadow-lg"
            title="Delete Variable"
          >
            <X size={10} />
          </button>
        </div>
      ))}
      
      <button 
        onClick={addNewVariable} 
        className="w-full py-3 border border-dashed border-white/10 text-slate-500 hover:text-sui-400 hover:border-sui-500/50 hover:bg-white/[0.02] rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 group"
      >
        <Plus size={12} className="group-hover:scale-110 transition-transform"/> Add Variable
      </button>

      {envVariables.length === 0 && (
        <div className="py-8 text-center px-4">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/5 text-slate-600">
            <Box size={20} />
          </div>
          <p className="text-xs text-slate-500">No variables defined.</p>
          <p className="text-[10px] text-slate-600 mt-1">Variables allow you to reuse values like addresses or keys across requests.</p>
        </div>
      )}
    </div>
  );
};