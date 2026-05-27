import {
    TabItem,
    Workspace,
    FeatureId,
    CollectionNode,
    HistoryItem,
    EnvironmentVariable,
    RequestItem,
    RequestType,
    UserProfile,
    ActivityLog,
    Comment,
    Network,
    AppSettings,
    Notification
} from '../types';

import { DEFAULT_MOVE_CALL } from './constants';
import {
    DEFAULT_APP_SETTINGS,
    normalizeAppSettings
} from './appConfig';
import {
    ApiError,
    apiService
} from '../services/api';

// Simple Event Emitter for State Updates
type Listener = () => void;

const listeners = new Set<Listener>();
type UserProfileOverrides = Partial<
    Pick<
        UserProfile,
        'name' | 'avatarUrl' | 'bannerUrl'
    >
>;
const userProfileOverrideFields = [
    'name',
    'avatarUrl',
    'bannerUrl'
] as const;
const storedUserStorageKey =
    'txio_user';
const currentWorkspaceStorageKey =
    'txio_current_workspace';
const settingsStorageKey =
    'txio_settings';
const networkStorageKey =
    'txio_network';

const emit = () => {
    listeners.forEach((l) => l());
};

const getUserProfileStorageKeys = (
    user: Pick<UserProfile, 'id' | 'email'>
) => {
    const keys: string[] = [];

    if (user.id) {
        keys.push(
            `txio_profile:${user.id}`
        );
    }

    if (user.email) {
        keys.push(
            `txio_profile:${user.email.toLowerCase()}`
        );
    }

    return keys;
};

const readUserProfileOverrides = (
    user: Pick<UserProfile, 'id' | 'email'>
): UserProfileOverrides => {
    if (typeof window === 'undefined') {
        return {};
    }

    return getUserProfileStorageKeys(
        user
    ).reduce<UserProfileOverrides>(
        (merged, key) => {
            try {
                const raw =
                    localStorage.getItem(key);

                if (!raw) {
                    return merged;
                }

                return {
                    ...merged,
                    ...JSON.parse(raw)
                };
            } catch {
                return merged;
            }
        },
        {}
    );
};

const applyUserProfileOverrides = (
    user: UserProfile
): UserProfile => {
    return {
        ...user,
        ...readUserProfileOverrides(user)
    };
};

const persistUserProfileOverrides = (
    user: UserProfile
) => {
    if (typeof window === 'undefined') {
        return;
    }

    const overrides: UserProfileOverrides =
        {};

    userProfileOverrideFields.forEach(
        (field) => {
            const value = user[field];

            if (
                typeof value === 'string' &&
                value.trim()
            ) {
                overrides[field] = value;
            }
        }
    );

    getUserProfileStorageKeys(user).forEach(
        (key) => {
            localStorage.setItem(
                key,
                JSON.stringify(overrides)
            );
        }
    );
};

const isUserProfile = (
    value: unknown
): value is UserProfile => {
    if (
        !value ||
        typeof value !== 'object'
    ) {
        return false;
    }

    const candidate =
        value as Partial<UserProfile>;

    return (
        typeof candidate.id ===
            'string' &&
        typeof candidate.email ===
            'string' &&
        typeof candidate.name ===
            'string'
    );
};

const readStoredUser = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = localStorage.getItem(
            storedUserStorageKey
        );

        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        return isUserProfile(parsed)
            ? parsed
            : null;
    } catch {
        return null;
    }
};

const persistStoredUser = (
    user: UserProfile
) => {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(
        storedUserStorageKey,
        JSON.stringify(user)
    );
};

const clearStoredUser = () => {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.removeItem(
        storedUserStorageKey
    );
};

const readStoredWorkspaceId = () => {
    if (typeof window === 'undefined') {
        return '';
    }

    return (
        localStorage.getItem(
            currentWorkspaceStorageKey
        ) || ''
    );
};

