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

  const handleCreateWorkspace = () => {
    if (newWsName.trim()) {
      onCreateWorkspace(newWsName.trim());
      setNewWsName('');
      setIsCreatingWorkspace(false);
      onToggleDropdown();
    }
  };

  return (
    <div className="h-16 px-4 flex flex-col justify-center border-b border-white/10 shrink-0 relative z-30 bg-black">
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Workspace</div>
      
      <button 
        onClick={onToggleDropdown} 
        className="flex items-center justify-between group py-1 -ml-1 px-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-slate-200 group-hover:text-white truncate">{currentWorkspace.name}</span>
          <span className={`px-1.5 py-[1px] rounded text-[9px] font-bold uppercase border tracking-wider ${currentWorkspace.type === 'Personal' ? 'border-slate-700/50 text-slate-500' : 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10'}`}>
            {currentWorkspace.type}
          </span>
        </div>
        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isDropdownOpen && (
        <div className="absolute top-14 left-2 right-2 bg-[#0c0c0e] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md">
          <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { onSwitchWorkspace(ws); onToggleDropdown(); }}
                className="w-full text-left px-4 py-2 text-xs font-bold text-slate-400 hover:bg-white/10 hover:text-white flex items-center justify-between transition-colors"
              >
                <span>{ws.name}</span>
                {ws.id === currentWorkspace.id && <Check size={12} className="text-sui-400"/>}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-700/50 p-1">
            {isCreatingWorkspace ? (
              <div className="px-2 py-1 flex items-center gap-2">
                <input
                  autoFocus
                  className="w-full bg-black border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-sui-500 outline-none placeholder:text-slate-600"
                  placeholder="Workspace Name"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateWorkspace();
                    if (e.key === 'Escape') setIsCreatingWorkspace(false);
                  }}
                />
                <button onClick={handleCreateWorkspace} className="p-1.5 bg-sui-600 hover:bg-sui-500 text-white rounded">
                  <Check size={12} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsCreatingWorkspace(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-sui-400 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Plus size={12} /> New Workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};