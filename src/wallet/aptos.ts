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

// Aptos entry-function payload shape every major extension wallet
// (Petra/Martian/Pontem/Rise/Nightly) accepts to signAndSubmitTransaction —
// the de facto standard predating the formal AIP-62 wallet standard, which
// these wallets also still support this legacy shape for.
export type AptosEntryFunctionPayload = {
    type: 'entry_function_payload';
    function: string; // "<address>::<module>::<function>"
    type_arguments: string[];
    arguments: unknown[];
    max_gas_amount?: string;
    gas_unit_price?: string;
};

type AptosProviderApi = {
    account?: () => Promise<{ address: string }>;
    connect: () => Promise<{ address: string }>;
    disconnect: () => Promise<void>;
    isConnected?: () => Promise<boolean>;
    signAndSubmitTransaction?: (
        payload: AptosEntryFunctionPayload
    ) => Promise<{ hash: string } | string>;
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

const getPontemProvider = (): AptosProviderApi | undefined => {
    const w = getBrowserWindow() as any;
    if (w?.pontem) {
        return w.pontem;
    }
    return undefined;
};

const getRiseProvider = (): AptosProviderApi | undefined => {
    const w = getBrowserWindow() as any;
    if (w?.rise) {
        return w.rise;
    }
    return undefined;
};

const getNightlyAptosProvider = (): AptosProviderApi | undefined => {
    const w = getBrowserWindow() as any;
    if (w?.nightly?.aptos) {
        return w.nightly.aptos;
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

        // No silent check available: connect() would open an approval popup,
        // so restoration must not fall back to it.
        return null;
    } catch {
        return null;
    }
};

const getAptosProviderById = (
    walletId: WalletId
): AptosProviderApi | undefined => {
    switch (walletId) {
        case 'petra':
            return getPetraProvider();
        case 'martian':
            return getMartianProvider();
        case 'pontem':
            return getPontemProvider();
        case 'rise-wallet':
            return getRiseProvider();
        case 'nightly-aptos':
            return getNightlyAptosProvider();
        default:
            return undefined;
    }
};

/**
 * Signs and submits an Aptos entry-function transaction via the connected
 * wallet's injected provider. Unlike Solana/EVM, the wallet itself builds,
 * signs and submits the transaction (it fetches the sequence number and
 * simulates gas internally) — Txio supplies the entry-function payload, not
 * a fully-built and locally-signed transaction, matching how Petra/Martian/
 * Pontem/Rise/Nightly's signAndSubmitTransaction is actually used in the
 * wild for entry_function_payload calls.
 */
export async function signAndSubmitAptosTransaction(
    walletId: WalletId,
    payload: AptosEntryFunctionPayload
): Promise<{ hash: string }> {
    const provider = getAptosProviderById(walletId);
    if (!provider) {
        throw new Error('Wallet is not connected or does not support Aptos.');
    }
    if (!provider.signAndSubmitTransaction) {
        throw new Error('This wallet does not support signing Aptos transactions.');
    }

    const result = await withTimeout(
        provider.signAndSubmitTransaction(payload),
        'Sign and submit transaction',
        60_000
    );
    const hash = typeof result === 'string' ? result : result.hash;
    if (!hash) {
        throw new Error('Wallet did not return a transaction hash.');
    }
    return { hash };
}

export const detectAptosWallets = async () => {
    return {
        petra: Boolean(getPetraProvider()),
        martian: Boolean(getMartianProvider()),
        pontem: Boolean(getPontemProvider()),
        'rise-wallet': Boolean(getRiseProvider()),
        'nightly-aptos': Boolean(getNightlyAptosProvider())
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
        case 'pontem':
            return connectProvider(getPontemProvider(), walletId, 'Pontem');
        case 'rise-wallet':
            return connectProvider(getRiseProvider(), walletId, 'Rise Wallet');
        case 'nightly-aptos':
            return connectProvider(getNightlyAptosProvider(), walletId, 'Nightly');
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
        case 'pontem':
            return restoreProvider(getPontemProvider(), walletId, 'Pontem');
        case 'rise-wallet':
            return restoreProvider(getRiseProvider(), walletId, 'Rise Wallet');
        case 'nightly-aptos':
            return restoreProvider(getNightlyAptosProvider(), walletId, 'Nightly');
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
        case 'pontem':
            provider = getPontemProvider();
            break;
        case 'rise-wallet':
            provider = getRiseProvider();
            break;
        case 'nightly-aptos':
            provider = getNightlyAptosProvider();
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
