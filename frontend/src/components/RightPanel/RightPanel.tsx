import React, { useRef, useEffect, useState } from 'react';
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

interface RightPanelProps {
  network: Network;
  activityLogs: ActivityLog[];
  comments: Comment[];
  activeRequestId: string;
  onPostComment: (content: string) => void;
  onClose: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  network,
  activityLogs,
  comments,
  onPostComment,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'objects' | 'analysis' | 'discuss'>('wallet');
  const [objects, setObjects] = useState<any[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  
  const { currentWallet } = useWallet();
  const connectedAddress = currentWallet?.family === 'sui' ? currentWallet.address : null;

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const fetchObjects = async () => {
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
  };

  useEffect(() => {
    if (activeTab === 'objects' && connectedAddress) {
      fetchObjects();
    }
  }, [activeTab, connectedAddress, network]);

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentInput.trim()) {
      onPostComment(commentInput);
      setCommentInput('');
    }
  };

  const TabButton = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all relative ${
        activeTab === id 
        ? 'text-electric-violet' 
        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
      }`}
      title={label}
    >
      <Icon size={16} strokeWidth={activeTab === id ? 2.5 : 2} />
      {activeTab === id && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-electric-violet shadow-[0_0_8px_currentColor]"></span>
      )}
    </button>
  );

  return (
    <div className="w-80 bg-near-black border-l border-white/10 flex flex-col h-full font-sans shadow-2xl relative z-30">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-white/10 bg-near-black">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inspector</span>
          <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
            network === 'mainnet' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
            network === 'testnet' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
            'bg-blue-500/10 text-blue-400 border-blue-500/20'
          }`}>
            {network}
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-slate-500 hover:text-white rounded hover:bg-white/10 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Navigation */}
      <div className="shrink-0 flex border-b border-white/10 bg-near-black">
        <TabButton id="wallet" icon={Wallet} label="Wallet" />
        <TabButton id="objects" icon={Box} label="Objects" />
        <TabButton id="analysis" icon={BrainCircuit} label="Analysis" />
        <TabButton id="discuss" icon={MessageSquare} label="Discuss" />
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