const persistCurrentWorkspaceId = (
    workspaceId: string
) => {
    if (typeof window === 'undefined') {
        return;
    }

    if (workspaceId) {
        localStorage.setItem(
            currentWorkspaceStorageKey,
            workspaceId
        );
        return;
    }

    localStorage.removeItem(
        currentWorkspaceStorageKey
    );
};

const readStoredSettings = () => {
    if (typeof window === 'undefined') {
        return DEFAULT_APP_SETTINGS;
    }

    try {
        return normalizeAppSettings(
            JSON.parse(
                localStorage.getItem(
                    settingsStorageKey
                ) || 'null'
            )
        );
    } catch {
        return DEFAULT_APP_SETTINGS;
    }
};

const persistSettings = (
    settings: AppSettings
) => {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(
        settingsStorageKey,
        JSON.stringify(settings)
    );
};

const readStoredNetwork = () => {
    if (typeof window === 'undefined') {
        return 'mainnet' as Network;
    }

    const storedNetwork =
        localStorage.getItem(
            networkStorageKey
        );

    return storedNetwork === 'testnet' ||
        storedNetwork === 'devnet'
        ? storedNetwork
        : 'mainnet';
};

const persistNetwork = (
    network: Network
) => {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(
        networkStorageKey,
        network
    );
};

const resolveWorkspaceSelection = (
    workspaces: Workspace[],
    preferredId?: string
) => {
    const normalizedPreferredId =
        preferredId?.trim() ||
        readStoredWorkspaceId();

    if (
        normalizedPreferredId &&
        workspaces.some(
            (workspace) =>
                workspace.id ===
                normalizedPreferredId
        )
    ) {
        return normalizedPreferredId;
    }

    return workspaces[0]?.id || '';
};

const decodeStoredTokenClaims = (
    token: string
) => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const payload = token.split('.')[1];

        if (!payload) {
            return null;
        }

        const normalizedPayload =
            payload
                .replace(/-/g, '+')
                .replace(/_/g, '/')
                .padEnd(
                    Math.ceil(
                        payload.length / 4
                    ) * 4,
                    '='
                );

        return JSON.parse(
            window.atob(
                normalizedPayload
            )
        ) as {
            sub?: string;
            email?: string;
        };
    } catch {
        return null;
    }
};

const buildUserFromToken = (
    token: string
): UserProfile | null => {
    const claims =
        decodeStoredTokenClaims(token);
    const email =
        typeof claims?.email === 'string'
            ? claims.email
            : '';
    const id =
        typeof claims?.sub === 'string'
            ? claims.sub
            : '';

    if (!email && !id) {
        return null;
    }

    return {
        id: id || email,
        email,
        name:
            email.split('@')[0]?.trim() ||
            'user'
    };
};

const isAuthFailure = (
    error: unknown
) => {
    if (error instanceof ApiError) {
        return (
            error.status === 401 ||
            error.status === 403
        );
    }

    return (
        error instanceof Error &&
        /unauthorized|invalid token|missing authorization/i.test(
            error.message
        )
    );
};

// State
interface AppState {
    activeTabId: string | null;
    tabs: TabItem[];

    // Map workspaceId to its specific tab state
    workspaceSessions: Record<
        string,
        {
            tabs: TabItem[];
            activeTabId: string | null;
        }
    >;

    savedTabs: TabItem[];
    recentTabs: TabItem[];

    workspaces: Workspace[];
    currentWorkspaceId: string;
    isLoadingWorkspaces: boolean;
    hasHydratedWorkspaces: boolean;

    isSidebarOpen: boolean;
    isInspectorOpen: boolean;
    isAuthModalOpen: boolean;
    isTerminalOpen: boolean;
    isCommandPaletteOpen: boolean;

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

    viewMode:
        | 'landing'
        | 'app'
        | 'docs'
        | 'auth'
        | 'ecosystem'
        | 'signin'
        | 'signup'
        | 'features'
        | 'otp'
        | 'integrations'
        | 'infrastructure'
        | 'partners';
}

// --- INITIAL STATE ---

