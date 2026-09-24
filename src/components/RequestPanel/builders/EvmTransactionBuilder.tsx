import React, { useEffect, useMemo, useRef, useState } from 'react';
import { isAddress, parseAbiItem, type Abi, type AbiFunction } from 'viem';
import { BookOpen, Download, Eye, FileUp, Loader2, PenLine, Save } from 'lucide-react';
import { Select } from '../../Select';
import { EvmTxParams, RequestItem } from '../../../types';
import { wagmiConfig } from '@/wallet/config';
import { appStore } from '@/lib/store';
import {
  DEFAULT_EVM_TX,
  checkEvmArg,
  coerceEvmArgs,
  getEvmTxChain
} from '@/services/transactionService';
import {
  abiFunctions,
  fetchVerifiedAbi,
  formatReadResult,
  functionKey,
  functionSignature,
  isReadFunction,
  loadTokenMeta,
  parseAbiJson,
  readContract,
  readSavedContracts,
  saveContract,
  type SavedContract
} from '@/services/evmContract';

interface EvmTransactionBuilderProps {
  request: RequestItem;
  activeAddress: string | null;
  isReadOnly?: boolean;
  onChange: (updatedReq: RequestItem) => void;
}

const inputClass =
  'w-full bg-white dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-200 focus:border-electric-violet focus:outline-none transition-colors';
const labelClass = 'block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5';
const smallBtn =
  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed';

const parseSignature = (signature: string): { fn: AbiFunction | null; error: string | null } => {
  const sig = signature.trim().replace(/^function\s+/, '');
  if (!sig) return { fn: null, error: null };
  try {
    const item = parseAbiItem(`function ${sig}`);
    return item.type === 'function' ? { fn: item as AbiFunction, error: null } : { fn: null, error: 'Not a function signature.' };
  } catch {
    return { fn: null, error: 'Couldn’t parse — use e.g. transfer(address to, uint256 amount).' };
  }
};

const safeAbi = (json?: string): Abi | null => {
  if (!json) return null;
  try {
    return parseAbiJson(json);
  } catch {
    return null;
  }
};

const isUint = (type: string) => /^u?int\d*$/.test(type);

type TokenMeta = { decimals: number; symbol: string } | null;

/**
 * EVM contract call: pick chain + contract, load its ABI (Sourcify or
 * pasted), choose a read or write function, fill a form generated from the
 * ABI. Read functions run instantly for free; write functions go through
 * Simulate → Sign & Execute in the header.
 */
