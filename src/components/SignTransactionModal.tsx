import React from 'react';
import {
    AlertTriangle,
    ArrowRight,
    FileText,
    Shield,
    Wallet,
    X
} from 'lucide-react';

import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import type { ConnectedWallet } from '@/wallet';
import { shortenAddress } from '@/wallet';

import { RequestItem } from '../types';
import {
    describeTransaction,
    TX_CHAIN_LABELS,
    walletFamilyForChain
} from '@/services/transactionService';

interface SignTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onExecute?: () => void;
  onRequestConnect: () => void;
  wallet: ConnectedWallet | null;
  request: RequestItem | null;
}

export const SignTransactionModal: React.FC<SignTransactionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onExecute,
  onRequestConnect,
  wallet,
  request
}) => {
  if (!isOpen || !request) return null;

  const summary = describeTransaction(request);
  const chainLabel = TX_CHAIN_LABELS[summary.chain];
  const canSign = Boolean(wallet?.address && wallet.family === walletFamilyForChain(summary.chain));

  // Simulation doesn't need a signature; it just uses the wallet as sender
  // when one is connected.
  const handleConfirm = () => onConfirm();

  const handleExecute = () => {
    if (canSign && onExecute) {
      onExecute();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/70 dark:bg-near-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-white dark:bg-near-black">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield size={18} className="text-electric-violet" /> Review Transaction
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Review details before simulation or on-chain execution.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="bg-white dark:bg-near-black border border-slate-200 dark:border-white/5 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                        <Wallet size={32} className={`mb-3 ${canSign ? 'text-emerald-400' : 'text-slate-400 dark:text-slate-600'}`} />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                            {canSign ? `${chainLabel} Wallet Ready` : wallet ? 'Wrong Wallet' : 'Wallet Needed to Sign'}
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            {canSign
                                ? `Your connected ${chainLabel} wallet will sign and is used as the simulation sender.`
                                : wallet
                                  ? `This is a ${chainLabel} transaction, but ${wallet.name} is connected on ${wallet.family.toUpperCase()}. Connect a ${chainLabel} wallet to sign.`
                                  : `Connect a ${chainLabel} wallet to sign. You can still simulate on chains that don't need a sender.`}
                        </p>
                        
                        {canSign ? (
                             <div className="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-900/40 font-mono">
                                 {shortenAddress(wallet.address, 10, 4)}
                             </div>
                        ) : (
                            <div className="w-full max-w-[220px]">
                                <ConnectWalletButton fullWidth className="!rounded-xl !py-2.5" />
                            </div>
                        )}
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-3 rounded-lg flex gap-2">
                         <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                         <div>
                             <h4 className="text-xs font-bold text-amber-600 dark:text-amber-500">Security Note</h4>
                             <p className="text-[10px] text-amber-600/80 dark:text-amber-500/80 mt-1">
                                 {onExecute
                                     ? 'Simulate runs the call against current chain state without signing or broadcasting. Sign & Execute broadcasts a real transaction from your wallet.'
                                     : 'This flow never signs or broadcasts, and never handles private keys.'}
                             </p>
                         </div>
                     </div>
                </div>

                <div className="space-y-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 block">Transaction Summary</label>
                        <div className="bg-white dark:bg-near-black border border-slate-200 dark:border-white/5 rounded-lg overflow-hidden">
                            <div className="p-3 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-dark-indigo-glow/50 flex items-center gap-2">
                                <FileText size={14} className="text-sky-400"/>
                                <span className="text-xs font-bold text-slate-900 dark:text-white">{chainLabel} · {summary.kind}</span>
                            </div>
                            <div className="p-3 space-y-2">
                                <div className="flex justify-between text-xs gap-4">
                                    <span className="text-slate-500">Target</span>
                                    <span className="text-slate-700 dark:text-slate-300 font-mono truncate max-w-[200px]" title={summary.target}>
                                        {summary.target}
                                    </span>
                                </div>
                                {summary.details.map(([label, value]) => (
                                    <div key={label} className="flex justify-between text-xs gap-4">
                                        <span className="text-slate-500">{label}</span>
                                        <span className="text-slate-700 dark:text-slate-300 font-mono truncate max-w-[200px]">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                     </div>

                </div>
            </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-dark-indigo-glow flex justify-end gap-3">
             <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                 Cancel
             </button>
             {onExecute ? (
                 <>
                     <button
                        onClick={handleConfirm}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 dark:text-white text-xs font-bold rounded flex items-center gap-2 transition-all"
                     >
                         Simulate
                     </button>
                     <button
                        onClick={canSign ? handleExecute : onRequestConnect}
                        className="px-6 py-2 bg-slate-900 dark:bg-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-near-black text-xs font-bold rounded shadow-lg flex items-center gap-2 transition-all"
                     >
                         {canSign ? 'Sign & Execute' : `Connect ${chainLabel} Wallet`} <ArrowRight size={14} />
                     </button>
                 </>
             ) : (
                 <button
                    onClick={canSign ? handleConfirm : onRequestConnect}
                    className="px-6 py-2 bg-slate-900 dark:bg-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-near-black text-xs font-bold rounded shadow-lg flex items-center gap-2 transition-all"
                 >
                     {canSign ? 'Run Simulation' : `Connect ${chainLabel} Wallet`} <ArrowRight size={14} />
                 </button>
             )}
        </div>
      </div>
    </div>
  );
};