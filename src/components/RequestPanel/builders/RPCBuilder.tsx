import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Search, Loader2, Check, ArrowRight, FileCode, Terminal as TerminalIcon, Zap } from 'lucide-react';
import {
  ADDRESS_FIRST_PARAM_METHODS,
  COMMON_RPC_METHODS,
  DEFAULT_EVM_CHAIN_ID,
  DEFAULT_RPC_CHAIN,
  EVM_CHAINS,
  RPC_CHAINS,
  RPC_METHOD_TEMPLATES,
} from '@/lib/constants';
import { useAppStore } from '@/lib/store';
import { useWallet } from '@/wallet';
import { executeChainRpc, looksLikeSuiNs, resolveSuiAddress, SuiRpcError } from '@/services/suiService';
import { ChainId } from '@/types';
import { JsonEditor } from '../../ui/JsonEditor';
import { Select } from '../../Select';
import { SolanaTransactionBuilder } from './SolanaTransactionBuilder';

interface RPCBuilderProps {
  request: any;
  onChange: (updatedReq: any) => void;
}

interface NsResolutionState {
  status: 'idle' | 'resolving' | 'resolved' | 'error';
  name: string;
  address?: string;
  error?: string;
}

const RESOLVE_DEBOUNCE_MS = 350;

export const RPCBuilder: React.FC<RPCBuilderProps> = ({ request, onChange }) => {
  const { network } = useAppStore();
  const { currentWallet } = useWallet();
  const solanaAddress = currentWallet?.family === 'solana' ? currentWallet.address : null;
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [resolutionResult, setResolutionResult] = useState<NsResolutionState>({ status: 'idle', name: '' });
  const [isMethodMenuOpen, setIsMethodMenuOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const methodFieldRef = useRef<HTMLDivElement>(null);
  const methodMenuRef = useRef<HTMLDivElement>(null);

  const updateMenuRect = useCallback(() => {
    const el = methodFieldRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuRect({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!isMethodMenuOpen) return;
    updateMenuRect();
    window.addEventListener('scroll', updateMenuRect, true);
    window.addEventListener('resize', updateMenuRect);
    return () => {
      window.removeEventListener('scroll', updateMenuRect, true);
      window.removeEventListener('resize', updateMenuRect);
    };
  }, [isMethodMenuOpen, updateMenuRect]);

  const chain: ChainId = request.rpcParams.chain ?? DEFAULT_RPC_CHAIN;
  // Some chains (Aptos today) have no known-method catalog yet — fall back
  // to empty rather than crashing on the missing lookup entry. Memoized so
  // the fallback literal is referentially stable across renders (otherwise
  // every hook depending on these would re-run every render).
  const methodsForChain = useMemo(() => COMMON_RPC_METHODS[chain] ?? [], [chain]);
  const templatesForChain = useMemo(() => RPC_METHOD_TEMPLATES[chain] ?? {}, [chain]);

  // Only Solana has a real transaction-signing path today (see
  // sendSolanaTransaction in wallet/solana.ts) — the mode toggle only makes
  // sense there. Presence of solanaTxParams on the request is what actually
  // decides which execution path RPCBuilder.tsx (the feature-level one)
  // takes; this is just the derived UI state for the toggle itself.
  const isSolanaTxMode = chain === 'solana' && Boolean(request.solanaTxParams);

  const setSolanaTxMode = (enabled: boolean) => {
    if (enabled) {
      onChange({
        ...request,
        solanaTxParams: request.solanaTxParams ?? {
          programId: '',
          accounts: [],
          data: '',
          dataEncoding: 'hex'
        }
      });
    } else {
      const { solanaTxParams: _drop, ...rest } = request;
      onChange(rest);
    }
  };

  const methodQuery = request.rpcParams.method.trim().toLowerCase();
  const filteredMethods = useMemo(
    () =>
      methodQuery
        ? methodsForChain.filter((m) => m.toLowerCase().includes(methodQuery))
        : methodsForChain,
    [methodsForChain, methodQuery]
  );
  const clampedHighlightedIndex = Math.min(highlightedIndex, Math.max(0, filteredMethods.length - 1));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideField = methodFieldRef.current?.contains(target);
      const insideMenu = methodMenuRef.current?.contains(target);
      if (!insideField && !insideMenu) {
        setIsMethodMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tracks the method most recently auto- or explicitly-filled with its
  // template, so the auto-fill effect below doesn't fight manual edits.
  const lastAutofilledMethod = useRef<string | null>(null);

  // Always-current request/rawJson for the async resolver below — onChange
  // takes a plain object, not a functional updater, so the resolver needs a
  // live read of state at the time getLatestLedger resolves rather than
  // whatever was captured in its closure when it was kicked off.
  const requestRef = useRef(request);
  requestRef.current = request;
  const rawJsonRef = useRef(rawJson);
  rawJsonRef.current = rawJson;

  // getTransactions/getEvents templates ship a placeholder startLedger
  // (Soroban nodes only retain a rolling ledger window, so no static number
  // stays valid) — resolve the real latest ledger right after inserting the
  // template and patch it in, rather than leaving a value guaranteed to be
  // rejected by the RPC.
  const resolveStellarStartLedger = useCallback(
    (method: string, insertedParams: unknown[]) => {
      if (chain !== 'stellar' || (method !== 'getTransactions' && method !== 'getEvents')) return;
      const placeholder = (insertedParams[0] as Record<string, unknown> | undefined)?.startLedger;

      executeChainRpc('stellar', network, 'getLatestLedger', [{}])
        .then(({ result }) => {
          const latest = result?.sequence;
          if (typeof latest !== 'number') return;

          let currentParams: unknown;
          try {
            currentParams = rawJsonRef.current !== null ? JSON.parse(rawJsonRef.current) : insertedParams;
          } catch {
            return;
          }
          // Only patch if the placeholder is still there — don't clobber a
          // value the user already edited in the meantime.
          if (
            !Array.isArray(currentParams) ||
            typeof currentParams[0] !== 'object' ||
            currentParams[0] === null ||
            (currentParams[0] as Record<string, unknown>).startLedger !== placeholder
          ) {
            return;
          }

          const patched = [{ ...(currentParams[0] as Record<string, unknown>), startLedger: latest }, ...currentParams.slice(1)];
          setRawJson(JSON.stringify(patched, null, 2));
          onChange({
            ...requestRef.current,
            rpcParams: { ...requestRef.current.rpcParams, params: patched }
          });
        })
        .catch(() => {
          // Leave the placeholder in place — the user can still see it's
          // unresolved and fill in a ledger number manually.
        });
    },
    [chain, network, onChange]
  );

  const selectMethod = useCallback(
    (method: string) => {
      const template = templatesForChain[method];
      const nextParams = template
        ? template.map((v) => (v && typeof v === 'object' ? structuredClone(v) : v))
        : [];

      onChange({
        ...request,
        rpcParams: { ...request.rpcParams, method, params: nextParams },
        name: method || 'New Request'
      });
      lastAutofilledMethod.current = method;
      setRawJson(JSON.stringify(nextParams, null, 2));
      setJsonError(null);
      setIsMethodMenuOpen(false);
      resolveStellarStartLedger(method, nextParams);
    },
    [onChange, request, templatesForChain, resolveStellarStartLedger]
  );

  const setChain = useCallback(
    (nextChain: ChainId) => {
      onChange({
        ...request,
        rpcParams: { ...request.rpcParams, chain: nextChain, method: '', params: [] },
      });
      setRawJson(null);
      setJsonError(null);
    },
    [onChange, request],
  );

  const displayJson =
    rawJson !== null
      ? rawJson
      : JSON.stringify(request.rpcParams.params, null, 2);

  const updateRpcParams = useCallback(
    (value: string) => {
      setRawJson(value);
      try {
        const parsed = JSON.parse(value);
        setJsonError(null);
        onChange({
          ...request,
          rpcParams: { ...request.rpcParams, params: parsed }
        });
      } catch {
        setJsonError('Invalid JSON — fix before sending.');
      }
    },
    [onChange, request]
  );

  const applyParamsTemplate = useCallback(
    (method: string) => {
      const template = templatesForChain[method];
      if (!template) return;
      const nextParams = template.map((v) =>
        v && typeof v === 'object' ? structuredClone(v) : v,
      );
      setJsonError(null);
      setRawJson(JSON.stringify(nextParams, null, 2));
      onChange({
        ...request,
        rpcParams: { ...request.rpcParams, params: nextParams },
      });
      resolveStellarStartLedger(method, nextParams);
    },
    [onChange, request, templatesForChain, resolveStellarStartLedger],
  );

  const methodHasTemplate = useMemo(
    () => Boolean(request.rpcParams.method) && request.rpcParams.method in templatesForChain,
    [request.rpcParams.method, templatesForChain],
  );

  // Auto-fill template when method changes and params are empty.
  useEffect(() => {
    const method = request.rpcParams.method;
    if (!method || !(method in templatesForChain)) return;
    if (lastAutofilledMethod.current === method) return;

    const current = request.rpcParams.params;
    const isEmpty = !Array.isArray(current) || current.length === 0;
    if (!isEmpty) {
      // Track so we don't loop, but don't overwrite user content.
      lastAutofilledMethod.current = method;
      return;
    }

    lastAutofilledMethod.current = method;
    queueMicrotask(() => applyParamsTemplate(method));
  }, [request.rpcParams.method, request.rpcParams.params, applyParamsTemplate, templatesForChain]);

  // First-param name detection: only when method is in the address-first set
  // AND params[0] is a string that looks like a .sui name. SuiNS only exists
  // on Sui, so this is skipped entirely for other chains.
  const candidateName = useMemo(() => {
    const method = request.rpcParams.method;
    if (chain !== 'sui' || !method || !ADDRESS_FIRST_PARAM_METHODS.has(method)) return null;
    const first = request.rpcParams.params?.[0];
    if (typeof first !== 'string') return null;
    const trimmed = first.trim();
    return looksLikeSuiNs(trimmed) ? trimmed : null;
  }, [chain, request.rpcParams.method, request.rpcParams.params]);

  // Debounced resolve when the candidate name changes
  const lastResolved = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!candidateName) {
      lastResolved.current = null;
      return;
    }

    const handle = window.setTimeout(async () => {
      const requested = candidateName;
      try {
        const address = await resolveSuiAddress(network, requested);
        if (cancelled) return;
        lastResolved.current = requested;
        setResolutionResult({ status: 'resolved', name: requested, address });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof SuiRpcError || err instanceof Error
          ? err.message
          : 'Resolution failed.';
        setResolutionResult({ status: 'error', name: requested, error: message });
      }
    }, RESOLVE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [candidateName, network]);

  // Derive the displayed resolution state from the latest async outcome:
  // 'idle' with no candidate, 'resolving' while the debounced lookup for the
  // current candidate hasn't completed yet, otherwise the stored outcome.
  const resolution = useMemo<NsResolutionState>(() => {
    if (!candidateName) return { status: 'idle', name: '' };
    if (resolutionResult.name === candidateName) return resolutionResult;
    return { status: 'resolving', name: candidateName };
  }, [candidateName, resolutionResult]);

  const applyResolution = useCallback(() => {
    if (resolution.status !== 'resolved' || !resolution.address) return;
    const params = Array.isArray(request.rpcParams.params)
      ? [...request.rpcParams.params]
      : [];
    params[0] = resolution.address;
    const nextParams = params;
    setRawJson(JSON.stringify(nextParams, null, 2));
    onChange({
      ...request,
      rpcParams: { ...request.rpcParams, params: nextParams }
    });
  }, [resolution, request, onChange]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* RPC Method Selection */}
      <div className="bg-slate-100 dark:bg-near-black/40 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-[0.2em]">RPC Method</h3>
        </div>

        {/* Chain selector — scopes the method suggestions and "Insert template" below. */}
        <div className="mb-4">
          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">
            Chain
          </label>
          <Select
            value={chain}
            onChange={(value) => setChain(value as ChainId)}
            options={RPC_CHAINS.map((c) => ({ label: c.label, value: c.id }))}
            fullWidth
            variant="glass"
          />
        </div>

        {/* EVM network selector — which EVM-compatible mainnet to target.
            All of these speak the same eth_* methods; this only changes
            which RPC endpoint gets hit. */}
        {chain === 'evm' && (
          <div className="mb-4">
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">
              Network
            </label>
            <Select
              value={String(request.rpcParams.evmChainId ?? DEFAULT_EVM_CHAIN_ID)}
              onChange={(value) =>
                onChange({
                  ...request,
                  rpcParams: { ...request.rpcParams, evmChainId: Number(value) }
                })
              }
              options={EVM_CHAINS.map((c) => ({ label: c.name, value: String(c.id) }))}
              fullWidth
              variant="glass"
            />
          </div>
        )}

        {/* Solana is the only chain with a real signing path today — this
            toggle swaps the whole method/params form below for a single
            instruction builder that signs and submits via the connected
            wallet, instead of a read-only RPC call. */}
        {chain === 'solana' && (
          <div className="mb-4">
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">
              Mode
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setSolanaTxMode(false)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  !isSolanaTxMode
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <TerminalIcon size={12} /> Read (RPC)
              </button>
              <button
                type="button"
                onClick={() => setSolanaTxMode(true)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  isSolanaTxMode
                    ? 'bg-white dark:bg-white/10 text-purple-500 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Zap size={12} /> Transaction
              </button>
            </div>
          </div>
        )}

        <div className={isSolanaTxMode ? 'hidden' : 'relative'} ref={methodFieldRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 z-10" size={16} />
          <input
            type="text"
            className="w-full bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-slate-900 dark:text-white focus:border-electric-violet focus:outline-none transition-all font-mono"
            placeholder={`e.g. ${methodsForChain[0] ?? 'method_name'}`}
            value={request.rpcParams.method}
            autoComplete="off"
            onFocus={() => {
              updateMenuRect();
              setIsMethodMenuOpen(true);
            }}
            onClick={() => {
              updateMenuRect();
              setIsMethodMenuOpen(true);
            }}
            onChange={(e) => {
              onChange({
                ...request,
                rpcParams: { ...request.rpcParams, method: e.target.value },
                name: e.target.value || 'New Request'
              });
              updateMenuRect();
              setIsMethodMenuOpen(true);
            }}
            onKeyDown={(e) => {
              if (!isMethodMenuOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                updateMenuRect();
                setIsMethodMenuOpen(true);
                return;
              }
              if (!isMethodMenuOpen || filteredMethods.length === 0) return;

              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex((i) => (i + 1) % filteredMethods.length);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex((i) => (i - 1 + filteredMethods.length) % filteredMethods.length);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                selectMethod(filteredMethods[clampedHighlightedIndex]);
              } else if (e.key === 'Escape') {
                setIsMethodMenuOpen(false);
              }
            }}
          />

          {isMethodMenuOpen && filteredMethods.length > 0 && menuRect && typeof document !== 'undefined' &&
            createPortal(
              <div
                ref={methodMenuRef}
                className="fixed max-h-64 overflow-y-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181b] shadow-2xl z-[200]"
                style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
              >
                {filteredMethods.map((m, i) => {
                  const isSelected = m === request.rpcParams.method;
                  return (
                  <button
                    key={m}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectMethod(m)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left font-mono text-xs transition-colors ${
                      i === clampedHighlightedIndex
                        ? 'bg-electric-violet/10 text-electric-violet'
                        : isSelected
                          ? 'text-electric-violet'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      {isSelected && <Check size={11} className="shrink-0" />}
                      <span className="truncate">{m}</span>
                    </span>
                    {m in templatesForChain && (
                      <span className="shrink-0 text-[9px] font-sans font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        template
                      </span>
                    )}
                  </button>
                  );
                })}
              </div>,
              document.body
            )}
        </div>
      </div>

      {isSolanaTxMode ? (
        <SolanaTransactionBuilder
          request={request}
          activeAddress={solanaAddress}
          onChange={onChange}
        />
      ) : (
        <div className="flex flex-col h-96">
          <div className="flex justify-between items-center mb-3 px-1 gap-3">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
              Parameters (JSON Array)
            </label>
            <div className="flex items-center gap-3">
              {jsonError && (
                <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
                  <AlertCircle size={11} />
                  {jsonError}
                </span>
              )}
              {methodHasTemplate && (
                <button
                  type="button"
                  onClick={() => applyParamsTemplate(request.rpcParams.method)}
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-electric-violet hover:opacity-80 uppercase tracking-wider transition-colors px-2 py-1 rounded-md hover:bg-electric-violet/[0.06]"
                  title="Replace params with the default template for this method"
                >
                  <FileCode size={11} />
                  Insert template
                </button>
              )}
            </div>
          </div>
          <div className={`flex-1 relative rounded-xl overflow-hidden ${jsonError ? 'ring-1 ring-red-500/40' : ''}`}>
            <JsonEditor
              value={displayJson}
              onChange={updateRpcParams}
              placeholder="[ ... ]"
            />
          </div>

          {/* SuiNS resolution hint */}
          {resolution.status !== 'idle' && (
            <SuiNsHint resolution={resolution} onApply={applyResolution} />
          )}
        </div>
      )}
    </div>
  );
};

const SuiNsHint: React.FC<{
  resolution: NsResolutionState;
  onApply: () => void;
}> = ({ resolution, onApply }) => {
  if (resolution.status === 'resolving') {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-xs text-slate-400">
        <Loader2 size={12} className="animate-spin text-electric-violet" />
        Resolving <span className="font-mono text-slate-600 dark:text-slate-300">{resolution.name}</span>…
      </div>
    );
  }

  if (resolution.status === 'error') {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/[0.06] border border-rose-500/20 text-xs text-rose-300">
        <AlertCircle size={12} className="shrink-0" />
        <span>
          Could not resolve <span className="font-mono">{resolution.name}</span>
          {resolution.error && <span className="text-rose-400/70"> — {resolution.error}</span>}
        </span>
      </div>
    );
  }

  if (resolution.status === 'resolved' && resolution.address) {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-electric-violet/[0.06] border border-electric-violet/20 text-xs">
        <Check size={12} className="shrink-0 text-electric-violet" />
        <span className="font-mono text-slate-400 truncate">{resolution.name}</span>
        <ArrowRight size={11} className="shrink-0 text-slate-600" />
        <span className="font-mono text-slate-700 dark:text-slate-200 truncate flex-1">{resolution.address}</span>
        <button
          type="button"
          onClick={onApply}
          className="shrink-0 text-[11px] font-semibold text-electric-violet hover:opacity-80 transition-colors px-2 py-0.5 rounded-md hover:bg-electric-violet/[0.08]"
        >
          Apply
        </button>
      </div>
    );
  }

  return null;
};