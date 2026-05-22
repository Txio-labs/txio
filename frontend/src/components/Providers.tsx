'use client';

import React, { Suspense, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { WagmiProvider } from 'wagmi';
import "@mysten/dapp-kit/dist/index.css";
import { WalletModal } from '@/components/wallet/WalletModal';
import { WalletStoreBridge } from '@/components/wallet/WalletStoreBridge';
import { wagmiConfig, WalletManagerProvider } from '@/wallet';
import { RedirectManager } from "./RedirectManager";

const networks = {
    mainnet: { url: getFullnodeUrl("mainnet") },
    testnet: { url: getFullnodeUrl("testnet") },
    devnet: { url: getFullnodeUrl("devnet") },
};

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5, // 5 minutes
                retry: 1,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
                <SuiClientProvider networks={networks} defaultNetwork="testnet">
                    <WalletProvider autoConnect={false}>
                        <WalletManagerProvider>
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
