import {
    ActiveSession,
    CollectionNode,
    isNetwork,
    Network,
    RequestItem,
    RequestType,
    UserProfile,
    NotificationPreferences,
    Workspace
} from '../types';
import { DEFAULT_MOVE_CALL } from '../lib/constants';
import { normalizeNotificationPreferences } from '../lib/appConfig';

const DEFAULT_API_BASE =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:8000/api/v1'
        : 'https://txio-oyac.onrender.com/api/v1';

export const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API_BASE;

const COMMAND_POLL_INTERVAL_MS = 500;

type MongoIdLike =
    | string
    | { $oid?: string }
    | { oid?: string }
    | null
    | undefined;

interface BackendNotificationPreferences {
    emailDigests?: boolean;
    emailSecurityAlerts?: boolean;
    inAppActivityAlerts?: boolean;
    inAppProductUpdates?: boolean;
    email_digests?: boolean;
    email_security_alerts?: boolean;
    in_app_activity_alerts?: boolean;
    in_app_product_updates?: boolean;
}

const normalizeBackendNotificationPreferences = (
    preferences?: BackendNotificationPreferences | null
): Partial<NotificationPreferences> | null => {
    if (!preferences) {
        return null;
    }

    return {
        emailDigests:
            preferences.emailDigests ??
            preferences.email_digests,
        emailSecurityAlerts:
            preferences.emailSecurityAlerts ??
            preferences.email_security_alerts,
        inAppActivityAlerts:
            preferences.inAppActivityAlerts ??
            preferences.in_app_activity_alerts,
        inAppProductUpdates:
            preferences.inAppProductUpdates ??
            preferences.in_app_product_updates
    };
};

interface BackendUserProfile {
    id?: MongoIdLike;
    _id?: MongoIdLike;
    name?: string | null;
    email: string;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    notification_preferences?: BackendNotificationPreferences | null;
    notificationPreferences?: BackendNotificationPreferences | null;
}

interface BackendAuthResponse {
    token: string;
    user: BackendUserProfile;
}

interface BackendCollection {
    id?: MongoIdLike;
    _id?: MongoIdLike;
    workspace_id?: MongoIdLike;
    name: string;
    description?: string | null;
}

interface BackendWorkspace {
    id?: MongoIdLike;
    _id?: MongoIdLike;
    name: string;
    type?: 'Personal' | 'Team' | null;
    active_env_id?: string | null;
    activeEnvId?: string | null;
}

interface BackendSavedRequest {
    id?: MongoIdLike;
    _id?: MongoIdLike;
    collection_id?: MongoIdLike;
    name: string;
    method: string;
    params?: unknown;
    network?: string | null;
    rpc_url?: string | null;
    last_response?: unknown;
    last_executed_at?: string | null;
}

interface BackendMessageResponse {
    message: string;
}

interface BackendWrappedUserResponse {
    user: BackendUserProfile;
}

interface BackendSwitchNetworkResponse {
    message: string;
    user: BackendUserProfile;
}

export type CommandExecutionState =
    | 'running'
    | 'success'
    | 'error'
    | 'cancelled'
    | 'timed_out';

export interface CommandExecutionResponse {
    executionId: string;
    command: string;
    state: CommandExecutionState;
    output?: string | null;
    stdout?: string | null;
    stderr?: string | null;
    exitCode?: number | null;
    durationMs?: number | null;
}

export interface AiChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface AiToolCall {
    name: string;
    args: Record<string, unknown>;
}

export interface AiChatResponse {
    role: 'model';
    text: string;
    toolCall?: AiToolCall | null;
}

export class ApiError extends Error {
    status: number;

    constructor(
        message: string,
        status: number
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        Object.setPrototypeOf(
            this,
            ApiError.prototype
        );
    }
}

const extractId = (value: MongoIdLike): string => {
    if (typeof value === 'string') {
        return value;
    }

    if (value && typeof value === 'object') {
        if (
            '$oid' in value &&
            typeof value.$oid === 'string'
        ) {
            return value.$oid;
        }

        if (
            'oid' in value &&
            typeof value.oid === 'string'
        ) {
            return value.oid;
        }
    }

    return '';
};

const deriveDisplayName = (
    email: string,
    providedName?: string | null
): string => {
    const trimmedName = providedName?.trim();
    if (trimmedName) {
        return trimmedName;
    }

    const localPart = email.split('@')[0]?.trim();
    return localPart || 'user';
};

