import {
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
    createElement,
    Fragment
} from 'react';

vi.mock('../services/api', () => {
    class ApiError extends Error {
        status: number;

        constructor(
            message: string,
            status: number
        ) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
        }
    }

    return {
        ApiError,
        apiService: {
            login: vi.fn(),
            register: vi.fn(),
            setToken: vi.fn(),
            getProfile: vi.fn(),
            getWorkspaces: vi.fn(),
            getCollections: vi.fn()
        }
    };
});

const user = {
    id: 'user-1',
    email: 'ada@example.com',
    name: 'Ada Lovelace'
};

const defaultNotificationPreferences = {
    emailDigests: true,
    emailSecurityAlerts: true,
    inAppActivityAlerts: true,
    inAppProductUpdates: false
};

const workspace = {
    id: 'workspace-1',
    name: 'Core Protocol',
    type: 'Personal' as const,
    activeEnvId: ''
};

const createDeferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>(
        (res, rej) => {
            resolve = res;
            reject = rej;
        }
    );

    return {
        promise,
        resolve,
        reject
    };
};

const loadStore = async () => {
    vi.resetModules();

    const apiModule =
        await import('../services/api');
    const storeModule = await import('./store');

    return {
        appStore: storeModule.appStore,
        useAppStore: storeModule.useAppStore,
        apiService: vi.mocked(
            apiModule.apiService
        ),
        ApiError: apiModule.ApiError
    };
};

