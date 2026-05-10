
import React, { useState, useEffect } from 'react';
import { X, Wallet, Shield, ArrowRight, AlertTriangle, Box, FileText } from 'lucide-react';
import { RequestItem } from '../types';

interface SignTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (signerAddress: string) => void;
  walletAddress: string | null;
  request: RequestItem | null;
}

export const SignTransactionModal: React.FC<SignTransactionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  walletAddress,
  request
}) => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  useEffect(() => {
      if (walletAddress) {
          setIsWalletConnected(true);
      } else {
          setIsWalletConnected(false);
      }
  }, [walletAddress, isOpen]);

  if (!isOpen || !request) return null;

  const handleConfirm = () => {
    if (walletAddress) {
      onConfirm(walletAddress);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield size={18} className="text-sui-400" /> Sign Transaction
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Review details before executing on-chain.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Column: Signer Status */}
                <div className="space-y-6">
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                        <Wallet size={32} className={`mb-3 ${isWalletConnected ? 'text-emerald-400' : 'text-slate-600'}`} />
                        <h3 className="text-sm font-bold text-white mb-1">
                            {isWalletConnected ? 'Wallet Connected' : 'Wallet Required'}
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            {isWalletConnected 
                                ? 'Your wallet is ready to sign this transaction.' 
                                : 'You must connect a wallet in the Inspector panel to proceed.'}
                        </p>
                        
                        {isWalletConnected && (
                             <div className="bg-emerald-900/20 text-emerald-400 text-xs px-3 py-1.5 rounded-full border border-emerald-900/40 font-mono">
                                 {walletAddress?.slice(0, 10)}...{walletAddress?.slice(-4)}
                             </div>
                        )}
                    </div>

                    <div className="bg-amber-900/10 border border-amber-900/30 p-3 rounded-lg flex gap-2">
                         <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                         <div>
                             <h4 className="text-xs font-bold text-amber-500">Security Note</h4>
                             <p className="text-[10px] text-amber-500/80 mt-1">
                                 Transaction signing is handled by your connected wallet. No private keys are ever stored or transmitted by this app.
                             </p>
                         </div>
                     </div>
                </div>

                {/* Right Column: Preview */}
                <div className="space-y-4">
                     <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">Transaction Summary</label>
                        <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                            <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2">
                                <FileText size={14} className="text-violet-400"/>
                                <span className="text-xs font-bold text-white">{request.txType || 'MoveCall'}</span>
                            </div>
                            <div className="p-3 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Target</span>
                                    <span className="text-slate-300 font-mono truncate max-w-[150px]">
                                        {request.txType === 'MoveCall' ? `${request.moveParams.packageId}::${request.moveParams.module}::${request.moveParams.function}` : 'Native Transfer'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Gas Budget</span>
                                    <span className="text-slate-300 font-mono">{request.moveParams.gasBudget} MIST</span>
                                </div>
                            </div>
                        </div>
                     </div>

                     <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Objects Involved</label>
                        {/* Mock analysis of objects */}
                        <div className="space-y-1">
                             <div className="flex items-center gap-2 text-xs text-slate-400 p-2 bg-slate-950 rounded border border-slate-800">
                                 <Box size={12} className="text-blue-400"/>
                                 <span className="font-mono">0x7d2...94d1</span>
                                 <span className="ml-auto text-[10px] bg-blue-900/30 text-blue-400 px-1.5 rounded">Mutated</span>
                             </div>
                             {request.moveParams.arguments.some(a => typeof a === 'string' && a.startsWith('0x')) && (
                                 <div className="flex items-center gap-2 text-xs text-slate-400 p-2 bg-slate-950 rounded border border-slate-800">
                                     <Box size={12} className="text-slate-500"/>
                                     <span className="font-mono">Input Object</span>
                                     <span className="ml-auto text-[10px] bg-slate-800 text-slate-500 px-1.5 rounded">Read</span>
                                 </div>
                             )}
                        </div>
                     </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
             <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
                 Cancel
             </button>
             <button 
                onClick={handleConfirm}
                disabled={!isWalletConnected}
                className="px-6 py-2 bg-sui-600 hover:bg-sui-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded shadow-lg shadow-sui-900/20 flex items-center gap-2 transition-all"
             >
                 {isWalletConnected ? 'Sign with Wallet' : 'Connect Wallet First'} <ArrowRight size={14} />
             </button>
        </div>
      </div>
    </div>
  );
};
