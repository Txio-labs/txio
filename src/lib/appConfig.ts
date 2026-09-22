import { AppSettings, ChainId, Network, NotificationPreferences } from '../types';
import { EVM_NETWORKS, NETWORKS, SOLANA_NETWORKS, STELLAR_NETWORKS } from './constants';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    emailDigests: true,
    emailSecurityAlerts: true,
    inAppActivityAlerts: true,
    inAppProductUpdates: false
};

const EMPTY_CUSTOM_RPC: Record<Network, string> = {
    mainnet: '',
    testnet: '',
    devnet: '',
    localnet: ''
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
        customRpc: {
            ...DEFAULT_APP_SETTINGS.customRpc,
            ...(settings?.customRpc || {})
        },
        evmCustomRpc: {
            ...DEFAULT_APP_SETTINGS.evmCustomRpc,
            ...(settings?.evmCustomRpc || {})
        },
        stellarCustomRpc: {
            ...DEFAULT_APP_SETTINGS.stellarCustomRpc,
            ...(settings?.stellarCustomRpc || {})
        },
        solanaCustomRpc: {
            ...DEFAULT_APP_SETTINGS.solanaCustomRpc,
            ...(settings?.solanaCustomRpc || {})
        }
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

export const resolveRpcUrl = (
    network: Network,
    settings: Pick<AppSettings, 'customRpc'> = DEFAULT_APP_SETTINGS
) => {
    const customUrl =
        settings.customRpc[network]?.trim();

    return customUrl || NETWORKS[network];
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
) => {
    if (chain === 'sui') {
        return resolveRpcUrl(network, settings);
    }

    if (chain === 'evm') {
        const customUrl = settings.evmCustomRpc[network]?.trim();
        return customUrl || EVM_NETWORKS[network];
    }

    if (chain === 'solana') {
        const customUrl = settings.solanaCustomRpc[network]?.trim();
        return customUrl || SOLANA_NETWORKS[network];
    }

    const customUrl = settings.stellarCustomRpc[network]?.trim();
    return customUrl || STELLAR_NETWORKS[network];
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
