'use client';

import { useEffect } from 'react';

import { appStore } from '@/lib/store';
import { useWallet } from '@/wallet';

export function WalletStoreBridge() {
    const {
        currentWallet
    } = useWallet();

    useEffect(() => {
        appStore.setConnectedAddress(
            currentWallet?.address ||
                null
        );
    }, [currentWallet?.address]);

    return null;
}
