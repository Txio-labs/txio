import React, { useState } from 'react';
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

  const handleOpenFullHistory = () => {
    appStore.openTab('history');
  };

  const handleAddCollection = () => {
    // This will be handled by the CollectionTree component's internal state
    // For now, we can trigger the creation flow
    onCreateCollection('New Collection');
  };

  const handleAddEnvVar = () => {
    onUpdateEnv([...envVariables, { key: '', value: '', enabled: true, network: 'all' }]);
  };

  return (
    <div className="flex h-full bg-black border-r border-white/10 font-sans select-none">
      {/* Navigation Rail */}
      <SidebarNav 
        activeMode={mode}
        onModeChange={setMode}
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
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 bg-black">
          {/* COLLECTIONS */}
          {mode === 'collections' && (
            <CollectionTree 
              collections={collections}
              activeTabId={activeTabId}
              onToggleExpand={onToggleExpand}
              onSelectCollectionRequest={onSelectCollectionRequest}
              onCreateCollection={onCreateCollection}
            />
          )}
          
          {/* HISTORY */}
          {mode === 'history' && (
            <HistoryList 
              history={history}
              currentWorkspace={currentWorkspace}
              onSelectRequest={onSelectRequest}
              onOpenFullHistory={handleOpenFullHistory}
            />
          )}

          {/* ENVIRONMENTS */}
          {mode === 'env' && (
            <EnvironmentList 
              envVariables={envVariables}
              onUpdateEnv={onUpdateEnv}
            />
          )}
        </div>
      </div>
    </div>
  );
};