import React, { useEffect, useState } from 'react';
import { Play, Zap, Loader2, Server, Terminal, Layers } from 'lucide-react';
import { Select } from '../Select';
import { RequestType, Network, ChainId, ALL_NETWORKS, RPCHealthMetric } from '../../types';
import { appStore, useAppStore } from '@/lib/store';
import { RPC_CHAINS } from '@/lib/constants';
import { resolveChainRpcUrl, getChainRpcHealth } from '../../services/suiService';

interface HeaderBarProps {
  requestType: RequestType;
  network: Network;
  isLoading: boolean;
  activeAddress: string | null;
  onTypeChange: (type: RequestType) => void;
  onSend: () => void;
  onExecute?: () => void;
  chain?: ChainId;
  onChainChange?: (chain: ChainId) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  requestType,
  network,
  isLoading,
  activeAddress,
  onTypeChange,
  onSend,
  onExecute,
  chain: chainProp,
  onChainChange
}) => {
  const { settings } = useAppStore();
  const [rpcHealth, setRpcHealth] = useState<RPCHealthMetric | null>(null);
  const chain: ChainId = chainProp ?? 'sui';
  const endpoint = resolveChainRpcUrl(chain, network);

  useEffect(() => {
    let mounted = true;

    const getHealth = async () => {
      const health = await getChainRpcHealth(chain, network);

      if (mounted) {
        setRpcHealth(health);
      }
    };

    getHealth();

    return () => {
      mounted = false;
    };
  }, [chain, network, endpoint]);

  return (
    <div className="p-3 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-near-black/50 flex flex-wrap gap-3 items-center backdrop-blur-sm">
      <div className="w-full sm:w-40 shrink-0">
        <Select 
          value={requestType}
          onChange={onTypeChange}
          options={[
            { label: 'JSON-RPC', value: RequestType.RPC, icon: <Terminal size={12} className="text-emerald-500" /> },
            { label: 'TX BUILDER', value: RequestType.TRANSACTION, icon: <Layers size={12} className="text-amber-500" /> }
          ]}
          fullWidth
        />
      </div>
      
      {/* Enhanced Endpoint Context */}
      <div className="flex-1 flex items-center bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg pl-1.5 pr-3 py-1.5 h-[38px] min-w-[200px] gap-2 group focus-within:border-slate-300 dark:border-white/20 transition-colors">
        <div className="w-32 shrink-0">
          <Select
            value={chain}
            onChange={(value) => onChainChange?.(value as ChainId)}
            options={RPC_CHAINS.map((c) => ({ label: c.label, value: c.id }))}
            size="xs"
            variant="ghost"
            disabled={!onChainChange}
            fullWidth
          />
        </div>
        <div className="w-28 shrink-0 border-l border-slate-200 dark:border-white/10 pl-2">
          <Select
            value={network}
            onChange={(value) => appStore.requestNetworkSwitch(value as Network)}
            options={ALL_NETWORKS.map((n) => ({ label: n.toUpperCase(), value: n }))}
            size="xs"
            variant="ghost"
            fullWidth
          />
        </div>
        <div className="flex-1 flex items-center gap-2 overflow-hidden border-l border-slate-200 dark:border-white/10 pl-2">
          <Server size={12} className="text-slate-500 shrink-0" />
          <span className="text-xs font-mono text-slate-500 truncate" title={endpoint}>{endpoint}</span>
        </div>
        {rpcHealth && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200 dark:border-white/10" title={`Status: ${rpcHealth.status}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${rpcHealth.status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : rpcHealth.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
            <span className={`text-[10px] font-mono ${rpcHealth.status === 'healthy' ? 'text-emerald-500' : rpcHealth.status === 'degraded' ? 'text-amber-500' : 'text-red-400'}`}>
              {Math.round(rpcHealth.latency[rpcHealth.latency.length-1])}ms
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button 
          onClick={onSend}
          disabled={isLoading}
          className={`h-[38px] bg-electric-violet hover:bg-electric-violet text-white px-5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:grayscale text-[10px] uppercase tracking-widest shadow-lg shadow-sui-900/40 active:scale-95 shrink-0 flex-1 sm:flex-initial`}
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
          {requestType === RequestType.RPC ? 'Send' : 'Simulate'}
        </button>

        {requestType === RequestType.TRANSACTION && onExecute && (
          <button
            onClick={onExecute}
            disabled={isLoading || !activeAddress}
            className="h-[38px] bg-emerald-600 hover:bg-emerald-500 text-white px-3 rounded-lg font-bold flex items-center justify-center transition-all shadow-lg shadow-emerald-900/40 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
            title={activeAddress ? 'Review wallet-based simulation' : 'Connect Wallet to review simulation'}
            aria-label={activeAddress ? 'Review wallet-based simulation' : 'Connect wallet to review simulation'}
          >
            <Zap size={14} fill="currentColor" />
          </button>
        )}
      </div>
    </div>
  );
};