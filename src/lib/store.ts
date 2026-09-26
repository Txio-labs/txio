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
    isNetwork,
    Network,
    AppSettings,
    Notification,
    ChainId
} from '../types';

import { DEFAULT_MOVE_CALL } from './constants';
import {
    DEFAULT_EVM_TX,
    DEFAULT_SOLANA_TX,
    DEFAULT_STELLAR_TX,
    getTxParamsForHistory
} from '../services/transactionService';
import {
    DEFAULT_APP_SETTINGS,
    normalizeAppSettings,
    normalizeNotificationPreferences
} from './appConfig';
import {
    setTelemetryEnabled,
    track
} from './telemetry';
import {
    ApiError,
    apiService,
    extractId
} from '../services/api';

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
const commentsStorageKey =
    'txio_comments';
const sessionsStorageKey =
    'txio_workspace_sessions';

const emit = () => {
    listeners.forEach((l) => l());
    // Debounced; cheap no-op until tabs/currentWorkspaceId are set on boot.
    // Hooked here rather than at each tab-mutating call site so a refresh
    // reliably restores wherever the user was — see scheduleSessionPersist.
    scheduleSessionPersist();
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
        notificationPreferences:
            normalizeNotificationPreferences(
                user.notificationPreferences
            ),
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

type WorkspaceSession = {
    tabs: TabItem[];
    activeTabId: string | null;
};

const isWorkspaceSessionMap = (
    value: unknown
): value is Record<string, WorkspaceSession> =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
        (session) =>
            typeof session === 'object' &&
            session !== null &&
            Array.isArray(
                (session as WorkspaceSession)
                    .tabs
            )
    );

// Open tabs (which request/page is open, and its in-progress data) so a
// page refresh returns to where the user was instead of dropping back to
// the Dashboard. Keyed per workspace, same as the in-memory
// `workspaceSessions` cache this mirrors — see hydrateWorkspaceState and
// setWorkspace. Best-effort: a corrupt or oversized value is dropped rather
// than crashing the app on boot.
const readStoredWorkspaceSessions =
    (): Record<string, WorkspaceSession> => {
        if (typeof window === 'undefined') {
            return {};
        }

        try {
            const raw = localStorage.getItem(
                sessionsStorageKey
            );

            if (!raw) {
                return {};
            }

            const parsed = JSON.parse(raw);

            return isWorkspaceSessionMap(parsed)
                ? parsed
                : {};
        } catch {
            return {};
        }
    };

const persistWorkspaceSessions = (
    sessions: Record<string, WorkspaceSession>
) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(
            sessionsStorageKey,
            JSON.stringify(sessions)
        );
    } catch {
        // Storage unavailable or quota exceeded — the open tab just won't
        // survive a refresh; nothing else depends on this write succeeding.
    }
};

let sessionPersistTimer: ReturnType<typeof setTimeout> | null = null;

// Debounced rather than run on every emit() — tab/request edits emit on
// every keystroke, and writing to localStorage that often would be wasted
// work for a value nothing reads until the next full page load.
const scheduleSessionPersist = () => {
    if (sessionPersistTimer) {
        clearTimeout(sessionPersistTimer);
    }

    sessionPersistTimer = setTimeout(() => {
        sessionPersistTimer = null;

        if (!state.currentWorkspaceId) {
            return;
        }

        persistWorkspaceSessions({
            ...state.workspaceSessions,
            [state.currentWorkspaceId]: {
                tabs: state.tabs,
                activeTabId: state.activeTabId
            }
        });
    }, 500);
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

    return isNetwork(storedNetwork)
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

const readStoredComments = (): Record<string, Comment[]> => {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = localStorage.getItem(
            commentsStorageKey
        );

        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw);
        if (
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)
        ) {
            return parsed as Record<
                string,
                Comment[]
            >;
        }

        return {};
    } catch {
        return {};
    }
};

const persistComments = (
    comments: Record<string, Comment[]>
) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(
            commentsStorageKey,
            JSON.stringify(comments)
        );
    } catch {
        // Ignore storage errors
    }
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

