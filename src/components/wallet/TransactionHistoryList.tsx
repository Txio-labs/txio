import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ExternalLink, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { ConnectedWallet } from '@/wallet/types';
import { shortenAddress } from '@/wallet/utils';
import { getTransactionHistory, type TransactionHistoryResult } from '@/services/transactionHistory';

const DirectionIcon: React.FC<{ direction: 'in' | 'out' | 'self' | 'unknown' }> = ({ direction }) => {
  if (direction === 'out') {
    return <ArrowUpRight size={14} className="text-red-500" />;
  }
  if (direction === 'in') {
    return <ArrowDownLeft size={14} className="text-emerald-500" />;
  }
  return <ArrowLeftRight size={14} className="text-fg-subtle" />;
};

const StatusBadge: React.FC<{ status: 'success' | 'failed' | 'unknown' }> = ({ status }) => {
  const classes =
    status === 'success'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : status === 'failed'
        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
        : 'bg-active text-fg-muted';

  return (
    <span className={`inline-flex items-center h-5 px-1.5 rounded-md text-xs font-medium capitalize ${classes}`}>
      {status}
    </span>
  );
};

export const TransactionHistoryList: React.FC<{ wallet: ConnectedWallet }> = ({ wallet }) => {
  const { network } = useAppStore();
  const key = `${wallet.family}:${wallet.address}:${wallet.chain?.id ?? ''}:${network}`;
  const [loaded, setLoaded] = useState<{ key: string; result: TransactionHistoryResult } | null>(null);
  const loading = loaded?.key !== key;
  const result = loading ? null : loaded.result;

  useEffect(() => {
    let cancelled = false;
    getTransactionHistory(wallet, network).then((res) => {
      if (!cancelled) setLoaded({ key, result: res });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-5 py-8 text-xs text-fg-subtle">
        <Loader2 size={16} className="animate-spin" /> Loading transaction history…
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div>
      {result.warning && (
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-[10px] border border-amber-500/25 bg-amber-500/[0.07] p-3 text-[13px] text-amber-700 dark:text-amber-300">
          {result.warning}
        </div>
      )}

      {result.items.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs text-fg-subtle">
          No transactions found.
        </div>
      ) : (
        <div className="divide-y divide-line">
          {result.items.map((item) => {
            const row = (
              <div
                key={item.hash}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-hover transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <DirectionIcon direction={item.direction} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[13px] text-fg truncate">{shortenAddress(item.hash)}</span>
                      {item.label && <span className="text-xs text-fg-muted truncate">{item.label}</span>}
                    </div>
                    <div className="text-xs text-fg-subtle">
                      {item.timestamp !== null ? new Date(item.timestamp * 1000).toLocaleString() : 'Unknown time'}
                      {item.counterparty && (
                        <>
                          {' · '}
                          {item.direction === 'out' ? 'to ' : 'from '}
                          <span className="font-mono">{shortenAddress(item.counterparty)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.amount && (
                    <span className="text-[13px] font-mono tabular text-fg">{item.amount}</span>
                  )}
                  <StatusBadge status={item.status} />
                  {item.explorerUrl && (
                    <a
                      href={item.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-fg-subtle hover:text-fg transition-colors"
                      title="View on explorer"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            );

            return row;
          })}
        </div>
      )}
    </div>
  );
};
