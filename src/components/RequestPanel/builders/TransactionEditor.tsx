import React from 'react';
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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Chain</span>
        <div className="w-48">
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
