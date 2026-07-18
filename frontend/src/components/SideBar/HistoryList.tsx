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
        className="w-full flex items-center justify-center gap-2 py-2 mb-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all group shadow-sm"
      >
        <span>Open Full History</span>
        <ArrowUpRight size={12} className="opacity-50 group-hover:opacity-100" />
      </button>

      {workspaceHistory.length === 0 && (
        <div className="p-8 text-center opacity-50">
          <History size={24} className="mx-auto mb-2 text-slate-600"/>
          <p className="text-xs text-slate-500">No history yet</p>
        </div>
      )}
      
      {workspaceHistory.map((item, i) => {
        const isRpc = item.type === RequestType.RPC;
        const isSuccess = item.status && item.status < 400;
        return (
          <div 
            key={item.id || i} 
            onClick={() => onSelectRequest(item)}
            className="group p-3 rounded-lg hover:bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-all bg-white/[0.02]"
          >
            <div className="flex justify-between items-start mb-1">
              <span className={`text-xs font-bold truncate flex-1 ${isSuccess ? 'text-slate-300' : 'text-red-400'}`}>
                {item.name || 'Untitled Request'}
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ml-2 ${isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {item.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className={`uppercase font-bold tracking-wider ${isRpc ? 'text-blue-400/80' : 'text-amber-400/80'}`}>
                {isRpc ? 'RPC' : 'TX'}
              </span>
              <span className="w-0.5 h-0.5 bg-slate-600 rounded-full"></span>
              <span>{new Date(item.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};