describe('appStore auth and session state', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.resetAllMocks();
    });

    it('starts in app mode when a user is already stored', async () => {
        localStorage.setItem(
            'txio_user',
            JSON.stringify(user)
        );

        const { appStore } = await loadStore();

        expect(
            appStore.getSnapshot().viewMode
        ).toBe('app');
        expect(
            appStore.getSnapshot().user
        ).toBeNull();
    });

    it('persists a successful login and hydrates its workspace', async () => {
        const { appStore, apiService } =
            await loadStore();
        apiService.login.mockResolvedValue({
            token: 'session-token',
            user
        });
        apiService.getWorkspaces.mockResolvedValue(
            [workspace]
        );
        apiService.getCollections.mockResolvedValue(
            []
        );

        await appStore.login(
            'ada@example.com',
            'correct-horse'
        );

        expect(
            apiService.setToken
        ).toHaveBeenCalledWith('session-token');
        expect(
            apiService.getCollections
        ).toHaveBeenCalledWith('workspace-1');
        expect(
            appStore.getSnapshot()
        ).toMatchObject({
            user,
            viewMode: 'app',
            workspaces: [workspace],
            currentWorkspaceId: 'workspace-1',
            hasHydratedWorkspaces: true
        });
        expect(
            localStorage.getItem('txio_viewMode')
        ).toBe('app');
        expect(
            JSON.parse(
                localStorage.getItem(
                    'txio_user'
                ) || 'null'
            )
        ).toEqual({
            ...user,
            notificationPreferences:
                defaultNotificationPreferences
        });
        expect(
            localStorage.getItem(
                'txio_current_workspace'
            )
        ).toBe('workspace-1');
    });

    it('hydrates prefetched workspaces without refetching them', async () => {
        const { appStore, apiService } =
            await loadStore();

        appStore.updateUser(user);
        apiService.getCollections.mockResolvedValue(
            []
        );

        await appStore.fetchWorkspaces(
            undefined,
            [workspace]
        );

        expect(
            apiService.getWorkspaces
        ).not.toHaveBeenCalled();
        expect(
            apiService.getCollections
        ).toHaveBeenCalledWith('workspace-1');
        expect(
            appStore.getSnapshot()
        ).toMatchObject({
            workspaces: [workspace],
            currentWorkspaceId: 'workspace-1',
            hasHydratedWorkspaces: true
        });
    });

    it('clears persisted identity and workspace state on logout', async () => {
        const { appStore, apiService } =
            await loadStore();
        apiService.login.mockResolvedValue({
            token: 'session-token',
            user
        });
        apiService.getWorkspaces.mockResolvedValue(
            [workspace]
        );
        apiService.getCollections.mockResolvedValue(
            []
        );
        await appStore.login(
            'ada@example.com',
            'correct-horse'
        );

        appStore.logout();

        expect(
            apiService.setToken
        ).toHaveBeenLastCalledWith(null);
        expect(
            appStore.getSnapshot()
        ).toMatchObject({
            user: null,
            viewMode: 'landing',
            workspaces: [],
            currentWorkspaceId: '',
            collections: [],
            tabs: [],
            activeTabId: null,
            hasHydratedWorkspaces: false
        });

        expect(
            localStorage.getItem('txio_user')
        ).toBeNull();
        expect(
            localStorage.getItem('txio_viewMode')
        ).toBeNull();
        expect(
            localStorage.getItem(
                'txio_current_workspace'
            )
        ).toBeNull();
    });

    it('clears an invalid stored session during initialization', async () => {
        localStorage.setItem(
            'txio_user',
            JSON.stringify(user)
        );
        localStorage.setItem(
            'txio_comments:user-1',
            JSON.stringify({
                'req-stale': [
                    {
                        id: 'cm-stale',
                        userName: user.name,
                        content: 'stale comment',
                        timestamp: 1,
                        userAvatarColor:
                            'bg-electric-violet'
                    }
                ]
            })
        );
        localStorage.setItem(
            'txio_viewMode',
            'app'
        );
        localStorage.setItem(
            'txio_current_workspace',
            'workspace-1'
        );
        const {
            appStore,
            apiService,
            ApiError
        } = await loadStore();
        apiService.getWorkspaces.mockResolvedValue(
            []
        );
        apiService.getProfile.mockRejectedValue(
            new ApiError('Unauthorized', 401)
        );
        // `initialize` kicks off the workspaces fetch alongside the profile
        // fetch, so it must resolve to a promise even on the auth-failure path.
        // Without this the mock returns `undefined` and the store throws before
        // the session-clearing logic under test can run.
        apiService.getWorkspaces.mockResolvedValue(
            []
        );
        vi.spyOn(
            console,
            'warn'
        ).mockImplementation(() => undefined);

        await appStore.initialize();

        expect(
            apiService.setToken
        ).toHaveBeenNthCalledWith(
            1,
            null
        );
        expect(
            apiService.setToken
        ).toHaveBeenLastCalledWith(null);
        expect(
            appStore.getSnapshot()
        ).toMatchObject({
            user: null,
            viewMode: 'landing',
            workspaces: [],
            currentWorkspaceId: '',
            isLoadingWorkspaces: false,
            hasHydratedWorkspaces: false,
            comments: {}
        });

        expect(
            localStorage.getItem('txio_user')
        ).toBeNull();
        expect(
            localStorage.getItem('txio_viewMode')
        ).toBeNull();
        expect(
            localStorage.getItem(
                'txio_current_workspace'
            )
        ).toBeNull();
    });

    it('clears comments when initializing without a stored token', async () => {

        localStorage.setItem(
            'txio_comments:user-1',
            JSON.stringify({
                'req-stale': [
                    {
                        id: 'cm-stale',
                        userName: user.name,
                        content: 'stale comment',
                        timestamp: 1,
                        userAvatarColor:
                            'bg-electric-violet'
                    }
                ]
            })
        );

        const { appStore } = await loadStore();

        await appStore.initialize();

        expect(
            appStore.getSnapshot().user
        ).toBeNull();
        expect(
            appStore.getSnapshot().comments
        ).toEqual({});
    });

    it('starts profile and workspace loading in parallel during initialization', async () => {
        localStorage.setItem(
            'txio_user',
            JSON.stringify(user)
        );

        const { appStore, apiService } =
            await loadStore();
        const profileDeferred =
            createDeferred<typeof user>();
        const workspacesDeferred =
            createDeferred<typeof workspace[]>();

        apiService.getProfile.mockReturnValue(
            profileDeferred.promise
        );
        apiService.getWorkspaces.mockReturnValue(
            workspacesDeferred.promise
        );
        apiService.getCollections.mockResolvedValue(
            []
        );

        const initializePromise =
            appStore.initialize();

        await Promise.resolve();

        expect(
            apiService.getProfile
        ).toHaveBeenCalledTimes(1);
        expect(
            apiService.getWorkspaces
        ).toHaveBeenCalledTimes(1);
        expect(
            apiService.getCollections
        ).not.toHaveBeenCalled();

        workspacesDeferred.resolve([
            workspace
        ]);
        profileDeferred.resolve(user);

        await initializePromise;

        expect(
            apiService.getCollections
        ).toHaveBeenCalledWith('workspace-1');
        expect(
            appStore.getSnapshot()
        ).toMatchObject({
            user,
            workspaces: [workspace],
            currentWorkspaceId: 'workspace-1',
            hasHydratedWorkspaces: true
        });
    });

    it('keeps a cached user when profile refresh fails without an auth error', async () => {
        localStorage.setItem(
            'txio_user',
            JSON.stringify(user)
        );
        const { appStore, apiService } =
            await loadStore();
        apiService.getProfile.mockRejectedValue(
            new Error('Backend unavailable')
        );
        apiService.getWorkspaces.mockResolvedValue(
            []
        );
        vi.spyOn(
            console,
            'warn'
        ).mockImplementation(() => undefined);

        await appStore.initialize();

        expect(
            apiService.setToken
        ).toHaveBeenLastCalledWith(
            null
        );
        expect(
            appStore.getSnapshot()
        ).toMatchObject({
            user,
            viewMode: 'app',
            isLoadingWorkspaces: false,
            hasHydratedWorkspaces: true
        });
        expect(
            JSON.parse(
                localStorage.getItem(
                    'txio_user'
                ) || 'null'
            )
        ).toEqual({
            ...user,
            notificationPreferences: defaultNotificationPreferences
        });
    });
});

