import React from 'react';
import { FileJson, ChevronRight } from 'lucide-react';
import { JsonEditor } from '../../ui/JsonEditor';
import { RequestItem, RequestType } from '../../../types';
import { RPC_METHOD_TEMPLATES } from '@/lib/constants';

interface RawEditorProps {
  request: RequestItem;
  onChange: (updatedReq: RequestItem) => void;
}

export const RawEditor: React.FC<RawEditorProps> = ({ 
  request, 
  onChange 
}) => {
  const updateRpcParams = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      onChange({ ...request, rpcParams: { ...request.rpcParams, params: parsed } });
    } catch (e) {
      // Invalid JSON, keep as is
    }
  };

  // Templates follow the request's chain; applying one keeps the chain and
  // EVM network (only method + params change).
  const chain = request.rpcParams.chain ?? 'sui';
  const templates = Object.entries(RPC_METHOD_TEMPLATES[chain] ?? {}).map(([method, params]) => ({
    label: method,
    method,
    params: [...params]
  }));

  const applyTemplate = (template: { method: string; params: unknown[] }) => {
    onChange({
      ...request,
      rpcParams: {
        ...request.rpcParams,
        method: template.method,
        params: template.params
      }
    });
  };

  return (
    <div className="h-full flex overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 p-6">
        {/* Read-Only Envelope Preview */}
        {request.type === RequestType.RPC && (
          <div className="mb-4 bg-white dark:bg-[#18181b] p-4 rounded-xl border border-slate-200 dark:border-white/10 opacity-75 shrink-0 group">
            <div className="flex justify-between items-center mb-2">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Full Request Preview</div>
              <div className="text-[9px] text-slate-600">ReadOnly</div>
            </div>
            <pre className="text-xs text-slate-400 font-mono overflow-x-auto text-ellipsis whitespace-nowrap p-1">
              {`{ "jsonrpc": "2.0", "id": 1, "method": "${request.rpcParams.method}", "params": [...] }`}
            </pre>
          </div>
        )}

        <div className="flex-1 relative min-h-0">
          <JsonEditor 
            value={request.type === RequestType.RPC 
              ? JSON.stringify(request.rpcParams.params, null, 2)
              : JSON.stringify(request.moveParams, null, 2)
            }
            onChange={(val) => {
              if (request.type === RequestType.RPC) {
                updateRpcParams(val);
              } else {
                // For transaction type, we need to update the entire moveParams
                try {
                  const parsed = JSON.parse(val);
                  onChange({ ...request, moveParams: parsed });
                } catch (e) {
                  // Invalid JSON, keep as is
                }
              }
            }}
            placeholder={request.type === RequestType.RPC ? "[\n  // Params array\n]" : "{ ...moveParams }"}
          />
        </div>
      </div>

      {/* Templates Sidebar - Only show for RPC type */}
      {request.type === RequestType.RPC && (
        <div className="w-64 border-l border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-near-black/20 overflow-y-auto custom-scrollbar p-4 flex flex-col">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <FileJson size={12}/> Templates
          </h3>
          <div className="space-y-2">
            {templates.map((t, idx) => (
              <button 
                key={idx}
                onClick={() => applyTemplate(t)}
                className="w-full text-left p-3 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 transition-all group active:scale-95"
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:text-white truncate">{t.label}</div>
                  <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-all -ml-2 group-hover:ml-0" />
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate opacity-60 group-hover:opacity-100 transition-opacity">
                  {t.method}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};