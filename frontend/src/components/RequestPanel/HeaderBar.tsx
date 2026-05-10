import React, { useEffect, useState } from 'react';
import { Play, Zap, Loader2, Server, Terminal, Layers } from 'lucide-react';
import { Select } from '../Select';
import { RequestType, Network, RPCHealthMetric } from '../../types';
import { NETWORKS } from '@/lib/constants';
import { fetchRPCHealth } from '../../services/mockService';

interface HeaderBarProps {
  requestType: RequestType;
  network: Network;
  isLoading: boolean;
  activeAddress: string | null;
  onTypeChange: (type: RequestType) => void;
  onSend: () => void;
  onExecute?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  requestType,
  network,
  isLoading,
  activeAddress,
  onTypeChange,
  onSend,
  onExecute
}) => {
  const [rpcHealth, setRpcHealth] = useState<RPCHealthMetric | null>(null);
  const endpoint = NETWORKS[network];

  useEffect(() => {
    const getHealth = async () => {
      const metrics = await fetchRPCHealth();
      const current = metrics.find(m => m.endpoint === endpoint) || metrics.find(m => m.endpoint.includes(network));
      setRpcHealth(current || null);
    };
    getHealth();
  }, [network, endpoint]);

  return (
    <div className="p-3 border-b border-white/10 bg-black/50 flex flex-wrap gap-3 items-center backdrop-blur-sm">
      <div className="w-full sm:w-40 shrink-0">
        <Select 
          value={requestType}
          onChange={onTypeChange}
          options={[
            { label: 'JSON-RPC', value: RequestType.RPC, icon: <Terminal size={12} className="text-emerald-500" /> },
            { label: 'TX BUILDER', value: RequestType.TRANSACTION, icon: <Layers size={12} className="text-violet-500" /> }
          ]}
          fullWidth
        />
      </div>
      
      {/* Enhanced Endpoint Context */}
      <div className="flex-1 flex items-center bg-black border border-white/10 rounded-lg px-3 py-1.5 h-[38px] min-w-[200px] group focus-within:border-white/20 transition-colors">
        <div className="flex items-center gap-2 mr-3 border-r border-white/10 pr-3">
          <Server size={12} className="text-slate-500" />
          <span className="text-[10px] font-bold text-slate-300 uppercase">{network}</span>
        </div>
        <div className="flex-1 flex items-center gap-2 overflow-hidden">
          <span className="text-xs font-mono text-slate-500 truncate" title={endpoint}>{endpoint}</span>
        </div>
        {rpcHealth && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/10" title={`Status: ${rpcHealth.status}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${rpcHealth.status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`}></div>
            <span className={`text-[10px] font-mono ${rpcHealth.status === 'healthy' ? 'text-emerald-500' : 'text-amber-500'}`}>
              {Math.round(rpcHealth.latency[rpcHealth.latency.length-1])}ms
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button 
          onClick={onSend}
          disabled={isLoading}
          className={`h-[38px] bg-sui-600 hover:bg-sui-500 text-white px-5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:grayscale text-[10px] uppercase tracking-widest shadow-lg shadow-sui-900/40 active:scale-95 shrink-0 flex-1 sm:flex-initial`}
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
          {requestType === RequestType.RPC ? 'Send' : 'Simulate'}
        </button>

        {requestType === RequestType.TRANSACTION && onExecute && (
          <button
            onClick={onExecute}
            disabled={isLoading || !activeAddress}
            className="h-[38px] bg-emerald-600 hover:bg-emerald-500 text-white px-3 rounded-lg font-bold flex items-center justify-center transition-all shadow-lg shadow-emerald-900/40 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
            title={activeAddress ? "Sign & Execute" : "Connect Wallet to Sign"}
          >
            <Zap size={14} fill="currentColor" />
          </button>
        )}
      </div>
    </div>
  );
};