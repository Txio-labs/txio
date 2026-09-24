import {
    ActiveSession,
    ChainId,
    CollectionNode,
    isNetwork,
    Network,
    RecipeTemplate,
    RequestItem,
    RequestType,
    UserProfile,
    AdminOverview,
    AdminUser,
    AdminRequest,
    AdminCollection,
    AdminRpcLog,
    AdminEndpointStats,
    NotificationPreferences,
    Workspace
} from '../types';
import { DEFAULT_MOVE_CALL } from '../lib/constants';
import { normalizeNotificationPreferences } from '../lib/appConfig';
import { getTxParamsForHistory } from './transactionService';

// NOTE: vercel.json's Content-Security-Policy connect-src is a static value
// (Vercel parses vercel.json at deploy time and this app builds with
// output: 'export', so there's no middleware to inject it from env) — if
// this default or NEXT_PUBLIC_API_URL's backend host ever changes, update
// connect-src in vercel.json to match, or requests will be silently blocked
// by the browser.
const DEFAULT_API_BASE =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:8000/api/v1'
        : 'https://api.txio.xyz/api/v1';

// NEXT_PUBLIC_API_URL is set per-environment (e.g. in Vercel) and is easy to
// configure as just the backend origin, without the /api/v1 prefix every
// backend route is actually mounted under. Normalize defensively so a
// trailing slash or a missing /api/v1 doesn't silently 404 every request.
const normalizeApiBase = (base: string): string => {
    const trimmed = base.replace(/\/+$/, '');
    return trimmed.endsWith('/api/v1')
        ? trimmed
        : `${trimmed}/api/v1`;
};

export const API_BASE = normalizeApiBase(
    process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE
);

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

interface BackendGitHubAccount {
    id: string;
    login: string;
}

