export type WalletChainFamily =
    | 'evm'
    | 'sui'
    | 'stellar';

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
    | 'deeplink';

export type WalletId =
    | 'metamask'
    | 'walletconnect'
    | 'coinbase-wallet'
    | 'phantom'
    | 'trust-wallet'
    | 'rainbow'
    | 'okx-wallet'
    | 'brave-wallet'
    | 'sui-wallet'
    | 'suiet'
    | 'ethos'
    | 'lobstr'
    | 'freighter'
    | 'albedo'
    | 'xbull'
    | 'rabet'
    | 'hana-wallet';

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
    currentWallet: ConnectedWallet | null;
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
    disconnect: () => Promise<void>;
    switchEvmChain: (
        chainId: number
    ) => Promise<void>;
    evmChains: WalletChainInfo[];
    isWalletConnectReady: boolean;
}
