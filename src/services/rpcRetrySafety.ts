import type { ChainId } from '@/types';
import { isStarknetWriteMethod } from './starknetMethods';

/**
 * JSON-RPC methods that submit a transaction, per chain. A timeout or a 5xx
 * from one of these does not mean the node rejected the transaction, so it
 * is sent once, to one endpoint, and never retried on the next endpoint in
 * the failover list. Starknet's list comes from its method registry.
 */
const SUBMIT_METHODS: Partial<Record<ChainId, ReadonlySet<string>>> = {
    sui: new Set(['sui_executeTransactionBlock', 'sendTransaction']),
    evm: new Set(['eth_sendRawTransaction', 'eth_sendTransaction']),
    solana: new Set(['sendTransaction']),
    stellar: new Set(['sendTransaction']),
};

export const isSubmitMethod = (chain: ChainId, method: string): boolean =>
    chain === 'starknet' ? isStarknetWriteMethod(method) : SUBMIT_METHODS[chain]?.has(method) ?? false;

/** The endpoints a request may try: all of them for reads, only the first for a submission. */
export const endpointsFor = (chain: ChainId, method: string, endpoints: string[]): string[] =>
    isSubmitMethod(chain, method) ? endpoints.slice(0, 1) : endpoints;
