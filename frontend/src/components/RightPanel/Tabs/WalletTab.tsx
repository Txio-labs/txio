import React, { useState } from 'react';
import { ExternalLink, Copy, Check, LogOut, Wallet } from 'lucide-react';
import { Network } from '../../../types';
import { Avatar } from '../../ui/Avatar';
import { 
  useCurrentAccount, 
  useDisconnectWallet,
  ConnectButton 
} from '@mysten/dapp-kit';

interface WalletTabProps {
  network: Network;
  balance: string | null;
  loadingBalance: boolean;
  formatAddress: (address: string) => string;
}

export const WalletTab: React.FC<WalletTabProps> = ({
  network,
  balance,
  loadingBalance,
  formatAddress,
}) => {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const [copied, setCopied] = useState(false);
  
  const connectedAddress = currentAccount?.address || null;

  const handleCopy = async () => {
    if (connectedAddress) {
      await navigator.clipboard.writeText(connectedAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const getExplorerUrl = (address: string) => {
    const networkMap: Record<Network, string> = {
      mainnet: 'mainnet',
      testnet: 'testnet',
      devnet: 'devnet'
    };
    const networkName = networkMap[network] || 'testnet';
    return `https://suiscan.xyz/${networkName}/account/${address}`;
  };

  if (!connectedAddress) {
    return (
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
        <div className="p-8 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02] relative overflow-hidden group">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-sui-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-sui-500/20 to-cyan-500/20 flex items-center justify-center border border-white/10 shadow-lg shadow-sui-500/10">
              <Wallet size={32} className="text-sui-400" />
            </div>
            
            <h3 className="text-sm font-bold text-slate-200 mb-2">No Wallet Connected</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Connect your Sui wallet to view assets, simulate transactions, and execute on-chain operations.
            </p>
            
            {/* Custom styled ConnectButton */}
            <ConnectButton 
              className="!w-full !bg-gradient-to-r !from-sui-600 !to-cyan-600 hover:!from-sui-500 hover:!to-cyan-500 !text-white !font-bold !py-3 !px-6 !rounded-xl !shadow-lg !shadow-sui-900/50 !transition-all !duration-300 hover:!scale-[1.02] hover:!shadow-xl hover:!shadow-sui-900/70 !border-0 !relative !overflow-hidden group/btn"
              connectText={
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Wallet size={16} />
                  Connect Wallet
                </span>
              }
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                border: 'none',
                boxShadow: '0 10px 25px -5px rgba(8, 145, 178, 0.3), 0 0 20px rgba(6, 182, 212, 0.2)',
              }}
            />
            
            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-600">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>Secure connection via Sui Wallet Standard</span>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="space-y-3">
          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-sui-500/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-sui-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-1">Secure & Private</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">Your keys never leave your wallet. All transactions are signed locally.</p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-1">Lightning Fast</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">Instant connection to Sui network with real-time balance updates.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
      <div className="bg-gradient-to-br from-[#111] via-[#0c0c0e] to-black rounded-xl p-5 border border-white/10 shadow-xl relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-sui-500/10 blur-[40px] rounded-full group-hover:bg-sui-500/20 transition-all duration-700"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Active Account</div>
              <div className="font-bold text-white text-sm font-mono">{formatAddress(connectedAddress)}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Avatar size="xs" seed={connectedAddress || 'anonymous'} />
            </div>
          </div>

          <div className="mb-4">
            <div className="text-[10px] text-slate-500 font-mono mb-1">Balance</div>
            <div className="text-2xl font-mono font-bold text-white tracking-tight flex items-baseline gap-2">
              {loadingBalance ? <span className="animate-pulse">...</span> : (balance || '0.0000')}
              <span className="text-xs text-sui-400 font-sans font-bold">SUI</span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1 border border-white/10 mb-2">
            <button 
              onClick={handleCopy} 
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded hover:bg-white/5 text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-500"/> : <Copy size={12} />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <div className="w-px h-4 bg-white/10"></div>
            <button 
              onClick={() => window.open(getExplorerUrl(connectedAddress), '_blank')} 
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded hover:bg-white/5 text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
            >
              <ExternalLink size={12} />
              <span>Scan</span>
            </button>
          </div>
          
          <button 
            onClick={handleDisconnect}
            className="w-full py-2 bg-red-900/10 hover:bg-red-900/30 text-red-400 hover:text-red-300 text-xs font-bold rounded border border-red-900/30 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={12} /> Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};