import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw, Trash2, Zap } from 'lucide-react';
import { Select } from '../../Select';
import { Network, RequestItem, SolanaAccountMeta, SolanaTxParams } from '../../../types';
import { getDiscoveryAdapter } from '@/services/discovery';
import { setCachedPackage } from '@/services/discovery/cache';
import { DiscoveryError, type DiscoveredFunction } from '@/services/discovery/types';
import { encodeAnchorInstruction, isSolanaProgramId } from '@/services/discovery/solanaDiscovery';

interface SolanaTransactionBuilderProps {
  request: RequestItem;
  activeAddress: string | null;
  network: Network;
  isReadOnly?: boolean;
  onChange: (updatedReq: RequestItem) => void;
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; instructions: DiscoveredFunction[] };

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
  network,
  isReadOnly,
  onChange
}) => {
  const params = request.solanaTxParams ?? DEFAULT_SOLANA_TX_PARAMS;
  const [load, setLoad] = useState<LoadState>({ status: 'idle' });
  const [manual, setManual] = useState(false);
  const [instructionName, setInstructionName] = useState('');
  const [argValues, setArgValues] = useState<string[]>([]);
  const [encodeError, setEncodeError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const programId = params.programId.trim();

  const loadIdl = useCallback(
    async (id: string) => {
      const ticket = ++requestRef.current;
      setLoad({ status: 'loading' });
      try {
        // The IDL authority can republish it, so always re-read instead of trusting the cache.
        const pkg = await getDiscoveryAdapter('solana').discoverPackage(id, network);
        setCachedPackage('solana', network, id, pkg);
        if (ticket === requestRef.current) setLoad({ status: 'loaded', instructions: pkg.modules[0]?.functions ?? [] });
      } catch (error) {
        const message = error instanceof DiscoveryError || error instanceof Error ? error.message : 'Could not load the program IDL.';
        if (ticket === requestRef.current) setLoad({ status: 'error', message });
      }
    },
    [network]
  );

  // Load automatically once the program ID is well-formed (debounced), and
  // again on network change: the same program ID can differ per cluster.
  useEffect(() => {
    if (manual) return;
    if (!isSolanaProgramId(programId)) {
      requestRef.current++;
      return;
    }
    const timer = setTimeout(() => void loadIdl(programId), 400);
    return () => clearTimeout(timer);
  }, [programId, network, manual, loadIdl]);

  const view: LoadState = isSolanaProgramId(programId) ? load : { status: 'idle' };
  const instructions = !manual && view.status === 'loaded' ? view.instructions : null;
  const selectedInstruction = instructions?.find((f) => f.name === instructionName) ?? null;
  const unsupportedParams = selectedInstruction?.parameters.filter((p) => p.resolution === 'unsupported') ?? [];

  /** Re-encodes instruction data from the argument fields; leaves data empty until every field encodes. */
  const encodeData = (fn: DiscoveredFunction, values: string[]): string => {
    try {
      const hex = encodeAnchorInstruction(fn, values);
      setEncodeError(null);
      return hex;
    } catch (error) {
      setEncodeError(error instanceof Error ? error.message : 'Could not encode the arguments.');
      return '';
    }
  };

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

  const selectInstruction = (name: string) => {
    const fn = instructions?.find((f) => f.name === name);
    if (!fn) return;
    const values = fn.parameters.map(() => '');
    setInstructionName(fn.name);
    setArgValues(values);
    setEncodeError(null);
    updateParams({
      accounts: (fn.accounts ?? []).map((a, i) => ({
        id: `${Date.now()}-${i}`,
        pubkey: a.address ?? (a.isSigner && activeAddress ? activeAddress : ''),
        isSigner: a.isSigner,
        isWritable: a.isWritable
      })),
      data: fn.parameters.length === 0 ? encodeData(fn, values) : '',
      dataEncoding: 'hex'
    });
  };

  const setArgValue = (index: number, value: string) => {
    if (!selectedInstruction) return;
    const values = [...argValues];
    values[index] = value;
    setArgValues(values);
    // With an argument the form can't encode, the data field is the user's to fill by hand.
    if (unsupportedParams.length > 0) return;
    updateParams({ data: encodeData(selectedInstruction, values), dataEncoding: 'hex' });
  };

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black/40 space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Solana instruction</div>
        <div className="flex items-center gap-3">
          {activeAddress && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-full text-[10px] font-mono text-emerald-500 dark:text-emerald-400">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              Signer: {activeAddress.slice(0, 4)}...{activeAddress.slice(-4)}
            </div>
          )}
          <button
            type="button"
            onClick={() => setManual((m) => !m)}
            disabled={isReadOnly}
            className="text-[11px] text-electric-violet hover:opacity-80 disabled:opacity-50"
          >
            {manual ? 'Use program IDL' : 'Enter manually'}
          </button>
        </div>
      </div>

      <div>
        <label className={labelClass}>Program ID</label>
        <div className="flex gap-2">
          <input
            className={fieldClass}
            value={params.programId}
            onChange={(e) => {
              setInstructionName('');
              updateParams({ programId: e.target.value });
            }}
            placeholder="Base58 program address"
            disabled={isReadOnly}
          />
          {!manual && (
            <button
              type="button"
              onClick={() => isSolanaProgramId(programId) && void loadIdl(programId)}
              disabled={isReadOnly || !isSolanaProgramId(programId) || view.status === 'loading'}
              aria-label="Reload program IDL"
              className="p-2 text-slate-500 hover:text-electric-violet transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={view.status === 'loading' ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
        {!manual && view.status === 'idle' && (
          <p className="mt-1.5 text-[11px] text-slate-500">Enter a program ID to load its instructions from the on-chain Anchor IDL.</p>
        )}
        {!manual && view.status === 'loading' && (
          <p className="mt-1.5 text-[11px] text-slate-500">Loading program IDL from {network}…</p>
        )}
        {!manual && view.status === 'error' && (
          <p role="alert" className="mt-1.5 text-[11px] text-rose-500">
            {view.message} You can still{' '}
            <button type="button" onClick={() => setManual(true)} className="underline">build the instruction manually</button>.
          </p>
        )}
      </div>

      {instructions && (
        <div>
          <label className={labelClass}>Instruction</label>
          <Select
            value={selectedInstruction?.name ?? ''}
            options={instructions.map((f) => ({ label: f.name, value: f.name }))}
            onChange={selectInstruction}
            placeholder={instructions.length ? 'Select an instruction' : 'This IDL declares no instructions'}
            fullWidth
            disabled={isReadOnly || instructions.length === 0}
          />
        </div>
      )}

      {selectedInstruction && selectedInstruction.parameters.length > 0 && (
        <div>
          <label className={labelClass}>Arguments</label>
          <div className="space-y-2">
            {selectedInstruction.parameters.map((p, idx) => (
              <div key={`${selectedInstruction.name}-${idx}`}>
                <div className="text-[10px] font-mono text-slate-500 mb-1">
                  {p.name}: {p.type}
                </div>
                <input
                  aria-label={`Argument ${idx + 1} (${p.type})`}
                  className={fieldClass}
                  value={argValues[idx] ?? ''}
                  onChange={(e) => setArgValue(idx, e.target.value)}
                  placeholder={p.type === 'pubkey' ? 'Base58 address' : p.type === 'bool' ? 'true / false' : p.type === 'bytes' ? 'hex, e.g. 0xdeadbeef' : p.type}
                  disabled={isReadOnly || p.resolution === 'unsupported'}
                />
              </div>
            ))}
          </div>
          {encodeError && <p className="mt-1.5 text-[11px] text-rose-500">{encodeError}</p>}
          {unsupportedParams.length > 0 && (
            <p className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-700 dark:text-amber-400">
              {unsupportedParams.map((p) => `${p.name} (${p.type})`).join(', ')} can&apos;t be encoded by this form yet. Enter the instruction data by hand below.
            </p>
          )}
        </div>
      )}

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
                placeholder={selectedInstruction?.accounts?.[idx]?.name ?? 'Account pubkey'}
                title={selectedInstruction?.accounts?.[idx]?.name}
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
