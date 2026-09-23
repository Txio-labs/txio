import React from 'react';
import { Layers } from 'lucide-react';

// Shown on the "Transaction" tab when the active request is a plain JSON-RPC
// call. Offers to turn it into a transaction on the same chain rather than
// fabricating transaction fields on top of an RPC request.
export const TransactionNotice: React.FC<{ onConvert: () => void }> = ({ onConvert }) => (
  <div className="p-6 md:p-10 max-w-2xl mx-auto">
    <div className="flex flex-col items-center text-center gap-3 py-12 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black/40">
      <Layers size={20} className="text-slate-400" />
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">This request has no transaction to build</h3>
      <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
        This is a read-only JSON-RPC request. Switch it to a transaction to build, simulate and sign one on this chain.
      </p>
      <button
        onClick={onConvert}
        className="mt-2 px-3 py-1.5 rounded-lg bg-electric-violet/10 hover:bg-electric-violet/20 text-electric-violet text-xs font-bold transition-colors"
      >
        Build a transaction
      </button>
    </div>
  </div>
);
