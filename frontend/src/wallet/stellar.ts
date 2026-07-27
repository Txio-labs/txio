import {
    getAddress as getFreighterAddress,
    isConnected as isFreighterConnected,
    requestAccess
} from '@stellar/freighter-api';
import {
    getPublicKey as getLobstrPublicKey,
    isConnected as isLobstrConnected
} from '@lobstrco/signer-extension-api';

import type {
    ConnectedWallet,
    WalletBalanceInfo,
    WalletChainInfo,
    WalletId
} from './types';

export type StellarNetworkName =
    | 'public'
    | 'testnet';

const CONNECT_TIMEOUT_MS = 30_000;

const STELLAR_WALLET_META: Partial<
    Record<
        WalletId,
        { name: string; connectorName: string }
    >
> = {
    lobstr: {
        name: 'LOBSTR',
        connectorName: 'LOBSTR Signer'
    },
    freighter: {
        name: 'Freighter',
        connectorName: 'Freighter API'
    },
    albedo: {
        name: 'Albedo',
        connectorName: 'Albedo'
    },
    xbull: {
        name: 'xBull',
        connectorName: 'xBull SDK'
    },
    rabet: {
        name: 'Rabet',
        connectorName: 'Rabet'
    },
    'hana-wallet': {
        name: 'Hana',
        connectorName: 'Hana Wallet'
    }
};

const stellarNetwork =
    process.env
        .NEXT_PUBLIC_STELLAR_NETWORK ===
    'testnet'
        ? 'testnet'
        : 'public';

const STELLAR_NETWORKS: Record<
    StellarNetworkName,
    {
        chain: WalletChainInfo;
        horizonUrl: string;
    }
> = {
    public: {
        chain: {
            id: 'stellar:public',
            family: 'stellar',
            name: 'Stellar',
            network: 'public',
            isSupported: true
        },
        horizonUrl:
            'https://horizon.stellar.org'
    },
    testnet: {
        chain: {
            id: 'stellar:testnet',
            family: 'stellar',
            name: 'Stellar Testnet',
            network: 'testnet',
            isSupported: true
        },
        horizonUrl:
            'https://horizon-testnet.stellar.org'
    }
};

const getChainConfig = () =>
    STELLAR_NETWORKS[stellarNetwork];

const buildWallet = (
    walletId: WalletId,
    address: string
): ConnectedWallet => {
    const meta =
        STELLAR_WALLET_META[walletId] ?? {
            name: String(walletId),
            connectorName: String(walletId)
        };

    return {
        id: walletId,
        name: meta.name,
        address,
        family: 'stellar',
        chain: getChainConfig().chain,
        connectorName: meta.connectorName,
        connectedAt: Date.now()
    };
};

const getBrowserWindow = () =>
    typeof window !== 'undefined'
        ? window
        : undefined;

type AlbedoApi = {
    publicKey?: (opts?: {
        token?: string;
    }) => Promise<{ pubkey?: string; publicKey?: string }>;
};

type XBullApi = {
    connect?: (opts?: Record<string, unknown>) => Promise<unknown>;
    getPublicKeys?: () => Promise<
        Array<string | { publicKey?: string; key?: string }>
    >;
    getAddress?: () => Promise<
        string | { publicKey?: string; address?: string }
    >;
    getPublicKey?: () => Promise<string>;
};

type RabetApi = {
    connect?: () => Promise<
        string | { publicKey?: string; address?: string }
    >;
    isConnected?: () => Promise<boolean>;
    getPublicKey?: () => Promise<string>;
};

type HanaApi = {
    getPublicKey?: () => Promise<string>;
    getAddress?: () => Promise<
        string | { publicKey?: string; address?: string }
    >;
    connect?: () => Promise<
        string | { publicKey?: string; address?: string }
    >;
    setAllowedStatus?: (
        allowed: boolean
    ) => Promise<unknown>;
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

const pickAddress = (value: unknown): string | null => {
    if (typeof value === 'string' && value.trim()) {
        return value.trim();
    }
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        for (const key of [
            'publicKey',
            'pubkey',
            'address',
            'key'
        ]) {
            const candidate = record[key];
            if (
                typeof candidate === 'string' &&
                candidate.trim()
            ) {
                return candidate.trim();
            }
        }
    }
    return null;
};

