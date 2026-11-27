import { describe, expect, it } from 'vitest';
import type { Network } from '@/types';
import { executeChainRpc, SuiRpcError } from './suiService';
import { STARKNET_METHODS, STARKNET_SPEC_VERSION } from './starknetMethods';
import { resolveStarknetQuery } from './starknetExplorer';
import { STRK_TOKEN_ADDRESS } from './starknet';

// Real Starknet RPC. Run with: LIVE=1 npx vitest run src/services/starknetMethods.live.test.ts
const live = process.env.LIVE === '1';
// This sends about 35 calls per network, paced at 400 ms. Do not loop it: PublicNode rate-limits and then blocks bursts.

const rpc = (network: Network, method: string, params: unknown[]) => executeChainRpc('starknet', network, method, params);

/** Real values from the chain, so every method gets valid inputs. */
async function fixtures(network: Network) {
    // Walk back from the latest block to one that holds a v3 invoke (quiet blocks can be empty).
    const latest = (await rpc(network, 'starknet_blockNumber', [])).result as number;
    let block: any;
    let invoke: any;
    for (let n = latest; n > latest - 20 && !invoke; n--) {
        block = (await rpc(network, 'starknet_getBlockWithTxs', [{ block_number: n }])).result;
        // Skip bots: an account that sends several transactions per block moves its nonce
        // between our nonce read and the estimate, which the node rejects as a stale nonce.
        const v3 = block.transactions.filter((t: { type: string; version: string }) => t.type === 'INVOKE' && t.version === '0x3');
        const perSender = new Map<string, number>();
        for (const t of v3) perSender.set(t.sender_address, (perSender.get(t.sender_address) ?? 0) + 1);
        invoke = v3.find((t: { sender_address: string }) => perSender.get(t.sender_address) === 1);
    }
    if (!invoke) throw new Error('No v3 invoke from a one-transaction sender in the last 20 blocks.');
    const classHash = (await rpc(network, 'starknet_getClassHashAt', ['latest', STRK_TOKEN_ADDRESS])).result;
    return { blockNumber: block.block_number as number, invoke, classHash: classHash as string };
}

const zeroBounds = {
    l1_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
    l1_data_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
    l2_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
};

// Errors that would mean the registry is wrong: method missing or params malformed.
const REGISTRY_ERRORS = new Set([-32601, -32602]);

describe.skipIf(!live).each<Network>(['testnet', 'mainnet'])('Starknet registry against live RPC (%s)', (network) => {
    it('serves the spec version the registry follows', async () => {
        expect((await rpc(network, 'starknet_specVersion', [])).result).toBe(STARKNET_SPEC_VERSION);
    }, 30000);

    it('accepts every read, trace and executables method with registry-shaped params', async () => {
        const f = await fixtures(network);
        // An empty multicall from a real account: valid calldata for any account's __execute__.
        // The nonce is read just before each use: the account may be a busy bot whose nonce moves during the run.
        const unsigned = async () => ({
            type: 'INVOKE',
            version: '0x3',
            sender_address: f.invoke.sender_address,
            calldata: ['0x0'],
            signature: [],
            // Pre-confirmed nonce: the node checks the nonce against pre-confirmed state (see STARKNET_SIMULATION_BLOCK).
            nonce: (await rpc(network, 'starknet_getNonce', ['pre_confirmed', f.invoke.sender_address])).result,
            resource_bounds: zeroBounds,
            tip: '0x0',
            paymaster_data: [],
            account_deployment_data: [],
            nonce_data_availability_mode: 'L1',
            fee_data_availability_mode: 'L1',
        });
        const params: Record<string, unknown[] | (() => Promise<unknown[]>)> = {
            starknet_getBlockWithTxHashes: ['latest'],
            starknet_getBlockWithTxs: [{ block_number: f.blockNumber }],
            starknet_getBlockWithReceipts: [{ block_number: f.blockNumber }],
            starknet_getBlockTransactionCount: ['latest'],
            starknet_getStateUpdate: [{ block_number: f.blockNumber }],
            starknet_getTransactionByHash: [f.invoke.transaction_hash],
            starknet_getTransactionByBlockIdAndIndex: [{ block_number: f.blockNumber }, 0],
            starknet_getTransactionReceipt: [f.invoke.transaction_hash],
            starknet_getTransactionStatus: [f.invoke.transaction_hash],
            starknet_call: [
                {
                    contract_address: STRK_TOKEN_ADDRESS,
                    entry_point_selector: '0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e',
                    calldata: [f.invoke.sender_address],
                },
                'latest',
            ],
            starknet_getStorageAt: [STRK_TOKEN_ADDRESS, '0x0', 'latest'],
            starknet_getNonce: ['latest', f.invoke.sender_address],
            starknet_getClassHashAt: ['latest', STRK_TOKEN_ADDRESS],
            starknet_getClassAt: ['latest', STRK_TOKEN_ADDRESS],
            starknet_getClass: ['latest', f.classHash],
            starknet_getEvents: [{ from_block: { block_number: f.blockNumber }, to_block: { block_number: f.blockNumber }, keys: [], chunk_size: 5 }],
            starknet_estimateFee: async () => [[await unsigned()], ['SKIP_VALIDATE'], 'pre_confirmed'],
            starknet_estimateMessageFee: [
                { from_address: '0x0000000000000000000000000000000000000001', to_address: STRK_TOKEN_ADDRESS, entry_point_selector: '0x1', payload: [] },
                'latest',
            ],
            starknet_getMessagesStatus: [`0x${'0'.repeat(63)}1`],
            starknet_getStorageProof: ['latest', [], [STRK_TOKEN_ADDRESS], []],
            starknet_traceTransaction: [f.invoke.transaction_hash],
            starknet_simulateTransactions: async () => ['pre_confirmed', [await unsigned()], ['SKIP_VALIDATE', 'SKIP_FEE_CHARGE']],
            starknet_traceBlockTransactions: [{ block_number: f.blockNumber }],
            starknet_getCompiledCasm: [f.classHash],
        };

        const outcomes: Record<string, string> = {};
        for (const method of STARKNET_METHODS.filter((m) => m.readOnly)) {
            const given = params[method.name] ?? method.template;
            // Public endpoints rate-limit bursts; pace the calls.
            await new Promise((r) => setTimeout(r, 400));
            try {
                const p = typeof given === 'function' ? await given() : given;
                const { result } = await rpc(network, method.name, p);
                outcomes[method.name] = result === undefined ? 'no result' : 'ok';
            } catch (err) {
                const code = err instanceof SuiRpcError ? err.rpcCode : undefined;
                // A real protocol error (not found, execution failed, provider limit) is a valid answer;
                // method-not-found or invalid-params would mean the registry is wrong.
                outcomes[method.name] = code !== undefined && !REGISTRY_ERRORS.has(code) ? `rpc error ${code}` : `FAILED: ${(err as Error).message}`;
            }
        }
        // The inputs above are real except for two made-up ones, which must get a protocol answer:
        // an invented L1 message (contract error 40) and an unknown L1 hash (not found 29).
        expect(outcomes).toEqual({
            ...Object.fromEntries(STARKNET_METHODS.filter((m) => m.readOnly).map((m) => [m.name, 'ok'])),
            starknet_estimateMessageFee: 'rpc error 40',
            starknet_getMessagesStatus: 'rpc error 29',
        });
    }, 180000);

    it('resolves an address in the explorer even though it is not a transaction hash', async () => {
        expect(await resolveStarknetQuery(network, STRK_TOKEN_ADDRESS)).toEqual({ kind: 'address', id: STRK_TOKEN_ADDRESS });
    }, 60000);
});
