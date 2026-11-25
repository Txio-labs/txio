'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { appStore } from '@/lib/store';
import { CHAIN_LABEL, detectLookup, explorerTabFor, type LookupChain, type LookupMatch } from '@/services/lookup';

/** One search box: paste an address or transaction hash and open its explorer. */
export const LookupPage: React.FC = () => {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<LookupMatch | null>(null);

  const open = (chain: LookupChain, query: string) => {
    const { featureId, data } = explorerTabFor(chain);
    appStore.openTab(featureId as Parameters<typeof appStore.openTab>[0], { ...data, query });
  };

  const submit = () => {
    const found = detectLookup(input);
    setMatch(found);
    if (!found) {
      setError('Not an address or transaction hash on a supported chain.');
      return;
    }
    setError(null);
    if (found.candidates.length === 1) open(found.candidates[0], found.query);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5 custom-scrollbar">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setMatch(null);
              setError(null);
            }}
            placeholder="Address or transaction hash"
            aria-label="Lookup"
            className="w-full rounded-card border border-line bg-sunken py-2 pl-9 pr-3 font-mono text-xs text-fg outline-none focus:border-fg-subtle"
          />
        </div>
        <button type="submit" className="rounded-card border border-line px-4 py-2 text-xs font-semibold text-fg hover:bg-hover">
          Look up
        </button>
      </form>

      {error && <div className="text-xs text-red-500">{error}</div>}

      {match && match.candidates.length > 1 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-fg-subtle">This format fits more than one chain. Pick one:</div>
          <div className="flex flex-wrap gap-2">
            {match.candidates.map((chain) => (
              <button
                key={chain}
                type="button"
                onClick={() => open(chain, match.query)}
                className="rounded-card border border-line px-3 py-1.5 text-xs font-medium text-fg hover:bg-hover"
              >
                {CHAIN_LABEL[chain]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
