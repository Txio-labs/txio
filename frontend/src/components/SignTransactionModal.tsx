
import React from 'react';
import {
    AlertTriangle,
    ArrowRight,
    Box,
    FileText,
    Shield,
    Wallet,
    X
} from 'lucide-react';

import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import type { ConnectedWallet } from '@/wallet';
import { shortenAddress } from '@/wallet';

import { RequestItem } from '../types';

interface SignTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (signerAddress: string) => void;
  onRequestConnect: () => void;
  wallet: ConnectedWallet | null;
  request: RequestItem | null;
}

export const SignTransactionModal: React.FC<SignTransactionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onRequestConnect,
  wallet,
  request
}) => {
  const isSuiWallet = wallet?.family === 'sui';
  const canSign = Boolean(isSuiWallet && wallet?.address);

  if (!isOpen || !request) return null;

  const handleConfirm = () => {
    if (canSign && wallet?.address) {
      onConfirm(wallet.address);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-near-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-dark-indigo-glow border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-near-black">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield size={18} className="text-electric-violet" /> Review Simulation
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Review details before running a wallet-address simulation.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="bg-near-black border border-white/5 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                        <Wallet size={32} className={`mb-3 ${canSign ? 'text-emerald-400' : 'text-slate-600'}`} />
                        <h3 className="text-sm font-bold text-white mb-1">
                            {canSign ? 'Sui Wallet Ready' : wallet ? 'Wrong Wallet Family' : 'Wallet Recommended'}
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            {canSign
                                ? 'Your connected Sui wallet address will be used as the simulation sender.'
                                : wallet
                                  ? `This simulation flow supports Sui sender addresses only. ${wallet.name} is connected on ${wallet.family.toUpperCase()}.`
                                  : 'Connect a Sui wallet in the Inspector panel to simulate with your real sender address.'}
                        </p>
                        
                        {canSign ? (
                             <div className="bg-emerald-900/20 text-emerald-400 text-xs px-3 py-1.5 rounded-full border border-emerald-900/40 font-mono">
                                 {shortenAddress(wallet.address, 10, 4)}
                             </div>
                        ) : (
                            <div className="w-full max-w-[220px]">
                                <ConnectWalletButton fullWidth className="!rounded-xl !py-2.5" />
                            </div>
                        )}
                    </div>

                    <div className="bg-amber-900/10 border border-amber-900/30 p-3 rounded-lg flex gap-2">
                         <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                         <div>
                             <h4 className="text-xs font-bold text-amber-500">Security Note</h4>
                             <p className="text-[10px] text-amber-500/80 mt-1">
                                 This flow does not sign or broadcast on-chain. It runs a dev-inspect simulation and never handles private keys.
                             </p>
                         </div>
                     </div>
                </div>

                <div className="space-y-4">
                     <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">Transaction Summary</label>
                        <div className="bg-near-black border border-white/5 rounded-lg overflow-hidden">
                            <div className="p-3 border-b border-white/5 bg-dark-indigo-glow/50 flex items-center gap-2">
                                <FileText size={14} className="text-sky-400"/>
                                <span className="text-xs font-bold text-white">{request.txType || 'MoveCall'}</span>
                            </div>
                            <div className="p-3 space-y-2">
                                <div className="flex justify-between text-xs gap-4">
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
                        <div className="space-y-1">
                             <div className="flex items-center gap-2 text-xs text-slate-400 p-2 bg-near-black rounded border border-white/5">
                                 <Box size={12} className="text-blue-400"/>
                                 <span className="font-mono">{canSign ? shortenAddress(wallet!.address, 8, 4) : 'Signer wallet'}</span>
                                 <span className="ml-auto text-[10px] bg-blue-900/30 text-blue-400 px-1.5 rounded">Mutated</span>
                             </div>
                             {request.moveParams.arguments.some(a => a.value.startsWith('0x')) && (
                                 <div className="flex items-center gap-2 text-xs text-slate-400 p-2 bg-near-black rounded border border-white/5">
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

        <div className="p-4 border-t border-white/5 bg-dark-indigo-glow flex justify-end gap-3">
             <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
                 Cancel
             </button>
             <button 
                onClick={canSign ? handleConfirm : onRequestConnect}
                className="px-6 py-2 bg-electric-violet hover:bg-electric-violet disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded shadow-lg shadow-sui-900/20 flex items-center gap-2 transition-all"
             >
                 {canSign ? 'Run Simulation' : wallet ? 'Connect Sui Wallet' : 'Connect Wallet'} <ArrowRight size={14} />
             </button>
        </div>
      </div>
    </div>
  );
};
