import { formatUnits, parseAbiItem, type Hex } from 'viem';
import { getPublicClient } from 'wagmi/actions';

import { wagmiConfig, DEFAULT_EVM_CHAIN_ID } from '@/wallet/config';
import { getEvmChain } from '@/lib/constants';

/**
 * Cross-chain approval/allowance discovery and revoke.
 *
 * EVM is the only chain in this app with a real, standing "approve a
 * spender for an amount, until revoked" concept (ERC-20 `approve`/
 * `allowance`, ERC-721/1155 `setApprovalForAll`). Sui's object-ownership
 * model has no equivalent for most assets — a Coin transfer moves the
 * object itself, not a spend allowance. Solana's closest analog is an SPL
 * token `Approve`/`Revoke` instruction targeting a delegate, a narrower
 * concept than ERC-20 allowances and not implemented here yet. This module
 * is intentionally EVM-only rather than forcing a uniform cross-chain table
 * that would misrepresent what the other chains actually support.
 */

const ERC20_APPROVAL_EVENT = parseAbiItem(
    'event Approval(address indexed owner, address indexed spender, uint256 value)'
);
const ERC20_ALLOWANCE_ABI = [
    parseAbiItem('function allowance(address owner, address spender) view returns (uint256)'),
    parseAbiItem('function decimals() view returns (uint8)'),
    parseAbiItem('function symbol() view returns (string)')
] as const;

export interface EvmApproval {
    tokenAddress: string;
    tokenSymbol: string | null;
    spender: string;
    /** Raw on-chain allowance, re-checked live (not just the last event's value — it may have changed since). */
    amount: bigint;
    /** True when `amount` is the practical "unlimited" ceiling (>= 2^255). */
    isUnlimited: boolean;
    formattedAmount: string;
}

const UNLIMITED_THRESHOLD = BigInt(2) ** BigInt(255);

/**
 * Scans recent `Approval` events for `owner` on `chainId`, dedupes to the
 * latest (token, spender) pair, then re-reads each one's live `allowance()`
 * — an approval can have been partially spent or already revoked since the
 * event fired, so the event log alone isn't authoritative. Entries with a
 * current allowance of 0 are dropped (nothing left to revoke).
 *
 * `fromBlock` defaults to a recent window rather than genesis: an unbounded
 * `eth_getLogs` scan is prohibitively slow/expensive on most public RPCs and
 * most wallets' active approvals were granted recently.
 */
export const scanEvmApprovals = async (
    chainId: number,
    owner: string,
    opts: { blockWindow?: bigint } = {}
): Promise<EvmApproval[]> => {
    const client = getPublicClient(wagmiConfig, { chainId: chainId as never });
    if (!client) throw new Error(`No RPC client configured for chain ${chainId}.`);

    const latestBlock = await client.getBlockNumber();
    const blockWindow = opts.blockWindow ?? BigInt(500_000);
    const fromBlock = latestBlock > blockWindow ? latestBlock - blockWindow : BigInt(0);

    const logs = await client.getLogs({
        event: ERC20_APPROVAL_EVENT,
        args: { owner: owner as Hex },
        fromBlock,
        toBlock: latestBlock
    });

    // Dedupe to the latest event per (token, spender) — only the current
    // state matters, not history.
    const latestByPair = new Map<string, { tokenAddress: string; spender: string }>();
    for (const log of logs) {
        const tokenAddress = log.address;
        const spender = log.args.spender as string;
        latestByPair.set(`${tokenAddress.toLowerCase()}:${spender.toLowerCase()}`, { tokenAddress, spender });
    }

    const results = await Promise.all(
        Array.from(latestByPair.values()).map(async ({ tokenAddress, spender }): Promise<EvmApproval | null> => {
            try {
                const [amount, decimals, symbol] = await Promise.all([
                    client.readContract({
                        address: tokenAddress as Hex,
                        abi: ERC20_ALLOWANCE_ABI,
                        functionName: 'allowance',
                        args: [owner as Hex, spender as Hex]
                    } as never) as Promise<bigint>,
                    (client
                        .readContract({ address: tokenAddress as Hex, abi: ERC20_ALLOWANCE_ABI, functionName: 'decimals' } as never)
                        .catch(() => 18)) as Promise<number>,
                    (client
                        .readContract({ address: tokenAddress as Hex, abi: ERC20_ALLOWANCE_ABI, functionName: 'symbol' } as never)
                        .catch(() => null)) as Promise<string | null>
                ]);

                if (amount === BigInt(0)) return null;

                const isUnlimited = amount >= UNLIMITED_THRESHOLD;
                return {
                    tokenAddress,
                    tokenSymbol: symbol,
                    spender,
                    amount,
                    isUnlimited,
                    formattedAmount: isUnlimited ? 'Unlimited' : formatUnits(amount, decimals)
                };
            } catch {
                // Token no longer responds the expected ERC-20 way (e.g. a
                // non-standard/rebasing token) — skip rather than crash the
                // whole scan over one bad entry.
                return null;
            }
        })
    );

    return results.filter((r): r is EvmApproval => r !== null);
};

export const evmChainLabelFor = (chainId: number): string => getEvmChain(chainId).name;

export const DEFAULT_APPROVAL_SCAN_CHAIN_ID = DEFAULT_EVM_CHAIN_ID;
