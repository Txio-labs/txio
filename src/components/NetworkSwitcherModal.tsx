
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Network } from '../types';

interface NetworkSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  from: Network;
  to: Network;
}

// mainnet carries real funds and gets the one warm/attention color; the rest
// are sandboxes and read as such, same idiom as a build pipeline's
// prod-vs-staging badges.
const NETWORK_COLOR: Record<Network, string> = {
  mainnet: '#4ade80',
  testnet: '#facc15',
  devnet: '#60a5fa',
  localnet: '#e879f9'
};

export const NetworkSwitcherModal: React.FC<NetworkSwitcherModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  from,
  to
}) => {
  if (!isOpen) return null;

  const isMainnetTarget = to === 'mainnet';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-elevated border border-line rounded-card shadow-card w-full max-w-sm overflow-hidden">
          <div className="p-6">
              <h2 className="text-sm font-semibold text-fg mb-1">Switch network</h2>
              <p className="text-xs text-fg-subtle mb-5">
                  This resets your object cache and active RPC connections. Request history is kept.
              </p>

              <div className="flex items-center gap-3 mb-5 font-mono text-sm">
                  <span className="flex items-center gap-1.5 text-fg-subtle">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: NETWORK_COLOR[from] }} />
                      {from}
                  </span>
                  <span className="text-fg-subtle">→</span>
                  <span className="flex items-center gap-1.5 font-semibold text-fg">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: NETWORK_COLOR[to] }} />
                      {to}
                  </span>
              </div>

              {isMainnetTarget && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2.5 mb-5">
                      <RefreshCw size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[12px] text-amber-600 dark:text-amber-400 leading-relaxed">
                          Mainnet transactions use real funds and can&apos;t be undone.
                      </p>
                  </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                  <button onClick={onClose} className="px-4 py-2.5 border border-line hover:border-line-strong text-fg-muted hover:text-fg text-xs font-semibold rounded-lg transition-colors">
                      Cancel
                  </button>
                  <button onClick={onConfirm} className="px-4 py-2.5 bg-inverse hover:opacity-90 text-on-inverse text-xs font-semibold rounded-lg transition-all">
                      Switch to {to}
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};