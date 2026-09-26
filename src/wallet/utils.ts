import type {
    ConnectedWallet,
    WalletChainFamily,
    WalletConnectErrorShape,
    WalletId
} from './types';
import type { AppSettings, Network } from '../types';
import { getSuiAccountExplorerUrl } from '../lib/appConfig';

declare global {
    interface Window {
        ethereum?: {
            isMetaMask?: boolean;
            isCoinbaseWallet?: boolean;
            isPhantom?: boolean;
            isTrust?: boolean;
            isTrustWallet?: boolean;
            isRainbow?: boolean;
            isOKExWallet?: boolean;
            isBraveWallet?: boolean;
            isRabby?: boolean;
            isZerion?: boolean;
            isOneInchIOSWallet?: boolean;
            isOneInchAndroidWallet?: boolean;
            isFrame?: boolean;
            providers?: Array<{
                isMetaMask?: boolean;
                isCoinbaseWallet?: boolean;
                isPhantom?: boolean;
                isTrust?: boolean;
                isTrustWallet?: boolean;
                isRainbow?: boolean;
                isOKExWallet?: boolean;
                isBraveWallet?: boolean;
                isRabby?: boolean;
                isZerion?: boolean;
                isOneInchIOSWallet?: boolean;
                isOneInchAndroidWallet?: boolean;
                isFrame?: boolean;
            }>;
        };
        phantom?: {
            ethereum?: unknown;
        };
        trustwallet?: unknown;
        okxwallet?: unknown;
        freighter?: boolean;
        lobstrSignerExtensionApi?: {
            isConnected?: () => Promise<boolean>;
        };
        albedo?: unknown;
        xBullSDK?: unknown;
        rabet?: unknown;
        hana?: unknown;
        glow?: unknown;
        nightly?: {
            solana?: unknown;
            aptos?: unknown;
        };
        pontem?: unknown;
        rise?: unknown;
    }
}

export const isBrowser = () =>
    typeof window !== 'undefined';

export const isMobileDevice = () => {
    if (!isBrowser()) {
        return false;
    }

    return /android|iphone|ipad|ipod/i.test(
        window.navigator.userAgent
    );
};

export const shortenAddress = (
    address: string,
    head = 6,
    tail = 4
) => {
    if (!address) {
        return '';
    }

    if (address.length <= head + tail) {
        return address;
    }

    return `${address.slice(0, head)}...${address.slice(-tail)}`;
};

export const normalizeWalletLabel = (
    value: string
) =>
    value
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

export const matchSuiWalletId = (
    walletName: string
): WalletId | null => {
    const normalized =
        normalizeWalletLabel(walletName);

    if (
        normalized.includes('suiet')
    ) {
        return 'suiet';
    }

    if (
        normalized.includes('ethos')
    ) {
        return 'ethos';
    }

    if (
        normalized.includes('sui wallet') ||
        normalized === 'sui'
    ) {
        return 'sui-wallet';
    }

    if (
        normalized.includes('nightly')
    ) {
        return 'nightly-sui';
    }

    if (
        normalized.includes('okx')
    ) {
        return 'okx-wallet-sui';
    }

    if (
        normalized.includes('slush')
    ) {
        return 'slush';
    }

    return null;
};

export const formatWalletError = (
    error: unknown
): WalletConnectErrorShape => {
    const message =
        error instanceof Error
            ? error.message
            : String(error || 'Wallet connection failed.');

    if (
        /rejected|denied|cancelled|canceled/i.test(
            message
        )
    ) {
        return {
            code: 'rejected',
            message:
                'The connection request was rejected.',
            recoverable: true
        };
    }

    if (
        /chain|network/i.test(message) &&
        /unsupported|switch/i.test(message)
    ) {
        return {
            code: 'unsupported-chain',
            message:
                'The wallet is on an unsupported chain for this action.',
            recoverable: true
        };
    }

    return {
        code: 'wallet-error',
        message,
        recoverable: true
    };
};

export const detectInjectedWallets =
    () => {
        if (!isBrowser()) {
            return {
                metamask: false,
                coinbase: false,
                phantom: false,
                trust: false,
                rainbow: false,
                okx: false,
                brave: false,
                rabby: false,
                zerion: false,
                oneinch: false,
                frame: false
            };
        }

        const providers =
            window.ethereum?.providers ||
            (window.ethereum
                ? [window.ethereum]
                : []);

        return {
            metamask: providers.some(
                (provider) =>
                    provider?.isMetaMask
            ),
            coinbase: providers.some(
                (provider) =>
                    provider?.isCoinbaseWallet
            ),
            phantom:
                Boolean(
                    window.phantom
                        ?.ethereum
                ) ||
                providers.some(
                    (provider) =>
                        provider?.isPhantom
                ),
            trust:
                Boolean(window.trustwallet) ||
                providers.some(
                    (provider) =>
                        provider?.isTrust ||
                        provider?.isTrustWallet
                ),
            rainbow: providers.some(
                (provider) =>
                    provider?.isRainbow
            ),
            okx:
                Boolean(window.okxwallet) ||
                providers.some(
                    (provider) =>
                        provider?.isOKExWallet
                ),
            brave: providers.some(
                (provider) =>
                    provider?.isBraveWallet
            ),
            rabby: providers.some(
                (provider) =>
                    provider?.isRabby
            ),
            zerion: providers.some(
                (provider) =>
                    provider?.isZerion
            ),
            oneinch: providers.some(
                (provider) =>
                    provider?.isOneInchIOSWallet ||
                    provider?.isOneInchAndroidWallet
            ),
            frame: providers.some(
                (provider) =>
                    provider?.isFrame
            )
        };
    };