const normalizeUserProfile = (
    user: BackendUserProfile
): UserProfile => {
    const email = user.email || '';

    return {
        id:
            extractId(user.id ?? user._id) ||
            email ||
            `user-${Date.now()}`,
        email,
        name: deriveDisplayName(
            email,
            user.name
        ),
        avatarUrl:
            typeof user.avatarUrl === 'string'
                ? user.avatarUrl
                : undefined,
        bannerUrl:
            typeof user.bannerUrl === 'string'
                ? user.bannerUrl
                : undefined,
        notificationPreferences:
            normalizeNotificationPreferences(
                normalizeBackendNotificationPreferences(
                    user.notificationPreferences ||
                        user.notification_preferences
                )
            )
    };
};

const normalizeRpcParams = (
    params: unknown
): any[] => {
    if (Array.isArray(params)) {
        return params;
    }

    if (
        params === null ||
        typeof params === 'undefined'
    ) {
        return [];
    }

    return [params];
};

const normalizeSavedRequest = (
    request: BackendSavedRequest
): RequestItem => {
    const id =
        extractId(request.id ?? request._id) ||
        `${request.method}-${request.name}`;

    return {
        id,
        name:
            request.name?.trim() ||
            request.method?.trim() ||
            'Saved Request',
        type: RequestType.RPC,
        network: isNetwork(request.network)
            ? request.network
            : undefined,
        rpcParams: {
            method: request.method || '',
            params: normalizeRpcParams(
                request.params
            )
        },
        moveParams: {
            ...DEFAULT_MOVE_CALL
        },
        localVars: [],
        timestamp: request.last_executed_at
            ? Date.parse(
                  request.last_executed_at
              ) || undefined
            : undefined
    };
};

const normalizeCollectionNode = (
    collection: BackendCollection,
    requests: BackendSavedRequest[] = []
): CollectionNode => {
    const id =
        extractId(collection.id ?? collection._id) ||
        collection.name
            .toLowerCase()
            .replace(/\s+/g, '-');

    return {
        id,
        type: 'collection',
        name:
            collection.name?.trim() ||
            'Untitled Collection',
        isExpanded: true,
        workspaceId: extractId(
            collection.workspace_id
        ),
        children: requests.map((request) => {
            const requestData =
                normalizeSavedRequest(request);

            return {
                id: requestData.id,
                type: 'request' as const,
                name: requestData.name,
                workspaceId: extractId(
                    collection.workspace_id
                ),
                requestData
            };
        })
    };
};

const normalizeWorkspace = (
    workspace: BackendWorkspace
): Workspace => {
    const emailFallbackId =
        typeof workspace.name === 'string'
            ? workspace.name
                  .toLowerCase()
                  .replace(/\s+/g, '-')
            : `workspace-${Date.now()}`;

    return {
        id:
            extractId(
                workspace.id ??
                    workspace._id
            ) || emailFallbackId,
        name:
            workspace.name?.trim() ||
            'Untitled Workspace',
        type:
            workspace.type === 'Team'
                ? 'Team'
                : 'Personal',
        activeEnvId:
            workspace.activeEnvId ||
            workspace.active_env_id ||
            ''
    };
};

const isCommandExecutionState = (
    value: unknown
): value is CommandExecutionState =>
    value === 'running' ||
    value === 'success' ||
    value === 'error' ||
    value === 'cancelled' ||
    value === 'timed_out';

const isOptionalString = (
    value: unknown
): value is string | null | undefined =>
    typeof value === 'string' ||
    value === null ||
    typeof value === 'undefined';

const isOptionalNumber = (
    value: unknown
): value is number | null | undefined =>
    typeof value === 'number' ||
    value === null ||
    typeof value === 'undefined';

const isCommandExecutionResponse = (
    value: unknown
): value is CommandExecutionResponse => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const response =
        value as Record<string, unknown>;

    return (
        typeof response.executionId ===
            'string' &&
        typeof response.command ===
            'string' &&
        isCommandExecutionState(
            response.state
        ) &&
        isOptionalString(
            response.output
        ) &&
        isOptionalString(
            response.stdout
        ) &&
        isOptionalString(
            response.stderr
        ) &&
        isOptionalNumber(
            response.exitCode
        ) &&
        isOptionalNumber(
            response.durationMs
        )
    );
};

const isAiToolCall = (
    value: unknown
): value is AiToolCall => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const toolCall =
        value as Record<string, unknown>;

    return (
        typeof toolCall.name === 'string' &&
        !!toolCall.args &&
        typeof toolCall.args === 'object' &&
        !Array.isArray(toolCall.args)
    );
};

