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
): ConnectedWallet => ({
    id: walletId,
    name:
        walletId === 'lobstr'
            ? 'LOBSTR'
            : 'Freighter',
    address,
    family: 'stellar',
    chain: getChainConfig().chain,
    connectorName:
        walletId === 'lobstr'
            ? 'LOBSTR Signer'
            : 'Freighter API',
    connectedAt: Date.now()
});

export const detectStellarWallets =
    async () => {
        const [lobstr, freighter] =
            await Promise.allSettled([
                isLobstrConnected(),
                isFreighterConnected()
            ]);

        const browserWindow =
            typeof window !== 'undefined'
                ? window
                : undefined;

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
        if (walletId === 'lobstr') {
            const installed =
                await isLobstrConnected();

            if (!installed) {
                throw new Error(
                    'LOBSTR signer extension is not installed.'
                );
            }

            const address =
                await getLobstrPublicKey();

            if (!address) {
                throw new Error(
                    'LOBSTR did not return a public key.'
                );
            }

            return buildWallet(
                'lobstr',
                address
            );
        }

        const access =
            await requestAccess();

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

        return buildWallet(
            'freighter',
            access.address
        );
    };

export const restoreStellarWallet =
    async (
        walletId: WalletId
    ): Promise<ConnectedWallet | null> => {
        if (walletId === 'lobstr') {
            const installed =
                await isLobstrConnected();

            if (!installed) {
                return null;
            }

            const address =
                await getLobstrPublicKey();
            return address
                ? buildWallet(
                      'lobstr',
                      address
                  )
                : null;
        }

        const installed =
            await isFreighterConnected();

        if (!installed.isConnected) {
            return null;
        }

        const address =
            await getFreighterAddress();

        if (address.error || !address.address) {
            return null;
        }

        return buildWallet(
            'freighter',
            address.address
        );
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
