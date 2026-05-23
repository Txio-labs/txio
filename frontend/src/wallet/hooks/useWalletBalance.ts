import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { useBalance } from 'wagmi';

import { useAppStore } from '@/lib/store';
import { getBalance } from '@/services/suiService';

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
                        await getBalance(
                            network,
                            currentWallet!.address
                        );
                    const raw =
                        response.result
                            ?.totalBalance ||
                        '0';

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

        return {
            balance: null,
            isLoading: false,
            error: null
        };
    };
