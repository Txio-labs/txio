import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Wallet, Box, X, BrainCircuit, MessageSquare } from 'lucide-react';
import { ALL_NETWORKS, Network, ActivityLog, Comment } from '../../types';
import { getOwnedObjects } from '../../services/suiService';
import { useWallet } from '@/wallet';
import { useAppStore, appStore } from '@/lib/store';
import { Select } from '@/components/Select';
import {
  WalletTab,
  ObjectsTab,
  AnalysisTab,
  DiscussTab,
} from './Tabs';

type RightPanelTab = 'wallet' | 'objects' | 'analysis' | 'discuss';

const networkColorClass = (network: Network) => {
  switch (network) {
    case 'mainnet': return 'bg-emerald-400';
    case 'testnet': return 'bg-amber-400';
    case 'devnet': return 'bg-blue-400';
    case 'localnet': return 'bg-fuchsia-400';
  }
};

interface RightPanelProps {
  network: Network;
  activityLogs: ActivityLog[];
  comments: Comment[];
  activeRequestId: string;
  onPostComment: (content: string) => void;
  onClose: () => void;
}

const TabButton = ({
  id,
  icon: Icon,
  label,
  isActive,
  onSelect,
}: {
  id: RightPanelTab;
  icon: any;
  label: string;
  isActive: boolean;
  onSelect: (id: RightPanelTab) => void;
}) => (
  <button
    onClick={() => onSelect(id)}
    role="tab"
    aria-selected={isActive}
    className={`flex-1 inline-flex items-center justify-center gap-1.5 h-7 rounded-[7px] text-xs font-medium transition-colors ${
      isActive ? 'bg-surface text-fg border border-line shadow-[0_1px_2px_rgba(0,0,0,0.12)]' : 'text-fg-subtle hover:text-fg border border-transparent'
    }`}
    title={label}
  >
    <Icon size={13} strokeWidth={isActive ? 2.2 : 1.8} />
    <span>{label}</span>
  </button>
);

export const RightPanel: React.FC<RightPanelProps> = ({
  network,
  activityLogs,
  comments,
  activeRequestId,
  onPostComment,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<RightPanelTab>('wallet');
  const [objects, setObjects] = useState<any[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  const { tabs, history } = useAppStore();
  const activeRequestTab = useMemo(
    () => tabs.find((t) => t.id === activeRequestId),
    [tabs, activeRequestId]
  );
  const activeRequest = activeRequestTab?.data;
  const lastRunHistoryEntry = useMemo(
    () => history.slice().reverse().find((h) => h.id === activeRequestId) ?? null,
    [history, activeRequestId]
  );

  const { currentWallet } = useWallet();
  const connectedAddress = currentWallet?.family === 'sui' ? currentWallet.address : null;

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // A monotonically-increasing counter lets each fetch "tag" its own result.
  // If a newer fetch starts (or dependencies change) while an earlier one is
  // still in-flight, the stale result is discarded when it eventually resolves,
  // preventing it from overwriting the current wallet's object list.
  const fetchGenerationRef = useRef(0);
  const fetchObjects = useCallback(async () => {
    if (!connectedAddress) return;
    const generation = ++fetchGenerationRef.current;
    setLoadingObjects(true);
    try {
      const res = await getOwnedObjects(network, connectedAddress);
      if (fetchGenerationRef.current !== generation) return; // stale — discard
      if (res.result && res.result.data) {
        setObjects(res.result.data);
      } else {
        setObjects([]);
      }
    } catch {
      if (fetchGenerationRef.current !== generation) return; // stale — discard
      setObjects([]);
    } finally {
      if (fetchGenerationRef.current === generation) {
        setLoadingObjects(false);
      }
    }
  }, [connectedAddress, network]);

  useEffect(() => {
    if (activeTab === 'objects' && connectedAddress) {
      queueMicrotask(() => {
        fetchObjects();
      });
    }
  }, [activeTab, connectedAddress, fetchObjects]);

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentInput.trim()) {
      onPostComment(commentInput);
      setCommentInput('');
    }
  };

  return (
    <div className="w-full flex flex-col h-full relative">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 h-12 border-b border-line">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[14px] font-semibold text-fg">Inspector</span>
          <Select
            value={network}
            size="xs"
            variant="outline"
            className="min-w-0"
            options={ALL_NETWORKS.map((option) => ({
              value: option,
              label: option,
              icon: <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${networkColorClass(option)}`} />
            }))}
            onChange={(nextNetwork) => appStore.requestNetworkSwitch(nextNetwork as Network)}
          />
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 inline-flex items-center justify-center text-fg-subtle hover:text-fg rounded-[7px] hover:bg-hover transition-colors"
          aria-label="Close inspector"
        >
          <X size={14} />
        </button>
      </div>

      {/* Navigation */}
      <div className="shrink-0 px-3 pt-3">
        <div role="tablist" className="flex gap-0.5 p-0.5 rounded-[9px] bg-hover border border-line">
          <TabButton id="wallet" icon={Wallet} label="Wallet" isActive={activeTab === 'wallet'} onSelect={setActiveTab} />
          <TabButton id="objects" icon={Box} label="Assets" isActive={activeTab === 'objects'} onSelect={setActiveTab} />
          <TabButton id="analysis" icon={BrainCircuit} label="Analysis" isActive={activeTab === 'analysis'} onSelect={setActiveTab} />
          <TabButton id="discuss" icon={MessageSquare} label="Discuss" isActive={activeTab === 'discuss'} onSelect={setActiveTab} />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* --- WALLET TAB --- */}
        {activeTab === 'wallet' && (
            <WalletTab
              formatAddress={formatAddress}
            />  
        )}

        {/* --- OBJECTS TAB --- */}
        {activeTab === 'objects' && (
          <div className="flex-1 flex flex-col min-h-0">
            <ObjectsTab
              connectedAddress={connectedAddress}
              walletFamily={currentWallet?.family || null}
              network={network}
              objects={objects}
              loadingObjects={loadingObjects}
              onRefreshObjects={fetchObjects}
            />
          </div>
        )}

        {/* --- ANALYSIS TAB --- */}
        {activeTab === 'analysis' && (
          <AnalysisTab request={activeRequest} lastRun={lastRunHistoryEntry} />
        )}

        {/* --- DISCUSS TAB --- */}
        {activeTab === 'discuss' && (
          <DiscussTab
            comments={comments}
            commentInput={commentInput}
            onCommentInputChange={setCommentInput}
            onSubmitComment={submitComment}
          />
        )}
      </div>
    </div>
  );
};