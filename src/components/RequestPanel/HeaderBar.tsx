import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, Zap, Loader2, Server, Terminal, Layers, FolderPlus, Check, ChevronDown } from 'lucide-react';
import { RequestType, Network, ChainId, RPCHealthMetric, RequestItem, ALL_NETWORKS } from '../../types';
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
  const [isNetworkMenuOpen, setIsNetworkMenuOpen] = useState(false);
  const saveButtonRef = useRef<HTMLDivElement>(null);
  const saveMenuPortalRef = useRef<HTMLDivElement>(null);
  const networkMenuRef = useRef<HTMLDivElement>(null);
  const chain: ChainId = chainProp ?? 'sui';
  const endpoint = resolveChainRpcUrl(chain, network, evmChainId);

  const handleNetworkSwitch = (newNetwork: Network) => {
    setIsNetworkMenuOpen(false);
    if (newNetwork === network) return;
    appStore.requestNetworkSwitch(newNetwork);
  };

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
      if (networkMenuRef.current && !networkMenuRef.current.contains(target)) {
        setIsNetworkMenuOpen(false);
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

  const netDot = (net: Network) =>
    net === 'mainnet' ? 'bg-emerald-400' : net === 'testnet' ? 'bg-amber-400' : net === 'devnet' ? 'bg-sky-500' : 'bg-fuchsia-400';
  const latency = rpcHealth ? Math.round(rpcHealth.latency[rpcHealth.latency.length - 1]) : null;

  return (
    <div className="px-4 pt-4 pb-3 flex flex-col gap-3">
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-2">
        {/* Request kind */}
        <div role="tablist" aria-label="Request type" className="inline-flex items-center p-0.5 h-9 rounded-[9px] bg-hover border border-line shrink-0">
          {[
            { value: RequestType.RPC, label: 'RPC', icon: <Terminal size={13} /> },
            { value: RequestType.TRANSACTION, label: 'Transaction', icon: <Layers size={13} /> },
          ].map((o) => (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={requestType === o.value}
              onClick={() => onTypeChange(o.value)}
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[7px] text-xs font-medium transition-colors ${
                requestType === o.value ? 'bg-surface text-fg border border-line shadow-[0_1px_2px_rgba(0,0,0,0.12)]' : 'text-fg-subtle hover:text-fg border border-transparent'
              }`}
            >
              {o.icon}
              {o.label}
            </button>
          ))}
        </div>

        {/* Endpoint bar */}
        <div className="order-3 lg:order-none basis-full lg:basis-auto flex-1 min-w-0 flex items-center h-9 rounded-[9px] border border-line bg-sunken focus-within:border-line-strong transition-colors">
          <div className="relative shrink-0" ref={networkMenuRef}>
            <button
              type="button"
              onClick={() => setIsNetworkMenuOpen((v) => !v)}
              className="flex items-center gap-2 h-9 pl-3 pr-2.5 text-xs font-medium text-fg capitalize hover:bg-hover rounded-l-[9px] border-r border-line transition-colors"
              title="Switch network"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${netDot(network)}`} />
              <span>{network}</span>
              <ChevronDown size={12} className={`text-fg-subtle transition-transform duration-200 ${isNetworkMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isNetworkMenuOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-44 bg-elevated border border-line rounded-card shadow-pop overflow-hidden z-50 animate-in fade-in zoom-in-95 p-1">
                {ALL_NETWORKS.map((net) => (
                  <button
                    key={net}
                    onClick={() => handleNetworkSwitch(net)}
                    className={`w-full flex items-center justify-between px-2.5 h-8 rounded-[7px] text-[14px] capitalize transition-colors ${
                      network === net ? 'bg-active text-fg' : 'text-fg-muted hover:bg-hover hover:text-fg'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${netDot(net)}`} />
                      {net}
                    </span>
                    {network === net && <Check size={13} className="text-fg" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Server size={13} className="text-fg-subtle ml-3 shrink-0" />
          <span className="flex-1 min-w-0 px-2 text-xs font-mono text-fg-muted truncate" title={endpoint}>
            {endpoint}
          </span>
          {rpcHealth && latency !== null && (
            <span
              className={`flex items-center gap-1.5 h-6 mr-1.5 px-2 rounded-md text-[12px] font-mono tabular ${
                rpcHealth.status === 'healthy'
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : rpcHealth.status === 'degraded'
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                    : 'text-red-500 bg-red-500/10'
              }`}
              title={`Status: ${rpcHealth.status}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {latency}ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto lg:ml-0">
          {requestType === RequestType.RPC && request && (
            <div className="relative" ref={saveButtonRef}>
              <button
                onClick={() =>
                  topLevelCollections.length === 0 ? void handleCreateAndSave() : setIsSaveMenuOpen((v) => !v)
                }
                disabled={isSaving}
                className="h-9 px-3 rounded-[9px] border border-line bg-surface hover:border-line-strong text-fg text-[14px] font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-card"
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
                  <FolderPlus size={13} className="text-fg-subtle" />
                )}
                <span className="hidden sm:inline">{request.collectionId ? 'Update' : 'Save'}</span>
                {topLevelCollections.length > 0 && <ChevronDown size={12} className="text-fg-subtle" />}
              </button>

              {isSaveMenuOpen && saveMenuRect && createPortal(
                <div
                  ref={saveMenuPortalRef}
                  style={{ position: 'fixed', top: saveMenuRect.top, right: saveMenuRect.right }}
                  className="w-60 bg-elevated border border-line rounded-card shadow-pop overflow-hidden z-[100] animate-in fade-in zoom-in-95"
                >
                  <div className="px-3 pt-2.5 pb-1.5 text-[12px] font-medium text-fg-subtle">Save to collection</div>
                  <div className="max-h-56 overflow-y-auto custom-scrollbar px-1 pb-1">
                    {topLevelCollections.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => void handleSaveToCollection(c.id)}
                        className="w-full flex items-center gap-2 px-2.5 h-8 rounded-[7px] text-left text-[14px] text-fg hover:bg-hover transition-colors"
                      >
                        <span className="truncate flex-1">{c.name}</span>
                        {request.collectionId === c.id && <Check size={13} className="text-fg shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>,
                document.body
              )}
            </div>
          )}

          {requestType === RequestType.TRANSACTION && onExecute && (
            <button
              onClick={onExecute}
              disabled={isLoading}
              className="h-9 px-3 rounded-[9px] border border-line bg-surface hover:border-line-strong text-fg text-[14px] font-medium flex items-center gap-1.5 transition-colors shadow-card disabled:opacity-40 disabled:cursor-not-allowed"
              title={activeAddress ? 'Review, sign & execute' : 'Review transaction (connect a wallet to sign)'}
              aria-label="Review and sign transaction"
            >
              <Zap size={13} className="text-amber-500" />
              <span className="hidden sm:inline">Sign</span>
            </button>
          )}

          <button
            id="txio-request-send-btn"
            onClick={onSend}
            disabled={isLoading}
            className="h-9 pl-3.5 pr-2 rounded-[9px] bg-inverse text-on-inverse text-[14px] font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
            {requestType === RequestType.RPC ? 'Send' : 'Simulate'}
            <span className="hidden md:inline-flex items-center h-5 px-1.5 rounded-[5px] bg-on-inverse/10 text-[12px] font-medium opacity-70">⌘↵</span>
          </button>
        </div>
      </div>
    </div>
  );
};