describe('appStore comments persistence', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.resetAllMocks();
    });

    it('persists posted comments to localStorage and restores them on load', async () => {
        localStorage.setItem('txio_user', JSON.stringify(user));

        const { appStore, apiService } = await loadStore();
        apiService.getProfile.mockResolvedValue(user);
        apiService.getWorkspaces.mockResolvedValue([]);

        await appStore.initialize();

        const requestId = 'req-123';
        appStore.postComment(requestId, 'Great API request structure!');

        const snapshot = appStore.getSnapshot();
        expect(snapshot.comments[requestId]).toBeDefined();
        expect(snapshot.comments[requestId]).toHaveLength(1);
        expect(snapshot.comments[requestId][0]).toMatchObject({
            userName: user.name,
            content: 'Great API request structure!'
        });

        const storedRaw = localStorage.getItem('txio_comments:user-1');
        expect(storedRaw).not.toBeNull();
        const storedComments = JSON.parse(storedRaw!);
        expect(storedComments[requestId]).toHaveLength(1);
        expect(storedComments[requestId][0].content).toBe('Great API request structure!');

        // Reload store and verify comments are hydrated from localStorage
        const reloaded = await loadStore();
        const reloadedSnapshot = reloaded.appStore.getSnapshot();
        expect(reloadedSnapshot.comments[requestId]).toHaveLength(1);
        expect(reloadedSnapshot.comments[requestId][0].content).toBe('Great API request structure!');
    });

    it('isolates comments between user ids in the same browser session', async () => {
        const { appStore, apiService } = await loadStore();
        apiService.login.mockResolvedValue({
            token: 'token-user-1',
            user
        });
        apiService.getWorkspaces.mockResolvedValue([]);
        apiService.getCollections.mockResolvedValue([]);

        await appStore.login(
            'ada@example.com',
            'correct-horse'
        );

        const requestId = 'req-shared';
        appStore.postComment(
            requestId,
            'Visible to user-1 only'
        );

        expect(
            appStore.getSnapshot().comments[requestId]
        ).toHaveLength(1);

        appStore.logout();

        expect(
            appStore.getSnapshot().comments
        ).toEqual({});

        const otherUser = {
            id: 'user-2',
            email: 'bob@example.com',
            name: 'Bob'
        };

        apiService.login.mockResolvedValue({
            token: 'token-user-2',
            user: otherUser
        });

        await appStore.login(
            'bob@example.com',
            'correct-horse'
        );

        expect(
            appStore.getSnapshot().comments
        ).toEqual({});

        expect(
            JSON.parse(
                localStorage.getItem(
                    'txio_comments:user-1'
                ) || '{}'
            )[requestId]
        ).toHaveLength(1);
        expect(
            localStorage.getItem(
                'txio_comments:user-2'
            )
        ).toBeNull();
    });

    it('re-scopes comments when the identity changes via updateUser (OAuth switch)', async () => {
        const { appStore, apiService } = await loadStore();
        apiService.login.mockResolvedValue({
            token: 'token-user-1',
            user
        });
        apiService.getWorkspaces.mockResolvedValue(
            []
        );
        apiService.getCollections.mockResolvedValue(
            []
        );

        await appStore.login(
            'ada@example.com',
            'correct-horse'
        );

        const requestId = 'req-oauth';
        appStore.postComment(
            requestId,
            'User-1 private comment'
        );

        const otherUser = {
            id: 'user-2',
            email: 'bob@example.com',
            name: 'Bob'
        };

        appStore.updateUser(otherUser);

        expect(
            appStore.getSnapshot().user
        ).toMatchObject(otherUser);
        expect(
            appStore.getSnapshot().comments
        ).toEqual({});
        expect(
            JSON.parse(
                localStorage.getItem(
                    'txio_comments:user-1'
                ) || '{}'
            )[requestId]
        ).toHaveLength(1);
    });
});

