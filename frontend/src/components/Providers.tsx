'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { WagmiProvider } from 'wagmi';
import "@mysten/dapp-kit/dist/index.css";
import { WalletModal } from '@/components/wallet/WalletModal';
import { WalletStoreBridge } from '@/components/wallet/WalletStoreBridge';
import { wagmiConfig, WalletManagerProvider } from '@/wallet';
import { RedirectManager } from "./RedirectManager";
import { ThemeSync } from './ThemeSync';
import { useAppStore } from '@/lib/store';
import { resolveRpcUrl } from '@/lib/appConfig';

export function Providers({ children }: { children: React.ReactNode }) {
    const { network, settings } = useAppStore();
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5, // 5 minutes
                retry: 1,
            },
        },
    }));
    const networks = useMemo(
        () => ({
            mainnet: {
                url: resolveRpcUrl(
                    'mainnet',
                    settings
                )
            },
            testnet: {
                url: resolveRpcUrl(
                    'testnet',
                    settings
                )
            },
            devnet: {
                url: resolveRpcUrl(
                    'devnet',
                    settings
                )
            }
        }),
        [settings]
    );

    return (
        <QueryClientProvider client={queryClient}>
            <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
                <SuiClientProvider
                    networks={networks}
                    defaultNetwork={network}
                >
                    <WalletProvider autoConnect={false}>
                        <WalletManagerProvider>
                            <ThemeSync />
                            <WalletStoreBridge />
                            <WalletModal />
                            <Suspense fallback={null}>
                                <RedirectManager />
                            </Suspense>
                            {children}
                        </WalletManagerProvider>
                    </WalletProvider>
                </SuiClientProvider>
            </WagmiProvider>
        </QueryClientProvider>
    );
}
