import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AlertCircle, Search, Loader2, Check, ArrowRight, FileCode } from 'lucide-react';
import {
  ADDRESS_FIRST_PARAM_METHODS,
  COMMON_RPC_METHODS,
  DEFAULT_RPC_CHAIN,
  RPC_CHAINS,
  RPC_METHOD_TEMPLATES,
} from '@/lib/constants';
import { useAppStore } from '@/lib/store';
import { looksLikeSuiNs, resolveSuiAddress, SuiRpcError } from '@/services/suiService';
import { ChainId } from '@/types';
import { JsonEditor } from '../../ui/JsonEditor';
import { Select } from '../../Select';

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
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [resolutionResult, setResolutionResult] = useState<NsResolutionState>({ status: 'idle', name: '' });

  const chain: ChainId = request.rpcParams.chain ?? DEFAULT_RPC_CHAIN;
  const methodsForChain = COMMON_RPC_METHODS[chain];
  const templatesForChain = RPC_METHOD_TEMPLATES[chain];

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
    },
    [onChange, request, templatesForChain],
  );

  const methodHasTemplate = useMemo(
    () => Boolean(request.rpcParams.method) && request.rpcParams.method in templatesForChain,
    [request.rpcParams.method, templatesForChain],
  );

  // Auto-fill template when method changes and params are empty.
  const lastAutofilledMethod = useRef<string | null>(null);
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

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
          <input
            list="rpc-methods-builder"
            type="text"
            className="w-full bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-slate-900 dark:text-white focus:border-electric-violet focus:outline-none transition-all font-mono"
            placeholder={`e.g. ${methodsForChain[0] ?? 'method_name'}`}
            value={request.rpcParams.method}
            onChange={(e) =>
              onChange({
                ...request,
                rpcParams: { ...request.rpcParams, method: e.target.value },
                name: e.target.value || 'New Request'
              })
            }
          />
          <datalist id="rpc-methods-builder">
            {methodsForChain.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>

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
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-electric-violet hover:text-soft-purple uppercase tracking-wider transition-colors px-2 py-1 rounded-md hover:bg-electric-violet/[0.06]"
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
          className="shrink-0 text-[11px] font-semibold text-electric-violet hover:text-soft-purple transition-colors px-2 py-0.5 rounded-md hover:bg-electric-violet/[0.08]"
        >
          Apply
        </button>
      </div>
    );
  }

  return null;
};