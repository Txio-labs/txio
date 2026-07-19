import React, { useState, useEffect, useRef } from 'react';
import { Folder, Plus, ChevronRight, ChevronDown, Play } from 'lucide-react';
import { CollectionNode } from '../../types';
import { appStore } from '@/lib/store';

interface CollectionTreeProps {
  collections: CollectionNode[];
  filterQuery?: string;
  activeTabId: string | null;
  onToggleExpand: (nodeId: string) => void;
  onSelectCollectionRequest: (node: CollectionNode) => void;
  onCreateCollection: (name: string) => void;
}

const nodeMatchesQuery = (node: CollectionNode, query: string) => {
  const searchableValues = [
    node.name,
    node.requestData?.name,
    node.requestData?.rpcParams?.method
  ];

  return searchableValues.some((value) =>
    value?.toLowerCase().includes(query)
  );
};

export const filterCollectionTree = (
  nodes: CollectionNode[],
  filterQuery: string
): CollectionNode[] => {
  const query = filterQuery.trim().toLowerCase();

  if (!query) {
    return nodes;
  }

  return nodes.flatMap((node) => {
    const selfMatches = nodeMatchesQuery(node, query);
    const filteredChildren = filterCollectionTree(node.children ?? [], query);

    if (!selfMatches && filteredChildren.length === 0) {
      return [];
    }

    return [{
      ...node,
      children: selfMatches ? node.children : filteredChildren
    }];
  });
};

export const CollectionTree: React.FC<CollectionTreeProps> = ({
  collections,
  filterQuery = '',
  activeTabId,
  onToggleExpand,
  onSelectCollectionRequest,
  onCreateCollection
}) => {
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);
  const isFiltering = filterQuery.trim().length > 0;
  const visibleCollections = filterCollectionTree(collections, filterQuery);

  useEffect(() => {
    if (isAddingCollection && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isAddingCollection]);

  const handleCreateCollection = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const name = newCollectionName.trim() || 'New Collection';
    onCreateCollection(name);
    setIsAddingCollection(false);
    setNewCollectionName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateCollection();
    else if (e.key === 'Escape') {
      setIsAddingCollection(false);
      setNewCollectionName('');
    }
  };

  const renderTree = (nodes: CollectionNode[], depth = 0) => {
    return nodes.map((node, index) => {
      const isLast = index === nodes.length - 1;
      const isActive = node.type === 'request' && node.requestData?.id === activeTabId;

      return (
        <div key={node.id} className="relative select-none">
          {depth > 0 && (
            <div 
              className="absolute left-0 w-px bg-white/10"
              style={{ left: `${(depth * 12) + 7}px`, top: '-4px', height: isLast ? '18px' : '100%' }}
            />
          )}
          
          <div 
            className={`
              group flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-lg transition-all duration-200
              ${node.type !== 'request' ? 'hover:bg-white/5 text-slate-400 hover:text-slate-200' : 
                isActive ? 'bg-sui-900/20 text-sui-300 shadow-[inset_2px_0_0_0_#0ea5e9]' : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'}
            `}
            style={{ paddingLeft: `${depth * 12 + 4}px` }}
            onClick={() => node.type !== 'request' ? onToggleExpand(node.id) : onSelectCollectionRequest(node)}
          >
            <div className="shrink-0 flex items-center justify-center w-4 h-4">
              {node.type === 'collection' || node.type === 'folder' ? (
                node.children && node.children.length > 0 ? (
                  node.isExpanded ? <ChevronDown size={10} className="text-slate-500 group-hover:text-slate-400" /> : <ChevronRight size={10} className="text-slate-500 group-hover:text-slate-400" />
                ) : <div className="w-1 h-1 rounded-full bg-slate-700" />
              ) : (
                <div className={`w-1.5 h-1.5 rounded-full ${node.name.includes('RPC') ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.4)]' : 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.4)]'}`} />
              )}
            </div>

            {node.type === 'collection' && <Folder size={13} className={`${node.isShared ? 'text-blue-400' : 'text-amber-500/80'} fill-current opacity-90`} />}
            {node.type === 'folder' && <Folder size={13} className="text-slate-600 fill-white/5" />}

            <span className={`truncate flex-1 font-sans text-[11px] font-medium leading-none pt-0.5 ${isActive ? 'font-bold' : ''}`}>
              {node.name}
            </span>

            {(node.type === 'collection' || node.type === 'folder') && (
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                {node.type === 'collection' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); appStore.openTab('runner', { collectionId: node.id }); }}
                    className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-green-400 transition-colors"
                    title="Run Collection"
                  >
                    <Play size={10} />
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); appStore.showToast('Adding to collection not implemented', 'info'); }} 
                  className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-white transition-colors"
                  title="Add Request"
                >
                  <Plus size={10} />
                </button>
              </div>
            )}
          </div>

          {(isFiltering || node.isExpanded) && node.children && (
            <div className="relative animate-in slide-in-from-left-1 duration-200">
              {renderTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex-1 pb-4 px-2">
      {isAddingCollection && (
        <div className="mb-2 px-1 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 bg-dark-indigo-glow/80 p-1.5 rounded-lg border border-sui-500/50 ring-1 ring-electric-violet/20 shadow-lg">
            <Folder size={14} className="text-electric-violet shrink-0" />
            <input 
              ref={createInputRef} 
              className="bg-transparent text-xs text-white outline-none flex-1 min-w-0 placeholder:text-slate-500 font-medium" 
              placeholder="Collection Name..." 
              value={newCollectionName} 
              onChange={(e) => setNewCollectionName(e.target.value)} 
              onKeyDown={handleKeyDown} 
              onBlur={() => setTimeout(() => { if (newCollectionName.trim() === '') setIsAddingCollection(false); }, 150)} 
            />
          </div>
        </div>
      )}
      
      <div className="pl-1 space-y-0.5">
        {visibleCollections.length > 0 ? (
          renderTree(visibleCollections)
        ) : isFiltering ? (
          <p className="px-3 py-6 text-center text-[11px] text-slate-600">
            No collections or requests match &ldquo;{filterQuery.trim()}&rdquo;.
          </p>
        ) : null}
      </div>
    </div>
  );
};
