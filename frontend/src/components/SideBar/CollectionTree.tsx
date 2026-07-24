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
  const isFiltering = filterQuery.trim().length > 0;
  const visibleCollections = filterCollectionTree(collections, filterQuery);

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
          
          <button 
            className={`
              group flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-lg transition-all duration-200 text-left w-full
              ${node.type !== 'request' ? 'hover:bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-700 dark:text-slate-200' : 
                isActive ? 'bg-sui-900/20 text-sui-300 shadow-[inset_2px_0_0_0_#0ea5e9]' : 'hover:bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-700 dark:text-slate-200'}
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
                    className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded text-slate-500 hover:text-green-400 transition-colors"
                    title="Run Collection"
                  >
                    <Play size={10} />
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); appStore.openTab('new_request', { collectionId: node.id }); }} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded text-slate-500 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white transition-colors"
                  title="Add Request"
                >
                  <Plus size={10} />
                </button>
              </div>
            )}
          </button>

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
      <button
        type="button"
        onClick={() => appStore.openTab('new_collection')}
        className="w-full flex items-center gap-1.5 px-2 py-1 mb-1 text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-white/5 rounded-lg transition-colors"
      >
        <Plus size={11} />
        <span>New Collection</span>
      </button>
      
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