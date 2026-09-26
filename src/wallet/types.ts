export type WalletChainFamily =
    | 'evm'
    | 'sui'
    | 'stellar'
    | 'solana'
    | 'aptos';

export type WalletConnectionStatus =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'rejected'
    | 'unsupported-chain'
    | 'error';

export type WalletAvailability =
    | 'installed'
    | 'available'
    | 'not-installed'
    | 'coming-soon';

export type WalletConnectionMethod =
    | 'injected'
    | 'walletconnect'
    | 'sdk'
    | 'wallet-standard'
    | 'deeplink'
    | 'hardware';

export type WalletId =
    | 'metamask'
    | 'walletconnect'
    | 'coinbase-wallet'
    | 'phantom'
    | 'trust-wallet'
    | 'rainbow'
    | 'okx-wallet'
    | 'brave-wallet'
    | 'rabby'
    | 'zerion'
    | 'oneinch'
    | 'frame'
    | 'ledger'
    | 'sui-wallet'
    | 'suiet'
    | 'ethos'
    | 'nightly-sui'
    | 'okx-wallet-sui'
    | 'slush'
    | 'lobstr'
    | 'freighter'
    | 'albedo'
    | 'xbull'
    | 'stellar-walletconnect'
    | 'rabet'
    | 'hana-wallet'
    | 'phantom-solana'
    | 'solflare'
    | 'backpack'
    | 'glow'
    | 'nightly-solana'
    | 'petra'
    | 'martian'
    | 'pontem'
    | 'rise-wallet'
    | 'nightly-aptos';

export interface WalletDescriptor {
    id: WalletId;
    name: string;
    shortName: string;
    chainFamily: WalletChainFamily;
    methods: WalletConnectionMethod[];
    tags: string[];
    description: string;
    installUrl?: string;
    mobileUrl?: string;
    badge?: string;
    iconSeed: string;
    isFeatured?: boolean;
}

export interface WalletChainInfo {
    id: string;
    family: WalletChainFamily;
    name: string;
    network: string;
    isSupported: boolean;
}

export interface WalletBalanceInfo {
    symbol: string;
    formatted: string;
    value: string;
    decimals: number;
}

export interface WalletCatalogItem
    extends WalletDescriptor {
    availability: WalletAvailability;
    isDetected: boolean;
    isRecent: boolean;
    isReady: boolean;
    helperText?: string;
}

export interface ConnectedWallet {
    id: WalletId;
    name: string;
    address: string;
    family: WalletChainFamily;
    chain: WalletChainInfo;
    connectorName: string;
    connectedAt: number;
}

export interface WalletSessionSnapshot {
    walletId: WalletId;
    family: WalletChainFamily;
    address?: string;
    chainId?: string;
    connectedAt?: number;
}

export interface WalletModalState {
    isOpen: boolean;
    query: string;
}

export interface WalletConnectResult {
    wallet: ConnectedWallet;
    balance?: WalletBalanceInfo | null;
}

export interface WalletConnectErrorShape {
    code?: string | number;
    message: string;
    recoverable?: boolean;
}

export interface WalletProviderContextValue {
    /** Convenience alias for linkedWallets.get(activeSignerFamily) — the wallet a new sign action targets. */
    currentWallet: ConnectedWallet | null;
    /** Every wallet linked in this session, one slot per chain family, connected simultaneously. */
    linkedWallets: Partial<
        Record<WalletChainFamily, ConnectedWallet>
    >;
    /** Which linked wallet's family is used when the user signs — switchable without disconnecting anything. */
    activeSignerFamily: WalletChainFamily | null;
    setActiveSigner: (
        family: WalletChainFamily
    ) => void;
    status: WalletConnectionStatus;
    error: WalletConnectErrorShape | null;
    wallets: WalletCatalogItem[];
    recentWalletIds: WalletId[];
    pendingWalletId: WalletId | null;
    isModalOpen: boolean;
    modalQuery: string;
    openModal: () => void;
    closeModal: () => void;
    setModalQuery: (query: string) => void;
    connect: (
        walletId: WalletId
    ) => Promise<void>;
    /** Disconnects the given chain family's linked wallet. Omit to disconnect the active signer. */
    disconnect: (
        family?: WalletChainFamily
    ) => Promise<void>;
    switchEvmChain: (
        chainId: number
    ) => Promise<void>;
    evmChains: WalletChainInfo[];
    isWalletConnectReady: boolean;
}
