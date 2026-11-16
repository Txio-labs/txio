import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Select } from '../../Select';
import type { Network } from '../../../types';
import { resolveChainRpcUrl } from '@/services/suiService';
import { stellarPassphrase } from '@/services/adapters/stellarAdapter';
import {
  STELLAR_XDR_TYPES,
  decodeStellarRpcResult,
  decodeStellarXdr,
  detectStellarXdrType,
  summarizeStellarEnvelope,
  type StellarTransactionSummary,
  type StellarXdrType
} from '@/services/stellar/xdr';

const TX_HASH_RE = /^[0-9a-fA-F]{64}$/;

type Inspection =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; type: string; summary: StellarTransactionSummary | null; decoded: unknown };

const fieldClass =
  'w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs font-mono text-fg focus:border-line-strong focus:outline-none transition-colors';

/** Fetches a transaction's raw XDR from Soroban RPC by hash. */
const fetchTransaction = async (hash: string, network: Network) => {
  const res = await fetch(resolveChainRpcUrl('stellar', network), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: { hash } })
  });
  const body = (await res.json()) as { result?: Record<string, unknown>; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message ?? 'getTransaction failed.');
  if (!body.result || body.result.status === 'NOT_FOUND') {
    throw new Error(`Transaction ${hash} was not found on ${network}. Soroban RPC only keeps recent history (about 7 days).`);
  }
  return body.result;
};

/**
 * Decodes Stellar XDR a developer pastes in (any common type, auto-detected)
 * or a transaction fetched by hash, and summarizes transaction envelopes.
 */
export const StellarXdrInspector: React.FC<{ network: Network }> = ({ network }) => {
  const [input, setInput] = useState('');
  const [type, setType] = useState<'auto' | StellarXdrType>('auto');
  const [inspection, setInspection] = useState<Inspection>({ status: 'idle' });

  const value = input.trim();
  const isHash = TX_HASH_RE.test(value);

  const inspect = async () => {
    setInspection({ status: 'loading' });
    try {
      const [sdk, passphrase] = await Promise.all([import('@stellar/stellar-sdk'), stellarPassphrase(network)]);

      if (isHash) {
        const tx = await fetchTransaction(value.toLowerCase(), network);
        const envelope = typeof tx.envelopeXdr === 'string' ? tx.envelopeXdr : null;
        setInspection({
          status: 'done',
          type: `Transaction ${String(tx.status ?? '').toLowerCase()}`.trim(),
          summary: envelope ? summarizeStellarEnvelope(sdk, envelope, passphrase) : null,
          decoded: decodeStellarRpcResult(sdk, tx) ?? tx
        });
        return;
      }

      const resolved = type === 'auto' ? detectStellarXdrType(sdk, value) : type;
      if (!resolved) {
        throw new Error('This is not XDR of a type the inspector knows. Pick the type by hand to see why it does not decode.');
      }
      const decoded = decodeStellarXdr(sdk, resolved, value);
      setInspection({
        status: 'done',
        type: resolved,
        summary: resolved === 'TransactionEnvelope' ? summarizeStellarEnvelope(sdk, value, passphrase) : null,
        decoded
      });
    } catch (err) {
      setInspection({ status: 'error', message: err instanceof Error ? err.message : 'Could not decode this input.' });
    }
  };

  return (
    <section aria-label="XDR inspector" className="space-y-3 rounded-[10px] border border-line bg-surface p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 min-w-[12rem]">
          <span className="block text-[12px] font-semibold text-fg-subtle mb-1.5">Base64 XDR or transaction hash</span>
          <textarea
            className={`${fieldClass} h-20 resize-y`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="AAAAAgAAAAB… or a 64-character transaction hash"
            spellCheck={false}
          />
        </label>
        <div className="w-48 shrink-0 space-y-2">
          <Select
            value={isHash ? 'auto' : type}
            options={[{ label: 'Detect type', value: 'auto' }, ...STELLAR_XDR_TYPES.map((t) => ({ label: t, value: t }))]}
            onChange={(v) => setType(v as 'auto' | StellarXdrType)}
            size="xs"
            fullWidth
            disabled={isHash}
            ariaLabel="XDR type"
          />
          <button
            type="button"
            onClick={() => void inspect()}
            disabled={!value || inspection.status === 'loading'}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-inverse text-on-inverse text-xs font-semibold disabled:opacity-40"
          >
            {inspection.status === 'loading' && <Loader2 size={12} className="animate-spin" />}
            {isHash ? `Fetch from ${network}` : 'Decode'}
          </button>
        </div>
      </div>

      {inspection.status === 'error' && (
        <p role="alert" className="text-[12px] text-rose-600 dark:text-rose-400">{inspection.message}</p>
      )}

      {inspection.status === 'done' && (
        <div className="space-y-3">
          <div className="text-[12px] font-semibold text-fg-subtle">{inspection.type}</div>
          {inspection.summary && <TransactionSummary summary={inspection.summary} />}
          <pre className="max-h-80 overflow-auto custom-scrollbar rounded-lg border border-line bg-sunken p-3 text-[12px] font-mono text-fg whitespace-pre">
            {JSON.stringify(inspection.decoded, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
};

const TransactionSummary: React.FC<{ summary: StellarTransactionSummary }> = ({ summary }) => (
  <div className="rounded-lg border border-line bg-sunken p-3 space-y-2 text-[12px]">
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
      <dt className="text-fg-subtle">Hash</dt>
      <dd className="font-mono text-fg break-all">{summary.hash}</dd>
      <dt className="text-fg-subtle">{summary.kind === 'fee-bump' ? 'Fee source' : 'Source'}</dt>
      <dd className="font-mono text-fg break-all">{summary.source}</dd>
      <dt className="text-fg-subtle">Max fee</dt>
      <dd className="font-mono text-fg">{summary.fee} stroops</dd>
      {summary.sequence && (
        <>
          <dt className="text-fg-subtle">Sequence</dt>
          <dd className="font-mono text-fg">{summary.sequence}</dd>
        </>
      )}
      {summary.memo !== undefined && (
        <>
          <dt className="text-fg-subtle">Memo</dt>
          <dd className="font-mono text-fg break-all">{String(summary.memo)}</dd>
        </>
      )}
      <dt className="text-fg-subtle">Signatures</dt>
      <dd className="font-mono text-fg">{summary.signatures}</dd>
    </dl>
    <ol className="space-y-1.5 border-t border-line pt-2">
      {summary.operations.map((op, i) => (
        <li key={i} className="font-mono text-fg break-all">
          <span className="text-fg-subtle">{i + 1}. {op.type}</span>
          {op.function && (
            <>
              {' '}
              {op.contract?.slice(0, 6)}…{op.contract?.slice(-4)}.<span className="font-semibold">{op.function}</span>(
              {op.args?.map((a) => JSON.stringify(a)).join(', ')})
            </>
          )}
        </li>
      ))}
    </ol>
  </div>
);