const hasToken =
    typeof window !== 'undefined' &&
    !!localStorage.getItem('txio_token');
const initialSettings =
    readStoredSettings();
const initialNetwork =
    readStoredNetwork();

let state: AppState = {
    activeTabId: null,

    tabs: [],

    workspaceSessions: {},

    savedTabs: [],

    recentTabs: [],

    workspaces: [],

    currentWorkspaceId: '',

    isLoadingWorkspaces: false,

    hasHydratedWorkspaces: false,

    isSidebarOpen: true,

    isInspectorOpen: true,

    isTerminalOpen: true,

    isAuthModalOpen: false,

    isCommandPaletteOpen: false,

    user: null,

    theme: initialSettings.theme,

    network: initialNetwork,

    isSyncing: false,

    scanStep: '',

    collections: [],

    history: [],

    envVariables: [],

    activityLogs: [],

    comments: {},

    settings: initialSettings,

    notifications: [],

    connectedAddress: null,

    // IMPORTANT:
    // restore app mode if token exists
    viewMode: hasToken ? 'app' : 'landing'
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

    showToast(
        message: string,
        type: 'info' | 'success' | 'error' = 'info'
    ) {
        const id =
            Date.now().toString() +
            Math.random().toString();

        state = {
            ...state,
            notifications: [
                ...state.notifications,
                {
                    id,
                    message,
                    type
                }
            ]
        };

        emit();

        setTimeout(() => {
            state = {
                ...state,
                notifications: state.notifications.filter(
                    (n) => n.id !== id
                )
            };

            emit();
        }, 3000);
    },

    setCommandPalette(isOpen: boolean) {
        state = {
            ...state,
            isCommandPaletteOpen: isOpen
        };

        emit();
    },

    openTab(type: FeatureId, data?: any) {
        const singletonFeatures = [
            'settings',
            'profile',
            'ai_chat',
            'docs',
            'ecosystem',
            'features',
            'integrations',
            'infrastructure',
            'partners'
        ];

        if (singletonFeatures.includes(type)) {
            const existing = state.tabs.find(
                (t) => t.type === type
            );

            if (existing) {
                state = {
                    ...state,
                    activeTabId: existing.id,
                    isCommandPaletteOpen: false
                };

                emit();

                return;
            }
        }

        const id =
            data?.id ||
            (singletonFeatures.includes(type)
                ? `${type}-tab`
                : `${type}-${Date.now()}`);

        let title = data?.name;

        if (!title) {
            switch (type) {
                case 'rpc':
                    title = 'New Request';
                    break;

                case 'ptb':
                    title = 'New PTB';
                    break;

                case 'profile':
                    title = 'My Profile';
                    break;

                case 'ai_chat':
                    title = 'AI Chat';
                    break;

                case 'settings':
                    title = 'Settings';
                    break;

                case 'new_request':
                    title = 'Create Request';
                    break;

                case 'history':
                    title = 'History';
                    break;

                case 'runner':
                    title = 'Runner';
                    break;

                case 'docs':
                    title = 'Documentation';
                    break;

                case 'ecosystem':
                    title = 'Ecosystem';
                    break;

                case 'features':
                    title = 'Features';
                    break;

                case 'integrations':
                    title = 'Integrations';
                    break;

                case 'infrastructure':
                    title = 'Infrastructure';
                    break;

                case 'partners':
                    title = 'Partners';
                    break;

                default:
                    title = 'Tab';
            }
        }

        const existingById = state.tabs.find(
            (t) => t.id === id
        );

        if (existingById) {
            state = {
                ...state,
                activeTabId: existingById.id,
                isCommandPaletteOpen: false
            };

            emit();

            return;
        }

        let tabData = data;

        if (!tabData) {
            if (type === 'rpc') {
                tabData = {
                    id,
                    name: 'New Request',
                    type: RequestType.RPC,
                    network: state.network,
                    rpcParams: {
                        method: '',
                        params: []
                    },
                    moveParams: {
                        ...DEFAULT_MOVE_CALL
                    }
                };
            } else if (type === 'ptb') {
                tabData = {
                    id,
                    name: 'New PTB',
                    type: RequestType.TRANSACTION,
                    network: state.network,
                    rpcParams: {
                        method: '',
                        params: []
                    },
                    moveParams: {
                        ...DEFAULT_MOVE_CALL
                    }
                };
            }
        }

        state = {
            ...state,

            tabs: [
                ...state.tabs,
                {
                    id,
                    type,
                    title,
                    data: tabData,
                    workspaceId:
                        state.currentWorkspaceId
                }
            ],

            activeTabId: id,

            isCommandPaletteOpen: false
        };

        emit();
    },

    setActiveTab(id: string | null) {
        state = {
            ...state,
            activeTabId: id
        };

        emit();
    },

    closeTab(id: string) {
        const tabToClose = state.tabs.find(
            (t) => t.id === id
        );

        if (tabToClose) {
            const newRecent = [
                tabToClose,
                ...state.recentTabs
            ].slice(0, 10);

            const newTabs = state.tabs.filter(
                (t) => t.id !== id
            );

            state = {
                ...state,

                tabs: newTabs,

                recentTabs: newRecent,

                activeTabId:
                    state.activeTabId === id
                        ? newTabs.length > 0
                            ? newTabs[newTabs.length - 1].id
                            : null
                        : state.activeTabId
            };

            emit();
        }
    },

    closeAllTabs() {
        const reversedTabs = [...state.tabs].reverse();

        const newRecent = [
            ...reversedTabs,
            ...state.recentTabs
        ].slice(0, 15);

        state = {
            ...state,
            tabs: [],
            activeTabId: null,
            recentTabs: newRecent
        };

        emit();
    },

    saveCurrentTab() {
        const currentTab = state.tabs.find(
            (t) => t.id === state.activeTabId
        );

        if (currentTab) {
            if (
                !state.savedTabs.find(
                    (t) => t.id === currentTab.id
                )
            ) {
                state = {
                    ...state,
                    savedTabs: [
                        ...state.savedTabs,
                        currentTab
                    ]
                };

                emit();
            }
        }
    },

    clearSavedTabs() {
        state = {
            ...state,
            savedTabs: []
        };

        emit();
    },

    restoreTab(tab: TabItem) {
        const isOpen = state.tabs.find(
            (t) => t.id === tab.id
        );

        if (isOpen) {
            state = {
                ...state,
                activeTabId: tab.id
            };
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
            tabs: state.tabs.map((t) =>
                t.id === id
                    ? {
                          ...t,
                          title
                      }
                    : t
            )
        };

        emit();
    },
    clearActivityLogs() {
        state = {
            ...state,
            activityLogs: []
        };

        emit();
    },

    finalizeRequest(
        tabId: string,
        type: 'rpc' | 'ptb',
        requestData: RequestItem
    ) {
        state = {
            ...state,
            tabs: state.tabs.map((t) =>
                t.id === tabId
                    ? {
                          ...t,
                          type: type as FeatureId,
                          title: requestData.name,
                          data: requestData
                      }
                    : t
            )
        };

        emit();
    },

    setNetwork(network: Network) {
        state = {
            ...state,
            isSyncing: true,
            scanStep: `Switching to ${network.toUpperCase()}...`
        };

        emit();

        setTimeout(() => {
            state = {
                ...state,
                scanStep:
                    'Handshaking with Fullnode...'
            };

            emit();
        }, 600);

        setTimeout(() => {
            state = {
                ...state,
                scanStep:
                    'Refreshing Object Registry...'
            };

            emit();
        }, 1200);

        setTimeout(() => {
            state = {
                ...state,
                network,
                isSyncing: false,
                scanStep: ''
            };

            persistNetwork(network);
            emit();
        }, 2000);
    },

    async fetchWorkspaces(
        preferredWorkspaceId?: string
    ) {
        if (!state.user) {
            persistCurrentWorkspaceId('');

            state = {
                ...state,
                workspaces: [],
                currentWorkspaceId: '',
                collections: [],
                isLoadingWorkspaces: false,
                hasHydratedWorkspaces: true,
                tabs: [],
                activeTabId: null
            };

            emit();
            return [];
        }

        state = {
            ...state,
            isLoadingWorkspaces: true
        };

        emit();

        try {
            const workspaces =
                await apiService.getWorkspaces();
            const nextWorkspaceId =
                resolveWorkspaceSelection(
                    workspaces,
                    preferredWorkspaceId
                );
            const currentSession =
                state.currentWorkspaceId
                    ? {
                          tabs: state.tabs,
                          activeTabId:
                              state.activeTabId
                      }
                    : null;
            const updatedSessions =
                currentSession
                    ? {
                          ...state.workspaceSessions,
                          [state.currentWorkspaceId]:
                              currentSession
                      }
                    : state.workspaceSessions;
            const nextSession =
                nextWorkspaceId
                    ? updatedSessions[
                          nextWorkspaceId
                      ] || {
                          tabs: [],
                          activeTabId: null
                      }
                    : {
                          tabs: [],
                          activeTabId: null
                      };

            persistCurrentWorkspaceId(
                nextWorkspaceId
            );

            state = {
                ...state,
                workspaces,
                currentWorkspaceId:
                    nextWorkspaceId,
                workspaceSessions:
                    updatedSessions,
                tabs: nextSession.tabs,
                activeTabId:
                    nextSession.activeTabId,
                collections: nextWorkspaceId
                    ? state.collections
                    : [],
                isLoadingWorkspaces: false,
                hasHydratedWorkspaces: true
            };

            emit();

            if (nextWorkspaceId) {
                await appStore.fetchCollections(
                    nextWorkspaceId
                );
            } else {
                state = {
                    ...state,
                    collections: []
                };

                emit();
            }

            return workspaces;
        } catch (error) {
            state = {
                ...state,
                workspaces: [],
                currentWorkspaceId: '',
                collections: [],
                tabs: [],
                activeTabId: null,
                isLoadingWorkspaces: false,
                hasHydratedWorkspaces: true
            };

            emit();
            throw error;
        }
    },

    setWorkspace(ws: Workspace) {
        if (!ws?.id) {
            return;
        }

        const currentSession = {
            tabs: state.tabs,
            activeTabId: state.activeTabId
        };

        const updatedSessions = {
            ...state.workspaceSessions,
            ...(state.currentWorkspaceId
                ? {
                      [state.currentWorkspaceId]:
                          currentSession
                  }
                : {})
        };

        const nextSession =
            updatedSessions[ws.id] || {
                tabs: [],
                activeTabId: null
            };

        state = {
            ...state,

            currentWorkspaceId: ws.id,

            workspaceSessions: updatedSessions,

            tabs: nextSession.tabs,

            activeTabId: nextSession.activeTabId,

            isSyncing: true,

            scanStep: `Loading ${ws.name}...`
        };

        persistCurrentWorkspaceId(ws.id);

        emit();

        void appStore
            .fetchCollections(ws.id)
            .finally(() => {
            state = {
                ...state,
                isSyncing: false,
                scanStep: ''
            };

            emit();
        });
    },

    async createWorkspace(
        name: string,
        type: Workspace['type'] = 'Personal'
    ) {
        state = {
            ...state,
            isLoadingWorkspaces: true,
            isSyncing: true,
            scanStep: `Provisioning ${name}...`
        };

        emit();

        try {
            const workspace =
                await apiService.createWorkspace(
                    name,
                    type
                );

            await appStore.fetchWorkspaces(
                workspace.id
            );

            state = {
                ...state,
                isSyncing: false,
                scanStep: ''
            };

            emit();

            appStore.showToast(
                `${workspace.name} created`,
                'success'
            );

            return workspace;
        } catch (error) {
            state = {
                ...state,
                isLoadingWorkspaces: false,
                isSyncing: false,
                scanStep: ''
            };

            emit();
            throw error;
        }
    },

    toggleSidebar() {
        state = {
            ...state,
            isSidebarOpen: !state.isSidebarOpen
        };

        emit();
    },

    toggleInspector() {
        state = {
            ...state,
            isInspectorOpen:
                !state.isInspectorOpen
        };

        emit();
    },

    toggleTerminal() {
        state = {
            ...state,
            isTerminalOpen: !state.isTerminalOpen
        };

        emit();
    },

    pushLog(
        action: string,
        target: string,
        type:
            | 'request'
            | 'team'
            | 'system'
            | 'error' = 'system'
    ) {
        const log: ActivityLog = {
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type,
            userName:
                state.user?.name || 'System',
            action,
            target,
            timestamp: Date.now()
        };

        state = {
            ...state,
            activityLogs: [
                log,
                ...state.activityLogs
            ].slice(0, 100)
        };

        emit();
    },

    setConnectedAddress(
        connectedAddress: string | null
    ) {
        if (
            state.connectedAddress ===
            connectedAddress
        ) {
            return;
        }

        state = {
            ...state,
            connectedAddress
        };

        emit();
    },

    updateEnv(vars: EnvironmentVariable[]) {
        state = {
            ...state,
            envVariables: vars
        };

        emit();
    },

    async createCollection(name: string) {
        if (!state.currentWorkspaceId) {
            appStore.showToast(
                'Create a workspace first',
                'error'
            );
            return;
        }

        try {
            const newColl =
                await apiService.createCollection(
                    state.currentWorkspaceId,
                    name || 'New Collection'
                );

            state = {
                ...state,
                collections: [
                    ...state.collections,
                    newColl
                ]
            };

            emit();
        } catch (error: any) {
            appStore.showToast(
                error.message,
                'error'
            );
        }
    },

    toggleCollectionExpand(nodeId: string) {
        const toggle = (
            nodes: CollectionNode[]
        ): CollectionNode[] => {
            return nodes.map((n) => {
                if (n.id === nodeId) {
                    return {
                        ...n,
                        isExpanded: !n.isExpanded
                    };
                }

                if (n.children) {
                    return {
                        ...n,
                        children: toggle(n.children)
                    };
                }

                return n;
            });
        };

        state = {
            ...state,
            collections: toggle(state.collections)
        };

        emit();
    },

    addToHistory(
        item: RequestItem,
        status: number,
        duration: number
    ) {
        const historyItem: HistoryItem = {
            ...item,

            timestamp: Date.now(),

            status,

            duration,

            network: state.network,

            userInitials: state.user
                ? state.user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                : 'G',

            workspaceId:
                state.currentWorkspaceId
        };

        state = {
            ...state,
            history: [
                ...state.history,
                historyItem
            ]
        };

        emit();
    },

    clearHistory() {
        state = {
            ...state,

            history: state.history.filter(
                (h) =>
                    h.workspaceId !==
                    state.currentWorkspaceId
            )
        };

        emit();
    },

    setAuthModal(isOpen: boolean) {
        state = {
            ...state,
            isAuthModalOpen: isOpen
        };

        emit();
    },

    async login(
        email: string,
        pass: string
    ) {
        try {
            const { user, token } =
                await apiService.login(
                    email,
                    pass
                );

            if (
                typeof window !== 'undefined'
            ) {
                localStorage.setItem(
                    'txio_token',
                    token
                );

                localStorage.setItem(
                    'txio_viewMode',
                    'app'
                );
            }

            apiService.setToken(token);

            const hydratedUser =
                applyUserProfileOverrides(
                    user
                );

            state = {
                ...state,
                user: hydratedUser,
                isAuthModalOpen: false,
                viewMode: 'app'
            };

            persistStoredUser(
                hydratedUser
            );

            emit();

            try {
                await appStore.fetchWorkspaces();
            } catch (workspaceError) {
                console.error(
                    'Failed to load workspaces after login:',
                    workspaceError
                );
            }
        } catch (error: any) {
            throw error;
        }
    },

    async signup(
        name: string,
        email: string,
        pass: string
    ) {
        try {
            const { user, token } =
                await apiService.register(
                    email,
                    pass
                );

            if (
                typeof window !== 'undefined'
            ) {
                localStorage.setItem(
                    'txio_token',
                    token
                );

                localStorage.setItem(
                    'txio_viewMode',
                    'app'
                );
            }

            apiService.setToken(token);

            const hydratedUser =
                applyUserProfileOverrides(
                    user
                );

            state = {
                ...state,
                user: hydratedUser,
                isAuthModalOpen: false,
                viewMode: 'app'
            };

            persistStoredUser(
                hydratedUser
            );

            emit();

            try {
                await appStore.fetchWorkspaces();
            } catch (workspaceError) {
                console.error(
                    'Failed to load workspaces after signup:',
                    workspaceError
                );
            }
        } catch (error: any) {
            throw error;
        }
    },

    logout() {
        apiService.setToken(null);

        if (typeof window !== 'undefined') {
            localStorage.removeItem(
                'txio_token'
            );

            localStorage.removeItem(
                'txio_viewMode'
            );
        }

        clearStoredUser();
        persistCurrentWorkspaceId('');

        state = {
            ...state,
            user: null,
            workspaces: [],
            currentWorkspaceId: '',
            collections: [],
            tabs: [],
            activeTabId: null,
            isLoadingWorkspaces: false,
            hasHydratedWorkspaces: false,
            viewMode: 'landing'
        };

        emit();
    },

    async fetchCollections(
        workspaceId = state.currentWorkspaceId
    ) {
        if (!state.user) return;

        if (!workspaceId) {
            state = {
                ...state,
                collections: []
            };

            emit();
            return;
        }

        try {
            const collections =
                await apiService.getCollections(
                    workspaceId
                );

            if (
                workspaceId !==
                state.currentWorkspaceId
            ) {
                return;
            }

            state = {
                ...state,
                collections
            };

            emit();
        } catch (error: any) {
            console.error(
                'Failed to fetch collections:',
                error
            );
        }
    },

    async initialize() {
        if (typeof window === 'undefined')
            return;

        const token =
            localStorage.getItem(
                'txio_token'
            );

        if (token) {
            const restoredUser =
                readStoredUser() ||
                buildUserFromToken(token);
            const hydratedRestoredUser =
                restoredUser
                    ? applyUserProfileOverrides(
                          restoredUser
                      )
                    : null;

            apiService.setToken(token);

            state = {
                ...state,
                user:
                    hydratedRestoredUser ||
                    state.user,
                isLoadingWorkspaces: true,
                viewMode: 'app'
            };

            emit();

            try {
                const user =
                    await apiService.getProfile();

                const hydratedUser =
                    applyUserProfileOverrides(
                        user
                    );

                state = {
                    ...state,
                    user: hydratedUser,
                    viewMode: 'app'
                };

                persistStoredUser(
                    hydratedUser
                );

                emit();

                try {
                    await appStore.fetchWorkspaces();
                } catch (workspaceError) {
                    console.error(
                        'Failed to restore workspaces during refresh:',
                        workspaceError
                    );
                }
            } catch (error) {
                if (
                    isAuthFailure(error)
                ) {
                    console.warn(
                        'Stored session is no longer valid'
                    );

                    apiService.setToken(
                        null
                    );

                    localStorage.removeItem(
                        'txio_token'
                    );

                    localStorage.removeItem(
                        'txio_viewMode'
                    );

                    clearStoredUser();
                    persistCurrentWorkspaceId('');

                    state = {
                        ...state,
                        user: null,
                        workspaces: [],
                        currentWorkspaceId: '',
                        collections: [],
                        tabs: [],
                        activeTabId: null,
                        isLoadingWorkspaces: false,
                        hasHydratedWorkspaces: false,
                        viewMode:
                            'landing'
                    };

                    emit();
                    return;
                }

                console.warn(
                    'Failed to restore profile during refresh',
                    error
                );

                if (
                    hydratedRestoredUser
                ) {
                    try {
                        await appStore.fetchWorkspaces();
                    } catch (workspaceError) {
                        console.error(
                            'Failed to restore workspaces after profile fallback:',
                            workspaceError
                        );
                    }
                } else {
                    state = {
                        ...state,
                        isLoadingWorkspaces: false,
                        hasHydratedWorkspaces: true
                    };

                    emit();
                }
            }
        } else {
            clearStoredUser();
            persistCurrentWorkspaceId('');

            state = {
                ...state,
                user: null,
                workspaces: [],
                currentWorkspaceId: '',
                collections: [],
                tabs: [],
                activeTabId: null,
                isLoadingWorkspaces: false,
                hasHydratedWorkspaces: false,
                viewMode: 'landing'
            };

            emit();
        }
    },

    updateUser(
        user:
            | UserProfile
            | Partial<UserProfile>
            | null
    ) {
        if (user === null) {
            clearStoredUser();
            persistCurrentWorkspaceId('');

            state = {
                ...state,
                user: null,
                workspaces: [],
                currentWorkspaceId: '',
                collections: [],
                tabs: [],
                activeTabId: null,
                isLoadingWorkspaces: false,
                hasHydratedWorkspaces: false
            };

            emit();
            return;
        }

        const isFullUser =
            typeof user.id === 'string' &&
            typeof user.email === 'string' &&
            typeof user.name === 'string';

        if (isFullUser) {
            const hydratedUser =
                applyUserProfileOverrides(
                    user as UserProfile
                );

            state = {
                ...state,
                user: hydratedUser
            };

            persistStoredUser(
                hydratedUser
            );

            emit();
            return;
        }

        if (!state.user) {
            return;
        }

        state = {
            ...state,
            user: {
                ...state.user,
                ...user
            }
        };

        if (state.user) {
            persistStoredUser(
                state.user
            );

            persistUserProfileOverrides(
                state.user
            );
        }

        emit();
    },

    updateSettings(
        updates: Partial<AppSettings>
    ) {
        const settings =
            normalizeAppSettings({
                ...state.settings,
                ...updates,
                customRpc: {
                    ...state.settings.customRpc,
                    ...(updates.customRpc || {})
                }
            });

        state = {
            ...state,
            settings,
            theme: settings.theme
        };

        persistSettings(settings);
        emit();
    },

    postComment(
        requestId: string,
        content: string
    ) {
        if (!state.user) return;

        const comment: Comment = {
            id: 'cm-' + Date.now(),

            userName: state.user.name,

            content,

            timestamp: Date.now(),

            userAvatarColor:
                'bg-electric-violet'
        };

        const newComments = {
            ...state.comments
        };

        newComments[requestId] = [
            ...(newComments[requestId] || []),
            comment
        ];

        state = {
            ...state,
            comments: newComments
        };

        emit();
    },

    setViewMode(
        mode:
            | 'landing'
            | 'app'
            | 'docs'
            | 'auth'
            | 'ecosystem'
            | 'signin'
            | 'signup'
            | 'features'
            | 'otp'
            | 'integrations'
            | 'infrastructure'
            | 'partners'
    ) {
        state = {
            ...state,
            viewMode: mode
        };

        if (typeof window !== 'undefined') {
            if (mode === 'app') {
                localStorage.setItem(
                    'txio_viewMode',
                    mode
                );
            }

            if (mode === 'landing') {
                localStorage.removeItem(
                    'txio_viewMode'
                );
            }
        }

        emit();
    }
};

import { useSyncExternalStore } from 'react';

export const useAppStore = () => {
    return useSyncExternalStore(
        appStore.subscribe,
        appStore.getSnapshot,
        appStore.getSnapshot
    );
};
