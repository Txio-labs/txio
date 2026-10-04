import { getPublicClient } from 'wagmi/actions';
import { normalize } from 'viem/ens';
import { wagmiConfig } from '@/wallet/config';
import type { NameResolver } from './index';

const MAINNET = 1;
const SEPOLIA = 11155111;

/**
 * ENS via viem's `getEnsAddress`, which uses the ENS Universal Resolver
 * (wildcard resolution, CCIP-read). Names live on Ethereum L1 (or Sepolia),
 * so this asks that chain even when the transaction targets an L2; the
 * resulting address is what gets used on the transaction's chain.
 */
export const ensResolver: NameResolver = {
    chain: 'evm',
    pattern: /[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.eth/,
    async resolve(name, ctx) {
        const chainId = ctx.evmChainId === SEPOLIA || ctx.network !== 'mainnet' ? SEPOLIA : MAINNET;
        const client = getPublicClient(wagmiConfig, { chainId: chainId as never });
        if (!client) throw new Error(`no RPC client for ENS on chain ${chainId}`);

        let normalized: string;
        try {
            normalized = normalize(name);
        } catch {
            throw new Error('not a valid ENS name');
        }

        let address: string | null;
        try {
            address = await client.getEnsAddress({ name: normalized });
        } catch (error) {
            throw new Error(error instanceof Error ? `ENS lookup failed (${error.message.split('\n')[0]})` : 'ENS lookup failed');
        }
        if (!address || /^0x0+$/.test(address)) throw new Error('name has no address record');
        return address;
    }
};
