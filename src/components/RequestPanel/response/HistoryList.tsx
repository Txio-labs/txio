import React from 'react';
import { ArrowDownLeft, ArrowUpRight, ExternalLink, HelpCircle, RefreshCw } from 'lucide-react';
import type { TxHistoryItem } from '@/services/transactionHistory';

const DIRECTIONS: Record<TxHistoryItem['direction'], { label: string; tone: string; Icon: React.FC<{ size?: number }> }> = {
  in: { label: 'Received', tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10', Icon: ArrowDownLeft },
  out: { label: 'Sent', tone: 'text-amber-600 dark:text-amber-400 bg-amber-500/10', Icon: ArrowUpRight },
  self: { label: 'Self', tone: 'text-sky-600 dark:text-sky-400 bg-sky-500/10', Icon: RefreshCw },
  unknown: { label: 'Other', tone: 'text-fg-subtle bg-hover', Icon: HelpCircle },
};

const STATUS: Record<TxHistoryItem['status'], { label: string; tone: string }> = {
  success: { label: 'Success', tone: 'text-emerald-600 dark:text-emerald-400' },
  failed: { label: 'Failed', tone: 'text-red-600 dark:text-red-400' },
  unknown: { label: 'Unknown', tone: 'text-fg-subtle' },
};

const formatWhen = (ts: number | null) =>
  ts == null
    ? 'Unknown time'
    : new Date(ts * 1000).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC';

const shortAddress = (address: string) => (address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address);

const capitalize = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

export const HistoryList: React.FC<{ items: TxHistoryItem[]; warning?: string }> = ({ items, warning }) => {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-[14px] text-fg-muted">
        {warning ?? 'No transactions found for this address.'}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto custom-scrollbar min-h-0">
      {warning && <p className="mx-4 mt-3 text-[13px] text-amber-600 dark:text-amber-400">{warning}</p>}
      <p className="px-4 pt-3 pb-1 text-[12px] font-medium uppercase tracking-wide text-fg-subtle">
        {items.length} transaction{items.length === 1 ? '' : 's'}
      </p>
      <ul className="divide-y divide-line">
        {items.map((item) => {
          const direction = DIRECTIONS[item.direction] ?? DIRECTIONS.unknown;
          const status = STATUS[item.status] ?? STATUS.unknown;
          const { Icon } = direction;
          return (
            <li key={`${item.hash}-${item.direction}-${item.amount ?? ''}`} className="flex items-center gap-3 px-4 py-3">
              <span className={`h-8 w-8 shrink-0 rounded-full inline-flex items-center justify-center ${direction.tone}`} title={direction.label} aria-label={direction.label}>
                <Icon size={15} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-fg truncate">{capitalize(item.label ?? 'Transaction')}</p>
                <p className="mt-0.5 text-[12px] text-fg-subtle tabular truncate">
                  {formatWhen(item.timestamp)}
                  {item.counterparty && <span> · {direction.label} {item.direction === 'out' ? 'to' : 'from'} {shortAddress(item.counterparty)}</span>}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="font-mono text-[14px] text-fg tabular whitespace-nowrap">{item.amount ?? '—'}</p>
                <p className={`mt-0.5 text-[12px] font-medium ${status.tone}`}>{status.label}</p>
              </div>

              {item.explorerUrl && (
                <a
                  href={item.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open in explorer"
                  title="Open in explorer"
                  className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-[7px] text-fg-subtle hover:text-fg hover:bg-hover transition-colors"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
