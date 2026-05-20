import { TabItem, Workspace, FeatureId, CollectionNode, HistoryItem, EnvironmentVariable, RequestItem, RequestType, UserProfile, ActivityLog, Comment, Network, AppSettings, Notification } from '../types';
import { DEFAULT_MOVE_CALL } from './constants';
import { apiService } from '../services/api';

// Simple Event Emitter for State Updates
type Listener = () => void;
const listeners = new Set<Listener>();

const emit = () => {
    listeners.forEach(l => l());
};

// State
interface AppState {
    activeTabId: string | null;
    tabs: TabItem[];
    // Map workspaceId to its specific tab state
    workspaceSessions: Record<string, { tabs: TabItem[], activeTabId: string | null }>;
    savedTabs: TabItem[]; 
    recentTabs: TabItem[]; 
    workspaces: Workspace[];
    currentWorkspaceId: string;
    isSidebarOpen: boolean;
    isInspectorOpen: boolean;
    isAuthModalOpen: boolean;
    isTerminalOpen: boolean; // Added
    isCommandPaletteOpen: boolean; // Added
    user: UserProfile | null;
    theme: 'dark' | 'light';
    network: Network;
    isSyncing: boolean;
    scanStep: string;
    settings: AppSettings;
    notifications: Notification[];
    connectedAddress: string | null;
    
    // Data for Sidebar & Inspector
    collections: CollectionNode[];
    history: HistoryItem[];
    envVariables: EnvironmentVariable[];
    activityLogs: ActivityLog[];
    comments: Record<string, Comment[]>; 
    viewMode: 'landing' | 'app' | 'docs' | 'auth' | 'ecosystem' | 'signin' | 'signup' | 'features' | 'otp' | 'integrations' | 'infrastructure' | 'partners'; // Added signin/signup and features
}

// --- INITIAL STATE ---

let state: AppState = {
    activeTabId: null, 
    tabs: [],
    workspaceSessions: {}, // Holds persisted tabs for each workspace
    savedTabs: [], 
    recentTabs: [], 
    workspaces: [
        { id: 'ws-1', name: 'Default', type: 'Personal', activeEnvId: '' }
    ],
    currentWorkspaceId: 'ws-1',
    isSidebarOpen: true,
    isInspectorOpen: true,
    isTerminalOpen: true,
    isAuthModalOpen: false,
    isCommandPaletteOpen: false,
    user: null,
    theme: 'dark',
    network: 'mainnet',
    isSyncing: false,
    scanStep: '',
    collections: [],
    history: [],
    envVariables: [],
    activityLogs: [],
    comments: {},
    settings: {
        theme: 'dark',
        showLineNumbers: true,
        autoSave: true,
        telemetry: true,
        customRpc: { mainnet: '', testnet: '', devnet: '' },
        explorer: 'suiscan'
    },
    notifications: [],
    connectedAddress: null,
    viewMode: 'landing' // Initial state is landing
};

