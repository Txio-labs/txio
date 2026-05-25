import { AppSettings, Network } from '../types';
import { NETWORKS } from './constants';

export const DEFAULT_APP_SETTINGS: AppSettings = {
    theme: 'dark',
    showLineNumbers: true,
    autoSave: true,
    telemetry: true,
    customRpc: {
        mainnet: '',
        testnet: '',
        devnet: ''
    },
    explorer: 'suiscan'
};

export const normalizeAppSettings = (
    settings?: Partial<AppSettings> | null
): AppSettings => ({
    ...DEFAULT_APP_SETTINGS,
    ...settings,
    customRpc: {
        ...DEFAULT_APP_SETTINGS.customRpc,
        ...(settings?.customRpc || {})
    }
});

export const resolveRpcUrl = (
    network: Network,
    settings: Pick<AppSettings, 'customRpc'> = DEFAULT_APP_SETTINGS
) => {
    const customUrl =
        settings.customRpc[network]?.trim();

    return customUrl || NETWORKS[network];
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