const isAiChatResponse = (
    value: unknown
): value is AiChatResponse => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const response =
        value as Record<string, unknown>;
    const toolCall =
        response.toolCall ??
        response.tool_call;

    return (
        response.role === 'model' &&
        typeof response.text === 'string' &&
        (typeof toolCall === 'undefined' ||
            toolCall === null ||
            isAiToolCall(toolCall))
    );
};

const sleep = (ms: number) =>
    new Promise((resolve) =>
        setTimeout(resolve, ms)
    );

class ApiService {
    private token: string | null =
        typeof window !==
        'undefined'
            ? localStorage.getItem(
                  'txio_token'
              )
            : null;

    setToken(token: string | null) {
        this.token = token;

        if (
            typeof window !==
            'undefined'
        ) {
            if (token) {
                localStorage.setItem(
                    'txio_token',
                    token
                );
            } else {
                localStorage.removeItem(
                    'txio_token'
                );
            }
        }
    }

    private async request<T>(
        path: string,
        options: RequestInit = {}
    ): Promise<T> {
        const headers = new Headers(
            options.headers || {}
        );

        if (this.token) {
            headers.set(
                'Authorization',
                `Bearer ${this.token}`
            );
        }

        if (
            options.body &&
            !headers.has(
                'Content-Type'
            )
        ) {
            headers.set(
                'Content-Type',
                'application/json'
            );
        }

        let response: Response;

        try {
            response = await fetch(
                `${API_BASE}${path}`,
                {
                    ...options,
                    headers
                }
            );
        } catch (error) {
            if (
                error instanceof Error &&
                error.name === 'AbortError'
            ) {
                throw new ApiError(
                    'Request cancelled.',
                    499
                );
            }

            const message =
                error instanceof Error &&
                error.message.trim() &&
                error.message !== 'Failed to fetch'
                    ? error.message
                    : 'Unable to reach the backend. Check that the API server is running and FRONTEND_URL allows the frontend origin.';

            throw new ApiError(message, 0);
        }

        if (!response.ok) {
            const contentType =
                response.headers.get(
                    'content-type'
                ) || '';

            let message =
                `HTTP ${response.status} ${response.statusText || 'API request failed'}`;

            if (
                contentType.includes(
                    'application/json'
                )
            ) {
                const error =
                    await response
                        .json()
                        .catch(() => null);

                message =
                    error?.message ||
                    error?.error ||
                    message;
            } else {
                const text =
                    await response
                        .text()
                        .catch(() => '');

                if (text.trim()) {
                    message = text.trim();
                }
            }

            throw new ApiError(
                message,
                response.status
            );
        }

        if (response.status === 204) {
            return undefined as T;
        }

        const contentType =
            response.headers.get(
                'content-type'
            ) || '';

        if (
            contentType.includes(
                'application/json'
            )
        ) {
            return response.json() as Promise<T>;
        }

        return (await response.text()) as T;
    }

    private async getRawCollectionRequests(
        collectionId: string
    ): Promise<BackendSavedRequest[]> {
        return this.request<
            BackendSavedRequest[]
        >(
            `/collections/${collectionId}/requests`
        );
    }

    // Auth
    async login(
        email: string,
        password: string
    ): Promise<{
        token: string;
        user: UserProfile;
    }> {
        const data =
            await this.request<BackendAuthResponse>(
                '/auth/login',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

        this.setToken(data.token);

        return {
            token: data.token,
            user: normalizeUserProfile(data.user)
        };
    }

    async register(
        email: string,
        password: string
    ): Promise<{
        token: string;
        user: UserProfile;
    }> {
        const data =
            await this.request<BackendAuthResponse>(
                '/auth/register',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

        this.setToken(data.token);

        return {
            token: data.token,
            user: normalizeUserProfile(data.user)
        };
    }

    async getProfile(): Promise<UserProfile> {
        const data =
            await this.request<BackendUserProfile>(
                '/auth/profile'
            );

        return normalizeUserProfile(data);
    }

    async getUserProfileByEmail(
        email: string
    ): Promise<UserProfile> {
        const data =
            await this.request<BackendWrappedUserResponse>(
                '/auth/get-user-profile',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        email
                    })
                }
            );