const connectLobstr = async (): Promise<ConnectedWallet> => {
    const installed = await isLobstrConnected();
    if (!installed) {
        throw new Error(
            'LOBSTR signer extension is not installed.'
        );
    }

    const address = await withTimeout(
        getLobstrPublicKey(),
        'LOBSTR'
    );
    if (!address) {
        throw new Error(
            'LOBSTR did not return a public key.'
        );
    }

    return buildWallet('lobstr', address);
};

const connectFreighter = async (): Promise<ConnectedWallet> => {
    const access = await withTimeout(
        requestAccess(),
        'Freighter'
    );

    if (access.error) {
        throw new Error(
            access.error.message ||
                'Freighter denied the connection request.'
        );
    }

    if (!access.address) {
        throw new Error(
            'Freighter did not return an address.'
        );
    }

    return buildWallet('freighter', access.address);
};

const connectAlbedo = async (): Promise<ConnectedWallet> => {
    const albedo = getBrowserWindow()?.albedo as
        | AlbedoApi
        | undefined;

    if (!albedo?.publicKey) {
        throw new Error(
            'Albedo is not installed or did not inject window.albedo.'
        );
    }

    const result = await withTimeout(
        albedo.publicKey({}),
        'Albedo'
    );
    const address =
        pickAddress(result) ??
        pickAddress(
            (result as { pubkey?: string })?.pubkey
        );

    if (!address) {
        throw new Error(
            'Albedo did not return a public key.'
        );
    }

    return buildWallet('albedo', address);
};

const connectXBull = async (): Promise<ConnectedWallet> => {
    const xbull = getBrowserWindow()?.xBullSDK as
        | XBullApi
        | undefined;

    if (!xbull) {
        throw new Error(
            'xBull is not installed or did not inject window.xBullSDK.'
        );
    }

    if (typeof xbull.connect === 'function') {
        await withTimeout(
            xbull.connect({
                canRequestPublicKey: true,
                canRequestSign: true
            }),
            'xBull connect'
        );
    }

    if (typeof xbull.getPublicKeys === 'function') {
        const keys = await withTimeout(
            xbull.getPublicKeys(),
            'xBull getPublicKeys'
        );
        const first = Array.isArray(keys) ? keys[0] : null;
        const address = pickAddress(first);
        if (address) {
            return buildWallet('xbull', address);
        }
    }

    if (typeof xbull.getAddress === 'function') {
        const result = await withTimeout(
            xbull.getAddress(),
            'xBull getAddress'
        );
        const address = pickAddress(result);
        if (address) {
            return buildWallet('xbull', address);
        }
    }

    if (typeof xbull.getPublicKey === 'function') {
        const result = await withTimeout(
            xbull.getPublicKey(),
            'xBull getPublicKey'
        );
        const address = pickAddress(result);
        if (address) {
            return buildWallet('xbull', address);
        }
    }

    throw new Error(
        'xBull did not return a public key.'
    );
};

const connectRabet = async (): Promise<ConnectedWallet> => {
    const rabet = getBrowserWindow()?.rabet as
        | RabetApi
        | undefined;

    if (!rabet) {
        throw new Error(
            'Rabet is not installed or did not inject window.rabet.'
        );
    }

    if (typeof rabet.connect === 'function') {
        const result = await withTimeout(
            rabet.connect(),
            'Rabet'
        );
        const address = pickAddress(result);
        if (address) {
            return buildWallet('rabet', address);
        }
    }

    if (typeof rabet.getPublicKey === 'function') {
        const result = await withTimeout(
            rabet.getPublicKey(),
            'Rabet getPublicKey'
        );
        const address = pickAddress(result);
        if (address) {
            return buildWallet('rabet', address);
        }
    }

    throw new Error(
        'Rabet did not return a public key.'
    );
};

