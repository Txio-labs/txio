import React, { useState } from 'react';
import { Box, Search, RefreshCw, ChevronLeft, Coins } from 'lucide-react';
import { Network } from '../../../types';
import { getObject } from '../../../services/suiService';
import type { WalletChainFamily } from '../../../wallet';

interface ObjectsTabProps {
  connectedAddress: string | null;
  walletFamily: WalletChainFamily | null;
  network: Network;
  objects: any[];
  loadingObjects: boolean;
  onRefreshObjects: () => void;
}

export const ObjectsTab: React.FC<ObjectsTabProps> = ({
  connectedAddress,
  walletFamily,
  network,
  objects,
  loadingObjects,
  onRefreshObjects,
}) => {
  const [selectedObject, setSelectedObject] = useState<any | null>(null);
  const [objectSearch, setObjectSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleObjectSearch = async () => {
    if (!objectSearch) return;
    setSearchLoading(true);
    setSelectedObject(null);
    setSearchError(null);
    try {
      const res = await getObject(network, objectSearch);
      if (res.result && res.result.data) {
        setSelectedObject(res.result.data);
      } else {
        // RPC responded but returned no object data (e.g. deleted/invalid ID)
        const rpcMessage = res.result?.error?.code || res.result?.error;
        setSearchError(rpcMessage ? String(rpcMessage) : 'Object not found');
      }
    } catch (err) {
      setSelectedObject(null);
      setSearchError(err instanceof Error ? err.message : 'Object not found');
    } finally {
      setSearchLoading(false);
    }
  };

  if (!connectedAddress) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
        <Box size={24} className="mb-2 text-fg-muted"/>
        <p className="text-xs text-fg-subtle">Connect a wallet to inspect owned objects</p>
      </div>
    );
  }

  if (walletFamily !== 'sui') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-card border border-line bg-hover flex items-center justify-center mb-4">
          <Box size={22} className="text-fg-subtle" />
        </div>
        <h3 className="text-sm font-semibold text-fg mb-2">Sui object inspection only</h3>
        <p className="text-xs leading-6 text-fg-subtle max-w-[220px]">
          The object explorer currently reads Sui ownership data. Switch to a Sui wallet to browse on-chain objects here.
        </p>
      </div>
    );
  }

  if (selectedObject) {
    return (
      <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-200">
        <div className="shrink-0 flex items-center gap-2 p-3 border-b border-line bg-white/80 dark:bg-black/50">
          <button onClick={() => setSelectedObject(null)} className="p-1 hover:bg-hover rounded text-fg-subtle hover:text-fg transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-semibold text-fg">Object Details</span>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-elevated">
          <div className="p-4 border-b border-line">
            <label className="text-[12px] font-semibold text-fg-muted block mb-1">Object ID</label>
            <div className="text-xs font-mono text-fg break-all select-all">{selectedObject.objectId || selectedObject.data?.objectId}</div>
          </div>
          <div className="p-4 border-b border-line">
            <label className="text-[12px] font-semibold text-fg-muted block mb-1">Type</label>
            <div className="text-xs font-mono text-amber-500 break-all select-all">{selectedObject.type || selectedObject.data?.type}</div>
          </div>
          <div className="p-4">
            <label className="text-[12px] font-semibold text-fg-muted block mb-2">Raw Content</label>
            <pre className="text-[12px] font-mono text-fg-subtle overflow-x-auto bg-surface p-3 rounded-lg border border-line">
              {JSON.stringify(selectedObject, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-3 border-b border-line flex gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input 
            className="w-full bg-surface border border-line rounded-lg pl-8 pr-3 py-1.5 text-xs text-fg focus:border-line-strong outline-none transition-all placeholder:text-fg-subtle"
            placeholder="Search Object ID..."
            value={objectSearch}
            onChange={(e) => { setObjectSearch(e.target.value); setSearchError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleObjectSearch()}
          />
        </div>
        <button onClick={onRefreshObjects} className="p-1.5 bg-surface border border-line rounded-lg text-fg-subtle hover:text-fg hover:border-line-strong transition-colors">
          <RefreshCw size={14} className={loadingObjects ? 'animate-spin' : ''} />
        </button>
      </div>

      {searchError && (
        // Inline feedback for a failed/empty object lookup, instead of failing silently
        <div className="px-3 pt-2 -mb-1 text-[12px] text-red-500 dark:text-red-400">
          {searchError}
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-1.5">
        {objects.map((obj, i) => {
          const type = obj.data?.type || '';
          const isCoin = type.includes('::coin::Coin');
          const shortType = type.split('::').pop().split('<')[0];
          const objectId: string = obj.data?.objectId || '';
          const shortId = objectId.length > 14
            ? `${objectId.slice(0, 8)}…${objectId.slice(-6)}`
            : objectId;

          return (
            <button
              key={i}
              onClick={() => setSelectedObject(obj)}
              className="group flex items-center gap-3 p-3 rounded-[10px] bg-surface hover:bg-hover border border-line hover:border-line-strong shadow-sm hover:shadow-md cursor-pointer transition-all duration-150 w-full text-left"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                isCoin
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-500'
                  : 'bg-hover border-line-strong text-fg'
              }`}>
                {isCoin ? <Coins size={16} /> : <Box size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-fg truncate">{shortType || 'Object'}</span>
                  <span className="shrink-0 text-[12px] font-mono font-medium text-fg-muted bg-hover px-1.5 py-0.5 rounded">v{obj.data?.version}</span>
                </div>
                <div className="text-[12px] font-mono text-fg-subtle truncate group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors" title={objectId}>{shortId}</div>
              </div>
            </button>
          );
        })}
        {objects.length === 0 && !loadingObjects && (
          <div className="p-8 text-center opacity-50">
            <Box size={24} className="mx-auto mb-2 text-fg-muted"/>
            <p className="text-xs text-fg-subtle">No objects found</p>
          </div>
        )}
      </div>
    </>
  );
};