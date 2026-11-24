import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useAppStore } from '@/lib/store';
import {
    fetchSep41Metadata,
    fetchStellarClassicAssets,
    formatTokenAmount,
    type StellarClassicAsset
} from '@/services/stellar/assets';
import { useWallet } from './useWallet';

export interface StellarTokenHolding {
    tokenContract: string;
    balance: string;
    transferCount: number;
    symbol: string | null;
    decimals: number | null;
    formatted: string;
}

export interface StellarAssets {
    classic: StellarClassicAsset[];
    tokens: StellarTokenHolding[];
    /** Set when one source failed; the other still shows. */
    warning: string | null;
}

/**
 * Every asset a Stellar address holds: classic balances from Horizon (all
 * trustlines) plus SEP-41 token balances from the indexed transfers. Works for
 * `G...` accounts and `C...` contract wallets alike.
 */
export const useStellarAssets = () => {
    const { currentWallet, family } = useWallet();
    const { network } = useAppStore();
    const address = currentWallet?.address;

    return useQuery<StellarAssets>({
        queryKey: ['stellar-assets', network, address],
        enabled: family === 'stellar' && Boolean(address),
        queryFn: async () => {
            const [classicResult, tokenResult] = await Promise.allSettled([
                fetchStellarClassicAssets(address!, network),
                apiService.getStellarTokenBalances(address!, network).then((r) => r.tokens),
            ]);

            const warnings: string[] = [];
            const classic = classicResult.status === 'fulfilled' ? classicResult.value : [];
            if (classicResult.status === 'rejected') warnings.push(`Classic balances: ${classicResult.reason?.message ?? 'failed'}`);

            const rawTokens = tokenResult.status === 'fulfilled' ? tokenResult.value : [];
            if (tokenResult.status === 'rejected') warnings.push(`Token balances: ${tokenResult.reason?.message ?? 'failed'}`);

            const tokens = await Promise.all(
                rawTokens.map(async (t): Promise<StellarTokenHolding> => {
                    const meta = await fetchSep41Metadata(t.tokenContract, network).catch(() => null);
                    const decimals = meta?.decimals ?? null;
                    const amount = formatTokenAmount(t.balance, decimals);
                    return {
                        ...t,
                        symbol: meta?.symbol ?? null,
                        decimals,
                        formatted: meta?.symbol ? `${amount} ${meta.symbol}` : amount,
                    };
                })
            );

            return { classic, tokens, warning: warnings.length ? warnings.join(' ') : null };
        },
    });
};