const connectHana = async (): Promise<ConnectedWallet> => {
    const hana = getBrowserWindow()?.hana as
        | HanaApi
        | undefined;

    if (!hana) {
        throw new Error(
            'Hana is not installed or did not inject window.hana.'
        );
    }

    if (typeof hana.setAllowedStatus === 'function') {
        try {
            await withTimeout(
                hana.setAllowedStatus(true),
                'Hana allow',
                10_000
            );
        } catch {
            // Some builds skip this gate; fall through to key methods.
        }
    }

    if (typeof hana.connect === 'function') {
        const result = await withTimeout(
            hana.connect(),
            'Hana connect'
        );
        const address = pickAddress(result);
        if (address) {
            return buildWallet('hana-wallet', address);
        }
    }

    if (typeof hana.getPublicKey === 'function') {
        const result = await withTimeout(
            hana.getPublicKey(),
            'Hana getPublicKey'
        );
        const address = pickAddress(result);
        if (address) {
            return buildWallet('hana-wallet', address);
        }
    }

    if (typeof hana.getAddress === 'function') {
        const result = await withTimeout(
            hana.getAddress(),
            'Hana getAddress'
        );
        const address = pickAddress(result);
        if (address) {
            return buildWallet('hana-wallet', address);
        }
    }

    throw new Error(
        'Hana did not return a public key.'
    );
};

export const detectStellarWallets =
    async () => {
        const [lobstr, freighter] =
            await Promise.allSettled([
                isLobstrConnected(),
                isFreighterConnected()
            ]);

        const browserWindow = getBrowserWindow();

        return {
            lobstr:
                lobstr.status ===
                    'fulfilled' &&
                Boolean(lobstr.value),
            freighter:
                freighter.status ===
                    'fulfilled' &&
                Boolean(
                    freighter.value
                        .isConnected
                ),
            albedo: Boolean(
                browserWindow?.albedo
            ),
            xbull: Boolean(
                browserWindow?.xBullSDK
            ),
            rabet: Boolean(
                browserWindow?.rabet
            ),
            hana: Boolean(
                browserWindow?.hana
            )
        };
    };

export const connectStellarWallet =
    async (
        walletId: WalletId
    ): Promise<ConnectedWallet> => {
        switch (walletId) {
            case 'lobstr':
                return connectLobstr();
            case 'freighter':
                return connectFreighter();
            case 'albedo':
                return connectAlbedo();
            case 'xbull':
                return connectXBull();
            case 'rabet':
                return connectRabet();
            case 'hana-wallet':
                return connectHana();
            default:
                throw new Error(
                    `Stellar wallet "${walletId}" is not supported.`
                );
        }
    };

const restoreLobstr =
    async (): Promise<ConnectedWallet | null> => {
        const installed = await isLobstrConnected();
        if (!installed) return null;

        const address = await getLobstrPublicKey();
        return address
            ? buildWallet('lobstr', address)
            : null;
    };

const restoreFreighter =
    async (): Promise<ConnectedWallet | null> => {
        const installed = await isFreighterConnected();
        if (!installed.isConnected) return null;

        const address = await getFreighterAddress();
        if (address.error || !address.address) {
            return null;
        }

        return buildWallet(
            'freighter',
            address.address
        );
    };

const restoreAlbedo =
    async (): Promise<ConnectedWallet | null> => {
        const albedo = getBrowserWindow()?.albedo as
            | AlbedoApi
            | undefined;
        if (!albedo?.publicKey) return null;

        try {
            const result = await withTimeout(
                albedo.publicKey({}),
                'Albedo restore',
                10_000
            );
            const address = pickAddress(result);
            return address
                ? buildWallet('albedo', address)
                : null;
        } catch {
            return null;
        }
    };