const hydrateWorkspaceState = async (
    workspaces: Workspace[],
    preferredWorkspaceId?: string
) => {
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
    // In-memory workspaceSessions only holds sessions visited earlier in
    // this tab (populated by switching workspaces). On a fresh page load
    // it's always empty, so fall back to the persisted copy from
    // localStorage — this is what makes a refresh return to the same open
    // request/page instead of the Dashboard.
    const storedSessions = readStoredWorkspaceSessions();
    const nextSession =
        nextWorkspaceId
            ? updatedSessions[nextWorkspaceId] ||
              storedSessions[nextWorkspaceId] || {
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
        // Merge in every persisted session, not just the one being switched
        // to, so other workspaces' tabs are also restored in-memory and
        // available without another localStorage read if the user switches
        // workspaces later in this session.
        workspaceSessions: {
            ...storedSessions,
            ...updatedSessions
        },
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
        await Promise.all([
            appStore.fetchCollections(
                nextWorkspaceId
            ),
            appStore.fetchHistory(
                nextWorkspaceId
            )
        ]);
    } else {
        state = {
            ...state,
            collections: [],
            history: []
        };

        emit();
    }

    return workspaces;
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

    pendingNetworkSwitch: Network | null;

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
        | 'ecosystem'
        | 'signin'
        | 'signup'
        | 'features'
        | 'otp'
        | 'integrations'
        | 'infrastructure'
        | 'partners';

    pendingAiPrompt: string | null;

    pendingSignup: {
        name: string;
        email: string;
        password: string;
    } | null;
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

    isTerminalOpen: false,

    isAuthModalOpen: false,

    isCommandPaletteOpen: false,

    user: null,

    theme: initialSettings.theme,

    network: initialNetwork,

    pendingNetworkSwitch: null,

    isSyncing: false,

    scanStep: '',

    collections: [],

    history: [],

    envVariables: [],

    activityLogs: [],

    comments: readStoredComments(),

    settings: initialSettings,

    notifications: [],

    connectedAddress: null,

    // IMPORTANT:
    // restore app mode if token exists
    viewMode: hasToken ? 'app' : 'landing',

    pendingAiPrompt: null,

    pendingSignup: null
};

// Sync telemetry gate with persisted settings on boot.
setTelemetryEnabled(initialSettings.telemetry);
track('app_boot', { theme: initialSettings.theme });

// Debounced auto-save for request tabs when settings.autoSave is on.
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

