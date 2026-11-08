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
    <div className="px-4 py-4 flex items-center justify-between gap-2 shrink-0 sticky top-0 z-30 bg-white/80 dark:bg-black/50 backdrop-blur-md">
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
          className="min-w-0 flex-1 rounded-lg border border-line bg-hover px-2.5 py-1.5 text-[12px] text-fg outline-none placeholder:text-fg-subtle focus:border-line-strong focus:ring-1 focus:ring-line"
        />
      ) : (
        <h2 className="font-semibold text-fg-subtle text-[12px] flex items-center gap-2 select-none px-1">
          {renderTitle()}
        </h2>
      )}
      
      <div className="flex items-center gap-1.5">
        {mode === 'collections' && (
          <>
            <button 
              onClick={onToggleFilter}
              className={`p-2 rounded-[10px] hover:bg-hover transition-all border hover:border-slate-200 dark:hover:border-white/5 ${isFilterOpen ? 'text-fg border-line bg-hover' : 'text-fg-subtle hover:text-fg border-transparent'}`}
              title={isFilterOpen ? 'Close filter' : 'Filter'}
              aria-label={isFilterOpen ? 'Close collection filter' : 'Filter collections'}
              aria-expanded={isFilterOpen}
              aria-controls="collection-filter"
            >
              <Filter size={14}/>
            </button>
            {onAddCollection && (
            <button 
              onClick={onAddCollection} 
              className="p-2 text-fg-subtle hover:text-fg rounded-[10px] hover:bg-hover transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/5" 
              title="New Collection"
            >
              <FolderPlus size={16}/>
            </button>
            )}
          </>
        )}
        {mode === 'env' && (
          <button 
            onClick={onAddEnvVar} 
            className="p-2 text-fg-subtle hover:text-fg rounded-[10px] hover:bg-hover transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/5" 
            title="Add Variable"
          >
            <Plus size={16}/>
          </button>
        )}
      </div>
    </div>
  );
};