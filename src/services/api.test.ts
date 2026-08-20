import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
    API_BASE,
    ApiError,
    apiService
} from './api';

const fetchMock = vi.fn<typeof fetch>();

const jsonResponse = (
    body: unknown,
    status = 200
) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json'
        }
    });

describe('apiService', () => {
    beforeEach(() => {
        apiService.setToken(null);
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        apiService.setToken(null);
        vi.unstubAllGlobals();
    });

    it('logs in with JSON credentials and persists the returned token', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                token: 'session-token',
                user: {
                    _id: { $oid: 'user-1' },
                    email: 'ada@example.com',
                    name: '  Ada Lovelace  '
                }
            })
        );

        const result = await apiService.login(
            'ada@example.com',
            'correct-horse'
        );

        expect(fetchMock).toHaveBeenCalledOnce();
        const [url, options] =
            fetchMock.mock.calls[0];
        const headers = new Headers(
            options?.headers
        );

        expect(url).toBe(
            `${API_BASE}/auth/login`
        );
        expect(options).toMatchObject({
            method: 'POST',
            body: JSON.stringify({
                email: 'ada@example.com',
                password: 'correct-horse'
            })
        });
        expect(
            headers.get('Content-Type')
        ).toBe('application/json');
        expect(result).toEqual({
            token: 'session-token',
            user: {
                id: 'user-1',
                email: 'ada@example.com',
                name: 'Ada Lovelace',
                avatarUrl: undefined,
                bannerUrl: undefined,
                notificationPreferences: {
                    emailDigests: true,
                    emailSecurityAlerts: true,
                    inAppActivityAlerts: true,
                    inAppProductUpdates: false
                }
            }
        });
    });

    it('sets credentials to include for authenticated requests', async () => {
        apiService.setToken('session-token');
        fetchMock.mockResolvedValue(
            jsonResponse({
                id: 'user-1',
                email: 'ada@example.com',
                name: 'Ada'
            })
        );

        await apiService.getProfile();

        const [, options] =
            fetchMock.mock.calls[0];

        expect(options?.credentials).toBe('include');
    });

    it('never interacts with localStorage for the token', async () => {
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
        const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
        const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

        apiService.setToken('test-token');
        apiService.setToken(null);

        expect(setItemSpy).not.toHaveBeenCalledWith('txio_token', expect.anything());
        expect(getItemSpy).not.toHaveBeenCalledWith('txio_token');
        expect(removeItemSpy).not.toHaveBeenCalledWith('txio_token');
    });

    it('converts JSON error responses into ApiError instances', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse(
                {
                    message:
                        'Invalid email or password'
                },
                401
            )
        );

        const request = apiService.login(
            'ada@example.com',
            'wrong-password'
        );

        await expect(request).rejects.toBeInstanceOf(
            ApiError
        );
        await expect(request).rejects.toMatchObject({
            status: 401,
            message: 'Invalid email or password'
        });
    });

    it('reports an unreachable backend without leaking fetch implementation text', async () => {
        fetchMock.mockRejectedValue(
            new TypeError('Failed to fetch')
        );

        await expect(
            apiService.getProfile()
        ).rejects.toMatchObject({
            name: 'ApiError',
            status: 0,
            message: expect.stringContaining(
                'Unable to reach the backend'
            )
        });
    });

    it('rejects malformed terminal responses', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                executionId: 'execution-1',
                command: 'txio status',
                state: 'unknown'
            })
        );

        await expect(
            apiService.startCommandExecution(
                'txio status'
            )
        ).rejects.toMatchObject({
            name: 'ApiError',
            status: 502,
            message:
                'Terminal response was malformed.'
        });
    });

    it('polls terminal execution until it reaches a terminal state', async () => {
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    executionId: 'execution-1',
                    command: 'txio status',
                    state: 'running'
                })
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    executionId: 'execution-1',
                    command: 'txio status',
                    state: 'running'
                })
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    executionId: 'execution-1',
                    command: 'txio status',
                    state: 'success',
                    output: 'ready',
                    exitCode: 0
                })
            );

        const result =
            await apiService.executeCommand(
                'txio status',
                { pollIntervalMs: 0 }
            );

        expect(result).toMatchObject({
            executionId: 'execution-1',
            state: 'success',
            output: 'ready',
            exitCode: 0
        });
        expect(
            fetchMock.mock.calls.map(
                ([url]) => url
            )
        ).toEqual([
            `${API_BASE}/terminal/execute`,
            `${API_BASE}/terminal/executions/execution-1`,
            `${API_BASE}/terminal/executions/execution-1`
        ]);
    });

    it('fetches and normalizes recipe templates', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse([
                {
                    _id: { $oid: 'tpl-1' },
                    title: 'Batch Transfer',
                    recipe_type: 'PTB',
                    description: null,
                    payload: { commands: [] }
                }
            ])
        );

        const templates =
            await apiService.getRecipeTemplates();

        expect(fetchMock).toHaveBeenCalledWith(
            `${API_BASE}/recipe-templates`,
            expect.anything()
        );
        expect(templates).toEqual([
            {
                id: 'tpl-1',
                title: 'Batch Transfer',
                type: 'PTB',
                description: undefined,
                payload: { commands: [] }
            }
        ]);
    });

    it('rotates the password with the email-based body the deployed backend expects', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                user: {
                    _id: { $oid: 'user-1' },
                    email: 'ada@example.com',
                    name: 'Ada Lovelace'
                }
            })
        );

        const result =
            await apiService.updatePassword(
                'ada@example.com',
                'current-password-123',
                'new-password-456'
            );

        const [url, options] =
            fetchMock.mock.calls[0];
        expect(url).toBe(
            `${API_BASE}/auth/update-password`
        );
        // The deployed backend requires `email` in the body (older
        // contract); the backend repo's current handler requires
        // `current_password` instead. Send both so rotation works against
        // the deployed instance today and survives the backend upgrade.
        expect(options).toMatchObject({
            method: 'POST',
            body: JSON.stringify({
                email: 'ada@example.com',
                current_password:
                    'current-password-123',
                new_password:
                    'new-password-456'
            })
        });
        expect(result).toEqual({
            id: 'user-1',
            email: 'ada@example.com',
            name: 'Ada Lovelace',
            avatarUrl: undefined,
            bannerUrl: undefined,
            notificationPreferences: {
                emailDigests: true,
                emailSecurityAlerts: true,
                inAppActivityAlerts: true,
                inAppProductUpdates: false
            }
        });
    });

    it('creates a recipe template with the given fields', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                _id: { $oid: 'tpl-2' },
                title: 'Stake to Validator',
                recipe_type: 'MoveCall',
                description: 'Stakes SUI to a chosen validator'
            })
        );

        const template =
            await apiService.createRecipeTemplate(
                'Stake to Validator',
                'MoveCall',
                'Stakes SUI to a chosen validator'
            );

        const [url, options] =
            fetchMock.mock.calls[0];
        expect(url).toBe(
            `${API_BASE}/recipe-templates`
        );
        expect(options).toMatchObject({
            method: 'POST',
            body: JSON.stringify({
                title: 'Stake to Validator',
                recipe_type: 'MoveCall',
                description:
                    'Stakes SUI to a chosen validator',
                payload: {}
            })
        });
        expect(template).toEqual({
            id: 'tpl-2',
            title: 'Stake to Validator',
            type: 'MoveCall',
            description:
                'Stakes SUI to a chosen validator',
            payload: {}
        });
    });
});
