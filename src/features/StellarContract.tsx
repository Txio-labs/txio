'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { Network } from '@/types';
import { apiService } from '@/services/api';

const short = (value: string, head = 10, tail = 6) =>
  value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rounded-card border border-line bg-sunken p-4">
    <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle">{title}</h3>
    {children}
  </section>
);
const Muted = ({ children }: { children: React.ReactNode }) => <div className="text-xs text-fg-subtle">{children}</div>;
const ErrorText = ({ message }: { message: string }) => <div className="text-xs text-red-500">{message}</div>;

/**
 * Contract view for a C... address. Shows the events the backend indexer has
 * recorded for it. Storage, WASM and full invocation history are not indexed yet.
 */
export const StellarContractView: React.FC<{ network: Network; contractId: string }> = ({ network, contractId }) => {
  const [topicFilter, setTopicFilter] = useState('');
  const events = useQuery({
    queryKey: ['stellar-contract-events', network, contractId],
    queryFn: () => apiService.getStellarContractEvents(contractId, network, 100),
  });

  const filtered = useMemo(() => {
    const list = events.data?.events ?? [];
    const needle = topicFilter.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((e) => e.eventType.toLowerCase().includes(needle) || e.topics.some((t) => t.toLowerCase().includes(needle)));
  }, [events.data, topicFilter]);

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Contract">
        <div className="break-all font-mono text-xs text-fg">{contractId}</div>
        <Muted>Indexed events only. Storage, WASM and invocation history are not indexed yet.</Muted>
      </Panel>
      <Panel title="Events">
        {events.isLoading ? (
          <div className="flex items-center gap-2 text-xs text-fg-subtle">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : events.error ? (
          <ErrorText message={(events.error as Error).message} />
        ) : (
          <>
            <input
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              placeholder="Filter by event type or topic"
              className="mb-3 w-full rounded-card border border-line bg-canvas px-3 py-1.5 font-mono text-xs text-fg outline-none focus:border-fg-subtle"
            />
            {filtered.length === 0 ? (
              <Muted>{events.data?.events.length ? 'No events match.' : 'No indexed events for this contract yet.'}</Muted>
            ) : (
              <ul className="divide-y divide-line">
                {filtered.map((e, i) => (
                  <li key={`${e.txHash}:${i}`} className="flex flex-col gap-0.5 py-2 text-xs">
                    <div className="flex justify-between gap-4">
                      <span className="text-fg">{e.eventType}</span>
                      <span className={e.inSuccessfulContractCall ? 'text-fg-subtle' : 'text-red-500'}>
                        ledger {e.ledger}
                        {e.ledgerClosedAt ? ` · ${new Date(e.ledgerClosedAt).toLocaleString()}` : ''}
                      </span>
                    </div>
                    <span className="font-mono text-fg-subtle">topics: {e.topics.map((t) => short(t, 14, 6)).join(', ') || '—'}</span>
                    {e.value && <span className="font-mono text-fg-subtle">value: {short(e.value, 18, 8)}</span>}
                    <span className="font-mono text-fg-subtle">tx {short(e.txHash, 12, 8)}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Panel>
    </div>
  );
};