interface BackendUserProfile {
    id?: MongoIdLike;
    _id?: MongoIdLike;
    name?: string | null;
    email: string;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    notification_preferences?: BackendNotificationPreferences | null;
    notificationPreferences?: BackendNotificationPreferences | null;
    github_account?: BackendGitHubAccount | null;
    githubAccount?: BackendGitHubAccount | null;
    google_linked?: boolean;
    googleLinked?: boolean;
    is_admin?: boolean;
    isAdmin?: boolean;
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

export interface BackendSpendPolicy {
    id?: MongoIdLike;
    _id?: MongoIdLike;
    wallet_family: string;
    wallet_address: string;
    chain?: string | null;
    daily_limit_usd?: number | null;
    per_tx_limit_usd?: number | null;
    max_tx_per_hour?: number | null;
    created_at: string;
    updated_at: string;
}

export interface BackendSessionKey {
    id?: MongoIdLike;
    _id?: MongoIdLike;
    wallet_family: string;
    wallet_address: string;
    label: string;
    delegate_address: string;
    scoped_contracts: string[];
    max_amount_per_tx_usd?: number | null;
    expires_at: string;
    revoked_at?: string | null;
    created_at: string;
}

export type BackendTriggerKind =
    | { kind: 'recurring'; interval_minutes: number }
    | { kind: 'time_once'; at: string }
    | { kind: 'price_threshold'; chain: string; token: string; above: boolean; value_usd: number };

export interface BackendScheduledTask {
    id?: MongoIdLike;
    _id?: MongoIdLike;
    session_key_id: MongoIdLike;
    name: string;
    trigger: BackendTriggerKind;
    request_template: unknown;
    status: 'active' | 'paused' | 'cancelled';
    next_run_at?: string | null;
    last_run_at?: string | null;
    last_error?: string | null;
    created_at: string;
}

export interface BackendWebhookSubscription {
    id?: MongoIdLike;
    _id?: MongoIdLike;
    url: string;
    events: string[];
    is_active: boolean;
    last_delivered_at?: string | null;
    last_delivery_error?: string | null;
    created_at: string;
}

interface BackendHistoryEntry {
    id?: MongoIdLike;
    _id?: MongoIdLike;
    workspace_id?: MongoIdLike;
    name: string;
    request_type: string;
    chain?: string | null;
    network: string;
    method?: string | null;
    params?: unknown;
    wallet_family?: string | null;
    wallet_address?: string | null;
    tx_params?: unknown;
    result?: unknown;
    status: number;
    duration_ms: number;
    executed_at: string;
}

interface BackendWorkspace {
    id?: MongoIdLike;
    _id?: MongoIdLike;
    name: string;
    type?: 'Personal' | 'Team' | null;
    active_env_id?: string | null;
    activeEnvId?: string | null;
}

interface BackendRecipeTemplate {
    id?: MongoIdLike;
    _id?: MongoIdLike;
    title: string;
    recipe_type: string;
    description?: string | null;
    payload?: Record<string, unknown>;
}

interface BackendSavedRequest {
    id?: MongoIdLike;
    _id?: MongoIdLike;
    collection_id?: MongoIdLike;
    name: string;
    method: string;
    params?: unknown;
    request_type?: string;
    chain?: string | null;
    tx_params?: unknown;
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

export const extractId = (value: MongoIdLike): string => {
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
            ),
        githubAccount: user.githubAccount || user.github_account || undefined,
        googleLinked: Boolean(user.googleLinked ?? user.google_linked),
        isAdmin: Boolean(user.isAdmin ?? user.is_admin)
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
    request: BackendSavedRequest,
    collectionId?: string
): RequestItem => {
    const id =
        extractId(request.id ?? request._id) ||
        `${request.method}-${request.name}`;

    // A TRANSACTION request's target lives in tx_params (chain-native —
    // Sui moveParams, EVM evmTxParams, etc.), not method/params — see
    // getTxParamsForHistory, which this mirrors for the History read-back.
    // Older saved requests have no request_type and default to RPC.
    const type =
        request.request_type === RequestType.TRANSACTION
            ? RequestType.TRANSACTION
            : RequestType.RPC;
    const chain = (request.chain as ChainId) ?? undefined;
    const hasTxParams = type === RequestType.TRANSACTION && request.tx_params != null;

    return {
        id,
        name:
            request.name?.trim() ||
            request.method?.trim() ||
            'Saved Request',
        type,
        network: isNetwork(request.network)
            ? request.network
            : undefined,
        rpcParams: {
            method: request.method || '',
            params: normalizeRpcParams(
                request.params
            ),
            chain
        },
        moveParams:
            hasTxParams && chain === 'sui'
                ? (request.tx_params as RequestItem['moveParams'])
                : { ...DEFAULT_MOVE_CALL },
        evmTxParams:
            hasTxParams && chain === 'evm'
                ? (request.tx_params as RequestItem['evmTxParams'])
                : undefined,
        solanaTxParams:
            hasTxParams && chain === 'solana'
                ? (request.tx_params as RequestItem['solanaTxParams'])
                : undefined,
        stellarTxParams:
            hasTxParams && chain === 'stellar'
                ? (request.tx_params as RequestItem['stellarTxParams'])
                : undefined,
        localVars: [],
        timestamp: request.last_executed_at
            ? Date.parse(
                  request.last_executed_at
              ) || undefined
            : undefined,
        collectionId,
        lastResponse: request.last_response
    };
};

const normalizeRecipeTemplate = (
    template: BackendRecipeTemplate
): RecipeTemplate => ({
    id:
        extractId(template.id ?? template._id) ||
        `${template.title}-${Date.now()}`,
    title: template.title?.trim() || 'Untitled Template',
    type: template.recipe_type || 'PTB',
    description: template.description ?? undefined,
    payload: template.payload ?? {}
});

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
                normalizeSavedRequest(request, id);

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

