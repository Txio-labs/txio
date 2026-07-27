import type {
    ConnectedWallet,
    WalletChainInfo,
    WalletId
} from './types';

export type SolanaNetworkName =
    | 'mainnet-beta'
    | 'testnet'
    | 'devnet';

const CONNECT_TIMEOUT_MS = 30_000;

const SOLANA_WALLET_META: Partial<
    Record<
        WalletId,
        { name: string; connectorName: string }
    >
> = {
    'phantom-solana': {
        name: 'Phantom',
        connectorName: 'Phantom'
    },
    solflare: {
        name: 'Solflare',
        connectorName: 'Solflare'
    },
    backpack: {
        name: 'Backpack',
        connectorName: 'Backpack'
    }
};

const solanaNetwork =
    process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet'
        ? 'devnet'
        : process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'testnet'
          ? 'testnet'
          : 'mainnet-beta';

const SOLANA_NETWORKS: Record<
    SolanaNetworkName,
    {
        chain: WalletChainInfo;
        rpcUrl: string;
    }
> = {
    'mainnet-beta': {
        chain: {
            id: 'solana:mainnet-beta',
            family: 'solana',
            name: 'Solana',
            network: 'mainnet-beta',
            isSupported: true
        },
        rpcUrl: 'https://api.mainnet-beta.solana.com'
    },
    testnet: {
        chain: {
            id: 'solana:testnet',
            family: 'solana',
            name: 'Solana Testnet',
            network: 'testnet',
            isSupported: true
        },
        rpcUrl: 'https://api.testnet.solana.com'
    },
    devnet: {
        chain: {
            id: 'solana:devnet',
            family: 'solana',
            name: 'Solana Devnet',
            network: 'devnet',
            isSupported: true
        },
        rpcUrl: 'https://api.devnet.solana.com'
    }
};

const getChainConfig = () => SOLANA_NETWORKS[solanaNetwork];

const buildWallet = (
    walletId: WalletId,
    address: string
): ConnectedWallet => {
    const meta = SOLANA_WALLET_META[walletId] ?? {
        name: String(walletId),
        connectorName: String(walletId)
    };

    return {
        id: walletId,
        name: meta.name,
        address,
        family: 'solana',
        chain: getChainConfig().chain,
        connectorName: meta.connectorName,
        connectedAt: Date.now()
    };
};

const getBrowserWindow = () =>
    typeof window !== 'undefined' ? window : undefined;

type SolanaProviderApi = {
    publicKey?: { toString: () => string } | null;
    connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
    disconnect: () => Promise<void>;
    isConnected?: boolean;
};

const withTimeout = async <T>(
    promise: Promise<T>,
    label: string,
    ms = CONNECT_TIMEOUT_MS
): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timer = setTimeout(() => {
                    reject(
                        new Error(
                            `${label} timed out after ${Math.round(ms / 1000)}s. Check the extension popup or try again.`
                        )
                    );
                }, ms);
            })
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
};

const getPhantomProvider = (): SolanaProviderApi | undefined => {
    const w = getBrowserWindow() as any;
    if (w?.phantom?.solana?.isPhantom) {
        return w.phantom.solana;
    }
    return undefined;
};

const getSolflareProvider = (): SolanaProviderApi | undefined => {
    const w = getBrowserWindow() as any;
    if (w?.solflare?.isSolflare) {
        return w.solflare;
    }
    return undefined;
};

const getBackpackProvider = (): SolanaProviderApi | undefined => {
    const w = getBrowserWindow() as any;
    if (w?.backpack) {
        return w.backpack;
    }
    return undefined;
};

const connectProvider = async (
    provider: SolanaProviderApi | undefined,
    walletId: WalletId,
    name: string
): Promise<ConnectedWallet> => {
    if (!provider) {
        throw new Error(`${name} is not installed.`);
    }

    try {
        const response = await withTimeout(
            provider.connect(),
            name
        );
        const address = response.publicKey.toString();
        if (!address) {
            throw new Error(`${name} did not return a public key.`);
        }
        return buildWallet(walletId, address);
    } catch (err: any) {
        throw new Error(err?.message || `${name} connection failed.`);
    }
};

const restoreProvider = async (
    provider: SolanaProviderApi | undefined,
    walletId: WalletId,
    name: string
): Promise<ConnectedWallet | null> => {
    if (!provider) return null;

    try {
        const response = await withTimeout(
            provider.connect({ onlyIfTrusted: true }),
            `${name} restore`,
            5000
        );
        const address = response.publicKey.toString();
        return address ? buildWallet(walletId, address) : null;
    } catch {
        return null;
    }
};

export const detectSolanaWallets = async () => {
    return {
        'phantom-solana': Boolean(getPhantomProvider()),
        solflare: Boolean(getSolflareProvider()),
        backpack: Boolean(getBackpackProvider())
    };
};

export const connectSolanaWallet = async (
    walletId: WalletId
): Promise<ConnectedWallet> => {
    switch (walletId) {
        case 'phantom-solana':
            return connectProvider(getPhantomProvider(), walletId, 'Phantom');
        case 'solflare':
            return connectProvider(getSolflareProvider(), walletId, 'Solflare');
        case 'backpack':
            return connectProvider(getBackpackProvider(), walletId, 'Backpack');
        default:
            throw new Error(`Solana wallet "${walletId}" is not supported.`);
    }
};

export const restoreSolanaWallet = async (
    walletId: WalletId
): Promise<ConnectedWallet | null> => {
    switch (walletId) {
        case 'phantom-solana':
            return restoreProvider(getPhantomProvider(), walletId, 'Phantom');
        case 'solflare':
            return restoreProvider(getSolflareProvider(), walletId, 'Solflare');
        case 'backpack':
            return restoreProvider(getBackpackProvider(), walletId, 'Backpack');
        default:
            return null;
    }
};

export const disconnectSolanaWallet = async (
    walletId: WalletId
): Promise<void> => {
    let provider: SolanaProviderApi | undefined;
    switch (walletId) {
        case 'phantom-solana':
            provider = getPhantomProvider();
            break;
        case 'solflare':
            provider = getSolflareProvider();
            break;
        case 'backpack':
            provider = getBackpackProvider();
            break;
    }
    
    if (provider && provider.disconnect) {
        try {
            await provider.disconnect();
        } catch {
            // ignore
        }
    }
};
