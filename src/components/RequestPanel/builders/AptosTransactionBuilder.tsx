import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Select } from '../../Select';
import { AptosTxParams, BuilderArg, MoveParamType, Network, RequestItem } from '../../../types';
import { DEFAULT_APTOS_TX } from '@/services/transactionService';
import { getDiscoveryAdapter } from '@/services/discovery';
import { setCachedPackage } from '@/services/discovery/cache';
import { DiscoveryError, type DiscoveredFunction, type DiscoveredPackage } from '@/services/discovery/types';
import { isAptosAddress, isSignerParam } from '@/services/discovery/aptosDiscovery';

interface AptosTransactionBuilderProps {
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
  | { status: 'loaded'; pkg: DiscoveredPackage };

const MANUAL_ARG_TYPES: MoveParamType[] = ['u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'bool', 'address', 'string', 'object', 'vector<u8>', 'vector<address>', 'json'];

const fieldClass =
  'w-full bg-white dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-200 focus:border-electric-violet focus:outline-none transition-colors';
const labelClass = 'block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5';

/** Maps an on-chain Move parameter type to the input kind the adapter can serialize. */
export const moveParamTypeForAptos = (type: string): MoveParamType => {
  const t = type.replace(/^&(mut )?/, '');
  if (['u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'bool', 'address'].includes(t)) return t as MoveParamType;
  if (t === '0x1::string::String') return 'string';
  if (t.startsWith('0x1::object::Object<')) return 'object';
  if (t === 'vector<u8>' || t === 'vector<address>') return t;
  return 'json';
};

const placeholderFor = (type: string, kind: MoveParamType): string => {
  if (kind === 'address' || kind === 'object') return '0x…';
  if (kind === 'bool') return 'true / false';
  if (kind === 'vector<u8>') return '0xdeadbeef or [1,2,3]';
  if (kind === 'json') return type.startsWith('0x1::option::Option<') ? 'JSON value (null for none)' : `JSON for ${type}`;
  return kind;
};

const describeError = (error: unknown): string => {
  if (error instanceof DiscoveryError) return error.message;
  return error instanceof Error ? error.message : 'Could not load modules.';
};

export const AptosTransactionBuilder: React.FC<AptosTransactionBuilderProps> = ({
  request,
  activeAddress,
  network,
  isReadOnly,
  onChange
}) => {
  const params = request.aptosTxParams ?? DEFAULT_APTOS_TX;
  const [load, setLoad] = useState<LoadState>({ status: 'idle' });
  const [manual, setManual] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const requestRef = useRef(0);

  const update = useCallback(
    (updates: Partial<AptosTxParams>) =>
      onChange({ ...request, aptosTxParams: { ...(request.aptosTxParams ?? DEFAULT_APTOS_TX), ...updates } }),
    [onChange, request]
  );

  const address = params.moduleAddress.trim();

  const loadModules = useCallback(
    async (addr: string) => {
      const ticket = ++requestRef.current;
      setLoad({ status: 'loading' });
      try {
        // Aptos modules can be upgraded in place, so this always asks the
        // fullnode instead of trusting the shared in-memory cache.
        const pkg = await getDiscoveryAdapter('aptos').discoverPackage(addr, network);
        setCachedPackage('aptos', network, addr, pkg);
        if (ticket === requestRef.current) setLoad({ status: 'loaded', pkg });
      } catch (error) {
        if (ticket === requestRef.current) setLoad({ status: 'error', message: describeError(error) });
      }
    },
    [network]
  );

  // Load automatically once the address is well-formed (debounced), and again
  // when the network changes: the same address holds different code per network.
  useEffect(() => {
    if (manual) return;
    if (!isAptosAddress(address)) {
      // Invalidate any request in flight; the view below shows "idle" for a malformed address.
      requestRef.current++;
      return;
    }
    const timer = setTimeout(() => void loadModules(address), 400);
    return () => clearTimeout(timer);
  }, [address, network, manual, loadModules]);

  // A malformed address always reads as idle, whatever an earlier lookup left behind.
  const view: LoadState = isAptosAddress(address) ? load : { status: 'idle' };
  const pkg = view.status === 'loaded' ? view.pkg : null;

  const entryModules = useMemo(
    () => (pkg ? pkg.modules.filter((m) => m.functions.some((f) => f.isEntry)) : []),
    [pkg]
  );
  const selectedModule = entryModules.find((m) => m.name === params.module) ?? null;
  const entryFunctions = useMemo(
    () => (selectedModule ? selectedModule.functions.filter((f) => f.isEntry) : []),
    [selectedModule]
  );
  const selectedFunction: DiscoveredFunction | null = entryFunctions.find((f) => f.name === params.function) ?? null;

  const selectModule = (name: string) => update({ module: name, function: '', typeArguments: [], arguments: [] });

  const selectFunction = (name: string) => {
    const fn = entryFunctions.find((f) => f.name === name);
    if (!fn) return;
    update({
      function: fn.name,
      typeArguments: fn.typeParameters.map(() => ''),
      arguments: fn.parameters
        .filter((p) => !isSignerParam(p.type))
        .map((p, i): BuilderArg => ({ id: `${Date.now()}-${i}`, type: moveParamTypeForAptos(p.type), value: '' }))
    });
  };

  const setArgValue = (index: number, value: string) => {
    const args = [...params.arguments];
    args[index] = { ...args[index], value };
    update({ arguments: args });
  };

  const setTypeArg = (index: number, value: string) => {
    const typeArguments = [...params.typeArguments];
    typeArguments[index] = value;
    update({ typeArguments });
  };

  const userParams = selectedFunction ? selectedFunction.parameters.filter((p) => !isSignerParam(p.type)) : [];

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black/40 space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Aptos entry function call</div>
        <div className="flex items-center gap-3">
          {activeAddress && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-full text-[10px] font-mono text-emerald-500 dark:text-emerald-400">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              Signer: {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
            </div>
          )}
          <button
            type="button"
            onClick={() => setManual((m) => !m)}
            disabled={isReadOnly}
            className="text-[11px] text-electric-violet hover:opacity-80 disabled:opacity-50"
          >
            {manual ? 'Use on-chain ABI' : 'Enter manually'}
          </button>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="aptos-address">Module address</label>
        <div className="flex gap-2">
          <input
            id="aptos-address"
            className={fieldClass}
            value={params.moduleAddress}
            onChange={(e) => update({ moduleAddress: e.target.value, module: '', function: '', typeArguments: [], arguments: [] })}
            placeholder="0x1"
            disabled={isReadOnly}
          />
          {!manual && (
            <button
              type="button"
              onClick={() => isAptosAddress(address) && void loadModules(address)}
              disabled={isReadOnly || !isAptosAddress(address) || view.status === 'loading'}
              aria-label="Reload modules"
              className="p-2 text-slate-500 hover:text-electric-violet transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={view.status === 'loading' ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
        {!manual && view.status === 'idle' && (
          <p className="mt-1.5 text-[11px] text-slate-500">Enter a module address to load its entry functions.</p>
        )}
        {!manual && view.status === 'loading' && (
          <p className="mt-1.5 text-[11px] text-slate-500">Loading modules from the {network} fullnode…</p>
        )}
        {!manual && view.status === 'error' && (
          <p role="alert" className="mt-1.5 text-[11px] text-rose-500">
            {view.message} You can still{' '}
            <button type="button" onClick={() => setManual(true)} className="underline">enter the call manually</button>.
          </p>
        )}
        {!manual && pkg && entryModules.length === 0 && (
          <p className="mt-1.5 text-[11px] text-slate-500">This account has modules but none expose an entry function.</p>
        )}
      </div>

      {manual ? (
        <ManualFields params={params} update={update} isReadOnly={isReadOnly} />
      ) : (
        pkg &&
        entryModules.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Module</label>
                <Select
                  value={selectedModule?.name ?? ''}
                  options={entryModules.map((m) => ({ label: m.name, value: m.name }))}
                  onChange={selectModule}
                  placeholder="Select a module"
                  fullWidth
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className={labelClass}>Entry function</label>
                <Select
                  value={selectedFunction?.name ?? ''}
                  options={entryFunctions.map((f) => ({ label: f.name, value: f.name }))}
                  onChange={selectFunction}
                  placeholder={selectedModule ? 'Select a function' : 'Select a module first'}
                  fullWidth
                  disabled={isReadOnly || !selectedModule}
                />
              </div>
            </div>

            {selectedFunction && selectedFunction.typeParameters.length > 0 && (
              <div>
                <label className={labelClass}>Type arguments</label>
                <div className="space-y-2">
                  {selectedFunction.typeParameters.map((tp, i) => (
                    <input
                      key={tp.name}
                      aria-label={`Type argument ${tp.name}`}
                      className={fieldClass}
                      value={params.typeArguments[i] ?? ''}
                      onChange={(e) => setTypeArg(i, e.target.value)}
                      placeholder={`${tp.name}${tp.constraints.length ? ` (${tp.constraints.join(', ')})` : ''}, e.g. 0x1::aptos_coin::AptosCoin`}
                      disabled={isReadOnly}
                    />
                  ))}
                </div>
              </div>
            )}

            {selectedFunction && (
              <div>
                <label className={labelClass}>Arguments</label>
                {userParams.length === 0 ? (
                  <div className="text-center py-4 bg-white dark:bg-near-black border border-dashed border-slate-200 dark:border-white/10 rounded-lg">
                    <span className="text-xs text-slate-500">This function takes no arguments besides the signer.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userParams.map((p, i) => (
                      <div key={`${selectedFunction.name}-${i}`}>
                        <div className="text-[10px] font-mono text-slate-500 mb-1">
                          {p.name}: {p.type}
                        </div>
                        <input
                          aria-label={`Argument ${i + 1} (${p.type})`}
                          className={fieldClass}
                          value={params.arguments[i]?.value ?? ''}
                          onChange={(e) => setArgValue(i, e.target.value)}
                          placeholder={placeholderFor(p.type, params.arguments[i]?.type ?? moveParamTypeForAptos(p.type))}
                          disabled={isReadOnly}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[11px] text-slate-500">The signer argument is supplied by your connected Aptos wallet.</p>
              </div>
            )}
          </>
        )
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          {showAdvanced ? 'Hide' : 'Show'} gas options
        </button>
        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className={labelClass} htmlFor="aptos-max-gas">Max gas amount</label>
              <input
                id="aptos-max-gas"
                className={fieldClass}
                value={params.maxGasAmount ?? ''}
                onChange={(e) => update({ maxGasAmount: e.target.value || undefined })}
                placeholder="Auto"
                inputMode="numeric"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="aptos-gas-price">Gas unit price (octas)</label>
              <input
                id="aptos-gas-price"
                className={fieldClass}
                value={params.gasUnitPrice ?? ''}
                onChange={(e) => update({ gasUnitPrice: e.target.value || undefined })}
                placeholder="Auto"
                inputMode="numeric"
                disabled={isReadOnly}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/** Raw entry-function fields: the fallback when the ABI cannot be loaded, and the pre-existing behaviour. */
const ManualFields: React.FC<{
  params: AptosTxParams;
  update: (updates: Partial<AptosTxParams>) => void;
  isReadOnly?: boolean;
}> = ({ params, update, isReadOnly }) => {
  const updateArg = (index: number, updates: Partial<BuilderArg>) => {
    const args = [...params.arguments];
    args[index] = { ...args[index], ...updates };
    update({ arguments: args });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="aptos-module">Module</label>
          <input
            id="aptos-module"
            className={fieldClass}
            value={params.module}
            onChange={(e) => update({ module: e.target.value })}
            placeholder="coin"
            disabled={isReadOnly}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="aptos-function">Function</label>
          <input
            id="aptos-function"
            className={fieldClass}
            value={params.function}
            onChange={(e) => update({ function: e.target.value })}
            placeholder="transfer"
            disabled={isReadOnly}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="aptos-type-args">Type arguments (comma separated)</label>
        <input
          id="aptos-type-args"
          className={fieldClass}
          value={params.typeArguments.join(', ')}
          onChange={(e) =>
            update({
              typeArguments: e.target.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            })
          }
          placeholder="0x1::aptos_coin::AptosCoin"
          disabled={isReadOnly}
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Arguments</label>
          <button
            type="button"
            onClick={() => update({ arguments: [...params.arguments, { id: Date.now().toString(), type: 'address', value: '' }] })}
            disabled={isReadOnly}
            className="text-xs flex items-center gap-1 text-electric-violet hover:opacity-80 disabled:opacity-50"
          >
            <Plus size={12} /> Add Argument
          </button>
        </div>
        <div className="space-y-2">
          {params.arguments.map((arg, idx) => (
            <div key={arg.id} className="flex gap-2">
              <div className="w-32 shrink-0">
                <Select
                  value={arg.type}
                  options={MANUAL_ARG_TYPES.map((t) => ({ label: t, value: t }))}
                  onChange={(v) => updateArg(idx, { type: v as MoveParamType })}
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
                placeholder={placeholderFor(arg.type, arg.type)}
                disabled={isReadOnly}
              />
              <button
                type="button"
                onClick={() => update({ arguments: params.arguments.filter((_, i) => i !== idx) })}
                disabled={isReadOnly}
                aria-label={`Remove argument ${idx + 1}`}
                className="p-2 text-slate-500 hover:text-rose-500 transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {params.arguments.length === 0 && (
            <div className="text-center py-4 bg-white dark:bg-near-black border border-dashed border-slate-200 dark:border-white/10 rounded-lg">
              <span className="text-xs text-slate-500">No arguments defined.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
