import {
    WalletId,
    WalletSessionSnapshot
} from './types';

const RECENT_WALLETS_KEY =
    'txio_recent_wallets';
const ACTIVE_WALLET_KEY =
    'txio_active_wallet';

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

export const clearActiveWalletSnapshot =
    () => {
        if (!isBrowser()) {
            return;
        }

        localStorage.removeItem(
            ACTIVE_WALLET_KEY
        );
    };
