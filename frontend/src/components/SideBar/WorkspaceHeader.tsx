import React, { useState } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';
import { Workspace } from '../../types';

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
    <div className="px-3 py-3 flex flex-col justify-center border-b border-white/[0.06] shrink-0 relative z-30 bg-near-black">
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Workspace</div>

      <button
        onClick={onToggleDropdown}
        className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-2 text-left transition-colors hover:border-electric-violet/30 hover:bg-white/[0.04]"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-electric-violet shadow-[0_0_6px_rgba(123,63,242,0.6)]" />

          <div className="min-w-0 flex-1">
            <div
              title={currentWorkspace.name}
              className="truncate text-sm font-semibold tracking-tight text-white transition-colors group-hover:text-electric-violet"
            >
              {currentWorkspace.name}
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                currentWorkspace.type === 'Personal'
                  ? 'bg-white/[0.04] text-slate-400'
                  : 'bg-electric-violet/[0.12] text-electric-violet'
              }`}>
                {currentWorkspace.type}
              </span>

              <span className="truncate text-[11px] text-slate-500">
                {workspaceCountLabel}
              </span>
            </div>
          </div>
        </div>

        <ChevronDown size={14} className={`shrink-0 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isDropdownOpen && (
        <div className="absolute top-[calc(100%-4px)] left-3 right-3 bg-[#0a0a0c] border border-white/[0.09] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-1.5 max-h-64 overflow-y-auto custom-scrollbar space-y-0.5">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { onSwitchWorkspace(ws); onToggleDropdown(); }}
                className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  ws.id === currentWorkspace.id
                  ? 'bg-electric-violet/[0.1] text-white'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {ws.name}
                  </div>
                  <div className="mt-0.5">
                    <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      ws.type === 'Personal'
                        ? 'bg-white/[0.04] text-slate-500'
                        : 'bg-electric-violet/[0.12] text-electric-violet'
                    }`}>
                      {ws.type}
                    </span>
                  </div>
                </div>

                {ws.id === currentWorkspace.id && <Check size={14} className="text-electric-violet shrink-0"/>}
              </button>
            ))}
          </div>

          <div className="p-1.5 bg-white/[0.02] border-t border-white/[0.06]">
            {isCreatingWorkspace ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  className="flex-1 bg-black border border-white/[0.09] rounded-lg px-2.5 py-1.5 text-sm text-white focus:border-electric-violet/50 outline-none placeholder:text-slate-600 transition-colors"
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
                  className="p-1.5 bg-electric-violet hover:bg-soft-purple text-white rounded-lg transition-colors"
                  aria-label="Create workspace"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingWorkspace(true)}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white"
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
