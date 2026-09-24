import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { useBalance } from 'wagmi';
import {
    Connection,
    PublicKey
} from '@solana/web3.js';
import { useSuiClient } from '@mysten/dapp-kit';

import { resolveChainRpcUrl } from '@/services/suiService';
import { useAppStore } from '@/lib/store';
import { APTOS_NETWORKS } from '@/lib/constants';

import { fetchStellarBalance } from '../stellar';
import type { WalletBalanceInfo } from '../types';
import { useWallet } from './useWallet';

export const useWalletBalance =
    () => {
        const {
            currentWallet,
            family
        } = useWallet();
        const { network } = useAppStore();
        const suiClient = useSuiClient();

        const evmBalance =
            useBalance({
                address:
                    family === 'evm' &&
                    currentWallet?.address
                        ? (currentWallet.address as `0x${string}`)
                        : undefined,
                query: {
                    enabled:
                        family === 'evm' &&
                        Boolean(
                            currentWallet?.address
                        )
                }
            });

        const suiBalance =
            useQuery({
                queryKey: [
                    'wallet-balance',
                    'sui',
                    network,
                    currentWallet?.address
                ],
                enabled:
                    family === 'sui' &&
                    Boolean(
                        currentWallet?.address
                    ),
                queryFn: async () => {
                    const response =
                        await suiClient.getBalance({
                            owner:
                                currentWallet!.address,
                            coinType:
                                '0x2::sui::SUI'
                        });
                    const raw =
                        response.totalBalance || '0';

                    return {
                        symbol: 'SUI',
                        formatted: `${(
                            Number(raw) /
                            1_000_000_000
                        ).toFixed(4)} SUI`,
                        value: raw,
                        decimals: 9
                    } satisfies WalletBalanceInfo;
                }
            });

        const stellarBalance =
            useQuery({
                queryKey: [
                    'wallet-balance',
                    'stellar',
                    currentWallet?.address
                ],
                enabled:
                    family ===
                        'stellar' &&
                    Boolean(
                        currentWallet?.address
                    ),
                queryFn: () =>
                    fetchStellarBalance(
                        currentWallet!.address
                    )
            });

        const solanaBalance =
            useQuery({
                queryKey: [
                    'wallet-balance',
                    'solana',
                    network,
                    currentWallet?.address
                ],
                enabled:
                    family === 'solana' &&
                    Boolean(
                        currentWallet?.address
                    ),
                queryFn: async () => {
                    const connection =
                        new Connection(
                            resolveChainRpcUrl(
                                'solana',
                                network
                            ),
                            'confirmed'
                        );
                    const lamports =
                        await connection.getBalance(
                            new PublicKey(
                                currentWallet!.address
                            )
                        );

                    return {
                        symbol: 'SOL',
                        formatted: `${(
                            lamports / 1_000_000_000
                        ).toFixed(4)} SOL`,
                        value: String(lamports),
                        decimals: 9
                    } satisfies WalletBalanceInfo;
                }
            });

        const aptosBalance =
            useQuery({
                queryKey: [
                    'wallet-balance',
                    'aptos',
                    network,
                    currentWallet?.address
                ],
                enabled:
                    family === 'aptos' &&
                    Boolean(
                        currentWallet?.address
                    ),
                queryFn: async () => {
                    const resourceType = encodeURIComponent(
                        '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
                    );
                    const response =
                        await fetch(
                            `${APTOS_NETWORKS[network]}/accounts/${currentWallet!.address}/resource/${resourceType}`
                        );

                    if (response.status === 404) {
                        return {
                            symbol: 'APT',
                            formatted: '0.0000 APT',
                            value: '0',
                            decimals: 8
                        } satisfies WalletBalanceInfo;
                    }

                    if (!response.ok) {
                        throw new Error(
                            'Unable to fetch Aptos balance.'
                        );
                    }

                    const resource =
                        (await response.json()) as {
                            coin?: {
                                value?: string;
                            };
                        };
                    const octas =
                        resource.coin?.value || '0';

                    return {
                        symbol: 'APT',
                        formatted: `${(
                            Number(octas) / 100_000_000
                        ).toFixed(4)} APT`,
                        value: octas,
                        decimals: 8
                    } satisfies WalletBalanceInfo;
                }
            });

        if (family === 'evm') {
            return {
                balance:
                    evmBalance.data
                        ? {
                              symbol:
                                  evmBalance
                                      .data
                                      .symbol,
                              formatted: `${Number(
                                  formatUnits(
                                      evmBalance
                                          .data
                                          .value,
                                      evmBalance
                                          .data
                                          .decimals
                                  )
                              ).toFixed(4)} ${evmBalance.data.symbol}`,
                              value:
                                  evmBalance
                                      .data
                                      .value
                                      .toString(),
                              decimals:
                                  evmBalance
                                      .data
                                      .decimals
                          }
                        : null,
                isLoading:
                    evmBalance.isLoading,
                error:
                    evmBalance.error ||
                    null
            };
        }

        if (family === 'sui') {
            return {
                balance:
                    suiBalance.data ||
                    null,
                isLoading:
                    suiBalance.isLoading,
                error:
                    suiBalance.error ||
                    null
            };
        }

        if (family === 'stellar') {
            return {
                balance:
                    stellarBalance.data ||
                    null,
                isLoading:
                    stellarBalance.isLoading,
                error:
                    stellarBalance.error ||
                    null
            };
        }

        if (family === 'solana') {
            return {
                balance:
                    solanaBalance.data ||
                    null,
                isLoading:
                    solanaBalance.isLoading,
                error:
                    solanaBalance.error ||
                    null
            };
        }

        if (family === 'aptos') {
            return {
                balance:
                    aptosBalance.data ||
                    null,
                isLoading:
                    aptosBalance.isLoading,
                error:
                    aptosBalance.error ||
                    null
            };
        }

        return {
            balance: null,
            isLoading: false,
            error: null
        };
    };
