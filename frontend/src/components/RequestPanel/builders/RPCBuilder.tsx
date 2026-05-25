import React, { useState, useCallback } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { COMMON_RPC_METHODS } from '@/lib/constants';
import { JsonEditor } from '../../ui/JsonEditor';

interface RPCBuilderProps {
  request: any;
  onChange: (updatedReq: any) => void;
}

export const RPCBuilder: React.FC<RPCBuilderProps> = ({ request, onChange }) => {
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* RPC Method Selection */}
      <div className="bg-near-black/40 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-[0.2em]">RPC Method</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
          <input
            list="rpc-methods-builder"
            type="text"
            className="w-full bg-near-black border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white focus:border-electric-violet focus:outline-none transition-all font-mono"
            placeholder="e.g. suix_getOwnedObjects"
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
            {COMMON_RPC_METHODS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="flex flex-col h-96">
        <div className="flex justify-between items-center mb-3 px-1">
          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
            Parameters (JSON Array)
          </label>
          {jsonError && (
            <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
              <AlertCircle size={11} />
              {jsonError}
            </span>
          )}
        </div>
        <div className={`flex-1 relative rounded-xl overflow-hidden ${jsonError ? 'ring-1 ring-red-500/40' : ''}`}>
          <JsonEditor
            value={displayJson}
            onChange={updateRpcParams}
            placeholder="[ ... ]"
          />
        </div>
      </div>
    </div>
  );
};