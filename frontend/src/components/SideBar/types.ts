import { CollectionNode, EnvironmentVariable, HistoryItem, Workspace } from '../../types';

export interface SidebarCommonProps {
  currentWorkspace: Workspace;
  activeTabId: string | null;
  activeTabType?: string;
}

export interface SidebarNavProps {
  activeMode: string;
  onModeChange: (mode: string) => void;
  activeTabType?: string;
}

export interface WorkspaceHeaderProps {
  currentWorkspace: Workspace;
  workspaces: Workspace[];
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
  onSwitchWorkspace: (ws: Workspace) => void;
  onCreateWorkspace: (name: string) => void;
  onOpenSettings: () => void;
}

export interface CollectionTreeProps {
  collections: CollectionNode[];
  activeTabId: string | null;
  onToggleExpand: (nodeId: string) => void;
  onSelectCollectionRequest: (node: CollectionNode) => void;
  onCreateCollection: (name: string) => void;
}

export interface HistoryListProps {
  history: HistoryItem[];
  currentWorkspace: Workspace;
  onSelectRequest: (req: HistoryItem) => void;
  onOpenFullHistory: () => void;
}

export interface EnvironmentListProps {
  envVariables: EnvironmentVariable[];
  onUpdateEnv: (vars: EnvironmentVariable[]) => void;
}