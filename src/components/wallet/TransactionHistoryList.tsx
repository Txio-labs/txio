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
  return <ArrowLeftRight size={14} className="text-slate-400" />;
};

const StatusBadge: React.FC<{ status: 'success' | 'failed' | 'unknown' }> = ({ status }) => {
  const classes =
    status === 'success'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : status === 'failed'
        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
        : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400';

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${classes}`}>
      {status}
    </span>
  );
};

export const TransactionHistoryList: React.FC<{ wallet: ConnectedWallet }> = ({ wallet }) => {
  const { network } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<TransactionHistoryResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getTransactionHistory(wallet, network).then((res) => {
      if (!cancelled) {
        setResult(res);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.address, wallet.family, network]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-5 py-8 text-xs text-slate-500">
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
        <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 p-3 text-[11px] text-amber-700 dark:text-amber-400">
          {result.warning}
        </div>
      )}

      {result.items.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs text-slate-500">
          No transactions found.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {result.items.map((item) => {
            const row = (
              <div
                key={item.hash}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <DirectionIcon direction={item.direction} />
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-slate-900 dark:text-white truncate">
                      {shortenAddress(item.hash)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {item.timestamp !== null
                        ? new Date(item.timestamp * 1000).toLocaleString()
                        : 'Unknown time'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.amount && (
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.amount}</span>
                  )}
                  <StatusBadge status={item.status} />
                  {item.explorerUrl && (
                    <a
                      href={item.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
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
