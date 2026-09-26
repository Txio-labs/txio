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
    EVM_CONNECTOR_IDS
} from '../config';
import {
    getWalletDescriptor,
    WALLET_DESCRIPTORS
} from '../descriptors';
import {
    closeXBullBridge,
    connectStellarWallet,
    detectStellarWallets,
    restoreStellarWallet
} from '../stellar';
import { connectSolanaWallet, detectSolanaWallets, restoreSolanaWallet, disconnectSolanaWallet } from '../solana';
import { connectAptosWallet, detectAptosWallets, restoreAptosWallet, disconnectAptosWallet } from '../aptos';
import {
    clearLinkedWallet,
    persistActiveSignerFamily,
    persistLinkedWallet,
    persistRecentWallet,
    readActiveSignerFamily,
    readLinkedWallets,
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
    const [solanaSession, setSolanaSession] = useState<ConnectedWallet | null>(null);
    const [aptosSession, setAptosSession] = useState<ConnectedWallet | null>(null);
    const [
        preferredWalletId,
        setPreferredWalletId
    ] = useState<WalletId | null>(null);
    const [
        activeSignerFamily,
        setActiveSignerFamilyState
    ] = useState<WalletChainFamily | null>(
        () => readActiveSignerFamily()
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
    const [solanaAvailability, setSolanaAvailability] = useState({'phantom-solana': false, solflare: false, backpack: false, glow: false, 'nightly-solana': false});
    const [aptosAvailability, setAptosAvailability] = useState({petra: false, martian: false, pontem: false, 'rise-wallet': false, 'nightly-aptos': false});

    const restoreAttemptedRef =
        useRef(false);
    const { network } =
        useAppStore();
    // Stamped explicitly at the moment a connect/restore call resolves
    // (event-handler / promise-callback context), never read during render,
    // so that `connectedAt` never has to call Date.now() while computing
    // the memoized wallet snapshots below.
    const [suiConnectedAt, setSuiConnectedAt] =
        useState(0);
    const [evmConnectedAt, setEvmConnectedAt] =
        useState(0);

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
        useCallback(() => {
            detectStellarWallets()
                .then((availability) => {
                    setStellarAvailability(
                        availability
                    );
                })
                .catch(() => {
                    setStellarAvailability({
                        lobstr: false,
                        freighter: false,
                        albedo: false,
                        xbull: false,
                        rabet: false,
                        hana: false
                    });
                });
        }, []);

    const refreshSolanaAvailability = useCallback(() => {
        detectSolanaWallets().then(setSolanaAvailability).catch(() => setSolanaAvailability({'phantom-solana': false, solflare: false, backpack: false, glow: false, 'nightly-solana': false}));
    }, []);
    const refreshAptosAvailability = useCallback(() => {
        detectAptosWallets().then(setAptosAvailability).catch(() => setAptosAvailability({petra: false, martian: false, pontem: false, 'rise-wallet': false, 'nightly-aptos': false}));
    }, []);

    useEffect(() => {
        refreshStellarAvailability();
        refreshSolanaAvailability();
        refreshAptosAvailability();
    }, [refreshStellarAvailability, refreshSolanaAvailability, refreshAptosAvailability]);

    // Best-effort prefetch of the heavy, dynamically-imported chain SDKs
    // (@mysten/sui/transactions, @stellar/stellar-sdk) during browser idle
    // time, so the first real connect/sign call doesn't have to download
    // them first. Never blocks or throws — a failed prefetch just means the
    // first real call pays the cost it would have paid anyway.
    useEffect(() => {
        const idle =
            typeof window !== 'undefined' && 'requestIdleCallback' in window
                ? window.requestIdleCallback
                : (cb: () => void) => setTimeout(cb, 1);

        const handle = idle(() => {
            import('@mysten/sui/transactions').catch(() => undefined);
            import('@stellar/stellar-sdk').catch(() => undefined);
        });

        return () => {
            if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && typeof handle === 'number') {
                window.cancelIdleCallback(handle);
            }
        };
    }, []);

    useEffect(() => {
        if (isModalOpen) {
            refreshStellarAvailability();
        refreshSolanaAvailability();
        refreshAptosAvailability();
        }
    }, [
        isModalOpen,
        refreshStellarAvailability,
        refreshSolanaAvailability,
        refreshAptosAvailability
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
                    family: 'sui' as const,
                    name: 'Sui',
                    network,
                    isSupported: true
                },
                connectorName:
                    suiWalletState.currentWallet
                        .name,
                connectedAt: suiConnectedAt
            };
        }, [
            currentSuiAccount,
            network,
            suiConnectedAt,
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
                    family: 'evm' as const,
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
                connectedAt: evmConnectedAt
            };
        }, [evmAccount, evmConnectedAt]);

    const linkedWallets = useMemo(() => {
        const map: Partial<
            Record<WalletChainFamily, ConnectedWallet>
        > = {};

        const candidates: (ConnectedWallet | null)[] = [
            connectedEvmWallet,
            connectedSuiWallet,
            stellarSession,
            solanaSession,
            aptosSession
        ];

        for (const wallet of candidates) {
            if (wallet) {
                map[wallet.family] = wallet;
            }
        }

        return map;
    }, [
        connectedEvmWallet,
        connectedSuiWallet,
        stellarSession,
        solanaSession,
        aptosSession
    ]);

    const currentWallet = useMemo(() => {
        if (activeSignerFamily) {
            const active =
                linkedWallets[
                    activeSignerFamily
                ];
            if (active) {
                return active;
            }
        }

        if (preferredWalletId) {
            const preferred = Object.values(
                linkedWallets
            ).find(
                (wallet) =>
                    wallet?.id ===
                    preferredWalletId
            );

            if (preferred) {
                return preferred;
            }
        }

        return (
            Object.values(linkedWallets)[0] ||
            null
        );
    }, [
        activeSignerFamily,
        linkedWallets,
        preferredWalletId
    ]);

    const setActiveSigner = useCallback(
        (family: WalletChainFamily) => {
            setActiveSignerFamilyState(
                family
            );
            persistActiveSignerFamily(
                family
            );
        },
        []
    );

    useEffect(() => {
        if (
            pendingWalletId ||
            evmAccount.isConnecting ||
            evmAccount.isReconnecting ||
            suiWalletState.isConnecting
        ) {
            queueMicrotask(() => {
                setStatus('connecting');
            });
            return;
        }

        if (currentWallet) {
            queueMicrotask(() => {
                setStatus('connected');
                setError(null);
                setPreferredWalletId(
                    currentWallet.id
                );
            });
            return;
        }

        if (
            restoreAttemptedRef.current
        ) {
            queueMicrotask(() => {
                setStatus((current) =>
                    current ===
                        'rejected' ||
                    current ===
                        'unsupported-chain' ||
                    current === 'error'
                        ? current
                        : 'disconnected'
                );
            });
        }
    }, [
        currentWallet,
        evmAccount.isConnecting,
        evmAccount.isReconnecting,
        pendingWalletId,
        suiWalletState.isConnecting
    ]);

    // Persist every linked wallet's session (one slot per family) whenever
    // the set of linked wallets changes, independent of which is active.
    useEffect(() => {
        for (const wallet of Object.values(
            linkedWallets
        )) {
            if (!wallet) {
                continue;
            }

            persistLinkedWallet(wallet.family, {
                walletId: wallet.id,
                family: wallet.family,
                address: wallet.address,
                chainId: wallet.chain.id,
                connectedAt: wallet.connectedAt
            });
        }
    }, [linkedWallets]);

    // Restore every family that was linked in a previous session, in
    // parallel — not just one. Sui restore additionally waits on
    // `suiWallets` being populated before it can run.
    useEffect(() => {
        if (
            restoreAttemptedRef.current
        ) {
            return;
        }

        const snapshots =
            readLinkedWallets();
        const families = Object.keys(
            snapshots
        ) as WalletChainFamily[];

        if (!families.length) {
            restoreAttemptedRef.current =
                true;
            return;
        }

        const suiSnapshot =
            snapshots.sui;
        if (
            suiSnapshot &&
            !suiWallets.length
        ) {
            // Wait for the Sui wallet-standard registry to populate
            // before deciding whether the restore can proceed.
            return;
        }

        restoreAttemptedRef.current = true;
        const restoredFamily =
            readActiveSignerFamily();
        let anyPending = false;

        for (const family of families) {
            const snapshot =
                snapshots[family];
            if (!snapshot) {
                continue;
            }

            if (family === 'sui') {
                const wallet =
                    findSuiWallet(
                        suiWallets,
                        snapshot.walletId
                    );

                if (!wallet) {
                    clearLinkedWallet('sui');
                    continue;
                }

                anyPending = true;
                queueMicrotask(() =>
                    setPendingWalletId(
                        snapshot.walletId
                    )
                );

                void connectSuiAsync({
                    wallet
                })
                    .then(() => {
                        setSuiConnectedAt(
                            Date.now()
                        );
                    })
                    .catch(() => {
                        clearLinkedWallet(
                            'sui'
                        );
                    })
                    .finally(() => {
                        setPendingWalletId(
                            null
                        );
                    });

                continue;
            }

            if (family === 'evm') {
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

                anyPending = true;
                queueMicrotask(() =>
                    setPendingWalletId(
                        snapshot.walletId
                    )
                );

                void reconnectEvmAsync({
                    connectors
                })
                    .then(() => {
                        setEvmConnectedAt(
                            Date.now()
                        );
                    })
                    .catch(() => {
                        clearLinkedWallet(
                            'evm'
                        );
                    })
                    .finally(() => {
                        setPendingWalletId(
                            null
                        );
                    });

                continue;
            }

            const restorePromise =
                family === 'solana'
                    ? restoreSolanaWallet(
                          snapshot.walletId
                      )
                    : family === 'aptos'
                        ? restoreAptosWallet(
                              snapshot.walletId
                          )
                        : restoreStellarWallet(
                              snapshot.walletId
                          );

            anyPending = true;
            queueMicrotask(() =>
                setPendingWalletId(
                    snapshot.walletId
                )
            );

            void restorePromise
                .then((wallet) => {
                    if (!wallet) {
                        clearLinkedWallet(
                            family
                        );
                        return;
                    }

                    if (family === 'solana') {
                        setSolanaSession(
                            wallet
                        );
                    } else if (
                        family === 'aptos'
                    ) {
                        setAptosSession(
                            wallet
                        );
                    } else {
                        setStellarSession(
                            wallet
                        );
                    }
                })
                .finally(() => {
                    setPendingWalletId(
                        null
                    );
                });
        }

        if (anyPending) {
            queueMicrotask(() => {
                setStatus('connecting');
            });
        }

        if (restoredFamily) {
            queueMicrotask(() =>
                setActiveSignerFamilyState(
                    restoredFamily
                )
            );
        }
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

                    await connectEvmAsync({
                        connector,
                        chainId:
                            DEFAULT_EVM_CHAIN_ID
                    });
                    setEvmConnectedAt(
                        Date.now()
                    );
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

                    await connectSuiAsync({
                        wallet
                    });
                    setSuiConnectedAt(
                        Date.now()
                    );
                } else if (descriptor.chainFamily === 'solana') {
                    const wallet = await connectSolanaWallet(walletId);
                    setSolanaSession(wallet);
                } else if (descriptor.chainFamily === 'aptos') {
                    const wallet = await connectAptosWallet(walletId);
                    setAptosSession(wallet);
                } else {
                    const wallet = await connectStellarWallet(walletId);
                    setStellarSession(wallet);
                }

                setPreferredWalletId(
                    walletId
                );
                setActiveSigner(
                    descriptor.chainFamily
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
            evmConnectors,
            setActiveSigner,
            suiWallets
        ]
    );

    const disconnect = useCallback(
        async (family?: WalletChainFamily) => {
            const targetFamily =
                family ||
                currentWallet?.family;
            const targetWallet =
                targetFamily
                    ? linkedWallets[
                          targetFamily
                      ]
                    : null;

            if (
                !targetFamily ||
                !targetWallet
            ) {
                return;
            }

            setError(null);
            setPendingWalletId(
                targetWallet.id
            );

            try {
                if (targetFamily === 'evm') {
                    await disconnectEvmAsync();
                } else if (
                    targetFamily === 'sui'
                ) {
                    await disconnectSuiAsync();
                } else if (
                    targetFamily === 'solana'
                ) {
                    await disconnectSolanaWallet(
                        targetWallet.id
                    );
                    setSolanaSession(null);
                } else if (
                    targetFamily === 'aptos'
                ) {
                    await disconnectAptosWallet(
                        targetWallet.id
                    );
                    setAptosSession(null);
                } else {
                    if (targetWallet.id === 'xbull') {
                        closeXBullBridge();
                    }
                    setStellarSession(null);
                }
            } finally {
                clearLinkedWallet(
                    targetFamily
                );
                setPendingWalletId(null);

                if (
                    activeSignerFamily ===
                    targetFamily
                ) {
                    const remaining =
                        Object.keys(
                            linkedWallets
                        ).filter(
                            (key) =>
                                key !==
                                targetFamily
                        ) as WalletChainFamily[];
                    setActiveSignerFamilyState(
                        remaining[0] || null
                    );
                }

                if (
                    Object.keys(linkedWallets)
                        .length <= 1
                ) {
                    setStatus('disconnected');
                }
            }
        },
        [
            activeSignerFamily,
            currentWallet?.family,
            disconnectEvmAsync,
            disconnectSuiAsync,
            linkedWallets
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
                    case 'phantom':
                        availability =
                            injected.phantom ||
                            evmConnectorIdSet.has(
                                'app.phantom'
                            )
                                ? 'installed'
                                : 'not-installed';
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
                    case 'rabby':
                        availability =
                            injected.rabby
                                ? 'installed'
                                : 'not-installed';
                        break;
                    case 'zerion':
                        availability =
                            injected.zerion
                                ? 'installed'
                                : 'not-installed';
                        break;
                    case 'oneinch':
                        availability =
                            injected.oneinch
                                ? 'installed'
                                : 'not-installed';
                        break;
                    case 'frame':
                        availability =
                            injected.frame
                                ? 'installed'
                                : 'not-installed';
                        break;
                    case 'sui-wallet':
                    case 'suiet':
                    case 'ethos':
                    case 'nightly-sui':
                    case 'okx-wallet-sui':
                    case 'slush':
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
                        // xBull's connect SDK bridges via postMessage to the
                        // extension when present, or opens the xBull webapp
                        // otherwise — always usable, never gated on a
                        // window.* injection check.
                        availability = 'available';
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
                    case 'phantom-solana':
                        availability = solanaAvailability['phantom-solana'] ? 'installed' : 'not-installed';
                        break;
                    case 'solflare':
                        availability = solanaAvailability.solflare ? 'installed' : 'not-installed';
                        break;
                    case 'backpack':
                        availability = solanaAvailability.backpack ? 'installed' : 'not-installed';
                        break;
                    case 'glow':
                        availability = solanaAvailability.glow ? 'installed' : 'not-installed';
                        break;
                    case 'nightly-solana':
                        availability = solanaAvailability['nightly-solana'] ? 'installed' : 'not-installed';
                        break;
                    case 'petra':
                        availability = aptosAvailability.petra ? 'installed' : 'not-installed';
                        break;
                    case 'martian':
                        availability = aptosAvailability.martian ? 'installed' : 'not-installed';
                        break;
                    case 'pontem':
                        availability = aptosAvailability.pontem ? 'installed' : 'not-installed';
                        break;
                    case 'rise-wallet':
                        availability = aptosAvailability['rise-wallet'] ? 'installed' : 'not-installed';
                        break;
                    case 'nightly-aptos':
                        availability = aptosAvailability['nightly-aptos'] ? 'installed' : 'not-installed';
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
        solanaAvailability,
        aptosAvailability,
        suiWallets
    ]);

    const value = useMemo<
        WalletProviderContextValue
    >(
        () => ({
            currentWallet,
            linkedWallets,
            activeSignerFamily,
            setActiveSigner,
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
            )
        }),
        [
            activeSignerFamily,
            connect,
            currentWallet,
            disconnect,
            error,
            evmChains,
            isModalOpen,
            linkedWallets,
            modalQuery,
            pendingWalletId,
            recentWalletIds,
            setActiveSigner,
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
