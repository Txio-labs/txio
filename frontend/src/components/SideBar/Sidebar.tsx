import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RequestItem, EnvironmentVariable, HistoryItem, CollectionNode, Workspace } from '../../types';
import { appStore } from '@/lib/store';
import { SidebarNav } from './SidebarNav';
import { WorkspaceHeader } from './WorkspaceHeader';
import { ContextToolbar } from './ContextToolbar';
import { CollectionTree } from './CollectionTree';
import { HistoryList } from './HistoryList';
import { EnvironmentList } from './EnvironmentList';

interface SidebarProps {
  currentWorkspace: Workspace;
  workspaces: Workspace[];
  collections: CollectionNode[];
  history: HistoryItem[];
  envVariables: EnvironmentVariable[];
  activeTabId: string | null;
  activeTabType?: string;
  onSwitchWorkspace: (ws: Workspace) => void;
  onSelectRequest: (req: RequestItem) => void;
  onSelectCollectionRequest: (node: CollectionNode) => void;
  onNewRequest: () => void;
  onUpdateEnv: (vars: EnvironmentVariable[]) => void;
  onToggleExpand: (nodeId: string) => void;
  onCreateCollection: (name: string) => void;
  onCreateWorkspace: (name: string) => void;
}

type SidebarMode = 'collections' | 'history' | 'env';

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentWorkspace,
  workspaces,
  collections, 
  history,
  envVariables,
  onSwitchWorkspace,
  onSelectRequest, 
  onSelectCollectionRequest,
  onNewRequest,
  onUpdateEnv,
  onToggleExpand,
  onCreateCollection,
  onCreateWorkspace,
  activeTabId,
  activeTabType
}) => {
  const [mode, setMode] = useState<SidebarMode>('collections');
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [isCollectionFilterOpen, setIsCollectionFilterOpen] = useState(false);
  const [collectionFilter, setCollectionFilter] = useState('');

  const handleOpenFullHistory = () => {
    appStore.openTab('history');
  };

  const handleAddCollection = () => {
    // This will be handled by the CollectionTree component's internal state
    // For now, we can trigger the creation txio
    onCreateCollection('New Collection');
  };

  const handleAddEnvVar = () => {
    onUpdateEnv([...envVariables, { key: '', value: '', enabled: true, network: 'all' }]);
  };

  const handleToggleCollectionFilter = () => {
    if (isCollectionFilterOpen) {
      setCollectionFilter('');
    }

    setIsCollectionFilterOpen(!isCollectionFilterOpen);
  };

  return (
    <div className="flex h-full bg-near-black border-r border-white/[0.06] font-sans select-none">
      {/* Navigation Rail */}
      <SidebarNav 
        activeMode={mode}
        onModeChange={(m) => setMode(m as SidebarMode)}
        activeTabType={activeTabType}
      />

      {/* Main Content Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">
        {/* Workspace Header */}
        <WorkspaceHeader 
          currentWorkspace={currentWorkspace}
          workspaces={workspaces}
          isDropdownOpen={isWsDropdownOpen}
          onToggleDropdown={() => setIsWsDropdownOpen(!isWsDropdownOpen)}
          onSwitchWorkspace={onSwitchWorkspace}
          onCreateWorkspace={onCreateWorkspace}
        />

        {/* Context Toolbar */}
        <ContextToolbar 
          mode={mode}
          onAddCollection={handleAddCollection}
          onAddEnvVar={handleAddEnvVar}
          filterQuery={collectionFilter}
          isFilterOpen={isCollectionFilterOpen}
          onFilterQueryChange={setCollectionFilter}
          onToggleFilter={handleToggleCollectionFilter}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 bg-near-black relative">
          <AnimatePresence mode="wait">
            {/* COLLECTIONS */}
            {mode === 'collections' && (
              <motion.div
                key="collections"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col"
              >
                <CollectionTree 
                  collections={collections}
                  filterQuery={collectionFilter}
                  activeTabId={activeTabId}
                  onToggleExpand={onToggleExpand}
                  onSelectCollectionRequest={onSelectCollectionRequest}
                  onCreateCollection={onCreateCollection}
                />
              </motion.div>
            )}
            
            {/* HISTORY */}
            {mode === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col"
              >
                <HistoryList 
                  history={history}
                  currentWorkspace={currentWorkspace}
                  onSelectRequest={onSelectRequest}
                  onOpenFullHistory={handleOpenFullHistory}
                />
              </motion.div>
            )}

            {/* ENVIRONMENTS */}
            {mode === 'env' && (
              <motion.div
                key="env"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col"
              >
                <EnvironmentList 
                  envVariables={envVariables}
                  onUpdateEnv={onUpdateEnv}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