const restoreXBull =
    async (): Promise<ConnectedWallet | null> => {
        const xbull = getBrowserWindow()?.xBullSDK as
            | XBullApi
            | undefined;
        if (!xbull) return null;

        try {
            if (typeof xbull.getPublicKeys === 'function') {
                const keys = await withTimeout(
                    xbull.getPublicKeys(),
                    'xBull restore',
                    10_000
                );
                const address = pickAddress(
                    Array.isArray(keys) ? keys[0] : null
                );
                if (address) {
                    return buildWallet('xbull', address);
                }
            }

            if (typeof xbull.getAddress === 'function') {
                const result = await withTimeout(
                    xbull.getAddress(),
                    'xBull restore address',
                    10_000
                );
                const address = pickAddress(result);
                if (address) {
                    return buildWallet('xbull', address);
                }
            }

            if (typeof xbull.getPublicKey === 'function') {
                const result = await withTimeout(
                    xbull.getPublicKey(),
                    'xBull restore key',
                    10_000
                );
                const address = pickAddress(result);
                if (address) {
                    return buildWallet('xbull', address);
                }
            }
        } catch {
            return null;
        }

        return null;
    };

const restoreRabet =
    async (): Promise<ConnectedWallet | null> => {
        const rabet = getBrowserWindow()?.rabet as
            | RabetApi
            | undefined;
        if (!rabet) return null;

        try {
            if (typeof rabet.isConnected === 'function') {
                const connected = await rabet.isConnected();
                if (!connected) return null;
            }

            if (typeof rabet.getPublicKey === 'function') {
                const result = await withTimeout(
                    rabet.getPublicKey(),
                    'Rabet restore',
                    10_000
                );
                const address = pickAddress(result);
                if (address) {
                    return buildWallet('rabet', address);
                }
            }

            // Fall back to connect() only if already authorized —
            // some Rabet builds expose no separate getter.
            if (typeof rabet.connect === 'function') {
                const result = await withTimeout(
                    rabet.connect(),
                    'Rabet restore connect',
                    10_000
                );
                const address = pickAddress(result);
                if (address) {
                    return buildWallet('rabet', address);
                }
            }
        } catch {
            return null;
        }

        return null;
    };

const restoreHana =
    async (): Promise<ConnectedWallet | null> => {
        const hana = getBrowserWindow()?.hana as
            | HanaApi
            | undefined;
        if (!hana) return null;

        try {
            if (typeof hana.getPublicKey === 'function') {
                const result = await withTimeout(
                    hana.getPublicKey(),
                    'Hana restore',
                    10_000
                );
                const address = pickAddress(result);
                if (address) {
                    return buildWallet(
                        'hana-wallet',
                        address
                    );
                }
            }

            if (typeof hana.getAddress === 'function') {
                const result = await withTimeout(
                    hana.getAddress(),
                    'Hana restore address',
                    10_000
                );
                const address = pickAddress(result);
                if (address) {
                    return buildWallet(
                        'hana-wallet',
                        address
                    );
                }
            }
        } catch {
            return null;
        }

        return null;
    };

export const restoreStellarWallet =
    async (
        walletId: WalletId
    ): Promise<ConnectedWallet | null> => {
        switch (walletId) {
            case 'lobstr':
                return restoreLobstr();
            case 'freighter':
                return restoreFreighter();
            case 'albedo':
                return restoreAlbedo();
            case 'xbull':
                return restoreXBull();
            case 'rabet':
                return restoreRabet();
            case 'hana-wallet':
                return restoreHana();
            default:
                return null;
        }
    };

export const fetchStellarBalance =
    async (
        address: string
    ): Promise<WalletBalanceInfo> => {
        const response =
            await fetch(
                `${getChainConfig().horizonUrl}/accounts/${address}`,
                {
                    headers: {
                        Accept: 'application/json'
                    }
                }
            );

        if (!response.ok) {
            throw new Error(
                'Unable to fetch Stellar balance.'
            );
        }

        const account =
            await response.json();
        const nativeBalance =
            Array.isArray(
                account?.balances
            )
                ? account.balances.find(
                      (
                          entry: {
                              asset_type?: string;
                          }
                      ) =>
                          entry.asset_type ===
                          'native'
                  )
                : null;

        const value =
            nativeBalance?.balance ||
            '0';

        return {
            symbol: 'XLM',
            formatted: `${Number(
                value
            ).toFixed(4)} XLM`,
            value,
            decimals: 7
        };
    };