const scheduleAutoSave = (tabId: string) => {
    if (!state.settings.autoSave) {
        return;
    }

    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }

    autoSaveTimer = setTimeout(() => {
        autoSaveTimer = null;
        const tab = state.tabs.find((t) => t.id === tabId);
        if (!tab) return;
        if (tab.type !== 'rpc' && tab.type !== 'ptb' && tab.type !== 'new_request') {
            return;
        }
        appStore.saveCurrentTab();
        track('request_saved', { tabType: tab.type, auto: true });
    }, 600);
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
                    type,
                    timestamp: Date.now()
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

    clearNotifications() {
        state = {
            ...state,
            notifications: []
        };
        emit();
    },

    dismissNotification(id: string) {
        state = {
            ...state,
            notifications: state.notifications.filter((n) => n.id !== id)
        };
        emit();
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
            'partners',
            'admin',
            'send',
            'approvals',
            'automation',
            'developers'
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

                case 'move':
                    title = 'Move Builder';
                    break;

                case 'playground':
                    title = 'Playground';
                    break;

                case 'profile':
                    title = 'Wallets';
                    break;

                case 'account':
                    title = 'Profile';
                    break;

                case 'ai_chat':
                    title = 'AI Chat';
                    break;

                case 'settings':
                    title = 'Settings';
                    break;

                case 'admin':
                    title = 'Admin';
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

                case 'collections':
                    title = 'Collections';
                    break;

                case 'new_collection':
                    title = 'New Collection';
                    break;

                case 'workspace_overview':
                    title = 'Workspace';
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

                case 'help':
                    title = 'Help';
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

                case 'send':
                    title = 'Send';
                    break;

                case 'approvals':
                    title = 'Approvals';
                    break;

                case 'automation':
                    title = 'Automation';
                    break;

                case 'developers':
                    title = 'Developers';
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

    // Closes every tab with no unsaved changes, leaving dirty (in-progress)
    // tabs open — the safer alternative to Close All.
    closeSavedTabs() {
        const closingTabs = state.tabs.filter((t) => !t.isDirty);
        const remainingTabs = state.tabs.filter((t) => t.isDirty);

        if (closingTabs.length === 0) return;

        const newRecent = [
            ...[...closingTabs].reverse(),
            ...state.recentTabs
        ].slice(0, 15);

        const activeTabId =
            state.activeTabId &&
            remainingTabs.some((t) => t.id === state.activeTabId)
                ? state.activeTabId
                : remainingTabs[remainingTabs.length - 1]?.id ?? null;

        state = {
            ...state,
            tabs: remainingTabs,
            activeTabId,
            recentTabs: newRecent
        };

        emit();
    },

    saveCurrentTab() {
        const currentTab = state.tabs.find(
            (t) => t.id === state.activeTabId
        );

        if (!currentTab) {
            return;
        }

        const snapshot: TabItem = {
            ...currentTab,
            isDirty: false
        };

        const existingIdx = state.savedTabs.findIndex(
            (t) => t.id === snapshot.id
        );

        const savedTabs =
            existingIdx === -1
                ? [...state.savedTabs, snapshot]
                : state.savedTabs.map((t, i) =>
                      i === existingIdx ? snapshot : t
                  );

        // Also clear dirty flag on the live tab.
        const tabs = state.tabs.map((t) =>
            t.id === snapshot.id
                ? { ...t, isDirty: false }
                : t
        );

        state = {
            ...state,
            tabs,
            savedTabs
        };

        emit();
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
                          data: requestData,
                          // Mark dirty until auto-save or explicit save clears it.
                          isDirty: true
                      }
                    : t
            )
        };

        emit();
        scheduleAutoSave(tabId);
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

    requestNetworkSwitch(network: Network) {
        if (state.network === network) return;
        state = {
            ...state,
            pendingNetworkSwitch: network
        };
        emit();
    },

    cancelNetworkSwitch() {
        state = {
            ...state,
            pendingNetworkSwitch: null
        };
        emit();
    },

    confirmNetworkSwitch() {
        const target = state.pendingNetworkSwitch;
        if (!target) return;

        state = {
            ...state,
            pendingNetworkSwitch: null
        };
        emit();

        appStore.setNetwork(target);
    },

    async fetchWorkspaces(
        preferredWorkspaceId?: string,
        prefetchedWorkspaces?:
            | Workspace[]
            | null
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
                prefetchedWorkspaces ??
                (await apiService.getWorkspaces());

            return await hydrateWorkspaceState(
                workspaces,
                preferredWorkspaceId
            );
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

        void Promise.all([
            appStore.fetchCollections(ws.id),
            appStore.fetchHistory(ws.id)
        ]).finally(() => {
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

    async renameWorkspace(
        workspaceId: string,
        name: string
    ) {
        try {
            const workspace =
                await apiService.updateWorkspace(
                    workspaceId,
                    name
                );

            await appStore.fetchWorkspaces(
                workspaceId
            );

            appStore.showToast(
                'Workspace renamed',
                'success'
            );

            return workspace;
        } catch (error) {
            appStore.showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to rename workspace',
                'error'
            );
            throw error;
        }
    },

    async deleteWorkspace(
        workspaceId: string
    ) {
        try {
            await apiService.deleteWorkspace(
                workspaceId
            );

            await appStore.fetchWorkspaces();

            appStore.showToast(
                'Workspace deleted',
                'success'
            );
        } catch (error) {
            appStore.showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete workspace',
                'error'
            );
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

    async createCollection(name: string, description?: string) {
        if (!state.currentWorkspaceId) {
            appStore.showToast(
                'Create a workspace first',
                'error'
            );
            return undefined;
        }

        try {
            const newColl =
                await apiService.createCollection(
                    state.currentWorkspaceId,
                    name || 'New Collection',
                    description
                );

            state = {
                ...state,
                collections: [
                    ...state.collections,
                    newColl
                ]
            };

            emit();
            return newColl;
        } catch (error: any) {
            appStore.showToast(
                error.message,
                'error'
            );
            return undefined;
        }
    },

    async deleteCollection(id: string) {
        try {
            await apiService.deleteCollection(id);

            state = {
                ...state,
                collections: state.collections.filter(
                    (c) => c.id !== id
                )
            };

            emit();
        } catch (error: any) {
            appStore.showToast(
                error.message,
                'error'
            );
        }
    },

    // Saves the currently-open request into a collection: creates a new
    // saved request the first time, or updates the existing one (including
    // its last_response snapshot) on subsequent saves once request.id /
    // request.collectionId identify an already-saved request.
    async saveRequestToCollection(
        collectionId: string,
        request: RequestItem,
        lastResponse?: unknown
    ): Promise<RequestItem | null> {
        const isAlreadySaved =
            request.collectionId === collectionId &&
            state.collections.some((c) =>
                c.id === collectionId &&
                (c.children ?? []).some((child) => child.id === request.id)
            );

        try {
            let saved: RequestItem;

            if (isAlreadySaved) {
                saved = await apiService.updateRequest(
                    collectionId,
                    request.id,
                    {
                        name: request.name,
                        method: request.rpcParams.method,
                        params: request.rpcParams.params,
                        requestType: request.type,
                        chain: request.rpcParams.chain,
                        txParams: getTxParamsForHistory(request),
                        network: request.network ?? null,
                        ...(lastResponse !== undefined ? { lastResponse } : {})
                    }
                );

                const updateNode = (nodes: CollectionNode[]): CollectionNode[] =>
                    nodes.map((n) => {
                        if (n.id === saved.id && n.type === 'request') {
                            return { ...n, name: saved.name, requestData: saved };
                        }
                        if (n.children) {
                            return { ...n, children: updateNode(n.children) };
                        }
                        return n;
                    });

                state = { ...state, collections: updateNode(state.collections) };
            } else {
                const newNode = await apiService.addRequest(collectionId, request);

                if (lastResponse !== undefined && newNode.requestData) {
                    saved = await apiService.updateRequest(
                        collectionId,
                        newNode.requestData.id,
                        { lastResponse }
                    );
                    newNode.requestData = saved;
                } else {
                    saved = newNode.requestData ?? { ...request, id: newNode.id, collectionId };
                }

                const addToCollection = (nodes: CollectionNode[]): CollectionNode[] =>
                    nodes.map((n) => {
                        if (n.id === collectionId && n.type === 'collection') {
                            return { ...n, children: [...(n.children ?? []), newNode] };
                        }
                        if (n.children) {
                            return { ...n, children: addToCollection(n.children) };
                        }
                        return n;
                    });

                state = { ...state, collections: addToCollection(state.collections) };
            }

            emit();
            appStore.showToast('Saved to collection', 'success');
            return saved;
        } catch (error: any) {
            appStore.showToast(error?.message ?? 'Failed to save request', 'error');
            return null;
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
        duration: number,
        // The execution outcome (tx hash, gas paid, decoded events,
        // explorer URL — or the error) from transactionService.ts. Only
        // meaningful for TRANSACTION requests; omitted for RPC calls, whose
        // response is already captured by params/method.
        result?: unknown,
        // The wallet that signed/sent this request, if any — the active
        // signer at execution time. Omitted for RPC calls made with no
        // wallet connected.
        wallet?: { family: string; address: string } | null
    ) {
        const txParams = getTxParamsForHistory(item);

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
                state.currentWorkspaceId ??
                undefined,

            executionResult: result,

            walletFamily: wallet?.family,
            walletAddress: wallet?.address
        };

        // Optimistic local update — the record round-trips to the backend
        // below so it survives a refresh, but the UI shouldn't wait on that.
        state = {
            ...state,
            history: [
                ...state.history,
                historyItem
            ]
        };

        emit();

        if (!state.user) return;

        void apiService
            .createHistoryEntry({
                workspaceId:
                    state.currentWorkspaceId ??
                    undefined,
                name: item.name,
                requestType: item.type,
                chain: item.rpcParams?.chain,
                network: state.network,
                method: item.rpcParams?.method,
                params: item.rpcParams?.params,
                walletFamily: wallet?.family,
                walletAddress: wallet?.address,
                txParams,
                result,
                status,
                durationMs: duration
            })
            .catch((error) => {
                console.error(
                    'Failed to persist history entry:',
                    error
                );
            });
    },

    async clearHistory() {
        const workspaceId =
            state.currentWorkspaceId;

        state = {
            ...state,

            history: state.history.filter(
                (h) =>
                    h.workspaceId !==
                    workspaceId
            )
        };

        emit();

        if (!state.user) return;

        try {
            await apiService.clearHistory(
                workspaceId ?? undefined
            );
        } catch (error) {
            console.error(
                'Failed to clear history:',
                error
            );
        }
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

    setPendingSignup(
        pending: {
            name: string;
            email: string;
            password: string;
        } | null
    ) {
        state = {
            ...state,
            pendingSignup: pending
        };

        emit();
    },

    async completeSignup(otp: string) {
        const pending = state.pendingSignup;

        if (!pending) {
            throw new Error(
                'No signup in progress.'
            );
        }

        await apiService.verifyOtp(
            pending.email,
            otp
        );

        await appStore.signup(
            pending.name,
            pending.email,
            pending.password
        );

        state = {
            ...state,
            pendingSignup: null
        };

        emit();
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

    async fetchHistory(
        workspaceId = state.currentWorkspaceId
    ) {
        if (!state.user) return;

        try {
            const entries =
                await apiService.getHistory(
                    workspaceId ?? undefined
                );

            if (
                workspaceId !==
                state.currentWorkspaceId
            ) {
                return;
            }

            const history: HistoryItem[] =
                entries.map((entry) => {
                    const id =
                        extractId(entry.id) ||
                        extractId(entry._id) ||
                        `${entry.name}-${entry.executed_at}`;

                    const type =
                        entry.request_type ===
                        RequestType.TRANSACTION
                            ? RequestType.TRANSACTION
                            : RequestType.RPC;
                    // Route the stored tx_params back into whichever
                    // chain-specific field it came from (see
                    // getTxParamsForHistory) so reopening a saved
                    // transaction shows its real params instead of a blank
                    // form. entries saved before this field existed on the
                    // backend fall back to the empty defaults, same as
                    // before.
                    const chain =
                        (entry.chain as ChainId) ??
                        'sui';
                    const hasTxParams =
                        type === RequestType.TRANSACTION &&
                        entry.tx_params != null;

                    return {
                        id,
                        type,
                        name: entry.name,
                        rpcParams: {
                            method:
                                entry.method ??
                                '',
                            params:
                                (entry.params as any[]) ??
                                [],
                            chain:
                                (entry.chain as ChainId) ??
                                undefined
                        },
                        moveParams:
                            hasTxParams && chain === 'sui'
                                ? (entry.tx_params as typeof DEFAULT_MOVE_CALL)
                                : { ...DEFAULT_MOVE_CALL },
                        evmTxParams:
                            hasTxParams && chain === 'evm'
                                ? (entry.tx_params as typeof DEFAULT_EVM_TX)
                                : undefined,
                        solanaTxParams:
                            hasTxParams && chain === 'solana'
                                ? (entry.tx_params as typeof DEFAULT_SOLANA_TX)
                                : undefined,
                        stellarTxParams:
                            hasTxParams && chain === 'stellar'
                                ? (entry.tx_params as typeof DEFAULT_STELLAR_TX)
                                : undefined,
                        executionResult:
                            entry.result ?? undefined,
                        walletFamily:
                            entry.wallet_family ?? undefined,
                        walletAddress:
                            entry.wallet_address ?? undefined,
                        timestamp: new Date(
                            entry.executed_at
                        ).getTime(),
                        status: entry.status,
                        duration:
                            entry.duration_ms,
                        network:
                            (entry.network as Network) ??
                            state.network,
                        workspaceId:
                            entry.workspace_id
                                ? extractId(
                                      entry.workspace_id
                                  ) || undefined
                                : undefined
                    };
                });

            state = {
                ...state,
                history
            };

            emit();
        } catch (error: any) {
            console.error(
                'Failed to fetch history:',
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

            if (hydratedRestoredUser) {
                persistStoredUser(
                    hydratedRestoredUser
                );
            }

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

            // Kick off the workspaces fetch before the try/catch so its promise
            // is in scope for both the success path and the profile-refresh
            // fallback in the catch block below. Declaring it inside the try
            // left it block-scoped, so the catch referenced an undefined
            // binding and threw `ReferenceError: workspacesPromise is not
            // defined`, losing the cached-user fallback entirely.
            const workspacesPromise =
                apiService.getWorkspaces();

            void workspacesPromise.catch(
                () => undefined
            );

            try {
                const profilePromise =
                    apiService.getProfile();

                const user =
                    await profilePromise;

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
                    const workspaces =
                        await workspacesPromise;

                    await appStore.fetchWorkspaces(
                        undefined,
                        workspaces
                    );
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
                        const workspaces =
                            await workspacesPromise;

                        await appStore.fetchWorkspaces(
                            undefined,
                            workspaces
                        );
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
        setTelemetryEnabled(settings.telemetry);
        if (typeof updates.telemetry === 'boolean') {
            track('settings_changed', {
                key: 'telemetry',
                value: settings.telemetry
            });
        }
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

        persistComments(newComments);
        emit();
    },

    setPendingAiPrompt(prompt: string | null) {
        state = {
            ...state,
            pendingAiPrompt: prompt
        };

        emit();
    },

    setViewMode(
        mode:
            | 'landing'
            | 'app'
            | 'docs'
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
