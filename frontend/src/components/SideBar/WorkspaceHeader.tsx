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
    <div className="px-4 py-5 flex flex-col justify-center border-b border-white/5 shrink-0 relative z-30 bg-near-black/50 backdrop-blur-md">
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">Workspace</div>
      
      <button 
        onClick={onToggleDropdown} 
        className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[1.15rem] border border-white/8 bg-white/[0.02] px-3 py-3 text-left transition-all hover:border-electric-violet/20 hover:bg-white/[0.035] active:scale-[0.98]"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-electric-violet shadow-[0_0_8px_rgba(123,63,242,0.6)]" />

          <div className="min-w-0 flex-1">
            <div
              title={currentWorkspace.name}
              className="truncate text-sm font-bold tracking-tight text-white transition-colors group-hover:text-electric-violet"
            >
              {currentWorkspace.name}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.22em] ${
                currentWorkspace.type === 'Personal'
                  ? 'border-white/10 bg-white/[0.03] text-slate-400'
                  : 'border-electric-violet/30 bg-electric-violet/10 text-electric-violet'
              }`}>
                {currentWorkspace.type}
              </span>

              <span className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                {workspaceCountLabel}
              </span>
            </div>
          </div>
        </div>

        <ChevronDown size={14} className={`mt-0.5 shrink-0 text-slate-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isDropdownOpen && (
        <div className="absolute top-[calc(100%-8px)] left-3 right-3 bg-[#0a0a0c] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl">
          <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar space-y-1">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { onSwitchWorkspace(ws); onToggleDropdown(); }}
                className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  ws.id === currentWorkspace.id 
                  ? 'bg-electric-violet/10 text-white' 
                  : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold">
                    {ws.name}
                  </div>
                  <div className="mt-1">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.22em] ${
                      ws.type === 'Personal'
                        ? 'border-white/10 text-slate-500'
                        : 'border-electric-violet/30 bg-electric-violet/10 text-electric-violet'
                    }`}>
                      {ws.type}
                    </span>
                  </div>
                </div>

                {ws.id === currentWorkspace.id && <Check size={14} className="text-electric-violet shrink-0"/>}
              </button>
            ))}
          </div>
          
          <div className="p-2 bg-white/[0.02] border-t border-white/5">
            {isCreatingWorkspace ? (
              <div className="px-1 flex items-center gap-2">
                <input
                  autoFocus
                  className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-electric-violet/50 outline-none placeholder:text-slate-600 transition-all"
                  placeholder="Workspace Name..."
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateWorkspace();
                    if (e.key === 'Escape') setIsCreatingWorkspace(false);
                  }}
                />
                <button 
                  onClick={handleCreateWorkspace} 
                  className="p-2 bg-electric-violet hover:bg-soft-purple text-white rounded-xl transition-colors shadow-lg shadow-electric-violet/20"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsCreatingWorkspace(true)}
                className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-400 transition-all hover:bg-white/[0.05] hover:text-white"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Plus size={14} className="shrink-0 text-electric-violet" /> 
                  <span className="truncate whitespace-nowrap">
                    Create Workspace
                  </span>
                </span>
                <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
                  New
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
