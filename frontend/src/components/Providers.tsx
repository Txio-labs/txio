'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import "@mysten/dapp-kit/dist/index.css";
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
            <SuiClientProvider networks={networks} defaultNetwork="testnet">
                <WalletProvider autoConnect>
                    <RedirectManager />
                    {children}
                </WalletProvider>
            </SuiClientProvider>
        </QueryClientProvider>
    );
}
