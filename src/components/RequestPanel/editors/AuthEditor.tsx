import React from 'react';
import { KeyRound } from 'lucide-react';

// RPC endpoints in Txio are public fullnodes/testnets resolved from
// src/lib/constants.ts — there is no per-request auth/credential model today.
// Wallet-backed signing (for TRANSACTION requests) is handled separately via
// the "Transaction" tab and the Sign modal. Placeholder empty state rather
// than fabricated auth config.
export const AuthEditor: React.FC = () => (
  <div className="p-6 md:p-10 max-w-2xl mx-auto">
    <div className="flex flex-col items-center text-center gap-3 py-12 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black/40">
      <KeyRound size={20} className="text-slate-400" />
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No authentication required</h3>
      <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
        RPC endpoints are public and unauthenticated. Requests that mutate chain state are authorized by a
        connected wallet signature instead — see the Transaction tab.
      </p>
    </div>
  </div>
);
