import React from 'react';
import { FileJson, ChevronRight } from 'lucide-react';
import { JsonEditor } from '../../ui/JsonEditor';
import { RequestItem, RequestType } from '../../../types';

const RPC_TEMPLATES = [
    {
        label: 'Get Owned Objects',
        method: 'suix_getOwnedObjects',
        params: [
            "0x7d20dcdb2bca4f508ea9613994683eb4e76e9c4ed27790dd226ee5310f5194d1",
            { "options": { "showContent": true, "showType": true, "showOwner": true } }
        ]
    },
    {
        label: 'Get Object',
        method: 'sui_getObject',
        params: [
            "0x_OBJECT_ID",
            { "showType": true, "showOwner": true, "showContent": true }
        ]
    },
    {
        label: 'Multi Get Objects',
        method: 'sui_multiGetObjects',
        params: [
            ["0x_ID_1", "0x_ID_2"],
            { "showType": true, "showOwner": true, "showContent": true }
        ]
    },
    {
        label: 'Get Balance (SUI)',
        method: 'suix_getBalance',
        params: ["0x_WALLET_ADDRESS", "0x2::sui::SUI"]
    },
    {
        label: 'Get All Balances',
        method: 'suix_getAllBalances',
        params: ["0x_WALLET_ADDRESS"]
    },
    {
        label: 'Get Coins',
        method: 'suix_getCoins',
        params: ["0x_WALLET_ADDRESS", "0x2::sui::SUI", null, 50]
    },
    {
        label: 'Query Transactions',
        method: 'suix_queryTransactionBlocks',
        params: [
            { "filter": { "FromAddress": "0x_WALLET_ADDRESS" }, "options": { "showInput": true, "showEffects": true, "showEvents": true } },
            null,
            10,
            true
        ]
    },
    {
        label: 'Get Transaction',
        method: 'sui_getTransactionBlock',
        params: ["TX_DIGEST", { "showInput": true, "showEffects": true, "showEvents": true }]
    },
    {
        label: 'Dry Run Transaction',
        method: 'sui_dryRunTransactionBlock',
        params: ["TX_BYTES_BASE64"]
    },
    {
        label: 'Execute Transaction',
        method: 'sui_executeTransactionBlock',
        params: ["TX_BYTES_BASE64", ["SIGNATURE"], { "showEffects": true, "showEvents": true }]
    },
    {
        label: 'Get Package Modules',
        method: 'sui_getNormalizedMoveModulesByPackage',
        params: ["0x_PACKAGE_ID"]
    },
    {
        label: 'Get Module',
        method: 'sui_getNormalizedMoveModule',
        params: ["0x_PACKAGE_ID", "MODULE_NAME"]
    },
    {
        label: 'System State',
        method: 'suix_getLatestSuiSystemState',
        params: []
    },
    {
        label: 'Chain ID',
        method: 'sui_getChainIdentifier',
        params: []
    }
];

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

  const applyTemplate = (template: typeof RPC_TEMPLATES[0]) => {
    onChange({
      ...request,
      rpcParams: {
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
          <div className="mb-4 bg-[#003152] p-4 rounded-xl border border-white/10 opacity-75 shrink-0 group">
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
        <div className="w-64 border-l border-white/10 bg-near-black/20 overflow-y-auto custom-scrollbar p-4 flex flex-col">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <FileJson size={12}/> Templates
          </h3>
          <div className="space-y-2">
            {RPC_TEMPLATES.map((t, idx) => (
              <button 
                key={idx}
                onClick={() => applyTemplate(t)}
                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group active:scale-95"
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="text-xs font-bold text-slate-200 group-hover:text-white truncate">{t.label}</div>
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