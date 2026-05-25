'use client';

import {
    useConnectWallet as useSuiConnectWallet,
    useCurrentAccount,
    useCurrentWallet,
    useDisconnectWallet as useSuiDisconnectWallet,
    useWallets
} from '@mysten/dapp-kit';
import type { WalletWithRequiredFeatures } from '@mysten/wallet-standard';
import { Buffer } from 'buffer';
import React, {
    createContext,
    startTransition,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import {
    useAccount as useEvmAccount,
    useChains,
    useConnect as useEvmConnect,
    useDisconnect as useEvmDisconnect,
    useReconnect as useEvmReconnect,
    useSwitchChain
} from 'wagmi';

import { useAppStore } from '@/lib/store';

import {
    DEFAULT_EVM_CHAIN_ID,
    EVM_CONNECTOR_IDS,
    isWalletConnectConfigured
} from '../config';
import {
    getWalletDescriptor,
    WALLET_DESCRIPTORS
} from '../descriptors';
import {
    connectStellarWallet,
    detectStellarWallets,
    restoreStellarWallet
} from '../stellar';
import {
    clearActiveWalletSnapshot,
    persistActiveWalletSnapshot,
    persistRecentWallet,
    readActiveWalletSnapshot,
    readRecentWallets
} from '../storage';
import type {
    ConnectedWallet,
    WalletCatalogItem,
    WalletChainFamily,
    WalletConnectErrorShape,
    WalletId,
    WalletProviderContextValue
} from '../types';
import {
    detectInjectedWallets,
    formatWalletError,
    isBrowser,
    isMobileDevice,
    matchSuiWalletId
} from '../utils';

const WalletManagerContext =
    createContext<WalletProviderContextValue | null>(
        null
    );

const resolveConnectorWalletId = (
    connectorId?: string
): WalletId | null => {
    if (!connectorId) {
        return null;
    }

    const entry = Object.entries(
        EVM_CONNECTOR_IDS
    ).find(
        ([, id]) => id === connectorId
    );

    return (entry?.[0] as WalletId) || null;
};

const findSuiWallet = (
    wallets: WalletWithRequiredFeatures[],
    walletId: WalletId
) => {
    return wallets.find(
        (wallet) =>
            matchSuiWalletId(wallet.name) ===
            walletId
    );
};

const getWalletInstallError = (
    walletId: WalletId
) => {
    const descriptor =
        getWalletDescriptor(walletId);

    if (!descriptor) {
        return 'Wallet is unavailable.';
    }

    if (
        descriptor.mobileUrl &&
        isMobileDevice() &&
        isBrowser()
    ) {
        const targetUrl =
            `${descriptor.mobileUrl}${encodeURIComponent(window.location.href)}`;
        window.location.assign(targetUrl);
        return null;
    }

    return `${descriptor.name} is not installed on this device.`;
};

export function WalletManagerProvider({
    children
}: {
    children: React.ReactNode;
}) {
    const [
        modalQuery,
        setModalQueryState
    ] = useState('');
    const [
        isModalOpen,
        setIsModalOpen
    ] = useState(false);
    const [
        pendingWalletId,
        setPendingWalletId
    ] = useState<WalletId | null>(null);
    const [status, setStatus] =
        useState<
            WalletProviderContextValue['status']
        >('disconnected');
    const [error, setError] =
        useState<WalletConnectErrorShape | null>(
            null
        );
    const [
        stellarSession,
        setStellarSession
    ] = useState<ConnectedWallet | null>(
        null
    );
    const [
        preferredWalletId,
        setPreferredWalletId
    ] = useState<WalletId | null>(
        () =>
            readActiveWalletSnapshot()
                ?.walletId || null
    );
    const [
        recentWalletIds,
        setRecentWalletIds
    ] = useState<WalletId[]>(
        readRecentWallets()
    );
    const [
        stellarAvailability,
        setStellarAvailability
    ] = useState({
        lobstr: false,
        freighter: false,
        albedo: false,
        xbull: false,
        rabet: false,
        hana: false
    });

    const restoreAttemptedRef =
        useRef(false);
    const { network } =
        useAppStore();

    const suiWallets = useWallets();
    const suiWalletState =
        useCurrentWallet();
    const currentSuiAccount =
        useCurrentAccount();
    const {
        mutateAsync: connectSuiAsync
    } = useSuiConnectWallet();
    const {
        mutateAsync: disconnectSuiAsync
    } = useSuiDisconnectWallet();

    const evmAccount = useEvmAccount();
    const evmChains = useChains();
    const {
        connectAsync: connectEvmAsync,
        connectors: evmConnectors
    } = useEvmConnect();
    const {
        disconnectAsync: disconnectEvmAsync
    } = useEvmDisconnect();
    const {
        reconnectAsync: reconnectEvmAsync
    } = useEvmReconnect();
    const {
        switchChainAsync
    } = useSwitchChain();

    useEffect(() => {
        if (
            typeof globalThis !==
                'undefined' &&
            !(
                globalThis as {
                    Buffer?: typeof Buffer;
                }
            ).Buffer
        ) {
            (
                globalThis as {
                    Buffer?: typeof Buffer;
                }
            ).Buffer = Buffer;
        }
    }, []);

    const refreshStellarAvailability =
        useCallback(async () => {
            try {
                const availability =
                    await detectStellarWallets();
                setStellarAvailability(
                    availability
                );
            } catch {
                setStellarAvailability({
                    lobstr: false,
                    freighter: false,
                    albedo: false,
                    xbull: false,
                    rabet: false,
                    hana: false
                });
            }
        }, []);

    useEffect(() => {
        void refreshStellarAvailability();
    }, [refreshStellarAvailability]);

    useEffect(() => {
        if (isModalOpen) {
            void refreshStellarAvailability();
        }
    }, [
        isModalOpen,
        refreshStellarAvailability
    ]);

    const connectedSuiWallet =
        useMemo(() => {
            if (
                !suiWalletState.isConnected ||
                !currentSuiAccount ||
                !suiWalletState.currentWallet
            ) {
                return null;
            }

            const walletId =
                matchSuiWalletId(
                    suiWalletState.currentWallet
                        .name
                ) || 'sui-wallet';
            const descriptor =
                getWalletDescriptor(walletId);

            return {
                id: walletId,
                name:
                    descriptor?.name ||
                    suiWalletState.currentWallet
                        .name,
                address:
                    currentSuiAccount.address,
                family: 'sui' as const,
                chain: {
                    id: 'sui',
                    family: 'sui',
                    name: 'Sui',
                    network,
                    isSupported: true
                },
                connectorName:
                    suiWalletState.currentWallet
                        .name,
                connectedAt: Date.now()
            };
        }, [
            currentSuiAccount,
            network,
            suiWalletState
        ]);

    const connectedEvmWallet =
        useMemo(() => {
            if (
                !evmAccount.isConnected ||
                !evmAccount.address ||
                !evmAccount.connector
            ) {
                return null;
            }

            const walletId =
                resolveConnectorWalletId(
                    evmAccount.connector.id
                ) || 'metamask';
            const descriptor =
                getWalletDescriptor(walletId);

            return {
                id: walletId,
                name:
                    descriptor?.name ||
                    evmAccount.connector.name,
                address:
                    evmAccount.address,
                family: 'evm' as const,
                chain: {
                    id: `eip155:${evmAccount.chainId}`,
                    family: 'evm',
                    name:
                        evmAccount.chain
                            ?.name || 'EVM',
                    network:
                        evmAccount.chain
                            ?.name ||
                        'mainnet',
                    isSupported: Boolean(
                        evmAccount.chain
                    )
                },
                connectorName:
                    evmAccount.connector.name,
                connectedAt: Date.now()
            };
        }, [evmAccount]);

    const currentWallet = useMemo(() => {
        const connectedWallets = [
            connectedEvmWallet,
            connectedSuiWallet,
            stellarSession
        ].filter(
            Boolean
        ) as ConnectedWallet[];

        if (
            preferredWalletId
        ) {
            const preferred =
                connectedWallets.find(
                    (wallet) =>
                        wallet.id ===
                        preferredWalletId
                );

            if (preferred) {
                return preferred;
            }
        }

        return connectedWallets[0] || null;
    }, [
        connectedEvmWallet,
        connectedSuiWallet,
        preferredWalletId,
        stellarSession
    ]);

    const disconnectFamiliesExcept =
        useCallback(
            async (
                family: WalletChainFamily
            ) => {
                if (
                    family !== 'evm' &&
                    evmAccount.isConnected
                ) {
                    try {
                        await disconnectEvmAsync();
                    } catch {
                        // noop
                    }
                }

                if (
                    family !== 'sui' &&
                    suiWalletState.isConnected
                ) {
                    try {
                        await disconnectSuiAsync();
                    } catch {
                        // noop
                    }
                }

                if (
                    family !== 'stellar' &&
                    stellarSession
                ) {
                    setStellarSession(
                        null
                    );
                }
            },
            [
                disconnectEvmAsync,
                disconnectSuiAsync,
                evmAccount.isConnected,
                stellarSession,
                suiWalletState.isConnected
            ]
        );

    useEffect(() => {
        if (
            pendingWalletId ||
            evmAccount.isConnecting ||
            evmAccount.isReconnecting ||
            suiWalletState.isConnecting
        ) {
            setStatus('connecting');
            return;
        }

        if (currentWallet) {
            setStatus('connected');
            setError(null);
            setPreferredWalletId(
                currentWallet.id
            );
            persistActiveWalletSnapshot(
                {
                    walletId:
                        currentWallet.id,
                    family:
                        currentWallet.family,
                    address:
                        currentWallet.address,
                    chainId:
                        currentWallet.chain.id,
                    connectedAt:
                        currentWallet.connectedAt
                }
            );
            return;
        }

        if (
            restoreAttemptedRef.current
        ) {
            setStatus((current) =>
                current ===
                    'rejected' ||
                current ===
                    'unsupported-chain' ||
                current === 'error'
                    ? current
                    : 'disconnected'
            );
        }
    }, [
        currentWallet,
        evmAccount.isConnecting,
        evmAccount.isReconnecting,
        pendingWalletId,
        suiWalletState.isConnecting
    ]);

    useEffect(() => {
        if (
            !restoreAttemptedRef.current &&
            !currentWallet
        ) {
            return;
        }

        if (
            !currentWallet &&
            !pendingWalletId &&
            !evmAccount.isConnecting &&
            !evmAccount.isReconnecting &&
            !suiWalletState.isConnecting
        ) {
            clearActiveWalletSnapshot();
        }
    }, [
        currentWallet,
        evmAccount.isConnecting,
        evmAccount.isReconnecting,
        pendingWalletId,
        suiWalletState.isConnecting
    ]);

    useEffect(() => {
        if (
            restoreAttemptedRef.current
        ) {
            return;
        }

        const snapshot =
            readActiveWalletSnapshot();

        if (!snapshot) {
            restoreAttemptedRef.current =
                true;
            return;
        }

        if (
            snapshot.family === 'sui'
        ) {
            if (!suiWallets.length) {
                return;
            }

            restoreAttemptedRef.current =
                true;
            const wallet =
                findSuiWallet(
                    suiWallets,
                    snapshot.walletId
                );

            if (!wallet) {
                clearActiveWalletSnapshot();
                return;
            }

            setStatus('connecting');
            setPendingWalletId(
                snapshot.walletId
            );

            void connectSuiAsync({
                wallet
            })
                .then(() => {
                    setPreferredWalletId(
                        snapshot.walletId
                    );
                })
                .catch(() => {
                    clearActiveWalletSnapshot();
                })
                .finally(() => {
                    setPendingWalletId(
                        null
                    );
                });

            return;
        }

        if (
            snapshot.family === 'evm'
        ) {
            restoreAttemptedRef.current =
                true;
            const connectorId =
                EVM_CONNECTOR_IDS[
                    snapshot.walletId as keyof typeof EVM_CONNECTOR_IDS
                ];
            const connectors =
                connectorId
                    ? evmConnectors.filter(
                          (
                              connector
                          ) =>
                              connector.id ===
                              connectorId
                      )
                    : evmConnectors;

            setStatus('connecting');
            setPendingWalletId(
                snapshot.walletId
            );

            void reconnectEvmAsync({
                connectors
            })
                .then(() => {
                    setPreferredWalletId(
                        snapshot.walletId
                    );
                })
                .catch(() => {
                    clearActiveWalletSnapshot();
                })
                .finally(() => {
                    setPendingWalletId(
                        null
                    );
                });

            return;
        }

        restoreAttemptedRef.current =
            true;
        setStatus('connecting');
        setPendingWalletId(
            snapshot.walletId
        );

        void restoreStellarWallet(
            snapshot.walletId
        )
            .then((wallet) => {
                if (wallet) {
                    setStellarSession(
                        wallet
                    );
                    setPreferredWalletId(
                        wallet.id
                    );
                } else {
                    clearActiveWalletSnapshot();
                }
            })
            .finally(() => {
                setPendingWalletId(
                    null
                );
            });
    }, [
        connectSuiAsync,
        evmConnectors,
        reconnectEvmAsync,
        suiWallets
    ]);

    const connect = useCallback(
        async (walletId: WalletId) => {
            const descriptor =
                getWalletDescriptor(
                    walletId
                );

            if (!descriptor) {
                return;
            }

            if (
                currentWallet?.id ===
                walletId
            ) {
                setIsModalOpen(false);
                return;
            }

            setError(null);
            setStatus('connecting');
            setPendingWalletId(walletId);

            try {
                if (
                    descriptor.chainFamily ===
                    'evm'
                ) {
                    const connectorId =
                        EVM_CONNECTOR_IDS[
                            walletId as keyof typeof EVM_CONNECTOR_IDS
                        ];

                    if (
                        walletId ===
                            'walletconnect' &&
                        !isWalletConnectConfigured
                    ) {
                        throw new Error(
                            'WalletConnect project ID is missing. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.'
                        );
                    }

                    const connector =
                        evmConnectors.find(
                            (
                                item
                            ) =>
                                item.id ===
                                connectorId
                        );

                    if (
                        !connector
                    ) {
                        const installError =
                            getWalletInstallError(
                                walletId
                            );
                        if (
                            installError
                        ) {
                            throw new Error(
                                installError
                            );
                        }
                        return;
                    }

                    await disconnectFamiliesExcept(
                        'evm'
                    );
                    await connectEvmAsync({
                        connector,
                        chainId:
                            DEFAULT_EVM_CHAIN_ID
                    });
                } else if (
                    descriptor.chainFamily ===
                    'sui'
                ) {
                    const wallet =
                        findSuiWallet(
                            suiWallets,
                            walletId
                        );

                    if (
                        !wallet
                    ) {
                        const installError =
                            getWalletInstallError(
                                walletId
                            );
                        if (
                            installError
                        ) {
                            throw new Error(
                                installError
                            );
                        }
                        return;
                    }

                    await disconnectFamiliesExcept(
                        'sui'
                    );
                    await connectSuiAsync({
                        wallet
                    });
                } else {
                    await disconnectFamiliesExcept(
                        'stellar'
                    );
                    const wallet =
                        await connectStellarWallet(
                            walletId
                        );
                    setStellarSession(
                        wallet
                    );
                }

                setPreferredWalletId(
                    walletId
                );
                persistRecentWallet(
                    walletId
                );
                setRecentWalletIds(
                    readRecentWallets()
                );
                setIsModalOpen(false);
            } catch (
                caughtError
            ) {
                const nextError =
                    formatWalletError(
                        caughtError
                    );
                setError(nextError);
                setStatus(
                    nextError.code ===
                        'rejected'
                        ? 'rejected'
                        : nextError.code ===
                            'unsupported-chain'
                          ? 'unsupported-chain'
                          : 'error'
                );
                clearActiveWalletSnapshot();
                throw caughtError;
            } finally {
                setPendingWalletId(
                    null
                );
            }
        },
        [
            connectEvmAsync,
            connectSuiAsync,
            currentWallet?.id,
            disconnectFamiliesExcept,
            evmConnectors,
            suiWallets
        ]
    );

    const disconnect = useCallback(
        async () => {
            if (!currentWallet) {
                clearActiveWalletSnapshot();
                setStatus(
                    'disconnected'
                );
                return;
            }

            setError(null);
            setPendingWalletId(
                currentWallet.id
            );

            try {
                if (
                    currentWallet.family ===
                    'evm'
                ) {
                    await disconnectEvmAsync();
                } else if (
                    currentWallet.family ===
                    'sui'
                ) {
                    await disconnectSuiAsync();
                } else {
                    setStellarSession(
                        null
                    );
                }
            } finally {
                clearActiveWalletSnapshot();
                setPendingWalletId(
                    null
                );
                setStatus(
                    'disconnected'
                );
            }
        },
        [
            currentWallet,
            disconnectEvmAsync,
            disconnectSuiAsync
        ]
    );

    const switchEvmChain =
        useCallback(
            async (chainId: number) => {
                if (
                    currentWallet?.family !==
                    'evm'
                ) {
                    throw new Error(
                        'Only EVM wallets can switch chains.'
                    );
                }

                try {
                    await switchChainAsync({
                        chainId
                    });
                    setError(null);
                } catch (
                    caughtError
                ) {
                    const nextError =
                        formatWalletError(
                            caughtError
                        );
                    setError(nextError);
                    setStatus(
                        nextError.code ===
                            'unsupported-chain'
                            ? 'unsupported-chain'
                            : 'error'
                    );
                    throw caughtError;
                }
            },
            [
                currentWallet?.family,
                switchChainAsync
            ]
        );

    const wallets = useMemo<
        WalletCatalogItem[]
    >(() => {
        const injected =
            detectInjectedWallets();
        const currentSuiIds =
            new Set(
                suiWallets
                    .map((wallet) =>
                        matchSuiWalletId(
                            wallet.name
                        )
                    )
                    .filter(
                        Boolean
                    ) as WalletId[]
            );
        const recentSet =
            new Set(
                recentWalletIds
            );

        const evmConnectorIdSet =
            new Set(
                evmConnectors.map(
                    (c) => c.id
                )
            );

        return WALLET_DESCRIPTORS.map(
            (descriptor) => {
                let availability:
                    | WalletCatalogItem['availability']
                    | undefined;
                let helperText =
                    descriptor.description;

                switch (
                    descriptor.id
                ) {
                    case 'metamask':
                        availability =
                            injected.metamask
                                ? 'installed'
                                : 'available';
                        break;
                    case 'coinbase-wallet':
                        availability =
                            injected.coinbase
                                ? 'installed'
                                : 'available';
                        break;
                    case 'walletconnect':
                        availability =
                            isWalletConnectConfigured
                                ? 'available'
                                : 'coming-soon';
                        if (
                            !isWalletConnectConfigured
                        ) {
                            helperText =
                                'Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to enable QR sessions.';
                        }
                        break;
                    case 'phantom':
                        availability =
                            injected.phantom ||
                            evmConnectorIdSet.has(
                                'app.phantom'
                            )
                                ? 'installed'
                                : 'available';
                        break;
                    case 'trust-wallet':
                        availability =
                            injected.trust ||
                            evmConnectorIdSet.has(
                                'com.trustwallet.app'
                            )
                                ? 'installed'
                                : 'not-installed';
                        break;
                    case 'rainbow':
                        availability =
                            injected.rainbow ||
                            evmConnectorIdSet.has(
                                'me.rainbow'
                            )
                                ? 'installed'
                                : 'not-installed';
                        break;
                    case 'okx-wallet':
                        availability =
                            injected.okx ||
                            evmConnectorIdSet.has(
                                'com.okex.wallet'
                            )
                                ? 'installed'
                                : 'not-installed';
                        break;
                    case 'brave-wallet':
                        availability =
                            injected.brave ||
                            evmConnectorIdSet.has(
                                'com.brave.wallet'
                            )
                                ? 'installed'
                                : 'not-installed';
                        break;
                    case 'sui-wallet':
                    case 'suiet':
                    case 'ethos':
                        availability =
                            currentSuiIds.has(
                                descriptor.id
                            )
                                ? 'installed'
                                : 'not-installed';
                        break;
                    case 'lobstr':
                        availability =
                            stellarAvailability.lobstr
                                ? 'installed'
                                : 'not-installed';
                        break;
                    case 'freighter':
                        availability =
                            stellarAvailability.freighter
                                ? 'installed'
                                : 'not-installed';
                        break;
                    case 'albedo':
                        availability =
                            stellarAvailability.albedo
                                ? 'installed'
                                : 'available';
                        break;
                    case 'xbull':
                        availability =
                            stellarAvailability.xbull
                                ? 'installed'
                                : 'not-installed';
                        break;
                    case 'rabet':
                        availability =
                            stellarAvailability.rabet
                                ? 'installed'
                                : 'not-installed';
                        break;
                    case 'hana-wallet':
                        availability =
                            stellarAvailability.hana
                                ? 'installed'
                                : 'not-installed';
                        break;
                    default:
                        availability =
                            'not-installed';
                }

                const isReady =
                    availability ===
                        'installed' ||
                    availability ===
                        'available';

                return {
                    ...descriptor,
                    availability,
                    isDetected:
                        availability ===
                        'installed',
                    isRecent:
                        recentSet.has(
                            descriptor.id
                        ),
                    isReady,
                    helperText
                };
            }
        );
    }, [
        evmConnectors,
        recentWalletIds,
        stellarAvailability,
        suiWallets
    ]);

    const value = useMemo<
        WalletProviderContextValue
    >(
        () => ({
            currentWallet,
            status,
            error,
            wallets,
            recentWalletIds,
            pendingWalletId,
            isModalOpen,
            modalQuery,
            openModal: () =>
                setIsModalOpen(true),
            closeModal: () =>
                setIsModalOpen(false),
            setModalQuery: (
                query
            ) => {
                startTransition(() => {
                    setModalQueryState(
                        query
                    );
                });
            },
            connect,
            disconnect,
            switchEvmChain,
            evmChains: evmChains.map(
                (chain) => ({
                    id: `eip155:${chain.id}`,
                    family: 'evm',
                    name: chain.name,
                    network: chain.name,
                    isSupported: true
                })
            ),
            isWalletConnectReady:
                isWalletConnectConfigured
        }),
        [
            connect,
            currentWallet,
            disconnect,
            error,
            evmChains,
            isModalOpen,
            modalQuery,
            pendingWalletId,
            recentWalletIds,
            status,
            switchEvmChain,
            wallets
        ]
    );

    return (
        <WalletManagerContext.Provider
            value={value}
        >
            {children}
        </WalletManagerContext.Provider>
    );
}

export const useWalletManagerContext =
    () => {
        const context = useContext(
            WalletManagerContext
        );

        if (!context) {
            throw new Error(
                'Wallet hooks must be used within WalletManagerProvider.'
            );
        }

        return context;
    };
