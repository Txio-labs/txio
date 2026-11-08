import React, { useMemo } from 'react';
import { History, ArrowUpRight } from 'lucide-react';
import { HistoryItem, Workspace, RequestType } from '../../types';
import { appStore } from '@/lib/store';

interface HistoryListProps {
  history: HistoryItem[];
  currentWorkspace: Workspace;
  onSelectRequest: (req: HistoryItem) => void;
  onOpenFullHistory: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  history,
  currentWorkspace,
  onSelectRequest,
  onOpenFullHistory
}) => {
  const workspaceHistory = useMemo(() => {
    if (!history) return [];
    return history.filter(item => 
      !item.workspaceId || item.workspaceId === currentWorkspace.id
    );
  }, [history, currentWorkspace.id]);

  return (
    <div className="px-2 space-y-2 pb-4">
      <button 
        onClick={onOpenFullHistory}
        className="w-full flex items-center justify-center gap-2 py-2 mb-2 bg-hover hover:bg-hover border border-line hover:border-line-strong rounded-lg text-xs font-semibold text-fg-subtle hover:text-fg transition-all group shadow-sm"
      >
        <span>Open Full History</span>
        <ArrowUpRight size={12} className="opacity-50 group-hover:opacity-100" />
      </button>

      {workspaceHistory.length === 0 && (
        <div className="p-8 text-center opacity-50">
          <History size={24} className="mx-auto mb-2 text-fg-muted"/>
          <p className="text-xs text-fg-subtle">No history yet</p>
        </div>
      )}
      
      {workspaceHistory.map((item, i) => {
        const isRpc = item.type === RequestType.RPC;
        const isSuccess = item.status && item.status < 400;
        return (
          <button 
            key={item.id || i} 
            onClick={() => onSelectRequest(item)}
            className="group p-3 rounded-lg hover:bg-hover border border-line hover:border-slate-200 dark:hover:border-white/10 cursor-pointer transition-all bg-hover text-left w-full"
          >
            <div className="flex justify-between items-start mb-1">
              <span className={`text-xs font-semibold truncate flex-1 ${isSuccess ? 'text-fg-muted' : 'text-red-600 dark:text-red-400'}`}>
                {item.name || 'Untitled Request'}
              </span>
              <span className={`text-[12px] font-mono px-1.5 py-0.5 rounded ml-2 ${isSuccess ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'}`}>
                {item.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-fg-subtle">
              <span className={` font-semibold ${isRpc ? 'text-blue-400/80' : 'text-amber-400/80'}`}>
                {isRpc ? 'RPC' : 'TX'}
              </span>
              <span className="w-0.5 h-0.5 bg-slate-600 rounded-full"></span>
              <span>{new Date(item.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};