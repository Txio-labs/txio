import React, { useEffect, useRef } from 'react';
import { Filter, FolderPlus, Plus } from 'lucide-react';

interface ContextToolbarProps {
  mode: string;
  onAddCollection?: () => void;
  onAddEnvVar?: () => void;
  filterQuery?: string;
  isFilterOpen?: boolean;
  onFilterQueryChange?: (query: string) => void;
  onToggleFilter?: () => void;
}

export const ContextToolbar: React.FC<ContextToolbarProps> = ({
  mode,
  onAddCollection,
  onAddEnvVar,
  filterQuery = '',
  isFilterOpen = false,
  onFilterQueryChange,
  onToggleFilter
}) => {
  const filterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFilterOpen) {
      filterInputRef.current?.focus();
    }
  }, [isFilterOpen]);

  const renderTitle = () => {
    switch (mode) {
      case 'collections': return "Explorer";
      case 'history': return "Timeline";
      case 'env': return "Config";
      default: return "";
    }
  };

  return (
    <div className="px-4 py-4 flex items-center justify-between gap-2 shrink-0 sticky top-0 z-30 bg-white/80 dark:bg-near-black/50 backdrop-blur-md">
      {mode === 'collections' && isFilterOpen ? (
        <input
          ref={filterInputRef}
          id="collection-filter"
          type="search"
          value={filterQuery}
          onChange={(event) => onFilterQueryChange?.(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onToggleFilter?.();
            }
          }}
          aria-label="Filter collections"
          placeholder="Filter by name or RPC method..."
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-electric-violet/60 focus:ring-1 focus:ring-electric-violet/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:placeholder:text-slate-600"
        />
      ) : (
        <h2 className="font-black text-slate-500 text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 select-none px-1">
          {renderTitle()}
        </h2>
      )}

      <div className="flex items-center gap-1.5">
        {mode === 'collections' && (
          <>
            <button
              onClick={onToggleFilter}
              className={`p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all border hover:border-slate-200 dark:hover:border-white/5 ${isFilterOpen ? 'text-electric-violet border-electric-violet/20 bg-electric-violet/10' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white border-transparent'}`}
              title={isFilterOpen ? 'Close filter' : 'Filter'}
              aria-label={isFilterOpen ? 'Close collection filter' : 'Filter collections'}
              aria-expanded={isFilterOpen}
              aria-controls="collection-filter"
            >
              <Filter size={14}/>
            </button>
            <button
              onClick={onAddCollection}
              className="p-2 text-slate-500 hover:text-electric-violet rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/5"
              title="New Collection"
            >
              <FolderPlus size={16}/>
            </button>
          </>
        )}
        {mode === 'env' && (
          <button
            onClick={onAddEnvVar}
            className="p-2 text-slate-500 hover:text-electric-violet rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/5"
            title="Add Variable"
          >
            <Plus size={16}/>
          </button>
        )}
      </div>
    </div>
  );
};
