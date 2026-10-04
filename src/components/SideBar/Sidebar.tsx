import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RequestItem, EnvironmentVariable, HistoryItem, CollectionNode, Workspace, canEditWorkspace } from '../../types';
import { MembersPanel } from '../MembersPanel';
import { appStore } from '@/lib/store';
import { Menu, X } from 'lucide-react';
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
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Viewers can read and simulate but not create or change anything.
  const canEdit = canEditWorkspace(currentWorkspace);

  const handleOpenFullHistory = () => {
    appStore.openTab('history');
  };

  const handleAddCollection = () => {
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
    <div className="relative flex h-full font-sans select-none">
      {/* Mobile trigger: opens the explorer as an off-canvas drawer below md */}
      <button
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open sidebar"
        className="md:hidden absolute top-2 left-2 z-20 p-1.5 rounded-lg bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white"
      >
        <Menu size={16} />
      </button>

      {isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close sidebar"
          className="md:hidden fixed inset-0 z-30 bg-near-black/50 animate-in fade-in duration-150"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 md:static md:z-auto w-[280px] md:w-auto max-w-[85vw] md:max-w-none flex h-full bg-slate-50 dark:bg-near-black border-r border-slate-200 dark:border-white/[0.06] transition-transform duration-200 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Navigation Rail */}
        <SidebarNav
          activeMode={mode}
          onModeChange={(m) => setMode(m as SidebarMode)}
          activeTabType={activeTabType}
        />

        {/* Main Content Panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">
          <button
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close sidebar"
            className="md:hidden absolute top-2 right-2 z-20 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X size={16} />
          </button>
          {/* Workspace Header */}
          <WorkspaceHeader
            currentWorkspace={currentWorkspace}
            workspaces={workspaces}
            isDropdownOpen={isWsDropdownOpen}
            onToggleDropdown={() => setIsWsDropdownOpen(!isWsDropdownOpen)}
            onSwitchWorkspace={onSwitchWorkspace}
            onCreateWorkspace={onCreateWorkspace}
            onOpenMembers={() => setIsMembersOpen(true)}
          />
        {!canEdit && (
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500 border-b border-slate-200 dark:border-white/[0.06]">
            View only
          </div>
        )}

        {/* Context Toolbar (Explorer section removed for collections mode) */}
        {mode !== 'collections' && (
          <ContextToolbar
            mode={mode}
            onAddCollection={canEdit ? handleAddCollection : undefined}
            onAddEnvVar={handleAddEnvVar}
            filterQuery={collectionFilter}
            isFilterOpen={isCollectionFilterOpen}
            onFilterQueryChange={setCollectionFilter}
            onToggleFilter={handleToggleCollectionFilter}
          />
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 bg-slate-50 dark:bg-near-black relative">
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
                  readOnly={!canEdit}
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
      {isMembersOpen && <MembersPanel workspace={currentWorkspace} onClose={() => setIsMembersOpen(false)} />}
    </div>
  );
};