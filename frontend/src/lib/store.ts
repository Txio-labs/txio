import { TabItem, Workspace, FeatureId, CollectionNode, HistoryItem, EnvironmentVariable, RequestItem, RequestType, UserProfile, ActivityLog, Comment, Network, AppSettings, Notification } from '../types';
import { DEFAULT_MOVE_CALL } from './constants';

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
    isCommandPaletteOpen: boolean; // Added
    user: UserProfile | null;
    theme: 'dark' | 'light';
    network: Network;
    isSyncing: boolean;
    scanStep: string;
    settings: AppSettings;
    notifications: Notification[];
    
    // Data for Sidebar & Inspector
    collections: CollectionNode[];
    history: HistoryItem[];
    envVariables: EnvironmentVariable[];
    activityLogs: ActivityLog[];
    comments: Record<string, Comment[]>; 
}

// --- MOCK DATA GENERATION ---

const NOW = Date.now();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

// Helper to generate rich history
const generateHistory = (): HistoryItem[] => {
    const items: HistoryItem[] = [];
    const actions = ['Mint NFT', 'Swap SUI/USDC', 'Stake SUI', 'Transfer Coins', 'Publish Package', 'Upgrade Contract', 'Claim Rewards', 'Vote Proposal', 'Add Liquidity', 'Burn Token'];
    const rpcMethods = ['suix_getOwnedObjects', 'sui_getObject', 'suix_getBalance', 'sui_getTotalTransactionBlocks', 'sui_getEvents', 'suix_getAllCoins', 'sui_getProtocolConfig'];
    
    // Fixed recent failures for demo
    items.push({ 
        id: 'h-err-1', type: RequestType.TRANSACTION, name: 'Mint Hero NFT', txType: 'MoveCall', 
        rpcParams: { method: '', params: [] }, moveParams: { ...DEFAULT_MOVE_CALL }, 
        timestamp: NOW - 2 * 60 * 1000, status: 400, duration: 150, network: 'mainnet', userInitials: 'SD',
        workspaceId: 'ws-1'
    });

    for (let i = 0; i < 45; i++) {
        const isRpc = Math.random() > 0.5;
        const isError = Math.random() > 0.9;
        const timeOffset = Math.floor(Math.pow(Math.random(), 3) * 7 * 24 * 3600 * 1000); // Skew towards recent
        
        items.push({
            id: `hist-${i}`,
            type: isRpc ? RequestType.RPC : RequestType.TRANSACTION,
            name: isRpc ? rpcMethods[Math.floor(Math.random() * rpcMethods.length)] : actions[Math.floor(Math.random() * actions.length)],
            rpcParams: {
                method: isRpc ? rpcMethods[Math.floor(Math.random() * rpcMethods.length)] : '',
                params: isRpc ? ['0x...'] : []
            },
            moveParams: { ...DEFAULT_MOVE_CALL },
            txType: isRpc ? undefined : 'MoveCall',
            timestamp: NOW - timeOffset,
            status: isError ? 400 : 200,
            duration: Math.floor(Math.random() * 800) + 50,
            network: Math.random() > 0.8 ? 'testnet' : 'mainnet',
            userInitials: 'SD',
            workspaceId: i % 2 === 0 ? 'ws-1' : 'ws-2' // Split history between workspaces
        });
    }
    return items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

// 1. Collections: Realistic Sui Development Structure
const MOCK_COLLECTIONS: CollectionNode[] = [
    {
        id: 'c1',
        type: 'collection',
        name: 'Sui System',
        workspaceId: 'ws-1',
        isExpanded: true,
        children: [
            { id: 'r1', type: 'request', name: 'Get Owned Objects', requestData: { id: 'r1', type: RequestType.RPC, name: 'Get Owned Objects', rpcParams: { method: 'suix_getOwnedObjects', params: ['0x7d20dcdb2bca4f508ea9613994683eb4e76e9c4ed27790dd226ee5310f5194d1'] }, moveParams: { ...DEFAULT_MOVE_CALL } } },
            { id: 'r2', type: 'request', name: 'Get Total Balance', requestData: { id: 'r2', type: RequestType.RPC, name: 'Get Total Balance', rpcParams: { method: 'suix_getBalance', params: ['0x7d20dcdb2bca4f508ea9613994683eb4e76e9c4ed27790dd226ee5310f5194d1'] }, moveParams: { ...DEFAULT_MOVE_CALL } } },
            { id: 'r3', type: 'request', name: 'Get Validators', requestData: { id: 'r3', type: RequestType.RPC, name: 'Get Validators', rpcParams: { method: 'suix_getLatestSuiSystemState', params: [] }, moveParams: { ...DEFAULT_MOVE_CALL } } },
            { id: 'r-sys-4', type: 'request', name: 'Dry Run Transaction', requestData: { id: 'r-sys-4', type: RequestType.RPC, name: 'Dry Run Transaction', rpcParams: { method: 'sui_dryRunTransactionBlock', params: [] }, moveParams: { ...DEFAULT_MOVE_CALL } } }
        ]
    },
    {
        id: 'c2',
        type: 'collection',
        name: 'DeFi Protocol',
        workspaceId: 'ws-1',
        isExpanded: false,
        isShared: true,
        children: [
            {
                id: 'f1', type: 'folder', name: 'DEX Operations', isExpanded: false, children: [
                    { id: 'r4', type: 'request', name: 'Swap SUI/USDC', requestData: { id: 'r4', type: RequestType.TRANSACTION, name: 'Swap SUI/USDC', txType: 'MoveCall', rpcParams: { method: '', params: [] }, moveParams: { packageId: '0x1e2...a99', module: 'pool', function: 'swap', typeArguments: ['0x2::sui::SUI', '0x5d4...a12::usdc::USDC'], arguments: [{ id: '1', type: 'u64', value: '1000000000' }, { id: '2', type: 'u64', value: '0' }], gasBudget: '5000000' } } },
                    { id: 'r5', type: 'request', name: 'Add Liquidity', requestData: { id: 'r5', type: RequestType.TRANSACTION, name: 'Add Liquidity', txType: 'MoveCall', rpcParams: { method: '', params: [] }, moveParams: { packageId: '0x1e2...a99', module: 'pool', function: 'add_liquidity', typeArguments: [], arguments: [], gasBudget: '10000000' } } },
                    { id: 'r-dex-3', type: 'request', name: 'Remove Liquidity', requestData: { id: 'r-dex-3', type: RequestType.TRANSACTION, name: 'Remove Liquidity', txType: 'MoveCall', rpcParams: { method: '', params: [] }, moveParams: { packageId: '0x1e2...a99', module: 'pool', function: 'remove_liquidity', typeArguments: [], arguments: [], gasBudget: '8000000' } } }
                ]
            },
            { id: 'r6', type: 'request', name: 'Claim Rewards', requestData: { id: 'r6', type: RequestType.TRANSACTION, name: 'Claim Rewards', txType: 'MoveCall', rpcParams: { method: '', params: [] }, moveParams: { packageId: '0x1e2...a99', module: 'farm', function: 'harvest', typeArguments: [], arguments: [], gasBudget: '2000000' } } }
        ]
    },
    {
        id: 'c3',
        type: 'collection',
        name: 'NFT Marketplace',
        workspaceId: 'ws-2',
        isExpanded: false,
        children: [
             { id: 'r7', type: 'request', name: 'Mint Hero', requestData: { id: 'r7', type: RequestType.TRANSACTION, name: 'Mint Hero', txType: 'MoveCall', rpcParams: { method: '', params: [] }, moveParams: { packageId: '0xhero', module: 'hero_nft', function: 'mint', typeArguments: [], arguments: [{ id: '1', type: 'string', value: 'Warrior' }, { id: '2', type: 'string', value: 'http://img.url' }], gasBudget: '10000000' } } },
             { id: 'r-nft-2', type: 'request', name: 'List for Sale', requestData: { id: 'r-nft-2', type: RequestType.TRANSACTION, name: 'List for Sale', txType: 'MoveCall', rpcParams: { method: '', params: [] }, moveParams: { packageId: '0xmarket', module: 'listing', function: 'create', typeArguments: [], arguments: [{ id: '1', type: 'u64', value: '100' }], gasBudget: '5000000' } } }
        ]
    },
    {
        id: 'c4',
        type: 'collection',
        name: 'Sui Kiosk',
        workspaceId: 'ws-2',
        isExpanded: false,
        children: [
            { id: 'r-kiosk-1', type: 'request', name: 'Create Kiosk', requestData: { id: 'r-kiosk-1', type: RequestType.TRANSACTION, name: 'Create Kiosk', txType: 'MoveCall', rpcParams: { method: '', params: [] }, moveParams: { packageId: '0x2', module: 'kiosk', function: 'new', typeArguments: [], arguments: [], gasBudget: '20000000' } } },
            { id: 'r-kiosk-2', type: 'request', name: 'Place Item', requestData: { id: 'r-kiosk-2', type: RequestType.TRANSACTION, name: 'Place Item', txType: 'MoveCall', rpcParams: { method: '', params: [] }, moveParams: { packageId: '0x2', module: 'kiosk', function: 'place', typeArguments: [], arguments: [], gasBudget: '5000000' } } }
        ]
    }
];

// 2. History
const MOCK_HISTORY: HistoryItem[] = generateHistory();

// 3. Environment Variables
const MOCK_ENV: EnvironmentVariable[] = [
    { key: 'PACKAGE_ID', value: '0x1e2f3d4...a99', enabled: true, network: 'mainnet', workspaceId: 'ws-1' },
    { key: 'ADMIN_CAP', value: '0x889...123', enabled: true, network: 'all', workspaceId: 'ws-1' },
    { key: 'TEST_COIN', value: '0x2::sui::SUI', enabled: false, network: 'testnet', workspaceId: 'ws-1' },
    { key: 'ORACLE_ADDR', value: '0xcafe...babe', enabled: true, network: 'mainnet', workspaceId: 'ws-1' },
    { key: 'DEV_WALLET', value: '0x7d2...94d1', enabled: true, network: 'devnet', workspaceId: 'ws-1' },
    // Workspace 2 vars
    { key: 'MARKETPLACE_ID', value: '0xmarket', enabled: true, network: 'mainnet', workspaceId: 'ws-2' },
    { key: 'KIOSK_CAP', value: '0x321...987', enabled: true, network: 'mainnet', workspaceId: 'ws-2' },
    { key: 'GAS_BUDGET_LOW', value: '1000000', enabled: true, network: 'all', workspaceId: 'ws-2' },
    { key: 'API_ENDPOINT', value: 'https://api.myapp.com/v1', enabled: true, network: 'all', workspaceId: 'ws-2' }
];

// 5. Activity Log
const MOCK_LOGS: ActivityLog[] = [
    { id: 'l1', type: 'request', userName: 'Sui Developer', action: 'executed', target: 'Swap SUI/USDC', timestamp: NOW - 5 * 60 * 1000 },
    { id: 'l2', type: 'team', userName: 'Alice Move', action: 'updated', target: 'DeFi Protocol / Swap', timestamp: NOW - 2 * HOUR },
    { id: 'l3', type: 'system', userName: 'System', action: 'synced', target: 'Mainnet', timestamp: NOW - 4 * HOUR },
    { id: 'l4', type: 'request', userName: 'Bob PTB', action: 'failed', target: 'Mint Hero', timestamp: NOW - 1 * DAY },
    { id: 'l5', type: 'team', userName: 'Alice Move', action: 'commented', target: 'Swap SUI/USDC', timestamp: NOW - 1.5 * DAY },
];

// 6. Comments
const MOCK_COMMENTS: Record<string, Comment[]> = {
    'r4': [
        { id: 'cm1', userName: 'Alice Move', content: 'Updated the gas budget to 5M based on latest simulation.', timestamp: NOW - 2 * HOUR, userAvatarColor: 'bg-emerald-600' },
        { id: 'cm2', userName: 'Sui Developer', content: 'Looks good. This slippage setting is safer.', timestamp: NOW - 1 * HOUR, userAvatarColor: 'bg-sui-600' }
    ]
};

// --- INITIAL STATE ---

let state: AppState = {
    activeTabId: null, 
    tabs: [],
    workspaceSessions: {}, // Holds persisted tabs for each workspace
    savedTabs: [], 
    recentTabs: [], 
    workspaces: [
        { id: 'ws-1', name: 'Default', type: 'Personal', activeEnvId: 'env-1' },
        { id: 'ws-2', name: 'Sui Foundation', type: 'Team', activeEnvId: 'env-2' }
    ],
    currentWorkspaceId: 'ws-1',
    isSidebarOpen: true,
    isInspectorOpen: true,
    isAuthModalOpen: false,
    isCommandPaletteOpen: false,
    user: { id: 'u1', name: 'Sui Developer', email: 'dev@sui.io' },
    theme: 'dark',
    network: 'mainnet',
    isSyncing: false,
    scanStep: '',
    collections: MOCK_COLLECTIONS,
    history: MOCK_HISTORY,
    envVariables: MOCK_ENV,
    activityLogs: MOCK_LOGS,
    comments: MOCK_COMMENTS,
    settings: {
        theme: 'dark',
        showLineNumbers: true,
        autoSave: true,
        telemetry: true,
        customRpc: { mainnet: '', testnet: '', devnet: '' },
        explorer: 'suiscan'
    },
    notifications: []
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

    updateEnv(vars: EnvironmentVariable[]) {
        state = { ...state, envVariables: vars };
        emit();
    },

    createCollection(name: string) {
        const newColl: CollectionNode = {
            id: 'c-' + Date.now(),
            type: 'collection',
            name: name || 'New Collection',
            isExpanded: true,
            children: [],
            workspaceId: state.currentWorkspaceId // Tag with current workspace
        };
        state = { ...state, collections: [...state.collections, newColl] };
        emit();
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

    login(email: string, pass: string) {
        state = { ...state, user: { id: 'u1', name: email.split('@')[0], email }, isAuthModalOpen: false };
        emit();
    },

    signup(name: string, email: string, pass: string) {
        state = { ...state, user: { id: 'u1', name, email }, isAuthModalOpen: false };
        emit();
    },

    logout() {
        state = { ...state, user: null };
        emit();
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
            userAvatarColor: 'bg-sui-600'
        };
        const newComments = { ...state.comments };
        newComments[requestId] = [...(newComments[requestId] || []), comment];
        state = { ...state, comments: newComments };
        emit();
    }
};

import { useSyncExternalStore } from 'react';
export const useAppStore = () => {
    return useSyncExternalStore(appStore.subscribe, appStore.getSnapshot);
};

// Remove the invalid useTabRouter function that was incorrectly placed here
// If you need a router integration hook, create it in a separate file:
// e.g., src/hooks/useTabRouter.ts