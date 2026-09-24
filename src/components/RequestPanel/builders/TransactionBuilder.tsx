import React, { useEffect, useState } from 'react';
import { Check, Loader2, Plus, Search, Sparkles, Trash2, Zap } from 'lucide-react';
import { Select } from '../../Select';
import { BuilderArg, MoveCallParams, MoveParamType, Network } from '../../../types';
import { MOVE_TYPES } from '@/lib/constants';
import { VariableInput } from '../ai/VariableInput';
import { discoverPackage, DiscoveryError, type DiscoveredFunction, type DiscoveredModule, type DiscoveredParameter } from '@/services/discovery';
import { resolveWalletObjectCandidates, type OwnedObjectOption } from '@/services/discovery/resolveArguments';

interface TransactionBuilderProps {
  request: any;
  activeAddress: string | null;
  envVars: any[];
  network?: Network;
  isReadOnly?: boolean;
  onChange: (updatedReq: any) => void;
}

const fieldClass =
  'w-full bg-white dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-200 focus:border-electric-violet focus:outline-none transition-colors';
const labelClass = 'block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5';

/** Move type string ("u64", "vector<u8>", "address"...) → this app's BuilderArg type enum. */
const moveParamTypeFor = (param: DiscoveredParameter): MoveParamType => {
  if (param.kind === 'address') return 'address';
  if (param.kind === 'object' || param.kind === 'coin') return 'object';
  if (param.type === 'vector<u8>') return 'vector<u8>';
  if (param.type === 'vector<address>') return 'vector<address>';
  if (['u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'bool'].includes(param.type)) return param.type as MoveParamType;
  return 'string';
};

/** A discovered parameter this UI can render a resolved/auto field for, vs. one it must fall back to raw entry for. */
const isRenderable = (param: DiscoveredParameter) => param.resolution !== 'unsupported';

export const TransactionBuilder: React.FC<TransactionBuilderProps> = ({
  request,
  activeAddress,
  envVars,
  network,
  isReadOnly,
  onChange
}) => {
  const [mode, setMode] = useState<'discover' | 'manual'>('manual');
  const [packageDraft, setPackageDraft] = useState(request.moveParams.packageId || '');
  const [discoveryState, setDiscoveryState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'loaded'; modules: DiscoveredModule[] }
  >({ status: 'idle' });
  const [selectedModuleName, setSelectedModuleName] = useState(request.moveParams.module || '');
  const [selectedFunctionName, setSelectedFunctionName] = useState(request.moveParams.function || '');
  // objectId candidates for each 'selector'/'wallet' parameter, keyed by
  // arg index — fetched from the connected wallet once a function with
  // object/coin parameters is selected.
  const [objectCandidates, setObjectCandidates] = useState<Record<number, OwnedObjectOption[] | 'loading' | 'error'>>({});

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

  const modules = discoveryState.status === 'loaded' ? discoveryState.modules : [];
  const selectedModule = modules.find((m) => m.name === selectedModuleName) ?? null;
  const selectedFunction = selectedModule?.functions.find((f) => f.name === selectedFunctionName) ?? null;

  const handleFetch = async () => {
    const packageId = packageDraft.trim();
    if (!packageId || !network) return;
    setDiscoveryState({ status: 'loading' });
    setSelectedModuleName('');
    setSelectedFunctionName('');
    try {
      const pkg = await discoverPackage('sui', packageId, network);
      if (pkg.modules.length === 0 || pkg.modules.every((m) => m.functions.length === 0)) {
        setDiscoveryState({ status: 'error', message: 'This package has no callable public/entry functions.' });
        return;
      }
      setDiscoveryState({ status: 'loaded', modules: pkg.modules });
      updateMoveParam('packageId', packageId);
    } catch (err) {
      const message = err instanceof DiscoveryError ? err.message : err instanceof Error ? err.message : 'Discovery failed.';
      setDiscoveryState({ status: 'error', message });
    }
  };

  /** Builds the request's moveParams from a discovered function's signature — the actual auto-fill step. */
  const applyDiscoveredFunction = (moduleName: string, fn: DiscoveredFunction) => {
    setSelectedModuleName(moduleName);
    setSelectedFunctionName(fn.name);
    setObjectCandidates({});

    const renderableParams = fn.parameters.filter(isRenderable);
    const newArgs: BuilderArg[] = renderableParams
      .filter((p) => p.kind !== 'transaction_context') // auto-supplied, never a field
      .map((p, i) => ({
        id: `${Date.now()}-${i}`,
        type: moveParamTypeFor(p),
        value: ''
      }));

    onChange({
      ...request,
      moveParams: {
        ...request.moveParams,
        packageId: packageDraft.trim(),
        module: moduleName,
        function: fn.name,
        typeArguments: fn.typeParameters.map(() => ''),
        arguments: newArgs
      }
    });
  };

  // Once a discovered function with object/coin params is applied, fetch
  // the connected wallet's matching objects for each selector-resolution
  // param — auto-selecting the value when exactly one candidate exists,
  // per "if only one compatible object exists, automatically select it."
  useEffect(() => {
    if (!selectedFunction || !activeAddress || !network) return;
    const renderableParams = selectedFunction.parameters.filter(isRenderable).filter((p) => p.kind !== 'transaction_context');

    renderableParams.forEach((param, argIndex) => {
      if (param.resolution !== 'selector' && param.resolution !== 'wallet') return;
      setObjectCandidates((prev) => ({ ...prev, [argIndex]: 'loading' }));
      resolveWalletObjectCandidates(network, activeAddress, param)
        .then((candidates) => {
          setObjectCandidates((prev) => ({ ...prev, [argIndex]: candidates }));
          if (candidates.length === 1) {
            updateMoveArg(argIndex, { value: candidates[0].objectId });
          }
        })
        .catch(() => setObjectCandidates((prev) => ({ ...prev, [argIndex]: 'error' })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFunction, activeAddress, network]);

  const renderableParams = selectedFunction
    ? selectedFunction.parameters.filter(isRenderable).filter((p) => p.kind !== 'transaction_context')
    : [];
  const hasTxContext = selectedFunction?.parameters.some((p) => p.kind === 'transaction_context') ?? false;
  const unsupportedParams = selectedFunction?.parameters.filter((p) => !isRenderable(p)) ?? [];

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black/40 space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Sui Move call</div>
        <div className="flex items-center gap-2">
          {activeAddress && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-full text-[10px] font-mono text-emerald-500 dark:text-emerald-400">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              Signer: {activeAddress.slice(0,6)}...{activeAddress.slice(-4)}
            </div>
          )}
          <div className="flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden text-[10px] font-bold uppercase tracking-wide">
            <button
              onClick={() => setMode('discover')}
              disabled={isReadOnly}
              className={`px-2.5 py-1 flex items-center gap-1 transition-colors ${mode === 'discover' ? 'bg-electric-violet text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
            >
              <Sparkles size={11} /> Discover
            </button>
            <button
              onClick={() => setMode('manual')}
              disabled={isReadOnly}
              className={`px-2.5 py-1 transition-colors ${mode === 'manual' ? 'bg-slate-900 dark:bg-white text-white dark:text-near-black' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
            >
              Manual
            </button>
          </div>
        </div>
      </div>

      {mode === 'discover' ? (
        <>
          <div>
            <label className={labelClass}>Package ID</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <VariableInput
                  className={fieldClass}
                  value={packageDraft}
                  onChange={setPackageDraft}
                  placeholder="0x..."
                  disabled={isReadOnly}
                  envVars={envVars}
                  network={network}
                />
              </div>
              <button
                onClick={handleFetch}
                disabled={isReadOnly || !packageDraft.trim() || discoveryState.status === 'loading'}
                className="shrink-0 px-3 py-2 bg-slate-900 dark:bg-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-near-black text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all"
              >
                {discoveryState.status === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                Fetch
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Discovers this package&apos;s modules, functions and argument types directly from the chain — no manual typing needed for what Sui already tells us.
            </p>
          </div>

          {discoveryState.status === 'error' && (
            <div className="px-3 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-600 dark:text-rose-400">
              {discoveryState.message}
            </div>
          )}

          {discoveryState.status === 'loaded' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Module</label>
                  <Select
                    value={selectedModuleName}
                    placeholder="Select a module"
                    options={modules.map((m) => ({ label: `${m.name} (${m.functions.length})`, value: m.name }))}
                    onChange={(v) => {
                      setSelectedModuleName(v);
                      setSelectedFunctionName('');
                    }}
                    fullWidth
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label className={labelClass}>Function</label>
                  <Select
                    value={selectedFunctionName}
                    placeholder={selectedModule ? 'Select a function' : 'Select a module first'}
                    options={(selectedModule?.functions ?? []).map((f) => ({
                      label: `${f.name}${f.isEntry ? '' : ' (public)'}`,
                      value: f.name
                    }))}
                    onChange={(v) => {
                      const fn = selectedModule?.functions.find((f) => f.name === v);
                      if (fn && selectedModule) applyDiscoveredFunction(selectedModule.name, fn);
                    }}
                    fullWidth
                    disabled={isReadOnly || !selectedModule}
                  />
                </div>
              </div>

              {selectedFunction && (
                <div className="text-[10px] font-mono text-slate-500 px-3 py-2 bg-white dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg break-all">
                  {request.moveParams.packageId}::{selectedFunction.module}::{selectedFunction.name}
                  {selectedFunction.typeParameters.length > 0 && `<${selectedFunction.typeParameters.map((t) => t.name).join(', ')}>`}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div>
          <label className={labelClass}>Package ID</label>
          <VariableInput
            className={fieldClass}
            value={request.moveParams.packageId}
            onChange={(v) => updateMoveParam('packageId', v)}
            placeholder="0x..."
            disabled={isReadOnly}
            envVars={envVars}
            network={network}
          />
        </div>
      )}

      {mode === 'manual' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Module</label>
            <VariableInput
              className={fieldClass}
              value={request.moveParams.module}
              onChange={(v) => updateMoveParam('module', v)}
              placeholder="module_name"
              disabled={isReadOnly}
              envVars={envVars}
              network={network}
            />
          </div>
          <div>
            <label className={labelClass}>Function</label>
            <VariableInput
              className={fieldClass}
              value={request.moveParams.function}
              onChange={(v) => updateMoveParam('function', v)}
              placeholder="function_name"
              disabled={isReadOnly}
              envVars={envVars}
              network={network}
            />
          </div>
        </div>
      )}

      {/* Type Arguments — auto-labeled with constraints when discovered, otherwise a raw comma list. */}
      {mode === 'discover' && selectedFunction && selectedFunction.typeParameters.length > 0 ? (
        <div>
          <label className={labelClass}>Type Arguments</label>
          <div className="space-y-2">
            {selectedFunction.typeParameters.map((tp, i) => (
              <div key={tp.name} className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-[10px] font-mono font-bold text-slate-500">{tp.name}</span>
                <input
                  className={fieldClass}
                  value={request.moveParams.typeArguments[i] ?? ''}
                  onChange={(e) => {
                    const next = [...request.moveParams.typeArguments];
                    next[i] = e.target.value;
                    updateMoveParam('typeArguments', next);
                  }}
                  placeholder={tp.constraints.length ? `Type with: ${tp.constraints.join(', ')}` : '0x2::sui::SUI'}
                  disabled={isReadOnly}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <label className={labelClass}>Type Arguments</label>
          <input
            className={fieldClass}
            value={request.moveParams.typeArguments.join(', ')}
            onChange={(e) => updateMoveParam('typeArguments', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
            placeholder="0x2::sui::SUI, 0x..."
            disabled={isReadOnly}
          />
        </div>
      )}

      {/* Discovered, resolved arguments — object/coin selectors instead of raw ID fields where possible. */}
      {mode === 'discover' && selectedFunction ? (
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Arguments</label>
            {hasTxContext && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check size={11} /> Transaction context supplied automatically
              </span>
            )}
          </div>
          <div className="space-y-2">
            {renderableParams.length === 0 && (
              <div className="text-center py-4 bg-white dark:bg-near-black border border-dashed border-slate-200 dark:border-white/10 rounded-lg">
                <span className="text-xs text-slate-500">This function takes no arguments.</span>
              </div>
            )}
            {renderableParams.map((param, idx) => {
              const arg = request.moveParams.arguments[idx];
              if (!arg) return null;
              const candidates = objectCandidates[idx];
              const showSelector = param.resolution === 'selector' || param.resolution === 'wallet';

              return (
                <div key={arg.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-28 shrink-0 text-[10px] font-mono text-slate-500 truncate" title={param.type}>
                      {param.name}
                      <span className="block text-slate-400 truncate">{param.type}</span>
                    </span>
                    {showSelector ? (
                      candidates === 'loading' ? (
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
                          <Loader2 size={12} className="animate-spin" /> Loading wallet {param.kind === 'coin' ? 'coins' : 'objects'}…
                        </div>
                      ) : candidates === 'error' || !candidates ? (
                        <div className="flex-1">
                          <VariableInput
                            className={fieldClass}
                            value={arg.value}
                            onChange={(v) => updateMoveArg(idx, { value: v })}
                            placeholder={activeAddress ? 'Object ID (lookup failed — enter manually)' : 'Connect a wallet, or enter Object ID'}
                            disabled={isReadOnly}
                            envVars={envVars}
                            network={network}
                          />
                        </div>
                      ) : candidates.length === 0 ? (
                        <div className="flex-1 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          No compatible {param.kind === 'coin' ? 'coins' : 'objects'} found in the connected wallet.
                        </div>
                      ) : (
                        <div className="flex-1">
                          <Select
                            value={arg.value}
                            placeholder={`Select ${param.kind === 'coin' ? 'a coin' : 'an object'}`}
                            options={candidates.map((c) => ({
                              label: `${c.objectId.slice(0, 8)}...${c.objectId.slice(-6)}`,
                              value: c.objectId
                            }))}
                            onChange={(v) => updateMoveArg(idx, { value: v })}
                            fullWidth
                            disabled={isReadOnly}
                          />
                        </div>
                      )
                    ) : (
                      <div className="flex-1">
                        <VariableInput
                          className={fieldClass}
                          value={arg.value}
                          onChange={(v) => updateMoveArg(idx, { value: v })}
                          placeholder={param.kind === 'address' ? '0x...' : 'Value'}
                          disabled={isReadOnly}
                          envVars={envVars}
                          network={network}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {unsupportedParams.length > 0 && (
            <div className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-700 dark:text-amber-400">
              {unsupportedParams.length} parameter{unsupportedParams.length > 1 ? 's' : ''} on this function ({unsupportedParams.map((p) => p.type).join(', ')}) can&apos;t be built by this form yet — try Manual mode, or a different function.
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
              Function Arguments
            </label>
            <button
              onClick={addMoveArg}
              disabled={isReadOnly}
              className="text-xs flex items-center gap-1 text-electric-violet hover:opacity-80 disabled:opacity-50"
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
                    className={fieldClass}
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
                  className="p-2 text-slate-500 hover:text-rose-500 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {request.moveParams.arguments.length === 0 && (
              <div className="text-center py-4 bg-white dark:bg-near-black border border-dashed border-slate-200 dark:border-white/10 rounded-lg">
                <span className="text-xs text-slate-500">No arguments defined.</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-1 border-t border-slate-200 dark:border-white/10">
        <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5 mt-3">
          <Zap size={12} className="text-amber-500" /> Gas Budget (MIST)
        </label>
        <input
          className={fieldClass}
          value={request.moveParams.gasBudget}
          onChange={(e) => updateMoveParam('gasBudget', e.target.value)}
          placeholder="10000000"
          disabled={isReadOnly}
        />
      </div>
    </div>
  );
};
