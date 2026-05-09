
import React from 'react';
import { ArrowRight, RefreshCw, Server, ShieldCheck, Activity } from 'lucide-react';
import { Network } from '../types';

interface NetworkSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  from: Network;
  to: Network;
}

export const NetworkSwitcherModal: React.FC<NetworkSwitcherModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  from,
  to
}) => {
  if (!isOpen) return null;

  const getNetworkColor = (n: Network) => {
      switch(n) {
          case 'mainnet': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
          case 'testnet': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
          case 'devnet': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
          default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0c0c0e] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative group">
          {/* Background Gradients */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sui-500 to-transparent opacity-50"></div>
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-sui-500/10 blur-3xl rounded-full pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>

          <div className="p-8 relative z-10">
              <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center mx-auto mb-4 shadow-inner">
                      <Server size={24} className="text-sui-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white mb-1">Switch Network Environment</h2>
                  <p className="text-xs text-slate-500">Confirm transition to a new blockchain network.</p>
              </div>
              
              <div className="flex items-center justify-between mb-8 relative">
                  {/* From Node */}
                  <div className="flex flex-col items-center gap-3 w-24">
                      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all ${getNetworkColor(from)}`}>
                          <ShieldCheck size={24} />
                      </div>
                      <div className="text-center">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Current</div>
                          <div className="text-xs font-bold text-slate-200 capitalize">{from}</div>
                      </div>
                  </div>

                  {/* Connection Line Animation */}
                  <div className="flex-1 flex flex-col items-center justify-center relative -top-3 px-2">
                       <div className="relative w-full h-px bg-slate-800">
                           <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-0.5 bg-gradient-to-r from-transparent via-sui-500 to-transparent opacity-50 animate-pulse"></div>
                       </div>
                       <div className="mt-2 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[9px] text-slate-500 font-mono flex items-center gap-1">
                           Connecting <span className="animate-pulse">...</span>
                       </div>
                  </div>

                  {/* To Node */}
                  <div className="flex flex-col items-center gap-3 w-24">
                      <div className={`w-14 h-14 rounded-2xl border-2 border-dashed flex items-center justify-center ${getNetworkColor(to).replace('bg-', 'hover:bg-')}`}>
                           <Activity size={24} className={to === 'mainnet' ? 'text-emerald-400' : to === 'testnet' ? 'text-amber-400' : 'text-blue-400'} />
                      </div>
                      <div className="text-center">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Target</div>
                          <div className="text-xs font-bold text-slate-200 capitalize">{to}</div>
                      </div>
                  </div>
              </div>

              <div className="bg-amber-900/10 border border-amber-900/30 rounded-xl p-4 flex gap-3 mb-6">
                  <RefreshCw size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                      <h4 className="text-xs font-bold text-amber-500 mb-1">Session Reset Required</h4>
                      <p className="text-[10px] text-amber-500/80 leading-relaxed">
                          Switching networks will reset your current object cache and active RPC connections. Your request history will be preserved.
                      </p>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <button onClick={onClose} className="px-4 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-all">
                      Cancel Request
                  </button>
                  <button onClick={onConfirm} className="px-4 py-3 bg-sui-600 hover:bg-sui-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sui-900/20 flex items-center justify-center gap-2 transition-all active:scale-95">
                      Confirm Switch <ArrowRight size={14} />
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};
