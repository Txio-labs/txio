import React, { useState } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';
import { Workspace } from '../../types';

const typeDot: Record<Workspace['type'], string> = {
  Personal: 'bg-sky-400',
  Team: 'bg-electric-violet'
};

interface WorkspaceHeaderProps {
  currentWorkspace: Workspace;
  workspaces: Workspace[];
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
  onSwitchWorkspace: (ws: Workspace) => void;
  onCreateWorkspace: (name: string) => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  currentWorkspace,
  workspaces,
  isDropdownOpen,
  onToggleDropdown,
  onSwitchWorkspace,
  onCreateWorkspace
}) => {
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const workspaceCountLabel =
    workspaces.length === 1
      ? '1 workspace'
      : `${workspaces.length} workspaces`;

  const handleCreateWorkspace = () => {
    if (newWsName.trim()) {
      onCreateWorkspace(newWsName.trim());
      setNewWsName('');
      setIsCreatingWorkspace(false);
      onToggleDropdown();
    }
  };

  return (
    <div className="px-3 py-3 flex flex-col justify-center border-b border-slate-200 dark:border-white/[0.06] shrink-0 relative z-30 bg-slate-50 dark:bg-near-black">
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Workspace</div>

      <button
        onClick={onToggleDropdown}
        className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100/70 dark:bg-white/[0.02] px-2.5 py-2 text-left transition-colors hover:border-electric-violet/30 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${typeDot[currentWorkspace.type]}`} />

          <div className="min-w-0 flex-1">
            <div
              title={currentWorkspace.name}
              className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white transition-colors group-hover:text-electric-violet"
            >
              {currentWorkspace.name}
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                {currentWorkspace.type}
              </span>

              <span className="truncate text-[11px] text-slate-400 dark:text-slate-600">
                · {workspaceCountLabel}
              </span>
            </div>
          </div>
        </div>

        <ChevronDown size={14} className={`shrink-0 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40 bg-white/40 dark:bg-black/40 backdrop-blur-[1px]"
          onClick={onToggleDropdown}
          aria-hidden="true"
        />
      )}

      {isDropdownOpen && (
        <div className="absolute top-[calc(100%-4px)] left-3 right-3 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/[0.09] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 pt-2.5 pb-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400 dark:text-slate-600">
            {workspaceCountLabel}
          </div>

          <div className="px-1.5 pb-1.5 max-h-64 overflow-y-auto custom-scrollbar space-y-0.5">
            {workspaces.map(ws => {
              const isActive = ws.id === currentWorkspace.id;
              return (
                <button
                  key={ws.id}
                  onClick={() => { onSwitchWorkspace(ws); onToggleDropdown(); }}
                  className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                    isActive
                      ? 'bg-electric-violet/[0.1]'
                      : 'hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${typeDot[ws.type]}`} />

                  <div className="min-w-0">
                    <div className={`truncate text-sm font-medium ${
                      isActive ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}>
                      {ws.name}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-600">
                      {ws.type}
                    </div>
                  </div>

                  {isActive && <Check size={14} className="text-electric-violet shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="p-1.5 bg-slate-50 dark:bg-white/[0.015] border-t border-slate-200 dark:border-white/[0.06]">
            {isCreatingWorkspace ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  className="flex-1 bg-white dark:bg-black border border-slate-200 dark:border-white/[0.09] rounded-lg px-2.5 py-1.5 text-sm text-slate-900 dark:text-white focus:border-electric-violet/50 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors"
                  placeholder="Workspace name…"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateWorkspace();
                    if (e.key === 'Escape') setIsCreatingWorkspace(false);
                  }}
                />
                <button
                  onClick={handleCreateWorkspace}
                  disabled={!newWsName.trim()}
                  className="p-1.5 bg-slate-900 dark:bg-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-near-black rounded-lg transition-colors"
                  aria-label="Create workspace"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingWorkspace(true)}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white"
              >
                <Plus size={14} className="shrink-0 text-electric-violet" />
                <span className="truncate">Create workspace</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};