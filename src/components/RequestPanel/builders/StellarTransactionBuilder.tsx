import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Select } from '../../Select';
import { RequestItem, StellarArg, StellarArgType, StellarTxParams } from '../../../types';
import { DEFAULT_STELLAR_TX } from '@/services/transactionService';

interface StellarTransactionBuilderProps {
  request: RequestItem;
  activeAddress: string | null;
  isReadOnly?: boolean;
  onChange: (updatedReq: RequestItem) => void;
}

const ARG_TYPES: StellarArgType[] = ['address', 'i128', 'u128', 'i64', 'u64', 'i32', 'u32', 'bool', 'string', 'symbol', 'bytes'];

const PLACEHOLDERS: Partial<Record<StellarArgType, string>> = {
  address: 'G… or C… address',
  bool: 'true / false',
  bytes: 'hex, e.g. 0xdeadbeef'
};

const inputClass =
  'w-full bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-slate-900 dark:text-white focus:border-teal-500 outline-none';
const labelClass = 'block text-[10px] uppercase font-bold text-slate-600 tracking-widest';

export const StellarTransactionBuilder: React.FC<StellarTransactionBuilderProps> = ({
  request,
  activeAddress,
  isReadOnly,
  onChange
}) => {
  const params = request.stellarTxParams ?? DEFAULT_STELLAR_TX;

  const update = (updates: Partial<StellarTxParams>) =>
    onChange({ ...request, stellarTxParams: { ...params, ...updates } });

  const addArg = () =>
    update({ args: [...params.args, { id: Date.now().toString(), type: 'address', value: '' }] });

  const updateArg = (index: number, updates: Partial<StellarArg>) => {
    const args = [...params.args];
    args[index] = { ...args[index], ...updates };
    update({ args });
  };

  const removeArg = (index: number) => update({ args: params.args.filter((_, i) => i !== index) });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-slate-100 dark:bg-near-black/40 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-teal-500 rounded-full"></div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-[0.2em]">
              Soroban Contract Call
            </h3>
          </div>
          {activeAddress && (
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-full text-[10px] font-mono text-emerald-400">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              Signer: {activeAddress.slice(0, 4)}...{activeAddress.slice(-4)}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className={labelClass} htmlFor="stellar-contract">Contract ID</label>
            <input
              id="stellar-contract"
              className={inputClass}
              value={params.contractId}
              onChange={(e) => update({ contractId: e.target.value })}
              placeholder="C… contract address"
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <label className={labelClass} htmlFor="stellar-fn">Function</label>
            <input
              id="stellar-fn"
              className={inputClass}
              value={params.function}
              onChange={(e) => update({ function: e.target.value })}
              placeholder="function_name"
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className={labelClass}>Arguments</label>
              <button
                onClick={addArg}
                disabled={isReadOnly}
                className="text-xs flex items-center gap-1 text-teal-500 hover:opacity-80 disabled:opacity-50"
              >
                <Plus size={12} /> Add Argument
              </button>
            </div>
            <div className="space-y-2">
              {params.args.map((arg, idx) => (
                <div key={arg.id} className="flex gap-2">
                  <div className="w-28 shrink-0">
                    <Select
                      value={arg.type}
                      options={ARG_TYPES.map((t) => ({ label: t, value: t }))}
                      onChange={(v) => updateArg(idx, { type: v as StellarArgType })}
                      size="xs"
                      fullWidth
                      disabled={isReadOnly}
                    />
                  </div>
                  <input
                    aria-label={`Argument ${idx + 1}`}
                    className="flex-1 min-w-0 bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-teal-500 outline-none"
                    value={arg.value}
                    onChange={(e) => updateArg(idx, { value: e.target.value })}
                    placeholder={PLACEHOLDERS[arg.type] ?? 'Value'}
                    disabled={isReadOnly}
                  />
                  <button
                    onClick={() => removeArg(idx)}
                    disabled={isReadOnly}
                    aria-label={`Remove argument ${idx + 1}`}
                    className="p-2 text-slate-600 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {params.args.length === 0 && (
                <div className="text-center py-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl border-dashed">
                  <span className="text-xs text-slate-600">No arguments defined.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