describe('appStore env variables persistence', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.resetAllMocks();
    });

    it('persists env variables to localStorage and restores them on load', async () => {
        localStorage.setItem('txio_user', JSON.stringify(user));
        localStorage.setItem('txio_current_workspace', 'workspace-1');

        const { appStore, apiService } = await loadStore();
        apiService.getProfile.mockResolvedValue(user);
        apiService.getWorkspaces.mockResolvedValue([workspace]);
        apiService.getCollections.mockResolvedValue([]);

        await appStore.initialize();

        const vars = [{ key: 'API_URL', value: 'https://api.example.com', enabled: true, network: 'all' as any }];
        appStore.updateEnv(vars);

        const snapshot = appStore.getSnapshot();
        expect(snapshot.envVariables).toHaveLength(1);
        expect(snapshot.envVariables[0].key).toBe('API_URL');

        const storedRaw = localStorage.getItem('txio_env_workspace-1');
        expect(storedRaw).not.toBeNull();
        const storedVars = JSON.parse(storedRaw!);
        expect(storedVars).toHaveLength(1);
        expect(storedVars[0].value).toBe('https://api.example.com');

        // Reload store and verify env variables are hydrated from localStorage
        const reloaded = await loadStore();
        reloaded.apiService.getProfile.mockResolvedValue(user);
        reloaded.apiService.getWorkspaces.mockResolvedValue([workspace]);
        reloaded.apiService.getCollections.mockResolvedValue([]);

        await reloaded.appStore.initialize();
        
        const reloadedSnapshot = reloaded.appStore.getSnapshot();
        expect(reloadedSnapshot.envVariables).toHaveLength(1);
        expect(reloadedSnapshot.envVariables[0].key).toBe('API_URL');
    });
});

describe('useAppStore selector behavior', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.resetAllMocks();
    });

    it('returns the full state when called without a selector', async () => {
        const { appStore, useAppStore } = await loadStore();
        const { render, screen } = await import('@testing-library/react');

        const BareProbe = () => {
            const state = useAppStore();

            return createElement(
                'span',
                { 'data-testid': 'full' },
                state.viewMode
            );
        };

        render(createElement(BareProbe));

        expect(
            screen.getByTestId('full').textContent
        ).toBe(appStore.getSnapshot().viewMode);
    });

    it('returns only the selected slice of state', async () => {
        const { appStore, useAppStore } = await loadStore();
        const { render } = await import('@testing-library/react');

        let selected: unknown = null;

        const Probe = () => {
            selected = useAppStore((s) => s.network);

            return null;
        };

        render(createElement(Probe));

        expect(selected).toBe(
            appStore.getSnapshot().network
        );
    });

    it('re-renders the un-scoped hook on any store update', async () => {
        const { appStore, useAppStore } = await loadStore();
        const { render, act } = await import('@testing-library/react');

        let renders = 0;

        const Probe = () => {
            useAppStore();
            renders++;

            return null;
        };

        render(createElement(Probe));
        const initialRenders = renders;

        act(() => {
            appStore.toggleTerminal();
        });

        expect(renders).toBe(initialRenders + 1);
    });

    it('skips re-renders for scoped selectors on unrelated store updates', async () => {
        const { appStore, useAppStore } = await loadStore();
        const { render, act } = await import('@testing-library/react');

        let themeRenders = 0;
        let terminalRenders = 0;

        const ThemeProbe = () => {
            useAppStore((s) => s.theme);
            themeRenders++;

            return null;
        };

        const TerminalProbe = () => {
            useAppStore((s) => s.isTerminalOpen);
            terminalRenders++;

            return null;
        };

        render(
            createElement(
                Fragment,
                null,
                createElement(ThemeProbe),
                createElement(TerminalProbe)
            )
        );

        const initialThemeRenders = themeRenders;
        const initialTerminalRenders = terminalRenders;

        act(() => {
            appStore.toggleTerminal();
        });

        expect(themeRenders).toBe(
            initialThemeRenders
        );
        expect(terminalRenders).toBe(
            initialTerminalRenders + 1
        );

        act(() => {
            appStore.updateSettings({
                theme: 'light'
            });
        });

        expect(themeRenders).toBe(
            initialThemeRenders + 1
        );
        expect(terminalRenders).toBe(
            initialTerminalRenders + 1
        );
    });

    it('keeps the previous selection reference when a shallow-equal slice is selected', async () => {
        const { appStore, useAppStore } = await loadStore();
        const { render, act } = await import('@testing-library/react');

        let selection: {
            network: string;
            isTerminalOpen: boolean;
        } | null = null;

        const Probe = () => {
            selection = useAppStore((s) => ({
                network: s.network,
                isTerminalOpen: s.isTerminalOpen
            }));

            return null;
        };

        render(createElement(Probe));
        const first = selection;

        act(() => {
            appStore.toggleSidebar();
        });

        // Unrelated change: shallow-equal slice, same reference, no re-render.
        expect(selection).toBe(first);

        act(() => {
            appStore.toggleTerminal();
        });

        expect(selection).not.toBe(first);
        expect(selection?.isTerminalOpen).toBe(
            !first?.isTerminalOpen
        );
    });
});
