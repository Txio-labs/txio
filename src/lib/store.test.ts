import {
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';
import { RequestType } from '../types';
import { DEFAULT_MOVE_CALL } from './constants';

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
        // Real implementation (not a vi.fn()): store.ts calls this directly
        // to normalize a history/collection entry's Mongo-shaped id, and the
        // test fixtures below use plain string ids, which it already
        // passes through unchanged.
        extractId: (value: unknown) => (typeof value === 'string' ? value : ''),
        apiService: {
            login: vi.fn(),
            register: vi.fn(),
            setToken: vi.fn(),
            getProfile: vi.fn(),
            getWorkspaces: vi.fn(),
            getCollections: vi.fn(),
            createHistoryEntry: vi.fn(),
            getHistory: vi.fn()
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
        localStorage.setItem('txio_token', 'cached-token');
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

        const storedRaw = localStorage.getItem('txio_comments');
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
});

describe('appStore.addToHistory transaction params round-trip', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.resetAllMocks();
    });

    const evmTxRequest = {
        id: 'req-evm',
        type: RequestType.TRANSACTION,
        name: 'Transfer USDC',
        rpcParams: { method: '', params: [], chain: 'evm' as const },
        moveParams: { ...DEFAULT_MOVE_CALL },
        evmTxParams: { chainId: 1, to: '0xabc', value: '0', functionSignature: 'transfer(address,uint256)', args: ['0xabc', '5'], data: '' }
    };

    it('sends the active chain params and the execution result to the backend', async () => {
        localStorage.setItem('txio_token', 'cached-token');
        localStorage.setItem('txio_user', JSON.stringify(user));

        const { appStore, apiService } = await loadStore();
        apiService.getProfile.mockResolvedValue(user);
        apiService.getWorkspaces.mockResolvedValue([]);
        apiService.createHistoryEntry.mockResolvedValue({ name: 'x', request_type: 'TRANSACTION', network: 'mainnet', status: 200, duration_ms: 0, executed_at: '2026-01-01T00:00:00.000Z' });

        await appStore.initialize();

        appStore.addToHistory(evmTxRequest, 200, 812, {
            hash: '0xdeadbeef',
            explorerUrl: 'https://etherscan.io/tx/0xdeadbeef'
        });

        expect(apiService.createHistoryEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                txParams: evmTxRequest.evmTxParams,
                result: { hash: '0xdeadbeef', explorerUrl: 'https://etherscan.io/tx/0xdeadbeef' },
                status: 200,
                durationMs: 812
            })
        );

        // Optimistic local entry carries the same result immediately,
        // before the backend round-trip resolves.
        const snapshot = appStore.getSnapshot();
        expect(snapshot.history.at(-1)).toMatchObject({
            evmTxParams: evmTxRequest.evmTxParams,
            executionResult: { hash: '0xdeadbeef', explorerUrl: 'https://etherscan.io/tx/0xdeadbeef' }
        });
    });

    it('omits txParams/result for a plain RPC request', async () => {
        localStorage.setItem('txio_token', 'cached-token');
        localStorage.setItem('txio_user', JSON.stringify(user));

        const { appStore, apiService } = await loadStore();
        apiService.getProfile.mockResolvedValue(user);
        apiService.getWorkspaces.mockResolvedValue([]);
        apiService.createHistoryEntry.mockResolvedValue({ name: 'x', request_type: 'TRANSACTION', network: 'mainnet', status: 200, duration_ms: 0, executed_at: '2026-01-01T00:00:00.000Z' });

        await appStore.initialize();

        const rpcRequest = {
            id: 'req-rpc',
            type: RequestType.RPC,
            name: 'getChainIdentifier',
            rpcParams: { method: 'sui_getChainIdentifier', params: [], chain: 'sui' as const },
            moveParams: { ...DEFAULT_MOVE_CALL }
        };

        appStore.addToHistory(rpcRequest, 200, 45);

        expect(apiService.createHistoryEntry).toHaveBeenCalledWith(
            expect.objectContaining({ txParams: undefined, result: undefined })
        );
    });
});

describe('appStore.fetchHistory chain-specific params read-back', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.resetAllMocks();
    });

    it('routes a stored tx_params entry back into the field matching its chain, and carries the result', async () => {
        localStorage.setItem('txio_token', 'cached-token');
        localStorage.setItem('txio_user', JSON.stringify(user));

        const { appStore, apiService } = await loadStore();
        apiService.getProfile.mockResolvedValue(user);
        apiService.getWorkspaces.mockResolvedValue([workspace]);
        apiService.getCollections.mockResolvedValue([]);
        apiService.getHistory.mockResolvedValue([
            {
                id: 'h1',
                name: 'Transfer USDC',
                request_type: 'TRANSACTION',
                chain: 'evm',
                network: 'mainnet',
                tx_params: { chainId: 1, to: '0xabc', value: '0', functionSignature: '', args: [], data: '' },
                result: { hash: '0xdeadbeef' },
                status: 200,
                duration_ms: 900,
                executed_at: '2026-01-01T00:00:00.000Z'
            }
        ]);

        await appStore.initialize();
        await appStore.fetchHistory(workspace.id);

        const entry = appStore.getSnapshot().history.find((h) => h.id === 'h1');
        expect(entry).toMatchObject({
            evmTxParams: { chainId: 1, to: '0xabc', value: '0', functionSignature: '', args: [], data: '' },
            executionResult: { hash: '0xdeadbeef' }
        });
        // Never leaks into a chain-mismatched field.
        expect(entry?.solanaTxParams).toBeUndefined();
        expect(entry?.stellarTxParams).toBeUndefined();
    });

    it('falls back to empty defaults for entries saved before tx_params existed', async () => {
        localStorage.setItem('txio_token', 'cached-token');
        localStorage.setItem('txio_user', JSON.stringify(user));

        const { appStore, apiService } = await loadStore();
        apiService.getProfile.mockResolvedValue(user);
        apiService.getWorkspaces.mockResolvedValue([workspace]);
        apiService.getCollections.mockResolvedValue([]);
        apiService.getHistory.mockResolvedValue([
            {
                id: 'h2',
                name: 'Old Move call',
                request_type: 'TRANSACTION',
                chain: 'sui',
                network: 'mainnet',
                status: 200,
                duration_ms: 500,
                executed_at: '2026-01-01T00:00:00.000Z'
            }
        ]);

        await appStore.initialize();
        await appStore.fetchHistory(workspace.id);

        const entry = appStore.getSnapshot().history.find((h) => h.id === 'h2');
        expect(entry?.moveParams).toEqual(DEFAULT_MOVE_CALL);
        expect(entry?.executionResult).toBeUndefined();
    });
});

describe('appStore terminal panel default', () => {
    it('starts closed so it does not crowd the request editor before anything has run', async () => {
        const { appStore } = await loadStore();
        expect(appStore.getSnapshot().isTerminalOpen).toBe(false);
    });

    it('toggleTerminal flips it open and closed', async () => {
        const { appStore } = await loadStore();

        appStore.toggleTerminal();
        expect(appStore.getSnapshot().isTerminalOpen).toBe(true);

        appStore.toggleTerminal();
        expect(appStore.getSnapshot().isTerminalOpen).toBe(false);
    });
});
