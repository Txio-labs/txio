import React from 'react';
import { Layers } from 'lucide-react';
import { Select } from '../../Select';
import { ChainId, EnvironmentVariable, Network, RequestItem } from '../../../types';
import { RPC_CHAINS } from '@/lib/constants';
import { getTxChain, withTxChain } from '@/services/transactionService';
import { TransactionBuilder } from './TransactionBuilder';
import { EvmTransactionBuilder } from './EvmTransactionBuilder';
import { SolanaTransactionBuilder } from './SolanaTransactionBuilder';
import { StellarTransactionBuilder } from './StellarTransactionBuilder';
import { TxTracker } from '../response/TxTracker';
import { RequestOutcome, TxProgress } from '../response/types';

interface TransactionEditorProps {
  request: RequestItem;
  activeAddress: string | null;
  envVars: EnvironmentVariable[];
  network: Network;
  isReadOnly?: boolean;
  onChange: (updatedReq: RequestItem) => void;
  outcome?: RequestOutcome | null;
  txProgress?: TxProgress | null;
  isLoading?: boolean;
}

/**
 * Transaction form for any chain: pick the chain, get that chain's native
 * transaction shape. Simulation and execution go through transactionService.
 * Uses the same flat bg-slate-50 card language as Headers/Auth/Advanced, but
 * — like the Params tab (RPCBuilder) it sits alongside — runs the full width
 * of the panel rather than capping to a narrow column: this is a real form
 * with fields worth the space, not a short static blurb.
 */
export const TransactionEditor: React.FC<TransactionEditorProps> = ({
  request,
  activeAddress,
  envVars,
  network,
  isReadOnly,
  onChange,
  outcome = null,
  txProgress = null,
  isLoading = false
}) => {
  const chain = getTxChain(request);

  const form = (() => {
    switch (chain) {
      case 'evm':
        return <EvmTransactionBuilder request={request} activeAddress={activeAddress} isReadOnly={isReadOnly} onChange={onChange} />;
      case 'solana':
        return <SolanaTransactionBuilder request={request} activeAddress={activeAddress} onChange={onChange} />;
      case 'stellar':
        return <StellarTransactionBuilder request={request} activeAddress={activeAddress} isReadOnly={isReadOnly} onChange={onChange} />;
      default:
        return (
          <TransactionBuilder
            request={request}
            activeAddress={activeAddress}
            envVars={envVars}
            network={network}
            isReadOnly={isReadOnly}
            onChange={onChange}
          />
        );
    }
  })();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Layers size={16} className="text-slate-400" />
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-[0.2em]">
          Transaction
        </h3>
      </div>

      <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black/40">
        <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Chain</div>
        <div className="text-xs text-slate-500 mb-3">Which chain this transaction targets — sets the params below and which wallet can sign it.</div>
        <div className="max-w-xs">
          <Select
            value={chain}
            options={RPC_CHAINS.map((c) => ({ label: c.label, value: c.id }))}
            onChange={(v) => onChange(withTxChain(request, v as ChainId))}
            fullWidth
            disabled={isReadOnly}
          />
        </div>
      </div>

      {form}
      <TxTracker outcome={outcome} progress={txProgress} isLoading={isLoading} />
    </div>
  );
};
