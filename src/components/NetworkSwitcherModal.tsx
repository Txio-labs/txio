import React from 'react';
import { AlertTriangle, ArrowRight, Check, RefreshCw } from 'lucide-react';
import { Network } from '../types';
import { Button, Modal, ModalFooter, StatusDot, networkTone } from './ui/primitives';
import { NETWORK_INFO } from './NetworkMenu';

interface NetworkSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  from: Network;
  to: Network;
}

function NetworkCard({ network, label, active }: { network: Network; label: string; active?: boolean }) {
  return (
    <div className={`flex-1 min-w-0 rounded-[10px] border p-3 ${active ? 'border-line-strong bg-surface shadow-card' : 'border-line bg-sunken'}`}>
      <div className="text-xs text-fg-subtle">{label}</div>
      <div className="mt-1.5 flex items-center gap-2">
        <StatusDot tone={networkTone(network)} />
        <span className="text-[15px] font-semibold text-fg">{NETWORK_INFO[network].label}</span>
      </div>
    </div>
  );
}

export const NetworkSwitcherModal: React.FC<NetworkSwitcherModalProps> = ({ isOpen, onClose, onConfirm, from, to }) => {
  const toMainnet = to === 'mainnet';

  // The confirm button takes focus, so Enter confirms; Modal closes on Escape.
  return (
    <Modal open={isOpen} onClose={onClose} width="sm" labelledBy="network-switch-title">
      <div className="px-5 pt-5 pb-4">
        <div className="h-10 w-10 rounded-[10px] border border-line bg-sunken flex items-center justify-center text-fg-muted">
          <RefreshCw size={17} />
        </div>
        <h2 id="network-switch-title" className="mt-4 text-[17px] font-semibold tracking-[-0.02em] text-fg">
          Switch to {NETWORK_INFO[to].label}?
        </h2>
        <p className="mt-1 text-[14px] text-fg-muted leading-relaxed">{NETWORK_INFO[to].hint}</p>

        <div className="mt-5 flex items-center gap-2">
          <NetworkCard network={from} label="Current" />
          <ArrowRight size={16} className="text-fg-subtle shrink-0" />
          <NetworkCard network={to} label="New" active />
        </div>

        <ul className="mt-5 space-y-2 text-[13px] text-fg-muted">
          <li className="flex gap-2.5">
            <Check size={15} className="text-emerald-500 shrink-0 mt-0.5" /> Request history and collections are kept.
          </li>
          <li className="flex gap-2.5">
            <RefreshCw size={14} className="text-fg-subtle shrink-0 mt-0.5" /> Cached objects and open RPC connections are reset.
          </li>
        </ul>

        {toMainnet && (
          <div className="mt-5 rounded-[10px] border border-amber-500/25 bg-amber-500/[0.07] p-3 flex gap-2.5">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[13px] text-amber-800 dark:text-amber-200 leading-relaxed">
              Mainnet transactions use real funds and can&apos;t be undone. Txio still asks before anything is signed.
            </p>
          </div>
        )}
      </div>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm} autoFocus>
          Switch to {NETWORK_INFO[to].label}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
