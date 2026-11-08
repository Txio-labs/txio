import React from 'react';
import { Layers } from 'lucide-react';

// Shown on the "Transaction" tab when the active request is a plain JSON-RPC
// call. Offers to turn it into a transaction on the same chain rather than
// fabricating transaction fields on top of an RPC request.
export const TransactionNotice: React.FC<{ onConvert: () => void }> = ({ onConvert }) => (
  <div className="p-4 md:p-6 w-full">
    <div className="flex flex-col items-center text-center gap-3 py-12 rounded-card border border-dashed border-line bg-sunken">
      <Layers size={20} className="text-fg-subtle" />
      <h3 className="text-sm font-semibold text-fg">This request has no transaction to build</h3>
      <p className="text-xs text-fg-subtle max-w-sm leading-relaxed">
        This is a read-only JSON-RPC request. Switch it to a transaction to build, simulate and sign one on this chain.
      </p>
      <button
        onClick={onConvert}
        className="mt-2 px-3 py-1.5 rounded-lg bg-hover hover:bg-active text-fg text-xs font-semibold transition-colors"
      >
        Build a transaction
      </button>
    </div>
  </div>
);
