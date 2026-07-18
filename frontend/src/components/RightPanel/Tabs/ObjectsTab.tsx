import React, { useState } from 'react';
import { Box, Search, RefreshCw, ChevronLeft, Coins } from 'lucide-react';
import { Network } from '../../../types';
import { getObject } from '../../../services/suiService';

interface ObjectsTabProps {
  connectedAddress: string | null;
  walletFamily: 'evm' | 'sui' | 'stellar' | null;
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

  const handleObjectSearch = async () => {
    if (!objectSearch) return;
    setSearchLoading(true);
    setSelectedObject(null);
    try {
      const res = await getObject(network, objectSearch);
      if (res.result && res.result.data) {
        setSelectedObject(res.result.data);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  if (!connectedAddress) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
        <Box size={24} className="mb-2 text-slate-600"/>
        <p className="text-xs text-slate-500">Connect a Sui wallet to inspect owned objects</p>
      </div>
    );
  }

  if (walletFamily !== 'sui') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center mb-4">
          <Box size={22} className="text-slate-500" />
        </div>
        <h3 className="text-sm font-bold text-white mb-2">Sui object inspection only</h3>
        <p className="text-xs leading-6 text-slate-500 max-w-[220px]">
          The object explorer currently reads Sui ownership data. Switch to a Sui wallet to browse on-chain objects here.
        </p>
      </div>
    );
  }

  if (selectedObject) {
    return (
      <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-200">
        <div className="shrink-0 flex items-center gap-2 p-3 border-b border-white/10 bg-near-black/50">
          <button onClick={() => setSelectedObject(null)} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-white">Object Details</span>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-[#003152]">
          <div className="p-4 border-b border-white/10">
            <label className="text-[10px] uppercase font-black text-slate-600 tracking-widest block mb-1">Object ID</label>
            <div className="text-xs font-mono text-electric-violet break-all select-all">{selectedObject.objectId || selectedObject.data?.objectId}</div>
          </div>
          <div className="p-4 border-b border-white/10">
            <label className="text-[10px] uppercase font-black text-slate-600 tracking-widest block mb-1">Type</label>
            <div className="text-xs font-mono text-amber-500 break-all select-all">{selectedObject.type || selectedObject.data?.type}</div>
          </div>
          <div className="p-4">
            <label className="text-[10px] uppercase font-black text-slate-600 tracking-widest block mb-2">Raw Content</label>
            <pre className="text-[10px] font-mono text-slate-400 overflow-x-auto bg-near-black p-3 rounded-lg border border-white/10">
              {JSON.stringify(selectedObject, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-3 border-b border-white/10 flex gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            className="w-full bg-near-black border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:border-electric-violet outline-none transition-all placeholder:text-slate-600"
            placeholder="Search Object ID..."
            value={objectSearch}
            onChange={(e) => setObjectSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleObjectSearch()}
          />
        </div>
        <button onClick={onRefreshObjects} className="p-1.5 bg-near-black border border-white/10 rounded-lg text-slate-400 hover:text-white hover:border-white/20 transition-colors">
          <RefreshCw size={14} className={loadingObjects ? 'animate-spin' : ''} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {objects.map((obj, i) => {
          const type = obj.data?.type || '';
          const isCoin = type.includes('::coin::Coin');
          const shortType = type.split('::').pop().split('<')[0];
          
          return (
            <div key={i} onClick={() => setSelectedObject(obj)} className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer transition-all">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                isCoin ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
              }`}>
                {isCoin ? <Coins size={14} /> : <Box size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-bold text-slate-300 truncate">{shortType || 'Object'}</span>
                  <span className="text-9px font-mono text-slate-600">v{obj.data?.version}</span>
                </div>
                <div className="text-[10px] font-mono text-slate-600 truncate opacity-60 group-hover:opacity-100">{obj.data?.objectId}</div>
              </div>
            </div>
          );
        })}
        {objects.length === 0 && !loadingObjects && (
          <div className="p-8 text-center opacity-50">
            <Box size={24} className="mx-auto mb-2 text-slate-600"/>
            <p className="text-xs text-slate-500">No objects found</p>
          </div>
        )}
      </div>
    </>
  );
};
