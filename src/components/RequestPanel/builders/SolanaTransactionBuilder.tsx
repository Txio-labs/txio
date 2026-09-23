import React from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { RequestItem, SolanaAccountMeta, SolanaTxParams } from '../../../types';

interface SolanaTransactionBuilderProps {
  request: RequestItem;
  activeAddress: string | null;
  onChange: (updatedReq: RequestItem) => void;
}

const DEFAULT_SOLANA_TX_PARAMS: SolanaTxParams = {
  programId: '',
  accounts: [],
  data: '',
  dataEncoding: 'hex'
};

const fieldClass =
  'w-full bg-white dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-200 focus:border-electric-violet focus:outline-none transition-colors';
const labelClass = 'block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5';

export const SolanaTransactionBuilder: React.FC<SolanaTransactionBuilderProps> = ({
  request,
  activeAddress,
  onChange
}) => {
  const params = request.solanaTxParams ?? DEFAULT_SOLANA_TX_PARAMS;

  const updateParams = (updates: Partial<SolanaTxParams>) => {
    onChange({
      ...request,
      solanaTxParams: { ...params, ...updates }
    });
  };

  const addAccount = () => {
    const newAccount: SolanaAccountMeta = {
      id: Date.now().toString(),
      pubkey: '',
      isSigner: false,
      isWritable: false
    };
    updateParams({ accounts: [...params.accounts, newAccount] });
  };

  const removeAccount = (index: number) => {
    const next = [...params.accounts];
    next.splice(index, 1);
    updateParams({ accounts: next });
  };

  const updateAccount = (index: number, updates: Partial<SolanaAccountMeta>) => {
    const next = [...params.accounts];
    next[index] = { ...next[index], ...updates };
    updateParams({ accounts: next });
  };

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black/40 space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Solana instruction</div>
        {activeAddress && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-full text-[10px] font-mono text-emerald-500 dark:text-emerald-400">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            Signer: {activeAddress.slice(0, 4)}...{activeAddress.slice(-4)}
          </div>
        )}
      </div>

      <div>
        <label className={labelClass}>Program ID</label>
        <input
          className={fieldClass}
          value={params.programId}
          onChange={(e) => updateParams({ programId: e.target.value })}
          placeholder="Base58 program address"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
            Accounts
          </label>
          <button
            onClick={addAccount}
            className="text-xs flex items-center gap-1 text-electric-violet hover:opacity-80"
          >
            <Plus size={12} /> Add Account
          </button>
        </div>
        <div className="space-y-2">
          {params.accounts.map((account, idx) => (
            <div key={account.id} className="flex items-center gap-2">
              <input
                className={`flex-1 min-w-0 ${fieldClass}`}
                value={account.pubkey}
                onChange={(e) => updateAccount(idx, { pubkey: e.target.value })}
                placeholder="Account pubkey"
              />
              <label className="flex items-center gap-1.5 text-[10px] text-slate-500 shrink-0 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={account.isSigner}
                  onChange={(e) => updateAccount(idx, { isSigner: e.target.checked })}
                  className="accent-electric-violet"
                />
                Signer
              </label>
              <label className="flex items-center gap-1.5 text-[10px] text-slate-500 shrink-0 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={account.isWritable}
                  onChange={(e) => updateAccount(idx, { isWritable: e.target.checked })}
                  className="accent-electric-violet"
                />
                Writable
              </label>
              <button
                onClick={() => removeAccount(idx)}
                className="p-2 text-slate-500 hover:text-rose-500 transition-colors shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {params.accounts.length === 0 && (
            <div className="text-center py-4 bg-white dark:bg-near-black border border-dashed border-slate-200 dark:border-white/10 rounded-lg">
              <span className="text-xs text-slate-500">No accounts defined.</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
            Instruction Data
          </label>
          <div className="flex items-center gap-1">
            {(['hex', 'base64', 'utf8'] as const).map((enc) => (
              <button
                key={enc}
                onClick={() => updateParams({ dataEncoding: enc })}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${
                  params.dataEncoding === enc
                    ? 'bg-electric-violet/15 text-electric-violet'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {enc}
              </button>
            ))}
          </div>
        </div>
        <textarea
          className={`${fieldClass} min-h-[80px]`}
          value={params.data}
          onChange={(e) => updateParams({ data: e.target.value })}
          placeholder={
            params.dataEncoding === 'hex'
              ? 'e.g. 01 (hex-encoded instruction data)'
              : params.dataEncoding === 'base64'
                ? 'Base64-encoded instruction data'
                : 'Raw UTF-8 instruction data'
          }
        />
        <p className="text-[10px] text-slate-500 leading-relaxed mt-1.5">
          Leave empty for instructions that take no data (e.g. a fixed-purpose counter increment).
        </p>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-white/10 text-[10px] text-slate-500 mt-3">
        <Zap size={12} className="text-amber-500 shrink-0" />
        This builds and submits a real, signed transaction via your connected Solana wallet — it is not a simulation.
      </div>
    </div>
  );
};