export const EvmTransactionBuilder: React.FC<EvmTransactionBuilderProps> = ({
  request,
  activeAddress,
  isReadOnly,
  onChange
}) => {
  const params = request.evmTxParams ?? DEFAULT_EVM_TX;
  const chain = getEvmTxChain(params.chainId);
  const abi = useMemo(() => safeAbi(params.abi), [params.abi]);
  const groups = useMemo(() => (abi ? abiFunctions(abi) : null), [abi]);
  const { fn, error: sigError } = useMemo(() => parseSignature(params.functionSignature), [params.functionSignature]);
  const selectedAbiFn = useMemo(
    () => (fn && abi ? (abi.find((i) => i.type === 'function' && functionKey(i as AbiFunction) === functionKey(fn)) as AbiFunction | undefined) : undefined),
    [abi, fn]
  );
  const activeFn = selectedAbiFn ?? fn;
  const isRead = activeFn ? isReadFunction(activeFn) : false;
  const isPayable = activeFn ? activeFn.stateMutability === 'payable' : true;

  const [abiMode, setAbiMode] = useState<'none' | 'paste'>('none');
  const [abiText, setAbiText] = useState('');
  const [abiStatus, setAbiStatus] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const [tab, setTab] = useState<'read' | 'write'>('write');
  const [saved, setSaved] = useState<SavedContract[]>(() => readSavedContracts());
  const [token, setToken] = useState<TokenMeta>(null);
  const [readState, setReadState] = useState<{ loading: boolean; result: string | null; error: string | null }>({
    loading: false,
    result: null,
    error: null
  });
  const fileRef = useRef<HTMLInputElement>(null);

  // ERC-20 metadata lets reads show "4,210.55 USDC" and offers the token's
  // unit for amounts. Reload whenever the contract or its ABI changes.
  useEffect(() => {
    let cancelled = false;
    const address = params.to.trim();
    const pending = abi && isAddress(address) ? loadTokenMeta(params.chainId, address, abi) : Promise.resolve(null);
    pending.then((meta) => {
      if (!cancelled) setToken(meta);
    });
    return () => {
      cancelled = true;
    };
  }, [abi, params.to, params.chainId]);

  const update = (updates: Partial<EvmTxParams>) => onChange({ ...request, evmTxParams: { ...params, ...updates } });

  const applyAbi = (next: Abi) => {
    update({ abi: JSON.stringify(next) });
    setAbiMode('none');
    setAbiStatus({ loading: false, error: null });
    const { read, write } = abiFunctions(next);
    setTab(write.length ? 'write' : 'read');
    if (!read.length && !write.length) setAbiStatus({ loading: false, error: 'This ABI has no functions.' });
  };

  const loadFromSourcify = async () => {
    if (!isAddress(params.to.trim())) {
      setAbiStatus({ loading: false, error: 'Enter a valid contract address first.' });
      return;
    }
    setAbiStatus({ loading: true, error: null });
    try {
      applyAbi(await fetchVerifiedAbi(params.chainId, params.to));
    } catch (err) {
      setAbiStatus({ loading: false, error: err instanceof Error ? err.message : 'Couldn’t load the ABI.' });
      setAbiMode('paste');
    }
  };

  const applyPasted = (text: string) => {
    try {
      applyAbi(parseAbiJson(text));
    } catch (err) {
      setAbiStatus({ loading: false, error: err instanceof Error ? err.message : 'Invalid ABI.' });
    }
  };

  const pickFunction = (key: string) => {
    const next = groups && [...groups.read, ...groups.write].find((f) => functionKey(f) === key);
    if (!next) return;
    setReadState({ loading: false, result: null, error: null });
    update({
      functionSignature: functionSignature(next),
      args: next.inputs.map(() => ''),
      argDecimals: next.inputs.map(() => null),
      value: next.stateMutability === 'payable' ? params.value : '0',
      data: ''
    });
  };

  const setSignature = (functionSignature: string) => {
    const parsed = parseSignature(functionSignature).fn;
    const args = parsed ? parsed.inputs.map((_, i) => params.args[i] ?? '') : params.args;
    update({ functionSignature, args });
  };

  const setArg = (index: number, value: string) => {
    const args = [...params.args];
    args[index] = value;
    update({ args });
  };

  const setDecimals = (index: number, decimals: number | null) => {
    const argDecimals = [...(params.argDecimals ?? [])];
    argDecimals[index] = decimals;
    update({ argDecimals });
  };

  const runRead = async () => {
    if (!activeFn || !abi) return;
    setReadState({ loading: true, result: null, error: null });
    const start = performance.now();
    try {
      const [value, tokenMeta] = await Promise.all([
        readContract({
          chainId: params.chainId,
          address: params.to,
          abi,
          fn: activeFn,
          args: coerceEvmArgs(activeFn, params.args, params.argDecimals),
          from: activeAddress
        }),
        // Read fresh rather than trusting the `token` state, which can
        // still be loading (or stale for a just-changed contract).
        loadTokenMeta(params.chainId, params.to, abi)
      ]);
      const single = activeFn.outputs.length === 1 && isUint(activeFn.outputs[0].type);
      const formatted = formatReadResult(value, single ? tokenMeta : null);
      setReadState({ loading: false, result: formatted, error: null });
      // `decoded` matches the field name TxTracker/simulateEvm already use
      // for a read return value, so this reads the same way whether it's
      // shown live or reopened later from History.
      const historyWallet = activeAddress ? { family: 'evm', address: activeAddress } : null;
      appStore.addToHistory(request, 200, Math.round(performance.now() - start), { decoded: formatted }, historyWallet);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Read failed.';
      setReadState({ loading: false, result: null, error: message });
      const historyWallet = activeAddress ? { family: 'evm', address: activeAddress } : null;
      appStore.addToHistory(request, 500, Math.round(performance.now() - start), { error: message }, historyWallet);
    }
  };

  const saveCurrent = () => {
    if (!abi || !isAddress(params.to.trim())) return;
    const name = window.prompt('Name this contract:', token?.symbol ?? 'My contract');
    if (!name?.trim()) return;
    setSaved(saveContract({ chainId: params.chainId, address: params.to.trim(), name: name.trim(), abi: params.abi! }));
    appStore.showToast(`Saved ${name.trim()}`, 'success');
  };

  const openSaved = (key: string) => {
    const c = saved.find((s) => `${s.chainId}:${s.address}` === key);
    if (!c) return;
    onChange({
      ...request,
      evmTxParams: { ...DEFAULT_EVM_TX, chainId: c.chainId, to: c.address, abi: c.abi }
    });
    setReadState({ loading: false, result: null, error: null });
  };

  const toInvalid = params.to.trim() !== '' && !isAddress(params.to.trim());
  const listed = groups ? (tab === 'read' ? groups.read : groups.write) : [];

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black/40 space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">EVM contract call</div>
        {activeAddress && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-full text-[10px] font-mono text-emerald-500 dark:text-emerald-400">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            Signer: {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
          </div>
        )}
      </div>

        {/* 1. Chain + contract */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelClass}>Network</label>
            <Select
              value={String(params.chainId)}
              options={wagmiConfig.chains.map((c) => ({ label: c.testnet ? `${c.name} (testnet)` : c.name, value: String(c.id) }))}
              onChange={(v) => update({ chainId: Number(v) })}
              fullWidth
              disabled={isReadOnly}
            />
          </div>
          {saved.length > 0 && (
            <div className="space-y-2">
              <label className={labelClass}>Saved contracts</label>
              <Select
                value=""
                placeholder="Open a saved contract…"
                options={saved.map((c) => ({
                  label: `${c.name} · ${getEvmTxChain(c.chainId)?.name ?? c.chainId}`,
                  value: `${c.chainId}:${c.address}`
                }))}
                onChange={openSaved}
                fullWidth
                disabled={isReadOnly}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className={labelClass} htmlFor="evm-to">Contract address</label>
          <input
            id="evm-to"
            className={`${inputClass} ${toInvalid ? '!border-rose-500/60' : ''}`}
            value={params.to}
            onChange={(e) => update({ to: e.target.value })}
            placeholder="0x… contract (or recipient, for a plain transfer)"
            disabled={isReadOnly}
            aria-invalid={toInvalid}
          />
          {toInvalid && <p className="text-[11px] text-rose-500">Not a valid address.</p>}
        </div>

        {/* 2. ABI */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={labelClass}>Interface</span>
            <button className={smallBtn} onClick={loadFromSourcify} disabled={isReadOnly || abiStatus.loading}>
              {abiStatus.loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Load verified ABI
            </button>
            <button className={smallBtn} onClick={() => setAbiMode(abiMode === 'paste' ? 'none' : 'paste')} disabled={isReadOnly}>
              <BookOpen size={12} /> Paste ABI
            </button>
            <button className={smallBtn} onClick={() => fileRef.current?.click()} disabled={isReadOnly}>
              <FileUp size={12} /> Upload
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) applyPasted(await file.text());
              }}
            />
            {abi && (
              <button className={smallBtn} onClick={saveCurrent} disabled={isReadOnly || toInvalid || !params.to.trim()}>
                <Save size={12} /> Save contract
              </button>
            )}
          </div>
          {groups && (
            <p className="text-[11px] text-slate-500">
              ABI loaded · {groups.read.length} read · {groups.write.length} write
              {token && ` · ${token.symbol} token`}
            </p>
          )}
          {abiStatus.error && <p className="text-[11px] text-rose-500">{abiStatus.error}</p>}
          {abiMode === 'paste' && (
            <div className="space-y-2">
              <textarea
                aria-label="ABI JSON"
                className={`${inputClass} h-28 resize-y`}
                value={abiText}
                onChange={(e) => setAbiText(e.target.value)}
                placeholder='[{"type":"function","name":"balanceOf", ...}] or a compiler artifact'
              />
              <button className={smallBtn} onClick={() => applyPasted(abiText)} disabled={!abiText.trim()}>
                Use this ABI
              </button>
            </div>
          )}
        </div>

        {/* Function picker (ABI) or manual signature */}
        {groups ? (
          <div className="space-y-2">
            <div className="flex bg-white dark:bg-near-black p-1 rounded-lg border border-slate-200 dark:border-white/5 w-fit" role="tablist">
              {(['read', 'write'] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-md ${
                    tab === t ? 'bg-electric-violet/10 text-electric-violet' : 'text-slate-500'
                  }`}
                >
                  {t === 'read' ? <Eye size={12} /> : <PenLine size={12} />}
                  {t === 'read' ? `Read (${groups.read.length})` : `Write (${groups.write.length})`}
                </button>
              ))}
            </div>
            <Select
              value={activeFn && listed.some((f) => functionKey(f) === functionKey(activeFn)) ? functionKey(activeFn) : ''}
              placeholder={tab === 'read' ? 'Choose a read function (free, no signature)' : 'Choose a write function (needs a transaction)'}
              options={listed.map((f) => ({ label: functionSignature(f), value: functionKey(f) }))}
              onChange={pickFunction}
              fullWidth
              disabled={isReadOnly || listed.length === 0}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={labelClass}>Function</span>
              {!params.functionSignature.trim() && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                  Raw Calldata mode
                </span>
              )}
            </div>
            <input
              id="evm-fn"
              className={inputClass}
              value={params.functionSignature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="transfer(address to, uint256 amount) — or load the ABI above; leave empty for raw calldata"
              disabled={isReadOnly}
            />
            {sigError && <p className="text-[11px] text-rose-500">{sigError}</p>}
            {!params.functionSignature.trim() && (
              <p className="text-[11px] text-slate-500">
                No function signature — this call sends the raw calldata below directly, unencoded.
              </p>
            )}
          </div>
        )}

        {/* 3. Arguments form */}
        {activeFn && activeFn.inputs.length > 0 && (
          <div className="space-y-3">
            <label className={labelClass}>Arguments</label>
            {activeFn.inputs.map((input, i) => {
              const value = params.args[i] ?? '';
              const decimals = params.argDecimals?.[i] ?? null;
              const problem = value ? checkEvmArg(input.type, value, decimals) : null;
              const name = input.name || `arg${i}`;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex gap-2 items-center">
                    <span className="w-36 shrink-0 text-[11px] font-mono text-slate-500 truncate" title={`${input.type} ${name}`}>
                      {name} <span className="opacity-60">{input.type}</span>
                    </span>
                    {input.type === 'bool' ? (
                      <button
                        role="switch"
                        aria-checked={value === 'true'}
                        aria-label={`Argument ${name}`}
                        onClick={() => setArg(i, value === 'true' ? 'false' : 'true')}
                        disabled={isReadOnly}
                        className={`h-5 w-9 rounded-full transition-colors relative ${value === 'true' ? 'bg-electric-violet' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value === 'true' ? 'left-4' : 'left-0.5'}`} />
                      </button>
                    ) : (
                      <input
                        aria-label={`Argument ${name}`}
                        aria-invalid={Boolean(problem)}
                        className={`flex-1 min-w-0 bg-slate-50 dark:bg-near-black border rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white outline-none ${
                          problem ? 'border-rose-500/60' : 'border-slate-200 dark:border-white/10 focus:border-electric-violet'
                        }`}
                        value={value}
                        onChange={(e) => setArg(i, e.target.value)}
                        placeholder={input.type.includes('[') || input.type.startsWith('tuple') ? 'JSON value' : input.type === 'address' ? '0x…' : input.type}
                        disabled={isReadOnly}
                      />
                    )}
                    {isUint(input.type) && (
                      <div className="w-28 shrink-0">
                        <Select
                          value={String(decimals ?? 0)}
                          options={[
                            { label: 'base units', value: '0' },
                            { label: 'gwei (1e9)', value: '9' },
                            { label: 'ether (1e18)', value: '18' },
                            ...(token && token.decimals !== 18 && token.decimals !== 9 && token.decimals !== 0
                              ? [{ label: `${token.symbol} (1e${token.decimals})`, value: String(token.decimals) }]
                              : [])
                          ]}
                          onChange={(v) => setDecimals(i, Number(v) || null)}
                          size="xs"
                          fullWidth
                          disabled={isReadOnly}
                        />
                      </div>
                    )}
                  </div>
                  {problem && <p className="pl-[9.5rem] text-[11px] text-rose-500">{problem}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* Payable value */}
        {!isRead && isPayable && (
          <div className="space-y-2">
            <label className={labelClass} htmlFor="evm-value">
              Value sent ({chain?.nativeCurrency.symbol ?? 'native'})
            </label>
            <input
              id="evm-value"
              className={inputClass}
              value={params.value}
              onChange={(e) => update({ value: e.target.value })}
              placeholder="0"
              inputMode="decimal"
              disabled={isReadOnly}
            />
          </div>
        )}

        {!activeFn && !groups && (
          <div className="space-y-2">
            <label className={labelClass} htmlFor="evm-data">Raw Calldata (optional)</label>
            <input
              id="evm-data"
              className={inputClass}
              value={params.data}
              onChange={(e) => update({ data: e.target.value })}
              placeholder="0x — raw hex calldata, sent as-is"
              disabled={isReadOnly}
            />
          </div>
        )}

        {/* Read call: instant, free */}
        {isRead && abi && (
          <div className="space-y-2">
            <button
              onClick={runRead}
              disabled={readState.loading || toInvalid || !params.to.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-electric-violet hover:opacity-90 text-white text-xs font-bold disabled:opacity-40"
            >
              {readState.loading ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />} Read
            </button>
            {readState.result !== null && activeFn && (
              <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-mono text-emerald-700 dark:text-emerald-300 break-all" role="status">
                {activeFn.name} → {readState.result}
              </div>
            )}
            {readState.error && <p className="text-xs text-rose-500 break-words">{readState.error}</p>}
          </div>
        )}
    </div>
  );
};
