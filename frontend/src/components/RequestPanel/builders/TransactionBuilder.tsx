import React from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { Select } from '../../Select';
import { MoveCallParams, MoveParamType, Network } from '../../../types';
import { MOVE_TYPES } from '@/lib/constants';
import { VariableInput } from '../ai/VariableInput';

interface TransactionBuilderProps {
  request: any;
  activeAddress: string | null;
  envVars: any[];
  network?: Network;
  isReadOnly?: boolean;
  onChange: (updatedReq: any) => void;
}

export const TransactionBuilder: React.FC<TransactionBuilderProps> = ({
  request,
  activeAddress,
  envVars,
  network,
  isReadOnly,
  onChange
}) => {
  const updateMoveParam = (field: keyof MoveCallParams, value: any) => {
    onChange({ 
      ...request, 
      moveParams: { ...request.moveParams, [field]: value } 
    });
  };

  const addMoveArg = () => {
    const newArg = {
      id: Date.now().toString(),
      type: 'u64' as MoveParamType,
      value: ''
    };
    updateMoveParam('arguments', [...request.moveParams.arguments, newArg]);
  };

  const removeMoveArg = (index: number) => {
    const newArgs = [...request.moveParams.arguments];
    newArgs.splice(index, 1);
    updateMoveParam('arguments', newArgs);
  };

  const updateMoveArg = (index: number, updates: Partial<any>) => {
    const newArgs = [...request.moveParams.arguments];
    newArgs[index] = { ...newArgs[index], ...updates };
    updateMoveParam('arguments', newArgs);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-near-black/40 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-sky-500 rounded-full"></div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-[0.2em]">
              Smart Contract Configuration
            </h3>
          </div>
          {activeAddress && (
            <div className="flex items-center gap-2 px-3 py-1 bg-near-black border border-white/10 rounded-full text-[10px] font-mono text-emerald-400">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              Signer: {activeAddress.slice(0,6)}...{activeAddress.slice(-4)}
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-bold text-slate-600 tracking-widest">
              Contract ID
            </label>
            <VariableInput 
              className="w-full bg-near-black border border-white/10 rounded-xl px-4 py-3 text-xs font-mono focus:border-sky-500 outline-none"
              value={request.moveParams.packageId}
              onChange={(v) => updateMoveParam('packageId', v)}
              placeholder="0x..."
              disabled={isReadOnly}
              envVars={envVars}
              network={network}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] uppercase font-bold text-slate-600 tracking-widest">
                Module
              </label>
              <VariableInput 
                className="w-full bg-near-black border border-white/10 rounded-xl px-4 py-3 text-xs font-mono focus:border-sky-500 outline-none"
                value={request.moveParams.module}
                onChange={(v) => updateMoveParam('module', v)}
                placeholder="module_name"
                disabled={isReadOnly}
                envVars={envVars}
                network={network}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] uppercase font-bold text-slate-600 tracking-widest">
                Function
              </label>
              <VariableInput 
                className="w-full bg-near-black border border-white/10 rounded-xl px-4 py-3 text-xs font-mono focus:border-sky-500 outline-none"
                value={request.moveParams.function}
                onChange={(v) => updateMoveParam('function', v)}
                placeholder="function_name"
                disabled={isReadOnly}
                envVars={envVars}
                network={network}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-bold text-slate-600 tracking-widest">
              Type Arguments
            </label>
            <input 
              className="w-full bg-near-black border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-slate-200 focus:border-sky-500 outline-none"
              value={request.moveParams.typeArguments.join(', ')}
              onChange={(e) => updateMoveParam('typeArguments', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="0x2::sui::SUI, 0x..."
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] uppercase font-bold text-slate-600 tracking-widest">
                Function Arguments
              </label>
              <button 
                onClick={addMoveArg}
                disabled={isReadOnly}
                className="text-xs flex items-center gap-1 text-sky-400 hover:text-sky-300 disabled:opacity-50"
              >
                <Plus size={12} /> Add Argument
              </button>
            </div>
            <div className="space-y-2">
              {request.moveParams.arguments.map((arg: any, idx: number) => (
                <div key={arg.id} className="flex gap-2">
                  <div className="w-32 shrink-0">
                    <Select 
                      value={arg.type}
                      options={MOVE_TYPES.map(t => ({ label: t, value: t }))}
                      onChange={(val) => updateMoveArg(idx, { type: val as MoveParamType })}
                      size="xs"
                      variant="default"
                      fullWidth
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="flex-1">
                    <VariableInput 
                      className="w-full bg-near-black border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:border-sky-500 outline-none"
                      value={arg.value}
                      onChange={(v) => updateMoveArg(idx, { value: v })}
                      placeholder={arg.type === 'object' ? 'Object ID' : 'Value'}
                      disabled={isReadOnly}
                      envVars={envVars}
                      network={network}
                    />
                  </div>
                  <button 
                    onClick={() => removeMoveArg(idx)}
                    disabled={isReadOnly}
                    className="p-2 text-slate-600 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {request.moveParams.arguments.length === 0 && (
                <div className="text-center py-4 bg-white/5 border border-white/10 rounded-xl border-dashed">
                  <span className="text-xs text-slate-600">No arguments defined.</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500 tracking-widest">
              <Zap size={12} className="text-amber-500" /> Gas Budget (Units)
            </label>
            <input 
              className="w-full bg-near-black border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-amber-500 focus:border-amber-500/50 outline-none font-bold"
              value={request.moveParams.gasBudget}
              onChange={(e) => updateMoveParam('gasBudget', e.target.value)}
              placeholder="10000000"
              disabled={isReadOnly}
            />
          </div>
        </div>
      </div>
    </div>
  );
};