import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Wallet, Box, X, BrainCircuit, MessageSquare } from 'lucide-react';
import { Network, ActivityLog, Comment } from '../../types';
import { getOwnedObjects } from '../../services/suiService';
import { useWallet } from '@/wallet';
import {
  WalletTab,
  ObjectsTab,
  AnalysisTab,
  DiscussTab,
} from './Tabs';

type RightPanelTab = 'wallet' | 'objects' | 'analysis' | 'discuss';

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
    className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-colors relative ${
      isActive
      ? 'text-electric-violet'
      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
    }`}
    title={label}
  >
    <Icon size={15} strokeWidth={isActive ? 2.25 : 1.75} />
    <span className="text-[10px] font-medium">{label}</span>
    {isActive && (
      <span className="absolute bottom-0 left-0 right-0 h-px bg-electric-violet"></span>
    )}
  </button>
);

export const RightPanel: React.FC<RightPanelProps> = ({
  network,
  activityLogs,
  comments,
  onPostComment,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<RightPanelTab>('wallet');
  const [objects, setObjects] = useState<any[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  
  const { currentWallet } = useWallet();
  const connectedAddress = currentWallet?.family === 'sui' ? currentWallet.address : null;

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const fetchObjects = useCallback(async () => {
    if (!connectedAddress) return;
    setLoadingObjects(true);
    try {
      const res = await getOwnedObjects(network, connectedAddress);
      if (res.result && res.result.data) {
        setObjects(res.result.data);
      } else {
        setObjects([]);
      }
    } catch (e) {
      setObjects([]);
    } finally {
      setLoadingObjects(false);
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
    <div className="w-80 bg-near-black border-l border-white/[0.06] flex flex-col h-full font-sans relative z-30">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-dark-indigo-glow">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-300 tracking-tight">Inspector</span>
          <div className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
            network === 'mainnet' ? 'bg-emerald-500/[0.12] text-emerald-400' :
            network === 'testnet' ? 'bg-amber-500/[0.12] text-amber-400' :
            'bg-blue-500/[0.12] text-blue-400'
          }`}>
            {network}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-500 hover:text-slate-200 rounded hover:bg-white/[0.05] transition-colors"
          aria-label="Close inspector"
        >
          <X size={13} />
        </button>
      </div>

      {/* Navigation */}
      <div className="shrink-0 flex border-b border-white/[0.06] bg-near-black">
        <TabButton id="wallet" icon={Wallet} label="Wallet" isActive={activeTab === 'wallet'} onSelect={setActiveTab} />
        <TabButton id="objects" icon={Box} label="Objects" isActive={activeTab === 'objects'} onSelect={setActiveTab} />
        <TabButton id="analysis" icon={BrainCircuit} label="Analysis" isActive={activeTab === 'analysis'} onSelect={setActiveTab} />
        <TabButton id="discuss" icon={MessageSquare} label="Discuss" isActive={activeTab === 'discuss'} onSelect={setActiveTab} />
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
          <div className="flex-1 flex flex-col min-h-0 bg-near-black">
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
        {activeTab === 'analysis' && <AnalysisTab />}

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
