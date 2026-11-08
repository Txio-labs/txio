import React, { useState } from 'react';
import { ChevronDown, Check, Plus, Users } from 'lucide-react';
import { Workspace } from '../../types';

const typeDot: Record<Workspace['type'], string> = {
  Personal: 'bg-sky-400',
  Team: 'bg-inverse'
};

interface WorkspaceHeaderProps {
  currentWorkspace: Workspace;
  workspaces: Workspace[];
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
  onSwitchWorkspace: (ws: Workspace) => void;
  onCreateWorkspace: (name: string) => void;
  onOpenMembers?: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  currentWorkspace,
  workspaces,
  isDropdownOpen,
  onToggleDropdown,
  onSwitchWorkspace,
  onCreateWorkspace,
  onOpenMembers
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
    <div className="px-3 py-3 flex flex-col justify-center border-b border-line shrink-0 relative z-30 bg-surface">
      <div className="text-[12px] font-semibold text-fg-subtle mb-1.5 px-1">Workspace</div>

      <button
        onClick={onToggleDropdown}
        className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-line bg-hover px-2.5 py-2 text-left transition-colors hover:border-line-strong hover:bg-hover"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${typeDot[currentWorkspace.type]}`} />

          <div className="min-w-0 flex-1">
            <div
              title={currentWorkspace.name}
              className="truncate text-sm font-semibold tracking-tight text-fg transition-colors group-hover:text-fg"
            >
              {currentWorkspace.name}
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px]">
              <span className="font-mono text-[12px] text-fg-subtle">
                {currentWorkspace.type}
              </span>

              <span className="truncate text-[12px] text-fg-subtle">
                · {workspaceCountLabel}
              </span>
            </div>
          </div>
        </div>

        <ChevronDown size={14} className={`shrink-0 text-fg-subtle transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40 bg-white/40 dark:bg-black/40 backdrop-blur-[1px]"
          onClick={onToggleDropdown}
          aria-hidden="true"
        />
      )}

      {isDropdownOpen && (
        <div className="absolute top-[calc(100%-4px)] left-3 right-3 bg-elevated border border-line rounded-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 pt-2.5 pb-1.5 text-[12px] font-mono text-fg-subtle">
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
                      ? 'bg-active'
                      : 'hover:bg-hover'
                  }`}
                >
                  <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${typeDot[ws.type]}`} />

                  <div className="min-w-0">
                    <div className={`truncate text-sm font-medium ${
                      isActive ? 'text-fg' : 'text-fg-muted'
                    }`}>
                      {ws.name}
                    </div>
                    <div className="font-mono text-[12px] text-fg-subtle">
                      {ws.type}{ws.role && ws.role !== 'owner' ? ` · ${ws.role}` : ''}
                    </div>
                  </div>

                  {isActive && <Check size={14} className="text-fg shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="p-1.5 bg-sunken border-t border-line">
            {onOpenMembers && !isCreatingWorkspace && (
              <button
                onClick={() => { onOpenMembers(); onToggleDropdown(); }}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-fg-muted transition-colors hover:bg-hover hover:text-fg"
              >
                <Users size={14} />
                Members
              </button>
            )}
            {isCreatingWorkspace ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  className="flex-1 bg-white dark:bg-black border border-line rounded-lg px-2.5 py-1.5 text-sm text-fg focus:border-line-strong outline-none placeholder:text-fg-subtle transition-colors"
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
                  className="p-1.5 bg-inverse hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-on-inverse rounded-lg transition-colors"
                  aria-label="Create workspace"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingWorkspace(true)}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-fg-muted transition-colors hover:bg-hover hover:text-fg"
              >
                <Plus size={14} className="shrink-0 text-fg" />
                <span className="truncate">Create workspace</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};