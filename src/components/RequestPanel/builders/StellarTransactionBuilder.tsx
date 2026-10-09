import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Select } from '../../Select';
import { Network, RequestItem, StellarArg, StellarArgType, StellarTxParams } from '../../../types';
import { DEFAULT_STELLAR_TX } from '@/services/transactionService';
import { getDiscoveryAdapter } from '@/services/discovery';
import { setCachedPackage } from '@/services/discovery/cache';
import { DiscoveryError, type DiscoveredFunction } from '@/services/discovery/types';
import { isStellarContractId, stellarArgTypeFor } from '@/services/discovery/stellarDiscovery';

interface StellarTransactionBuilderProps {
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
  | { status: 'loaded'; functions: DiscoveredFunction[] };

const ARG_TYPES: StellarArgType[] = ['address', 'i128', 'u128', 'i64', 'u64', 'i32', 'u32', 'bool', 'string', 'symbol', 'bytes'];

const PLACEHOLDERS: Partial<Record<StellarArgType, string>> = {
  address: 'G… or C… address',
  bool: 'true / false',
  bytes: 'hex, e.g. 0xdeadbeef'
};

const fieldClass =
  'w-full bg-white dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-200 focus:border-electric-violet focus:outline-none transition-colors';
const labelClass = 'block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5';

export const StellarTransactionBuilder: React.FC<StellarTransactionBuilderProps> = ({
  request,
  activeAddress,
  network,
  isReadOnly,
  onChange
}) => {
  const params = request.stellarTxParams ?? DEFAULT_STELLAR_TX;
  const [load, setLoad] = useState<LoadState>({ status: 'idle' });
  const [manual, setManual] = useState(false);
  const requestRef = useRef(0);
  const contractId = params.contractId.trim();

  const loadSpec = useCallback(
    async (id: string) => {
      const ticket = ++requestRef.current;
      setLoad({ status: 'loading' });
      try {
        // Soroban contracts can be upgraded in place, so always re-read the spec.
        const pkg = await getDiscoveryAdapter('stellar').discoverPackage(id, network);
        setCachedPackage('stellar', network, id, pkg);
        if (ticket === requestRef.current) setLoad({ status: 'loaded', functions: pkg.modules[0]?.functions ?? [] });
      } catch (error) {
        const message = error instanceof DiscoveryError || error instanceof Error ? error.message : 'Could not load the contract spec.';
        if (ticket === requestRef.current) setLoad({ status: 'error', message });
      }
    },
    [network]
  );

  // Load automatically once the contract ID is well-formed (debounced), and
  // again on network change: the same ID can hold different code per network.
  useEffect(() => {
    if (manual) return;
    if (!isStellarContractId(contractId)) {
      requestRef.current++;
      return;
    }
    const timer = setTimeout(() => void loadSpec(contractId), 400);
    return () => clearTimeout(timer);
  }, [contractId, network, manual, loadSpec]);

  const view: LoadState = isStellarContractId(contractId) ? load : { status: 'idle' };
  const functions = !manual && view.status === 'loaded' ? view.functions : null;
  const selectedFunction = functions?.find((f) => f.name === params.function) ?? null;
  const unsupportedParams = selectedFunction?.parameters.filter((p) => p.resolution === 'unsupported') ?? [];

  const selectFunction = (name: string) => {
    const fn = functions?.find((f) => f.name === name);
    if (!fn) return;
    update({
      function: fn.name,
      args: fn.parameters.map((p) => ({ id: crypto.randomUUID(), type: stellarArgTypeFor(p.type) ?? 'string', value: '' }))
    });
  };

  const update = (updates: Partial<StellarTxParams>) =>
    onChange({ ...request, stellarTxParams: { ...params, ...updates } });

  const addArg = () =>
    update({ args: [...params.args, { id: crypto.randomUUID(), type: 'address', value: '' }] });

  const updateArg = (index: number, updates: Partial<StellarArg>) => {
    const args = [...params.args];
    args[index] = { ...args[index], ...updates };
    update({ args });
  };

  const removeArg = (index: number) => update({ args: params.args.filter((_, i) => i !== index) });

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black/40 space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Soroban contract call</div>
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
            {manual ? 'Use contract spec' : 'Enter manually'}
          </button>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="stellar-contract">Contract ID</label>
        <div className="flex gap-2">
          <input
            id="stellar-contract"
            className={fieldClass}
            value={params.contractId}
            onChange={(e) => update({ contractId: e.target.value })}
            placeholder="C… contract address"
            disabled={isReadOnly}
          />
          {!manual && (
            <button
              type="button"
              onClick={() => isStellarContractId(contractId) && void loadSpec(contractId)}
              disabled={isReadOnly || !isStellarContractId(contractId) || view.status === 'loading'}
              aria-label="Reload contract spec"
              className="p-2 text-slate-500 hover:text-electric-violet transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={view.status === 'loading' ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
        {!manual && view.status === 'idle' && (
          <p className="mt-1.5 text-[11px] text-slate-500">Enter a contract address to load its functions from the contract spec.</p>
        )}
        {!manual && view.status === 'loading' && (
          <p className="mt-1.5 text-[11px] text-slate-500">Loading contract spec from {network} Soroban RPC…</p>
        )}
        {!manual && view.status === 'error' && (
          <p role="alert" className="mt-1.5 text-[11px] text-rose-500">
            {view.message} You can still{' '}
            <button type="button" onClick={() => setManual(true)} className="underline">enter the call manually</button>.
          </p>
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor="stellar-fn">Function</label>
        {functions ? (
          <Select
            value={selectedFunction?.name ?? ''}
            options={functions.map((f) => ({ label: f.name, value: f.name }))}
            onChange={selectFunction}
            placeholder={functions.length ? 'Select a function' : 'This contract exposes no functions'}
            fullWidth
            disabled={isReadOnly || functions.length === 0}
          />
        ) : (
          <input
            id="stellar-fn"
            className={fieldClass}
            value={params.function}
            onChange={(e) => update({ function: e.target.value })}
            placeholder="function_name"
            disabled={isReadOnly}
          />
        )}
      </div>

      {selectedFunction ? (
        <div>
          <label className={labelClass}>Arguments</label>
          {selectedFunction.parameters.length === 0 ? (
            <div className="text-center py-4 bg-white dark:bg-near-black border border-dashed border-slate-200 dark:border-white/10 rounded-lg">
              <span className="text-xs text-slate-500">This function takes no arguments.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedFunction.parameters.map((p, idx) => {
                const arg = params.args[idx];
                if (!arg) return null;
                return (
                  <div key={arg.id}>
                    <div className="text-[10px] font-mono text-slate-500 mb-1">
                      {p.name}: {p.type}
                    </div>
                    <input
                      aria-label={`Argument ${idx + 1} (${p.type})`}
                      className={fieldClass}
                      value={arg.value}
                      onChange={(e) => updateArg(idx, { value: e.target.value })}
                      placeholder={PLACEHOLDERS[arg.type] ?? arg.type}
                      disabled={isReadOnly || p.resolution === 'unsupported'}
                    />
                  </div>
                );
              })}
            </div>
          )}
          {unsupportedParams.length > 0 && (
            <p className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-700 dark:text-amber-400">
              {unsupportedParams.map((p) => `${p.name} (${p.type})`).join(', ')} can&apos;t be built by this form yet. Use Manual mode or pick another function.
            </p>
          )}
        </div>
      ) : (
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Arguments</label>
          <button
            onClick={addArg}
            disabled={isReadOnly}
            className="text-xs flex items-center gap-1 text-electric-violet hover:opacity-80 disabled:opacity-50"
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
                className={`flex-1 min-w-0 ${fieldClass}`}
                value={arg.value}
                onChange={(e) => updateArg(idx, { value: e.target.value })}
                placeholder={PLACEHOLDERS[arg.type] ?? 'Value'}
                disabled={isReadOnly}
              />
              <button
                onClick={() => removeArg(idx)}
                disabled={isReadOnly}
                aria-label={`Remove argument ${idx + 1}`}
                className="p-2 text-slate-500 hover:text-rose-500 transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {params.args.length === 0 && (
            <div className="text-center py-4 bg-white dark:bg-near-black border border-dashed border-slate-200 dark:border-white/10 rounded-lg">
              <span className="text-xs text-slate-500">No arguments defined.</span>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
