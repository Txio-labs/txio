import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, Zap, Loader2, Server, Terminal, Layers, FolderPlus, Check, ChevronDown } from 'lucide-react';
import { Select } from '../Select';
import { RequestType, Network, ChainId, RPCHealthMetric, RequestItem } from '../../types';
import { appStore, useAppStore } from '@/lib/store';
import { resolveChainRpcUrl, getChainRpcHealth } from '../../services/suiService';
import { RequestOutcome } from './response/types';

interface HeaderBarProps {
  requestType: RequestType;
  network: Network;
  isLoading: boolean;
  activeAddress: string | null;
  onTypeChange: (type: RequestType) => void;
  onSend: () => void;
  onExecute?: () => void;
  chain?: ChainId;
  evmChainId?: number;
  request?: RequestItem;
  outcome?: RequestOutcome | null;
  onChange?: (updatedReq: RequestItem) => void;
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
  evmChainId,
  request,
  outcome,
  onChange
}) => {
  const { settings, collections } = useAppStore();
  const [rpcHealth, setRpcHealth] = useState<RPCHealthMetric | null>(null);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveMenuRect, setSaveMenuRect] = useState<{ top: number; right: number } | null>(null);
  const saveButtonRef = useRef<HTMLDivElement>(null);
  const saveMenuPortalRef = useRef<HTMLDivElement>(null);
  const chain: ChainId = chainProp ?? 'sui';
  const endpoint = resolveChainRpcUrl(chain, network, evmChainId);

  const topLevelCollections = collections.filter((c) => c.type === 'collection');

  const updateSaveMenuRect = useCallback(() => {
    const el = saveButtonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSaveMenuRect({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
  }, []);

  useEffect(() => {
    if (!isSaveMenuOpen) return;
    updateSaveMenuRect();
    window.addEventListener('scroll', updateSaveMenuRect, true);
    window.addEventListener('resize', updateSaveMenuRect);
    return () => {
      window.removeEventListener('scroll', updateSaveMenuRect, true);
      window.removeEventListener('resize', updateSaveMenuRect);
    };
  }, [isSaveMenuOpen, updateSaveMenuRect]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        saveButtonRef.current && !saveButtonRef.current.contains(target) &&
        saveMenuPortalRef.current && !saveMenuPortalRef.current.contains(target)
      ) {
        setIsSaveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveToCollection = async (collectionId: string) => {
    if (!request) return;
    setIsSaving(true);
    setIsSaveMenuOpen(false);

    const saved = await appStore.saveRequestToCollection(collectionId, request, outcome?.result);

    setIsSaving(false);
    if (saved && onChange) {
      onChange({ ...request, id: saved.id, collectionId: saved.collectionId ?? collectionId });
    }
    if (saved) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1800);
    }
  };

  const handleCreateAndSave = async () => {
    if (!request) return;
    const name = window.prompt('Name your new collection:', 'My Collection');
    if (!name || !name.trim()) return;

    setIsSaving(true);
    const newCollection = await appStore.createCollection(name.trim());
    if (!newCollection) {
      setIsSaving(false);
      return;
    }
    await handleSaveToCollection(newCollection.id);
  };

  useEffect(() => {
    let mounted = true;

    const getHealth = async () => {
      const health = await getChainRpcHealth(chain, network, evmChainId);

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
      <div className="flex-1 flex items-center bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 h-[38px] min-w-[200px] group focus-within:border-slate-300 dark:focus-within:border-white/20 transition-colors">
        <div className="flex items-center gap-2 mr-3 border-r border-slate-200 dark:border-white/10 pr-3">
          <Server size={12} className="text-slate-500" />
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">{network}</span>
        </div>
        <div className="flex-1 flex items-center gap-2 overflow-hidden">
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
          id="txio-request-send-btn"
          onClick={onSend}
          disabled={isLoading}
          className={`h-[38px] bg-slate-900 dark:bg-white hover:opacity-90 text-white dark:text-near-black px-5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:grayscale text-[10px] uppercase tracking-widest shadow-lg active:scale-95 shrink-0 flex-1 sm:flex-initial`}
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

        {requestType === RequestType.RPC && request && (
          <div className="relative" ref={saveButtonRef}>
            <button
              onClick={() =>
                topLevelCollections.length === 0
                  ? void handleCreateAndSave()
                  : setIsSaveMenuOpen((v) => !v)
              }
              disabled={isSaving}
              className="h-[38px] bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[10px] uppercase tracking-widest shrink-0"
              title={
                topLevelCollections.length === 0
                  ? 'Create a collection and save this request to it'
                  : request.collectionId
                    ? 'Update the saved request in its collection'
                    : 'Save this request to a collection'
              }
            >
              {isSaving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : justSaved ? (
                <Check size={13} className="text-emerald-500" />
              ) : (
                <FolderPlus size={13} />
              )}
              <span className="hidden sm:inline">{request.collectionId ? 'Update' : 'Save'}</span>
              {topLevelCollections.length > 0 && <ChevronDown size={11} className="text-slate-400" />}
            </button>

            {isSaveMenuOpen && saveMenuRect && createPortal(
              <div
                ref={saveMenuPortalRef}
                style={{ position: 'fixed', top: saveMenuRect.top, right: saveMenuRect.right }}
                className="w-56 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100]"
              >
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-white/5">
                  Save to collection
                </div>
                <div className="max-h-56 overflow-y-auto custom-scrollbar p-1.5">
                  {topLevelCollections.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => void handleSaveToCollection(c.id)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="truncate flex-1">{c.name}</span>
                      {request.collectionId === c.id && <Check size={12} className="text-electric-violet shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>,
              document.body
            )}
          </div>
        )}
      </div>
    </div>
  );
};