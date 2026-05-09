import React, { useRef, useEffect, useState } from 'react';
import { Wallet, Box, X, BrainCircuit, MessageSquare } from 'lucide-react';
import { Network, ActivityLog, Comment } from '../../types';
import { getOwnedObjects, getObject, getBalance } from '../../services/suiService';
import {
  useCurrentAccount,
  useDisconnectWallet,
} from '@mysten/dapp-kit';
import { appStore } from '@/lib/store';
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
  const [balance, setBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [copied, setCopied] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  
  const account = useCurrentAccount();
  const connectedAddress = account?.address || null;
  const { mutate: disconnect } = useDisconnectWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleCopy = () => {
    if (connectedAddress) {
      navigator.clipboard.writeText(connectedAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    if (disconnect) {
      disconnect();
    }
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

  // Remove this useEffect - we're not syncing with the store anymore
  // useEffect(() => {
  //   if (account?.address) {
  //     appStore.setConnectedAddress(account.address);
  //   } else {
  //     appStore.setConnectedAddress(null);
  //   }
  // }, [account]);

  const fetchBalance = async () => {
    if (!connectedAddress) {
      setBalance(null);
      return;
    }
    setLoadingBalance(true);
    try {
      const res = await getBalance(network, connectedAddress);
      if (res.result && res.result.totalBalance) {
        const mist = Number(res.result.totalBalance);
        setBalance((mist / 1_000_000_000).toFixed(4));
      } else {
        setBalance('0.0000');
      }
    } catch (e) {
      setBalance('0.0000');
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'objects' && connectedAddress) {
      fetchObjects();
    }
    if (activeTab === 'wallet' && connectedAddress) {
      fetchBalance();
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
        ? 'text-sui-400' 
        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
      }`}
      title={label}
    >
      <Icon size={16} strokeWidth={activeTab === id ? 2.5 : 2} />
      {activeTab === id && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sui-400 shadow-[0_0_8px_currentColor]"></span>
      )}
    </button>
  );

  return (
    <div className="w-80 bg-black border-l border-white/10 flex flex-col h-full font-sans shadow-2xl relative z-30">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black">
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
      <div className="shrink-0 flex border-b border-white/10 bg-black">
        <TabButton id="wallet" icon={Wallet} label="Wallet" />
        <TabButton id="objects" icon={Box} label="Objects" />
        <TabButton id="analysis" icon={BrainCircuit} label="Analysis" />
        <TabButton id="discuss" icon={MessageSquare} label="Discuss" />
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* --- WALLET TAB --- */}
        {activeTab === 'wallet' && (
            <WalletTab
              network={network}
              balance={balance}
              loadingBalance={loadingBalance}
              copied={copied}
              onCopy={handleCopy}
              formatAddress={formatAddress}
            />  
        )}

        {/* --- OBJECTS TAB --- */}
        {activeTab === 'objects' && (
          <div className="flex-1 flex flex-col min-h-0 bg-black">
            <ObjectsTab
              connectedAddress={connectedAddress}
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