        return normalizeUserProfile(data.user);
    }

    async requestOtp(
        email: string
    ): Promise<BackendMessageResponse> {
        return this.request<BackendMessageResponse>(
            '/auth/request-otp',
            {
                method: 'POST',
                body: JSON.stringify({ email })
            }
        );
    }

    async verifyOtp(
        email: string,
        otp: string
    ): Promise<BackendMessageResponse> {
        return this.request<BackendMessageResponse>(
            '/auth/verify-otp',
            {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    otp
                })
            }
        );
    }

    async forgotPassword(
        email: string
    ): Promise<BackendMessageResponse> {
        return this.request<BackendMessageResponse>(
            '/auth/forgot-password',
            {
                method: 'POST',
                body: JSON.stringify({ email })
            }
        );
    }

    async resetPassword(
        email: string,
        otp: string,
        newPassword: string
    ): Promise<BackendMessageResponse> {
        return this.request<BackendMessageResponse>(
            '/auth/reset-password',
            {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    otp,
                    new_password:
                        newPassword
                })
            }
        );
    }

    async updateEmail(
        oldEmail: string,
        newEmail: string
    ): Promise<UserProfile> {
        const data =
            await this.request<BackendWrappedUserResponse>(
                '/auth/update-email',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        old_email:
                            oldEmail,
                        new_email:
                            newEmail
                    })
                }
            );

        return normalizeUserProfile(data.user);
    }

    async updateNotificationPreferences(
        notificationPreferences: NotificationPreferences
    ): Promise<UserProfile> {
        const data =
            await this.request<BackendWrappedUserResponse>(
                '/auth/notification-preferences',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        notification_preferences: {
                            email_digests:
                                notificationPreferences.emailDigests,
                            email_security_alerts:
                                notificationPreferences.emailSecurityAlerts,
                            in_app_activity_alerts:
                                notificationPreferences.inAppActivityAlerts,
                            in_app_product_updates:
                                notificationPreferences.inAppProductUpdates
                        }
                    })
                }
            );

        return normalizeUserProfile(data.user);
    }

    async updatePassword(
        email: string,
        newPassword: string
    ): Promise<UserProfile> {
        const data =
            await this.request<BackendWrappedUserResponse>(
                '/auth/update-password',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        email,
                        new_password:
                            newPassword
                    })
                }
            );

        return normalizeUserProfile(data.user);
    }

    async deleteUser(
        email: string
    ): Promise<UserProfile> {
        const data =
            await this.request<BackendWrappedUserResponse>(
                '/auth/delete-user',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        email
                    })
                }
            );

        return normalizeUserProfile(data.user);
    }

    async switchNetwork(
        network: Network
    ): Promise<UserProfile> {
        const data =
            await this.request<BackendSwitchNetworkResponse>(
                '/auth/switch-network',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        network
                    })
                }
            );

        return normalizeUserProfile(data.user);
    }

    // Workspaces
    async getWorkspaces(): Promise<
        Workspace[]
    > {
        const data =
            await this.request<
                BackendWorkspace[]
            >('/workspaces');

        return data.map(normalizeWorkspace);
    }

    async createWorkspace(
        name: string,
        type: Workspace['type'] = 'Personal'
    ): Promise<Workspace> {
        const data =
            await this.request<BackendWorkspace>(
                '/workspaces',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        name,
                        workspace_type: type
                    })
                }
            );

        return normalizeWorkspace(data);
    }

    // Collections
    async getCollections(
        workspaceId: string
    ): Promise<CollectionNode[]> {
        const collections =
            await this.request<
                BackendCollection[]
            >(
                `/collections?workspace_id=${encodeURIComponent(
                    workspaceId
                )}`
            );

        return Promise.all(
            collections.map(
                async (collection) => {
                    const id = extractId(
                        collection.id ??
                            collection._id
                    );

                    if (!id) {
                        return normalizeCollectionNode(
                            collection,
                            []
                        );
                    }

                    try {
                        const requests =
                            await this.getRawCollectionRequests(
                                id
                            );

                        return normalizeCollectionNode(
                            collection,
                            requests
                        );
                    } catch (error) {
                        console.error(
                            `Failed to load requests for collection ${id}:`,
                            error
                        );

                        return normalizeCollectionNode(
                            collection,
                            []
                        );
                    }
                }
            )
        );
    }

    async createCollection(
        workspaceId: string,
        name: string,
        description?: string
    ): Promise<CollectionNode> {
        const data =
            await this.request<BackendCollection>(
                '/collections',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        workspace_id:
                            workspaceId,
                        name,
                        description
                    })
                }
            );

        return normalizeCollectionNode(
            data,
            []
        );
    }

    async deleteCollection(
        id: string
    ): Promise<void> {
        await this.request<
            BackendMessageResponse
        >(`/collections/${id}`, {
            method: 'DELETE'
        });
    }

    // Requests
    async addRequest(
        collectionId: string,
        request: Partial<RequestItem>
    ): Promise<CollectionNode> {
        const data =
            await this.request<BackendSavedRequest>(
                `/collections/${collectionId}/requests`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        name: request.name,
                        method:
                            request.rpcParams
                                ?.method,
                        params:
                            request.rpcParams
                                ?.params,
                        network:
                            request.network ??
                            'mainnet'
                    })
                }
            );

        const requestData =
            normalizeSavedRequest(data);

        return {
            id: requestData.id,
            type: 'request',
            name: requestData.name,
            requestData
        };
    }

    async sendAiChat(
        messages: AiChatMessage[],
        options: {
            signal?: AbortSignal;
        } = {}
    ): Promise<AiChatResponse> {
        let response: unknown;

        try {
            response =
                await this.request<unknown>(
                    '/ai/chat',
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            messages
                        }),
                        signal: options.signal
                    }
                );
        } catch (error) {
            if (
                error instanceof ApiError &&
                error.status === 404
            ) {
                throw new ApiError(
                    'AI endpoint not found. Restart the backend so /api/v1/ai/chat is available.',
                    404
                );
            }

            throw error;
        }

        if (!isAiChatResponse(response)) {
            throw new ApiError(
                'AI response was malformed.',
                502
            );
        }

        return {
            role: 'model',
            text: response.text,
            toolCall:
                response.toolCall ??
                null
        };
    }

    // Terminal
    async startCommandExecution(
        command: string,
        options: {
            signal?: AbortSignal;
        } = {}
    ): Promise<CommandExecutionResponse> {
        const response =
            await this.request<unknown>(
                '/terminal/execute',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        command
                    }),
                    signal: options.signal
                }
            );

        if (
            !isCommandExecutionResponse(
                response
            )
        ) {
            throw new ApiError(
                'Terminal response was malformed.',
                502
            );
        }

        return response;
    }

    async getCommandExecution(
        executionId: string,
        options: {
            signal?: AbortSignal;
        } = {}
    ): Promise<CommandExecutionResponse> {
        const response =
            await this.request<unknown>(
                `/terminal/executions/${executionId}`,
                {
                    signal: options.signal
                }
            );

        if (
            !isCommandExecutionResponse(
                response
            )
        ) {
            throw new ApiError(
                'Terminal execution status was malformed.',
                502
            );
        }

        return response;
    }

    async cancelCommandExecution(
        executionId: string,
        options: {
            signal?: AbortSignal;
        } = {}
    ): Promise<CommandExecutionResponse> {
        const response =
            await this.request<unknown>(
                `/terminal/executions/${executionId}/cancel`,
                {
                    method: 'POST',
                    signal: options.signal
                }
            );

        if (
            !isCommandExecutionResponse(
                response
            )
        ) {
            throw new ApiError(
                'Terminal cancellation response was malformed.',
                502
            );
        }

        return response;
    }

    // Sessions
    async getSessions(): Promise<ActiveSession[]> {
        const data = await this.request<{ sessions: ActiveSession[] }>('/auth/sessions');
        return data.sessions;
    }

    async revokeSession(sessionId: string): Promise<void> {
        await this.request<void>(`/auth/sessions/${encodeURIComponent(sessionId)}`, {
            method: 'DELETE',
        });
    }

    async executeCommand(
        command: string,
        options: {
            signal?: AbortSignal;
            pollIntervalMs?: number;
        } = {}
    ): Promise<CommandExecutionResponse> {
        const started =
            await this.startCommandExecution(
                command,
                {
                    signal: options.signal
                }
            );

        if (started.state !== 'running') {
            return started;
        }

        while (true) {
            if (options.signal?.aborted) {
                await this.cancelCommandExecution(
                    started.executionId
                ).catch(() => undefined);

                throw new ApiError(
                    'Request cancelled.',
                    499
                );
            }

            await sleep(
                options.pollIntervalMs ??
                    COMMAND_POLL_INTERVAL_MS
            );

            const current =
                await this.getCommandExecution(
                    started.executionId,
                    {
                        signal: options.signal
                    }
                );

            if (current.state !== 'running') {
                return current;
            }
        }
    }
}

export const apiService = new ApiService();
