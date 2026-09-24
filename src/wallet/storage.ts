import {
    WalletChainFamily,
    WalletId,
    WalletSessionSnapshot
} from './types';

const RECENT_WALLETS_KEY =
    'txio_recent_wallets';
const ACTIVE_WALLET_KEY =
    'txio_active_wallet';
const LINKED_WALLETS_KEY =
    'txio_linked_wallets';
const ACTIVE_SIGNER_KEY =
    'txio_active_signer';

type LinkedWalletsSnapshot = Partial<
    Record<WalletChainFamily, WalletSessionSnapshot>
>;

const isBrowser = () =>
    typeof window !== 'undefined';

export const readRecentWallets = () => {
    if (!isBrowser()) {
        return [] as WalletId[];
    }

    try {
        const raw = localStorage.getItem(
            RECENT_WALLETS_KEY
        );

        if (!raw) {
            return [] as WalletId[];
        }

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? (parsed.filter(
                  (value) =>
                      typeof value ===
                      'string'
              ) as WalletId[])
            : [];
    } catch {
        return [] as WalletId[];
    }
};

export const persistRecentWallet = (
    walletId: WalletId
) => {
    if (!isBrowser()) {
        return;
    }

    const next = [
        walletId,
        ...readRecentWallets().filter(
            (value) =>
                value !== walletId
        )
    ].slice(0, 4);

    localStorage.setItem(
        RECENT_WALLETS_KEY,
        JSON.stringify(next)
    );
};

/** @deprecated single-wallet snapshot, superseded by readLinkedWallets/persistLinkedWallet */
export const readActiveWalletSnapshot =
    () => {
        if (!isBrowser()) {
            return null;
        }

        try {
            const raw =
                localStorage.getItem(
                    ACTIVE_WALLET_KEY
                );

            if (!raw) {
                return null;
            }

            return JSON.parse(
                raw
            ) as WalletSessionSnapshot;
        } catch {
            return null;
        }
    };

/** @deprecated single-wallet snapshot, superseded by readLinkedWallets/persistLinkedWallet */
export const persistActiveWalletSnapshot =
    (
        snapshot: WalletSessionSnapshot
    ) => {
        if (!isBrowser()) {
            return;
        }

        localStorage.setItem(
            ACTIVE_WALLET_KEY,
            JSON.stringify(snapshot)
        );
    };

/** @deprecated single-wallet snapshot, superseded by readLinkedWallets/persistLinkedWallet */
export const clearActiveWalletSnapshot =
    () => {
        if (!isBrowser()) {
            return;
        }

        localStorage.removeItem(
            ACTIVE_WALLET_KEY
        );
    };

export const readLinkedWallets = () => {
    if (!isBrowser()) {
        return {} as LinkedWalletsSnapshot;
    }

    try {
        const raw = localStorage.getItem(
            LINKED_WALLETS_KEY
        );

        if (!raw) {
            return {} as LinkedWalletsSnapshot;
        }

        const parsed = JSON.parse(raw);
        return (parsed &&
            typeof parsed === 'object'
            ? parsed
            : {}) as LinkedWalletsSnapshot;
    } catch {
        return {} as LinkedWalletsSnapshot;
    }
};

export const persistLinkedWallet = (
    family: WalletChainFamily,
    snapshot: WalletSessionSnapshot
) => {
    if (!isBrowser()) {
        return;
    }

    const next: LinkedWalletsSnapshot = {
        ...readLinkedWallets(),
        [family]: snapshot
    };

    localStorage.setItem(
        LINKED_WALLETS_KEY,
        JSON.stringify(next)
    );
};

export const clearLinkedWallet = (
    family: WalletChainFamily
) => {
    if (!isBrowser()) {
        return;
    }

    const next = {
        ...readLinkedWallets()
    };
    delete next[family];

    localStorage.setItem(
        LINKED_WALLETS_KEY,
        JSON.stringify(next)
    );
};

export const readActiveSignerFamily = () => {
    if (!isBrowser()) {
        return null;
    }

    try {
        const raw = localStorage.getItem(
            ACTIVE_SIGNER_KEY
        );
        return (raw as WalletChainFamily) || null;
    } catch {
        return null;
    }
};

export const persistActiveSignerFamily = (
    family: WalletChainFamily
) => {
    if (!isBrowser()) {
        return;
    }

    localStorage.setItem(
        ACTIVE_SIGNER_KEY,
        family
    );
};
