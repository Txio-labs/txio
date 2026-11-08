import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface MainnetExecutionWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const MainnetExecutionWarningModal: React.FC<MainnetExecutionWarningModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-elevated border border-line rounded-card shadow-card w-full max-w-md overflow-hidden relative group">
          {/* Background Gradients */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/10 blur-3xl rounded-full pointer-events-none"></div>

          <div className="p-8 relative z-10">
              <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-elevated rounded-card border border-line flex items-center justify-center mx-auto mb-4 shadow-inner text-red-500">
                      <ShieldAlert size={24} />
                  </div>
                  <h2 className="text-lg font-semibold text-fg mb-1">Mainnet Execution Warning</h2>
                  <p className="text-xs text-fg-subtle">You are about to execute a transaction on mainnet.</p>
              </div>
              
              <div className="bg-red-900/10 border border-red-900/30 rounded-[10px] p-4 flex gap-3 mb-6">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                      <h4 className="text-xs font-semibold text-red-500 mb-1">Irreversible Action</h4>
                      <p className="text-[12px] text-red-500/80 leading-relaxed">
                          This action will execute a real transaction on the main network and may incur real costs. Please verify the transaction details in your wallet before confirming.
                      </p>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <button onClick={onClose} className="px-4 py-3 bg-elevated border border-line hover:bg-hover text-fg-subtle hover:text-fg text-xs font-semibold rounded-[10px] transition-all">
                      Cancel
                  </button>
                  <button onClick={onConfirm} className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-[10px] shadow-card shadow-red-900/20 flex items-center justify-center gap-2 transition-all">
                      Confirm &amp; Execute
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};
