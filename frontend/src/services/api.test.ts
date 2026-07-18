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
                bannerUrl: undefined
            }
        });
        expect(
            localStorage.getItem('txio_token')
        ).toBe('session-token');
    });

    it('adds the bearer token to authenticated requests', async () => {
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
        const headers = new Headers(
            options?.headers
        );

        expect(
            headers.get('Authorization')
        ).toBe('Bearer session-token');
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
});
