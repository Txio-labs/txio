import React from 'react';
import { Filter, FolderPlus, Plus } from 'lucide-react';
import { appStore } from '@/lib/store';

interface ContextToolbarProps {
  mode: string;
  onAddCollection?: () => void;
  onAddEnvVar?: () => void;
}

export const ContextToolbar: React.FC<ContextToolbarProps> = ({
  mode,
  onAddCollection,
  onAddEnvVar
}) => {
  const renderTitle = () => {
    switch (mode) {
      case 'collections': return "Explorer";
      case 'history': return "Timeline";
      case 'env': return "Config";
      default: return "";
    }
  };

  return (
    <div className="px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-30 bg-black">
      <h2 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 select-none">
        {renderTitle()}
      </h2>
      
      <div className="flex items-center gap-1">
        {mode === 'collections' && (
          <>
            <button 
              onClick={() => appStore.showToast('Filtering not implemented', 'info')} 
              className="p-1.5 text-slate-500 hover:text-white rounded hover:bg-white/10 transition-colors" 
              title="Filter"
            >
              <Filter size={12}/>
            </button>
            <button 
              onClick={onAddCollection} 
              className="p-1.5 text-slate-500 hover:text-sui-400 rounded hover:bg-white/10 transition-colors" 
              title="New Collection"
            >
              <FolderPlus size={14}/>
            </button>
          </>
        )}
        {mode === 'env' && (
          <button 
            onClick={onAddEnvVar} 
            className="p-1.5 text-slate-500 hover:text-sui-400 rounded hover:bg-white/10 transition-colors" 
            title="Add Variable"
          >
            <Plus size={14}/>
          </button>
        )}
      </div>
    </div>
  );
};