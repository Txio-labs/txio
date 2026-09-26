import {
    isConnected as isFreighterConnected,
    signTransaction as freighterSignTransaction,
    requestAccess
} from '@stellar/freighter-api';
import {
    getPublicKey as getLobstrPublicKey,
    isConnected as isLobstrConnected,
    signTransaction as lobstrSignTransaction
} from '@lobstrco/signer-extension-api';
import { xBullWalletConnect } from '@creit.tech/xbull-wallet-connect';
import { SignClient } from '@walletconnect/sign-client';
import type { SessionTypes } from '@walletconnect/types';
// Imported lazily inside getWcModal(), not at module scope: @walletconnect/modal
// runs browser-detection code (window.matchMedia) as an import-time side
// effect, which throws in non-browser environments like the Vitest/JSDOM
// suite that otherwise never touches this Stellar WalletConnect path.
import type { WalletConnectModal } from '@walletconnect/modal';

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
    'stellar-walletconnect': {
        name: 'WalletConnect',
        connectorName: 'WalletConnect'
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

// xBull's official connect SDK (https://github.com/Creit-Tech/xBull-Wallet-Connect)
// bridges to the extension via postMessage, and falls back to the xBull
// webapp when the extension isn't installed — so, unlike the other Stellar
// wallets here, xBull needs no window.* injection check at all. One bridge
// is kept per session (a fresh keypair/session id per the library's own
// guidance) and reused across connect() and later sign() calls, then closed
// on disconnect.
//
// preferredTarget is forced to 'website' rather than the library's default
// ('extension'): with 'extension' the SDK calls window.xBullSDK.getAddress()
// whenever window.xBullSDK is truthy, and some installed versions of the
// extension inject an object without that method, so connect() throws
// "getAddress is not a function" instead of falling back to the popup flow.
let xbullBridge: xBullWalletConnect | undefined;

const getXBullBridge = (): xBullWalletConnect => {
    xbullBridge ??= new xBullWalletConnect({ preferredTarget: 'website' });
    return xbullBridge;
};

export const closeXBullBridge = (): void => {
    xbullBridge?.closeConnections();
    xbullBridge = undefined;
};

const walletConnectProjectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const isStellarWalletConnectConfigured = Boolean(
    walletConnectProjectId
);

// Stellar's own WalletConnect namespace (https://docs.walletconnect.com/advanced/multichain/rpc-reference/stellar-rpc)
// exposes stellar_signXDR as its sign method, scoped to CAIP-2 chain ids
// stellar:pubnet / stellar:testnet.
const STELLAR_WC_METHOD = 'stellar_signXDR';
const getStellarWcChainId = () =>
    stellarNetwork === 'testnet'
        ? 'stellar:testnet'
        : 'stellar:pubnet';

type WcSignClient = InstanceType<typeof SignClient>;

let wcSignClient: WcSignClient | undefined;
let wcModal: WalletConnectModal | undefined;
let wcSession: SessionTypes.Struct | undefined;

const getWcSignClient = async (): Promise<WcSignClient> => {
    if (!walletConnectProjectId) {
        throw new Error(
            'WalletConnect project ID is missing. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.'
        );
    }

    wcSignClient ??= await SignClient.init({
        projectId: walletConnectProjectId,
        metadata: {
            name: 'txio',
            description:
                'Multi-chain wallet session for txio workspace.',
            url: getBrowserWindow()?.location.origin ?? 'https://txio.xyz',
            icons: []
        }
    });

    return wcSignClient;
};

const getWcModal = async (): Promise<WalletConnectModal> => {
    if (!walletConnectProjectId) {
        throw new Error(
            'WalletConnect project ID is missing. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.'
        );
    }

    if (!wcModal) {
        const { WalletConnectModal: Modal } = await import(
            '@walletconnect/modal'
        );
        wcModal = new Modal({
            projectId: walletConnectProjectId
        });
    }

    return wcModal;
};

export const closeStellarWalletConnect = async (): Promise<void> => {
    wcModal?.closeModal();

    if (wcSignClient && wcSession) {
        try {
            await wcSignClient.disconnect({
                topic: wcSession.topic,
                reason: {
                    code: 6000,
                    message: 'User disconnected'
                }
            });
        } catch {
            // Session may already be gone on the wallet's side.
        }
    }

    wcSession = undefined;
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
    // A fresh bridge per connect attempt: reusing one across a failed/retried
    // connect can leave stale listeners from the abandoned attempt.
    closeXBullBridge();
    const bridge = getXBullBridge();

    const address = await withTimeout(
        bridge.connect(),
        'xBull connect'
    );

    if (!address) {
        throw new Error('xBull did not return a public key.');
    }

    return buildWallet('xbull', address);
};

const connectWalletConnectStellar = async (): Promise<ConnectedWallet> => {
    if (getBrowserWindow()?.xBullSDK) {
        // xBull's extension globally intercepts any WalletConnect pairing
        // proposal in the page and crashes parsing the Stellar namespace
        // (confirmed reproducible with both requiredNamespaces and
        // optionalNamespaces — the bug is in xBull's own bundle). Failing
        // fast here avoids opening a QR/URI modal for a pairing that will
        // never complete once xBull grabs it.
        throw new Error(
            'The xBull extension intercepts WalletConnect pairings and cannot complete them. Use the "xBull" option instead of WalletConnect to connect.'
        );
    }

    const client = await getWcSignClient();
    const modal = await getWcModal();
    const chainId = getStellarWcChainId();

    const { uri, approval } = await client.connect({
        requiredNamespaces: {
            stellar: {
                methods: [STELLAR_WC_METHOD],
                chains: [chainId],
                events: []
            }
        }
    });

    try {
        if (uri) {
            await modal.openModal({ uri });
        }

        const session = await withTimeout(
            approval(),
            'WalletConnect (Stellar) connect'
        );

        wcSession = session;

        const account = session.namespaces.stellar?.accounts?.[0];
        // CAIP-10 account id, e.g. "stellar:pubnet:G...".
        const address = account?.split(':')[2];

        if (!address) {
            throw new Error(
                'WalletConnect session did not return a Stellar address.'
            );
        }

        return buildWallet('stellar-walletconnect', address);
    } finally {
        modal.closeModal();
    }
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
            // xBull's connect SDK bridges to the extension when installed and
            // otherwise opens the xBull webapp itself, so it's always usable
            // — unlike the other wallets here, its availability isn't gated
            // on a window.* injection.
            xbull: true,
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
            case 'stellar-walletconnect':
                return connectWalletConnectStellar();
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

        // getAddress() only succeeds if this origin was already granted
        // access *in a way Freighter still recognizes* — after a page
        // reload it can return an error even though the extension is
        // installed and was previously authorized, incorrectly reading as
        // "not connected" and dropping the session on every refresh.
        // requestAccess() is the same call connectFreighter() uses to
        // establish the session in the first place: Freighter resolves it
        // immediately with no prompt when the origin is already
        // authorized, and only shows a popup when it truly isn't — so it's
        // safe to call silently here too.
        const access = await requestAccess();
        if (access.error || !access.address) {
            return null;
        }

        return buildWallet(
            'freighter',
            access.address
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
        // The xBull connect SDK has no silent "already authorized" check —
        // bridge.connect() always opens a fresh popup/tab for the user to
        // approve. Popping that on every page load would violate the
        // no-surprise-auth-prompt rule the other wallets follow here, so
        // xBull is never silently restored; the user reconnects explicitly.
        return null;
    };

const restoreWalletConnectStellar =
    async (): Promise<ConnectedWallet | null> => {
        // Like xBull, WalletConnect has no silent "already authorized"
        // check here — restoring a session automatically without user
        // interaction would violate the no-surprise-auth-prompt rule the
        // other wallets follow, so the user reconnects explicitly.
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
            case 'stellar-walletconnect':
                return restoreWalletConnectStellar();
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

        if (response.status === 404) {
            // Stellar accounts don't exist on-ledger until they receive the
            // minimum XLM reserve — a freshly created/connected wallet with
            // no incoming payment yet will always 404 here. That's a normal
            // "not funded" state, not an RPC/Horizon failure.
            return {
                symbol: 'XLM',
                formatted: 'Account not funded',
                value: '0',
                decimals: 7
            };
        }

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

/**
 * Asks the connected Stellar wallet to sign a transaction envelope (XDR).
 * Returns the signed XDR; submitting it is the caller's job.
 */
export const signStellarTransaction = async (
    walletId: WalletId,
    transactionXdr: string,
    networkPassphrase: string,
    address: string
): Promise<string> => {
    if (walletId === 'freighter') {
        const result = await freighterSignTransaction(transactionXdr, {
            networkPassphrase,
            address
        });
        if (result.error) {
            throw new Error(result.error.message || 'Freighter declined to sign the transaction.');
        }
        return result.signedTxXdr;
    }
    if (walletId === 'lobstr') {
        const signed = await lobstrSignTransaction(transactionXdr);
        if (!signed) {
            throw new Error('LOBSTR declined to sign the transaction.');
        }
        return signed;
    }
    if (walletId === 'xbull') {
        const bridge = getXBullBridge();
        const signedXdr = await withTimeout(
            bridge.sign({ xdr: transactionXdr, publicKey: address, network: networkPassphrase }),
            'xBull sign',
            60_000
        );
        if (!signedXdr) {
            throw new Error('xBull declined to sign the transaction.');
        }
        return signedXdr;
    }
    if (walletId === 'stellar-walletconnect') {
        if (!wcSignClient || !wcSession) {
            throw new Error(
                'WalletConnect session is not active. Reconnect the wallet.'
            );
        }

        const result = await withTimeout(
            wcSignClient.request<{ signedXDR: string }>({
                topic: wcSession.topic,
                chainId: getStellarWcChainId(),
                request: {
                    method: STELLAR_WC_METHOD,
                    params: { xdr: transactionXdr }
                }
            }),
            'WalletConnect (Stellar) sign',
            60_000
        );

        if (!result?.signedXDR) {
            throw new Error(
                'WalletConnect wallet declined to sign the transaction.'
            );
        }

        return result.signedXDR;
    }
    throw new Error(`Stellar wallet "${walletId}" does not support signing here.`);
};