    getToken(): string | null {
        return this.token;
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

    async unlinkGithub(): Promise<BackendMessageResponse> {
        return this.request<BackendMessageResponse>(
            '/auth/github/unlink',
            { method: 'POST' }
        );
    }

    async updateEmail(
        newEmail: string
    ): Promise<UserProfile> {
        const data =
            await this.request<BackendWrappedUserResponse>(
                '/auth/update-email',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        new_email:
                            newEmail
                    })
                }
            );

        return normalizeUserProfile(data.user);
    }

    async updateProfile(name: string): Promise<UserProfile> {
        const data =
            await this.request<BackendWrappedUserResponse>(
                '/auth/update-profile',
                {
                    method: 'POST',
                    body: JSON.stringify({ name })
                }
            );

        return normalizeUserProfile(data.user);
    }

    async updateNotificationPreferences(
        notificationPreferences: NotificationPreferences
    ): Promise<UserProfile> {
        const data =
            await this.request<BackendWrappedUserResponse>(
                '/auth/update-notification-preferences',
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
        currentPassword: string,
        newPassword: string
    ): Promise<UserProfile> {
        const data =
            await this.request<BackendWrappedUserResponse>(
                '/auth/update-password',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        current_password:
                            currentPassword,
                        new_password:
                            newPassword
                    })
                }
            );

        return normalizeUserProfile(data.user);
    }

    async deleteUser(): Promise<UserProfile> {
        const data =
            await this.request<BackendWrappedUserResponse>(
                '/auth/delete-user',
                {
                    method: 'POST'
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

    async updateWorkspace(
        workspaceId: string,
        name: string
    ): Promise<Workspace> {
        const data =
            await this.request<BackendWorkspace>(
                `/workspaces/${encodeURIComponent(workspaceId)}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({ name })
                }
            );

        return normalizeWorkspace(data);
    }

    async deleteWorkspace(
        workspaceId: string
    ): Promise<void> {
        await this.request(
            `/workspaces/${encodeURIComponent(workspaceId)}`,
            { method: 'DELETE' }
        );
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

    // Recipe Templates
    async getRecipeTemplates(): Promise<RecipeTemplate[]> {
        const templates =
            await this.request<BackendRecipeTemplate[]>(
                '/recipe-templates'
            );

        return templates.map(normalizeRecipeTemplate);
    }

    async createRecipeTemplate(
        title: string,
        recipeType: string,
        description?: string,
        payload?: Record<string, unknown>
    ): Promise<RecipeTemplate> {
        const data =
            await this.request<BackendRecipeTemplate>(
                '/recipe-templates',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        title,
                        recipe_type: recipeType,
                        description,
                        payload: payload ?? {}
                    })
                }
            );

        return normalizeRecipeTemplate(data);
    }

    async deleteRecipeTemplate(id: string): Promise<void> {
        await this.request<BackendMessageResponse>(
            `/recipe-templates/${id}`,
            { method: 'DELETE' }
        );
    }

    // Requests
    async addRequest(
        collectionId: string,
        request: Partial<RequestItem>
    ): Promise<CollectionNode> {
        // Only a full RequestItem carries chain-native transaction params;
        // a genuinely partial one (missing `type`) has none to send.
        const txParams =
            request.type === RequestType.TRANSACTION
                ? getTxParamsForHistory(request as RequestItem)
                : undefined;

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
                        request_type: request.type,
                        chain: request.rpcParams?.chain,
                        tx_params: txParams,
                        network:
                            request.network ??
                            'mainnet'
                    })
                }
            );

        const requestData =
            normalizeSavedRequest(data, collectionId);

        return {
            id: requestData.id,
            type: 'request',
            name: requestData.name,
            requestData
        };
    }

    async updateRequest(
        collectionId: string,
        requestId: string,
        updates: {
            name?: string;
            method?: string;
            params?: any;
            requestType?: string;
            chain?: string;
            txParams?: unknown;
            network?: string | null;
            lastResponse?: unknown | null;
        }
    ): Promise<RequestItem> {
        const body: Record<string, unknown> = {};
        if (updates.name !== undefined) body.name = updates.name;
        if (updates.method !== undefined) body.method = updates.method;
        if (updates.params !== undefined) body.params = updates.params;
        if (updates.requestType !== undefined) body.request_type = updates.requestType;
        if (updates.chain !== undefined) body.chain = updates.chain;
        if (updates.txParams !== undefined) body.tx_params = updates.txParams;
        if (updates.network !== undefined) body.network = updates.network;
        if (updates.lastResponse !== undefined) body.last_response = updates.lastResponse;

        const data =
            await this.request<BackendSavedRequest>(
                `/collections/${collectionId}/requests/${requestId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(body)
                }
            );

        return normalizeSavedRequest(data, collectionId);
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

    // Admin
    async getAdminOverview(): Promise<AdminOverview> {
        return this.request<AdminOverview>('/admin/overview');
    }

    async getAdminUsers(limit = 200): Promise<AdminUser[]> {
        return this.request<AdminUser[]>(`/admin/accounts?limit=${limit}`);
    }

    async getAdminRequests(limit = 200): Promise<AdminRequest[]> {
        return this.request<AdminRequest[]>(`/admin/requests?limit=${limit}`);
    }

    async getAdminCollections(limit = 200): Promise<AdminCollection[]> {
        return this.request<AdminCollection[]>(`/admin/collections?limit=${limit}`);
    }

    async getAdminRpcLogs(limit = 200): Promise<AdminRpcLog[]> {
        return this.request<AdminRpcLog[]>(`/admin/logs?limit=${limit}`);
    }

    async getAdminEndpointStats(sampleSize = 1000): Promise<AdminEndpointStats[]> {
        return this.request<AdminEndpointStats[]>(`/admin/endpoint-stats?limit=${sampleSize}`);
    }

    /** Permanently deletes an account and everything it owns. */
    async adminDeleteUser(email: string): Promise<void> {
        await this.request<{ message: string; email: string }>('/admin/users/delete', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    // Spend policies
    async upsertSpendPolicy(policy: {
        walletFamily: string;
        walletAddress: string;
        chain?: string;
        dailyLimitUsd?: number | null;
        perTxLimitUsd?: number | null;
        maxTxPerHour?: number | null;
    }): Promise<BackendSpendPolicy> {
        return this.request<BackendSpendPolicy>('/spend-policies', {
            method: 'POST',
            body: JSON.stringify({
                wallet_family: policy.walletFamily,
                wallet_address: policy.walletAddress,
                chain: policy.chain,
                daily_limit_usd: policy.dailyLimitUsd,
                per_tx_limit_usd: policy.perTxLimitUsd,
                max_tx_per_hour: policy.maxTxPerHour
            })
        });
    }

    async getSpendPolicy(walletAddress: string): Promise<BackendSpendPolicy | null> {
        return this.request<BackendSpendPolicy | null>(`/spend-policies?wallet_address=${encodeURIComponent(walletAddress)}`);
    }

    async deleteSpendPolicy(walletAddress: string): Promise<void> {
        await this.request(`/spend-policies?wallet_address=${encodeURIComponent(walletAddress)}`, { method: 'DELETE' });
    }

    async checkSpendPolicy(walletAddress: string, usdValue: number): Promise<{ allowed: boolean; reason?: string | null }> {
        return this.request('/spend-policies/check', {
            method: 'POST',
            body: JSON.stringify({ wallet_address: walletAddress, usd_value: usdValue })
        });
    }

    // Session keys
    async createSessionKey(req: {
        walletFamily: string;
        walletAddress: string;
        label: string;
        delegateAddress: string;
        delegatePrivateKey: string;
        scopedContracts: string[];
        maxAmountPerTxUsd?: number | null;
        expiresAt: string;
    }): Promise<BackendSessionKey> {
        return this.request<BackendSessionKey>('/session-keys', {
            method: 'POST',
            body: JSON.stringify({
                wallet_family: req.walletFamily,
                wallet_address: req.walletAddress,
                label: req.label,
                delegate_address: req.delegateAddress,
                delegate_private_key: req.delegatePrivateKey,
                scoped_contracts: req.scopedContracts,
                max_amount_per_tx_usd: req.maxAmountPerTxUsd,
                expires_at: req.expiresAt
            })
        });
    }

    async listSessionKeys(): Promise<BackendSessionKey[]> {
        return this.request<BackendSessionKey[]>('/session-keys');
    }

    async revokeSessionKey(id: string): Promise<void> {
        await this.request(`/session-keys/${id}/revoke`, { method: 'POST' });
    }

    // Scheduled tasks
    async createScheduledTask(req: {
        name: string;
        sessionKeyId: string;
        trigger: BackendTriggerKind;
        requestTemplate: unknown;
    }): Promise<BackendScheduledTask> {
        return this.request<BackendScheduledTask>('/scheduled-tasks', {
            method: 'POST',
            body: JSON.stringify({
                name: req.name,
                session_key_id: req.sessionKeyId,
                trigger: req.trigger,
                request_template: req.requestTemplate
            })
        });
    }

    async listScheduledTasks(): Promise<BackendScheduledTask[]> {
        return this.request<BackendScheduledTask[]>('/scheduled-tasks');
    }

    async pauseScheduledTask(id: string): Promise<void> {
        await this.request(`/scheduled-tasks/${id}/pause`, { method: 'POST' });
    }

    async resumeScheduledTask(id: string): Promise<void> {
        await this.request(`/scheduled-tasks/${id}/resume`, { method: 'POST' });
    }

    async cancelScheduledTask(id: string): Promise<void> {
        await this.request(`/scheduled-tasks/${id}/cancel`, { method: 'POST' });
    }

    // Webhooks
    async createWebhook(url: string, events: string[]): Promise<{ id: string; url: string; events: string[]; secret: string }> {
        return this.request('/webhooks', {
            method: 'POST',
            body: JSON.stringify({ url, events })
        });
    }

    async listWebhooks(): Promise<BackendWebhookSubscription[]> {
        return this.request<BackendWebhookSubscription[]>('/webhooks');
    }

    async deleteWebhook(id: string): Promise<void> {
        await this.request(`/webhooks/${id}`, { method: 'DELETE' });
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

    async createHistoryEntry(entry: {
        workspaceId?: string;
        name: string;
        requestType: string;
        chain?: string;
        network: string;
        method?: string;
        params?: unknown;
        walletFamily?: string;
        walletAddress?: string;
        // Chain-native transaction params (Sui moveParams, EVM evmTxParams,
        // Solana solanaTxParams, Stellar stellarTxParams) and the execution
        // outcome — see transactionService.ts's getTxParamsForHistory and
        // the result shape it produces. Absent for plain RPC entries.
        txParams?: unknown;
        result?: unknown;
        status: number;
        durationMs: number;
    }): Promise<BackendHistoryEntry> {
        return this.request<BackendHistoryEntry>('/history', {
            method: 'POST',
            body: JSON.stringify({
                workspace_id: entry.workspaceId,
                name: entry.name,
                request_type: entry.requestType,
                chain: entry.chain,
                network: entry.network,
                method: entry.method,
                params: entry.params,
                wallet_family: entry.walletFamily,
                wallet_address: entry.walletAddress,
                tx_params: entry.txParams,
                result: entry.result,
                status: entry.status,
                duration_ms: entry.durationMs
            })
        });
    }

    async getHistory(workspaceId?: string, walletAddress?: string, walletFamily?: string): Promise<BackendHistoryEntry[]> {
        const params = new URLSearchParams();
        if (workspaceId) params.set('workspace_id', workspaceId);
        if (walletAddress) params.set('wallet_address', walletAddress);
        if (walletFamily) params.set('wallet_family', walletFamily);
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request<BackendHistoryEntry[]>(`/history${query}`);
    }

    async clearHistory(workspaceId?: string): Promise<void> {
        const query = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : '';
        await this.request<{ message: string }>(`/history${query}`, { method: 'DELETE' });
    }

    async deleteHistoryEntry(id: string): Promise<void> {
        await this.request<{ message: string }>(`/history/${id}`, { method: 'DELETE' });
    }
}

export const apiService = new ApiService();