/** Chain-native EVM explorers (Etherscan-family / brand scanners). */
const EVM_FAMILY_EXPLORERS: Record<string, string> = {
    'eip155:1': 'https://etherscan.io/address/',
    'eip155:8453': 'https://basescan.org/address/',
    'eip155:137': 'https://polygonscan.com/address/',
    'eip155:42161': 'https://arbiscan.io/address/',
    'eip155:10': 'https://optimistic.etherscan.io/address/',
    'eip155:43114': 'https://snowtrace.io/address/',
    'eip155:56': 'https://bscscan.com/address/',
    'eip155:7777777': 'https://explorer.zora.energy/address/',
    'eip155:11155111': 'https://sepolia.etherscan.io/address/',
    'eip155:84532': 'https://sepolia.basescan.org/address/',
    'eip155:80002': 'https://amoy.polygonscan.com/address/',
    'eip155:421614': 'https://sepolia.arbiscan.io/address/',
    'eip155:11155420': 'https://sepolia-optimism.etherscan.io/address/',
    'eip155:43113': 'https://testnet.snowtrace.io/address/',
    'eip155:97': 'https://testnet.bscscan.com/address/'
};

/** Blockscout address explorers (where a public instance is known). */
const EVM_BLOCKSCOUT_EXPLORERS: Record<string, string> = {
    'eip155:1': 'https://eth.blockscout.com/address/',
    'eip155:8453': 'https://base.blockscout.com/address/',
    'eip155:137': 'https://polygon.blockscout.com/address/',
    'eip155:42161': 'https://arbitrum.blockscout.com/address/',
    'eip155:10': 'https://optimism.blockscout.com/address/',
    'eip155:11155111': 'https://eth-sepolia.blockscout.com/address/',
    'eip155:84532': 'https://base-sepolia.blockscout.com/address/'
};

/** @deprecated Prefer EVM_FAMILY_EXPLORERS; kept for any external imports. */
const EVM_EXPLORERS = EVM_FAMILY_EXPLORERS;

export type ExplorerPreferences = Pick<
    AppSettings,
    'explorer' | 'evmExplorer' | 'stellarExplorer' | 'solanaExplorer'
>;

const DEFAULT_EXPLORER_PREFS: ExplorerPreferences = {
    explorer: 'suiscan',
    evmExplorer: 'family',
    stellarExplorer: 'stellarexpert',
    solanaExplorer: 'solanaexplorer'
};

/**
 * Resolve an external block-explorer URL for a connected wallet.
 * Honors per-family preferences from Settings (Sui / EVM / Stellar).
 */
export const getWalletExplorerUrl = (
    wallet: ConnectedWallet,
    explorerOrPrefs:
        | AppSettings['explorer']
        | ExplorerPreferences
        | Partial<ExplorerPreferences> = 'suiscan'
) => {
    // Backward-compat: older call sites passed only the Sui explorer string.
    const prefs: ExplorerPreferences =
        typeof explorerOrPrefs === 'string'
            ? {
                  ...DEFAULT_EXPLORER_PREFS,
                  explorer: explorerOrPrefs
              }
            : {
                  ...DEFAULT_EXPLORER_PREFS,
                  ...explorerOrPrefs
              };

    if (wallet.family === 'evm') {
        const map =
            prefs.evmExplorer === 'blockscout'
                ? EVM_BLOCKSCOUT_EXPLORERS
                : EVM_FAMILY_EXPLORERS;
        const base =
            map[wallet.chain.id] ??
            EVM_FAMILY_EXPLORERS[wallet.chain.id];
        return base ? `${base}${wallet.address}` : null;
    }

    if (wallet.family === 'sui') {
        const network =
            wallet.chain.network === 'mainnet'
                ? 'mainnet'
                : wallet.chain.network === 'devnet'
                  ? 'devnet'
                  : 'testnet';

        return getSuiAccountExplorerUrl(
            wallet.address,
            network as Network,
            prefs.explorer
        );
    }

    if (wallet.family === 'solana') {
        const isMainnet = wallet.chain.network === 'mainnet-beta';
        const clusterQuery = isMainnet ? '' : `?cluster=${wallet.chain.network}`;

        switch (prefs.solanaExplorer) {
            case 'solscan':
                return `https://solscan.io/account/${wallet.address}${isMainnet ? '' : `?cluster=${wallet.chain.network}`}`;
            case 'solanafm':
                return `https://solana.fm/address/${wallet.address}${isMainnet ? '' : `?cluster=${wallet.chain.network}`}`;
            default:
                return `https://explorer.solana.com/address/${wallet.address}${clusterQuery}`;
        }
    }

    if (wallet.family !== 'stellar') {
        // No explorer mapping exists for this wallet family yet (e.g. Aptos) —
        // return null rather than silently building a wrong (Stellar-shaped)
        // URL for an address format it doesn't belong to.
        return null;
    }

    const networkPath =
        wallet.chain.network === 'testnet' ? 'testnet' : 'public';

    if (prefs.stellarExplorer === 'stellarchain') {
        const host =
            networkPath === 'testnet'
                ? 'https://testnet.stellarchain.io'
                : 'https://stellarchain.io';
        return `${host}/accounts/${wallet.address}`;
    }

    return `https://stellar.expert/explorer/${networkPath}/account/${wallet.address}`;
};

export const getFamilyLabel = (
    family: WalletChainFamily
) => {
    switch (family) {
        case 'evm':
            return 'EVM';
        case 'sui':
            return 'Sui';
        case 'stellar':
            return 'Stellar';
    }
};
