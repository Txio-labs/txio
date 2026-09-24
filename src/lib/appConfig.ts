import { AppSettings, ChainId, Network, NotificationPreferences, RpcEndpointOverrides } from '../types';
import { EVM_NETWORKS, NETWORKS, NETWORKS_FALLBACK, SOLANA_NETWORKS, STELLAR_NETWORKS } from './constants';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    emailDigests: true,
    emailSecurityAlerts: true,
    inAppActivityAlerts: true,
    inAppProductUpdates: false
};

const EMPTY_CUSTOM_RPC: RpcEndpointOverrides = {
    mainnet: [],
    testnet: [],
    devnet: [],
    localnet: []
};

/**
 * Settings persisted before multi-endpoint failover shipped stored one
 * string per network instead of an array. Accepts either shape and always
 * returns the array form, dropping blank entries.
 */
const normalizeRpcOverrides = (
    raw: unknown
): RpcEndpointOverrides => {
    const result: RpcEndpointOverrides = { ...EMPTY_CUSTOM_RPC };

    if (!raw || typeof raw !== 'object') {
        return result;
    }

    for (const network of Object.keys(result) as Network[]) {
        const value = (raw as Record<string, unknown>)[network];

        if (typeof value === 'string') {
            result[network] = value.trim() ? [value.trim()] : [];
        } else if (Array.isArray(value)) {
            result[network] = value
                .filter((entry): entry is string => typeof entry === 'string')
                .map((entry) => entry.trim())
                .filter(Boolean);
        }
    }

    return result;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
    theme: 'light',
    showLineNumbers: true,
    autoSave: true,
    telemetry: true,
    customRpc: { ...EMPTY_CUSTOM_RPC },
    evmCustomRpc: { ...EMPTY_CUSTOM_RPC },
    stellarCustomRpc: { ...EMPTY_CUSTOM_RPC },
    solanaCustomRpc: { ...EMPTY_CUSTOM_RPC },
    explorer: 'suiscan',
    evmExplorer: 'family',
    stellarExplorer: 'stellarexpert',
    solanaExplorer: 'solanaexplorer'
};

export const normalizeNotificationPreferences = (
    preferences?: Partial<NotificationPreferences> | null
): NotificationPreferences => ({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(preferences || {})
});

export const normalizeAppSettings = (
    settings?: Partial<AppSettings> | null
): AppSettings => {
    const merged: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        ...settings,
        customRpc: normalizeRpcOverrides(settings?.customRpc),
        evmCustomRpc: normalizeRpcOverrides(settings?.evmCustomRpc),
        stellarCustomRpc: normalizeRpcOverrides(settings?.stellarCustomRpc),
        solanaCustomRpc: normalizeRpcOverrides(settings?.solanaCustomRpc)
    };

    // Backward-compat: older persisted state only had Sui `explorer`.
    if (!settings?.evmExplorer) {
        merged.evmExplorer = DEFAULT_APP_SETTINGS.evmExplorer;
    }
    if (!settings?.stellarExplorer) {
        merged.stellarExplorer = DEFAULT_APP_SETTINGS.stellarExplorer;
    }
    if (!settings?.solanaExplorer) {
        merged.solanaExplorer = DEFAULT_APP_SETTINGS.solanaExplorer;
    }

    return merged;
};

/** The single best endpoint to use — first configured override, or the built-in default. */
export const resolveRpcUrl = (
    network: Network,
    settings: Pick<AppSettings, 'customRpc'> = DEFAULT_APP_SETTINGS
) => resolveRpcUrlList(network, settings)[0];

/**
 * Every endpoint to try for this network, in priority order: user-configured
 * overrides first, then the built-in fallback mirror (if one exists for this
 * network), then the primary default — so a single provider being briefly
 * unreachable doesn't fail every call.
 */
export const resolveRpcUrlList = (
    network: Network,
    settings: Pick<AppSettings, 'customRpc'> = DEFAULT_APP_SETTINGS
): string[] => {
    const overrides = settings.customRpc[network] || [];
    const fallback = NETWORKS_FALLBACK[network];
    return [...overrides, ...(fallback ? [fallback] : []), NETWORKS[network]];
};

/**
 * Chain-aware RPC URL resolution, honoring per-chain custom overrides where
 * they exist. Aptos has no default/override RPC infrastructure yet (it's a
 * REST API, not JSON-RPC, so it needs a different request-building path) —
 * it's intentionally left out here.
 */
export const resolveChainCustomRpcUrl = (
    chain: Extract<ChainId, 'sui' | 'evm' | 'stellar' | 'solana'>,
    network: Network,
    settings: Pick<AppSettings, 'customRpc' | 'evmCustomRpc' | 'stellarCustomRpc' | 'solanaCustomRpc'> = DEFAULT_APP_SETTINGS
) => resolveChainRpcUrlList(chain, network, settings)[0];

/** Every endpoint to try for this chain+network, in priority order, ending with the built-in default. */
export const resolveChainRpcUrlList = (
    chain: Extract<ChainId, 'sui' | 'evm' | 'stellar' | 'solana'>,
    network: Network,
    settings: Pick<AppSettings, 'customRpc' | 'evmCustomRpc' | 'stellarCustomRpc' | 'solanaCustomRpc'> = DEFAULT_APP_SETTINGS
): string[] => {
    if (chain === 'sui') {
        return resolveRpcUrlList(network, settings);
    }

    if (chain === 'evm') {
        return [...(settings.evmCustomRpc[network] || []), EVM_NETWORKS[network]];
    }

    if (chain === 'solana') {
        return [...(settings.solanaCustomRpc[network] || []), SOLANA_NETWORKS[network]];
    }

    return [...(settings.stellarCustomRpc[network] || []), STELLAR_NETWORKS[network]];
};

const getSuiExplorerHost = (
    network: Network,
    explorer: AppSettings['explorer']
) => {
    if (explorer === 'suivision') {
        if (network === 'mainnet') {
            return 'https://suivision.xyz';
        }

        return `https://${network}.suivision.xyz`;
    }

    if (explorer === 'suiexplorer') {
        return 'https://suiexplorer.com';
    }

    return 'https://suiscan.xyz';
};

const getSuiExplorerQuery = (
    network: Network,
    explorer: AppSettings['explorer']
) => {
    if (explorer === 'suiexplorer') {
        return `?network=${network}`;
    }

    return '';
};

export const getSuiAccountExplorerUrl = (
    address: string,
    network: Network,
    explorer: AppSettings['explorer']
) => {
    if (explorer === 'suiscan') {
        return `${getSuiExplorerHost(network, explorer)}/${network}/account/${address}`;
    }

    return `${getSuiExplorerHost(network, explorer)}/address/${address}${getSuiExplorerQuery(network, explorer)}`;
};

export const getSuiTransactionExplorerUrl = (
    digest: string,
    network: Network,
    explorer: AppSettings['explorer']
) => {
    if (explorer === 'suiscan') {
        return `${getSuiExplorerHost(network, explorer)}/${network}/tx/${digest}`;
    }

    return `${getSuiExplorerHost(network, explorer)}/txblock/${digest}${getSuiExplorerQuery(network, explorer)}`;
};
