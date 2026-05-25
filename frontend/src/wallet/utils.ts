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
            providers?: Array<{
                isMetaMask?: boolean;
                isCoinbaseWallet?: boolean;
                isPhantom?: boolean;
                isTrust?: boolean;
                isTrustWallet?: boolean;
                isRainbow?: boolean;
                isOKExWallet?: boolean;
                isBraveWallet?: boolean;
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

    if (
        /walletconnect project id/i.test(
            message
        )
    ) {
        return {
            code: 'walletconnect-config',
            message,
            recoverable: false
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
                brave: false
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
            )
        };
    };

const EVM_EXPLORERS: Record<
    string,
    string
> = {
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

export const getWalletExplorerUrl = (
    wallet: ConnectedWallet,
    explorer: AppSettings['explorer'] =
        'suiscan'
) => {
    if (wallet.family === 'evm') {
        const explorer =
            EVM_EXPLORERS[
                wallet.chain.id
            ];
        return explorer
            ? `${explorer}${wallet.address}`
            : null;
    }

    if (wallet.family === 'sui') {
        const network =
            wallet.chain.network ===
            'mainnet'
                ? 'mainnet'
                : wallet.chain.network ===
                    'devnet'
                  ? 'devnet'
                  : 'testnet';

        return getSuiAccountExplorerUrl(
            wallet.address,
            network as Network,
            explorer
        );
    }

    const networkPath =
        wallet.chain.network ===
        'testnet'
            ? 'testnet'
            : 'public';

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