// Actions
export const appStore = {
    subscribe(listener: Listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    
    getSnapshot() {
        return state;
    },

    showToast(message: string, type: 'info' | 'success' | 'error' = 'info') {
        const id = Date.now().toString() + Math.random().toString();
        state = { ...state, notifications: [...state.notifications, { id, message, type }] };
        emit();
        setTimeout(() => {
            state = { ...state, notifications: state.notifications.filter(n => n.id !== id) };
            emit();
        }, 3000);
    },

    setCommandPalette(isOpen: boolean) {
        state = { ...state, isCommandPaletteOpen: isOpen };
        emit();
    },

    openTab(type: FeatureId, data?: any) {
        const singletonFeatures = ['settings', 'profile', 'ai_chat'];
        
        if (singletonFeatures.includes(type)) {
            const existing = state.tabs.find(t => t.type === type);
            if (existing) {
                state = { ...state, activeTabId: existing.id, isCommandPaletteOpen: false };
                emit();
                return;
            }
        }

        const id = data?.id || (singletonFeatures.includes(type) ? `${type}-tab` : `${type}-${Date.now()}`);
        let title = data?.name;
        if (!title) {
            switch(type) {
                case 'rpc': title = 'New Request'; break;
                case 'ptb': title = 'New PTB'; break;
                case 'profile': title = 'My Profile'; break;
                case 'ai_chat': title = 'AI Chat'; break;
                case 'settings': title = 'Settings'; break;
                case 'new_request': title = 'Create Request'; break;
                case 'history': title = 'History'; break;
                case 'runner': title = 'Runner'; break;
                default: title = 'Tab';
            }
        }

        const existingById = state.tabs.find(t => t.id === id);
        if (existingById) {
            state = { ...state, activeTabId: existingById.id, isCommandPaletteOpen: false };
            emit();
            return;
        }

        let tabData = data;
        if (!tabData) {
            if (type === 'rpc') {
                tabData = { id, name: 'New Request', type: RequestType.RPC, rpcParams: { method: '', params: [] }, moveParams: { ...DEFAULT_MOVE_CALL } };
            } else if (type === 'ptb') {
                tabData = { id, name: 'New PTB', type: RequestType.TRANSACTION, rpcParams: { method: '', params: [] }, moveParams: { ...DEFAULT_MOVE_CALL } };
            }
        }

        state = {
            ...state,
            tabs: [...state.tabs, { id, type, title, data: tabData, workspaceId: state.currentWorkspaceId }],
            activeTabId: id,
            isCommandPaletteOpen: false
        };
        emit();
    },

    setActiveTab(id: string | null) {
        state = { ...state, activeTabId: id };
        emit();
    },

    closeTab(id: string) {
        const tabToClose = state.tabs.find(t => t.id === id);
        if (tabToClose) {
            const newRecent = [tabToClose, ...state.recentTabs].slice(0, 10);
            const newTabs = state.tabs.filter(t => t.id !== id);
            state = {
                ...state,
                tabs: newTabs,
                recentTabs: newRecent,
                activeTabId: state.activeTabId === id ? (newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null) : state.activeTabId
            };
            emit();
        }
    },

    closeAllTabs() {
        const reversedTabs = [...state.tabs].reverse();
        const newRecent = [...reversedTabs, ...state.recentTabs].slice(0, 15);
        state = { ...state, tabs: [], activeTabId: null, recentTabs: newRecent };
        emit();
    },

    saveCurrentTab() {
        const currentTab = state.tabs.find(t => t.id === state.activeTabId);
        if (currentTab) {
            if (!state.savedTabs.find(t => t.id === currentTab.id)) {
                state = { ...state, savedTabs: [...state.savedTabs, currentTab] };
                emit();
            }
        }
    },

    clearSavedTabs() {
        state = { ...state, savedTabs: [] };
        emit();
    },

    restoreTab(tab: TabItem) {
        const isOpen = state.tabs.find(t => t.id === tab.id);
        if (isOpen) {
            state = { ...state, activeTabId: tab.id };
        } else {
            state = { 
                ...state, 
                tabs: [...state.tabs, tab], 
                activeTabId: tab.id 
            };
        }
        emit();
    },

    renameTab(id: string, title: string) {
        state = {
            ...state,
            tabs: state.tabs.map(t => t.id === id ? { ...t, title } : t)
        };
        emit();
    },

    finalizeRequest(tabId: string, type: 'rpc' | 'ptb', requestData: RequestItem) {
        state = {
            ...state,
            tabs: state.tabs.map(t => t.id === tabId ? {
                ...t,
                type: type as FeatureId,
                title: requestData.name,
                data: requestData
            } : t)
        };
        emit();
    },

    setNetwork(network: Network) {
        state = { ...state, isSyncing: true, scanStep: `Switching to ${network.toUpperCase()}...` };
        emit();

        setTimeout(() => {
            state = { ...state, scanStep: 'Handshaking with Fullnode...' };
            emit();
        }, 600);

        setTimeout(() => {
             state = { ...state, scanStep: 'Refreshing Object Registry...' };
             emit();
        }, 1200);

        setTimeout(() => {
            state = { ...state, network, isSyncing: false, scanStep: '' };
            emit();
        }, 2000);
    },

    setWorkspace(ws: Workspace) {
        // 1. Save current workspace session
        const currentSession = {
            tabs: state.tabs,
            activeTabId: state.activeTabId
        };
        
        const updatedSessions = {
            ...state.workspaceSessions,
            [state.currentWorkspaceId]: currentSession
        };

        // 2. Load next workspace session (or default empty)
        const nextSession = updatedSessions[ws.id] || { tabs: [], activeTabId: null };

        // 3. Update state
        state = { 
            ...state, 
            currentWorkspaceId: ws.id,
            workspaceSessions: updatedSessions,
            tabs: nextSession.tabs,
            activeTabId: nextSession.activeTabId,
            // Show syncing animation for workspace transition effect
            isSyncing: true,
            scanStep: `Loading ${ws.name}...`
        };
        emit();

        // Simulate loading delay for "Real" feel
        setTimeout(() => {
            state = { ...state, isSyncing: false, scanStep: '' };
            emit();
        }, 800);
    },

    createWorkspace(name: string) {
        const newWs: Workspace = {
            id: 'ws-' + Date.now(),
            name: name,
            type: 'Personal',
            activeEnvId: ''
        };
        state = { 
            ...state, 
            workspaces: [...state.workspaces, newWs],
            currentWorkspaceId: newWs.id 
        };
        // Trigger a switch to the new workspace to initialize session
        appStore.setWorkspace(newWs);
    },

    toggleSidebar() {
        state = { ...state, isSidebarOpen: !state.isSidebarOpen };
        emit();
    },

    toggleInspector() {
        state = { ...state, isInspectorOpen: !state.isInspectorOpen };
        emit();
    },

    toggleTerminal() {
        state = { ...state, isTerminalOpen: !state.isTerminalOpen };
        emit();
    },

    pushLog(action: string, target: string, type: 'request' | 'team' | 'system' | 'error' = 'system') {
        const log: ActivityLog = {
            id: 'log-' + Date.now(),
            type,
            userName: state.user?.name || 'System',
            action,
            target,
            timestamp: Date.now()
        };
        state = { ...state, activityLogs: [log, ...state.activityLogs].slice(0, 100) };
        emit();
    },

    updateEnv(vars: EnvironmentVariable[]) {
        state = { ...state, envVariables: vars };
        emit();
    },

    async createCollection(name: string) {
        try {
            const newColl = await apiService.createCollection(name || 'New Collection');
            state = { ...state, collections: [...state.collections, { ...newColl, isExpanded: true }] };
            emit();
        } catch (error: any) {
            appStore.showToast(error.message, 'error');
        }
    },

    toggleCollectionExpand(nodeId: string) {
        const toggle = (nodes: CollectionNode[]): CollectionNode[] => {
            return nodes.map(n => {
                if (n.id === nodeId) return { ...n, isExpanded: !n.isExpanded };
                if (n.children) return { ...n, children: toggle(n.children) };
                return n;
            });
        };
        state = { ...state, collections: toggle(state.collections) };
        emit();
    },

    addToHistory(item: RequestItem, status: number, duration: number) {
        const historyItem: HistoryItem = {
            ...item,
            timestamp: Date.now(),
            status,
            duration,
            network: state.network,
            userInitials: state.user ? state.user.name.split(' ').map(n => n[0]).join('') : 'G',
            workspaceId: state.currentWorkspaceId // Attach current workspace ID
        };
        state = {
            ...state,
            history: [...state.history, historyItem]
        };
        emit();
    },

    clearHistory() {
        // Only clear history for current workspace
        state = { 
            ...state, 
            history: state.history.filter(h => h.workspaceId !== state.currentWorkspaceId) 
        };
        emit();
    },

    setAuthModal(isOpen: boolean) {
        state = { ...state, isAuthModalOpen: isOpen };
        emit();
    },

    async login(email: string, pass: string) {
        try {
            const { user } = await apiService.login(email, pass);
            state = { ...state, user, isAuthModalOpen: false, viewMode: 'app' };
            emit();
            appStore.fetchCollections();
        } catch (error: any) {
            // Fallback for mocked mode or if API is down
            state = { ...state, user: { id: 'u1', name: 'Developer', email }, isAuthModalOpen: false, viewMode: 'app' };
            emit();
        }
    },

    async signup(name: string, email: string, pass: string) {
        try {
            const { user } = await apiService.register(email, pass);
            state = { ...state, user, isAuthModalOpen: false, viewMode: 'app' };
            emit();
            appStore.fetchCollections();
        } catch (error: any) {
             // Fallback for mocked mode
            state = { ...state, user: { id: 'u1', name, email }, isAuthModalOpen: false, viewMode: 'app' };
            emit();
        }
    },

    logout() {
        apiService.setToken(null);
        state = { ...state, user: null, collections: [], viewMode: 'landing' };
        emit();
    },

    async fetchCollections() {
        if (!state.user) return;
        try {
            const collections = await apiService.getCollections();
            state = { ...state, collections };
            emit();
        } catch (error: any) {
            console.error('Failed to fetch collections:', error);
        }
    },

    async initialize() {
        if (typeof window === 'undefined') return;
        const token = localStorage.getItem('txio_token');
        if (token) {
            try {
                const user = await apiService.getProfile();
                state = { ...state, user };
                emit();
                await appStore.fetchCollections();
            } catch (error) {
                console.warn('Session expired');
                apiService.setToken(null);
            }
        }
    },

    updateUser(updates: Partial<UserProfile>) {
        if (state.user) {
            state = { ...state, user: { ...state.user, ...updates } };
            emit();
        }
    },
    
    updateSettings(updates: Partial<AppSettings>) {
        state = { ...state, settings: { ...state.settings, ...updates } };
        emit();
    },

    postComment(requestId: string, content: string) {
        if (!state.user) return;
        const comment: Comment = {
            id: 'cm-' + Date.now(),
            userName: state.user.name,
            content,
            timestamp: Date.now(),
            userAvatarColor: 'bg-electric-violet'
        };
        const newComments = { ...state.comments };
        newComments[requestId] = [...(newComments[requestId] || []), comment];
        state = { ...state, comments: newComments };
        emit();
    },

    setViewMode(mode: 'landing' | 'app' | 'docs' | 'auth' | 'ecosystem' | 'signin' | 'signup' | 'features' | 'otp' | 'integrations' | 'infrastructure' | 'partners') {
        state = { ...state, viewMode: mode };
        emit();
    },
};

import { useSyncExternalStore } from 'react';
export const useAppStore = () => {
    return useSyncExternalStore(appStore.subscribe, appStore.getSnapshot, appStore.getSnapshot);
};


// Remove the invalid useTabRouter function that was incorrectly placed here
// If you need a router integration hook, create it in a separate file:
// e.g., src/hooks/useTabRouter.ts
