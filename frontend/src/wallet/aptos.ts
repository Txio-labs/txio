import type {
    ConnectedWallet,
    WalletChainInfo,
    WalletId
} from './types';

export type AptosNetworkName =
    | 'mainnet'
    | 'testnet'
    | 'devnet';

const CONNECT_TIMEOUT_MS = 30_000;

const APTOS_WALLET_META: Partial<
    Record<
        WalletId,
        { name: string; connectorName: string }
    >
> = {
    petra: {
        name: 'Petra',
        connectorName: 'Petra'
    },
    martian: {
        name: 'Martian',
        connectorName: 'Martian'
    }
};

const aptosNetwork =
    process.env.NEXT_PUBLIC_APTOS_NETWORK === 'devnet'
        ? 'devnet'
        : process.env.NEXT_PUBLIC_APTOS_NETWORK === 'testnet'
          ? 'testnet'
          : 'mainnet';

const APTOS_NETWORKS: Record<
    AptosNetworkName,
    {
        chain: WalletChainInfo;
        rpcUrl: string;
    }
> = {
    mainnet: {
        chain: {
            id: 'aptos:mainnet',
            family: 'aptos',
            name: 'Aptos',
            network: 'mainnet',
            isSupported: true
        },
        rpcUrl: 'https://fullnode.mainnet.aptoslabs.com/v1'
    },
    testnet: {
        chain: {
            id: 'aptos:testnet',
            family: 'aptos',
            name: 'Aptos Testnet',
            network: 'testnet',
            isSupported: true
        },
        rpcUrl: 'https://fullnode.testnet.aptoslabs.com/v1'
    },
    devnet: {
        chain: {
            id: 'aptos:devnet',
            family: 'aptos',
            name: 'Aptos Devnet',
            network: 'devnet',
            isSupported: true
        },
        rpcUrl: 'https://fullnode.devnet.aptoslabs.com/v1'
    }
};

const getChainConfig = () => APTOS_NETWORKS[aptosNetwork];

const buildWallet = (
    walletId: WalletId,
    address: string
): ConnectedWallet => {
    const meta = APTOS_WALLET_META[walletId] ?? {
        name: String(walletId),
        connectorName: String(walletId)
    };

    return {
        id: walletId,
        name: meta.name,
        address,
        family: 'aptos',
        chain: getChainConfig().chain,
        connectorName: meta.connectorName,
        connectedAt: Date.now()
    };
};

const getBrowserWindow = () =>
    typeof window !== 'undefined' ? window : undefined;

type AptosProviderApi = {
    account?: () => Promise<{ address: string }>;
    connect: () => Promise<{ address: string }>;
    disconnect: () => Promise<void>;
    isConnected?: () => Promise<boolean>;
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

const getPetraProvider = (): AptosProviderApi | undefined => {
    const w = getBrowserWindow() as any;
    if (w?.aptos) {
        return w.aptos;
    }
    return undefined;
};

const getMartianProvider = (): AptosProviderApi | undefined => {
    const w = getBrowserWindow() as any;
    if (w?.martian) {
        return w.martian;
    }
    return undefined;
};

const connectProvider = async (
    provider: AptosProviderApi | undefined,
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
        const address = response.address;
        if (!address) {
            throw new Error(`${name} did not return an address.`);
        }
        return buildWallet(walletId, address);
    } catch (err: any) {
        throw new Error(err?.message || `${name} connection failed.`);
    }
};

const restoreProvider = async (
    provider: AptosProviderApi | undefined,
    walletId: WalletId,
    name: string
): Promise<ConnectedWallet | null> => {
    if (!provider) return null;

    try {
        if (provider.isConnected && typeof provider.account === 'function') {
            const isConnected = await provider.isConnected();
            if (isConnected) {
                const response = await withTimeout(
                    provider.account(),
                    `${name} restore account`,
                    5000
                );
                if (response.address) {
                    return buildWallet(walletId, response.address);
                }
            }
            return null;
        }

        // Fallback for connecting silently if possible, some wallets only expose connect
        const response = await withTimeout(
            provider.connect(),
            `${name} restore`,
            5000
        );
        const address = response.address;
        return address ? buildWallet(walletId, address) : null;
    } catch {
        return null;
    }
};

export const detectAptosWallets = async () => {
    return {
        petra: Boolean(getPetraProvider()),
        martian: Boolean(getMartianProvider())
    };
};

export const connectAptosWallet = async (
    walletId: WalletId
): Promise<ConnectedWallet> => {
    switch (walletId) {
        case 'petra':
            return connectProvider(getPetraProvider(), walletId, 'Petra');
        case 'martian':
            return connectProvider(getMartianProvider(), walletId, 'Martian');
        default:
            throw new Error(`Aptos wallet "${walletId}" is not supported.`);
    }
};

export const restoreAptosWallet = async (
    walletId: WalletId
): Promise<ConnectedWallet | null> => {
    switch (walletId) {
        case 'petra':
            return restoreProvider(getPetraProvider(), walletId, 'Petra');
        case 'martian':
            return restoreProvider(getMartianProvider(), walletId, 'Martian');
        default:
            return null;
    }
};

export const disconnectAptosWallet = async (
    walletId: WalletId
): Promise<void> => {
    let provider: AptosProviderApi | undefined;
    switch (walletId) {
        case 'petra':
            provider = getPetraProvider();
            break;
        case 'martian':
            provider = getMartianProvider();
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
