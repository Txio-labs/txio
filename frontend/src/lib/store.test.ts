import {
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

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

    it('starts in app mode when a token is already stored', async () => {
        localStorage.setItem(
            'txio_token',
            'cached-token'
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
            localStorage.getItem('txio_token')
        ).toBe('session-token');
        expect(
            localStorage.getItem('txio_viewMode')
        ).toBe('app');
        expect(
            JSON.parse(
                localStorage.getItem(
                    'txio_user'
                ) || 'null'
            )
        ).toEqual(user);
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
            localStorage.getItem('txio_token')
        ).toBeNull();
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
            'txio_token',
            'expired-token'
        );
        localStorage.setItem(
            'txio_user',
            JSON.stringify(user)
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
        apiService.getProfile.mockRejectedValue(
            new ApiError('Unauthorized', 401)
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
            'expired-token'
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
            hasHydratedWorkspaces: false
        });
        expect(
            localStorage.getItem('txio_token')
        ).toBeNull();
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

    it('starts profile and workspace loading in parallel during initialization', async () => {
        localStorage.setItem(
            'txio_token',
            'cached-token'
        );
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
            'txio_token',
            'cached-token'
        );
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
            'cached-token'
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
            localStorage.getItem('txio_token')
        ).toBe('cached-token');
        expect(
            JSON.parse(
                localStorage.getItem(
                    'txio_user'
                ) || 'null'
            )
        ).toEqual(user);
    });
});
