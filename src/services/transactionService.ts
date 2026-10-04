import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { ChainId, EvmTxParams, Network, RequestItem, RequestType, StellarTxParams, SolanaTxParams } from '../types';
import type { ConnectedWallet, WalletChainFamily } from '@/wallet/types';
import type { ChainAdapter, TxContext, TxResult } from './chainAdapter';
import { suiAdapter } from './adapters/suiAdapter';
import { evmAdapter, DEFAULT_EVM_TX, getEvmTxChain, checkEvmArg, coerceEvmArgs, buildEvmCalldata, toJsonSafe } from './adapters/evmAdapter';
import { solanaAdapter, DEFAULT_SOLANA_TX } from './adapters/solanaAdapter';
import { stellarAdapter, DEFAULT_STELLAR_TX, toStellarScVal } from './adapters/stellarAdapter';
import { aptosAdapter, DEFAULT_APTOS_TX } from './adapters/aptosAdapter';
import { resolveRequestNames } from './nameResolution';

/**
 * One entry point for building, simulating and executing transactions on
 * every supported chain. A TRANSACTION request names its chain in
 * `rpcParams.chain` and carries that chain's native params; this module
 * dispatches to the chain's `ChainAdapter` (see `./chainAdapter.ts` and
 * `./adapters/`) so the UI never branches on chain for execution — each
 * adapter owns its own transaction construction, simulation and signing
 * internally, using that chain's own SDK and execution model.
 */

export type { TxResult, TxContext, DescribedTransaction, TxErrorCode } from './chainAdapter';
export { ChainExecutionError } from './chainAdapter';

// Re-exported for existing call sites — these were previously defined here
// and now live in their chain's adapter module.
export { DEFAULT_EVM_TX, getEvmTxChain, checkEvmArg, coerceEvmArgs, buildEvmCalldata, toJsonSafe };
export { DEFAULT_SOLANA_TX };
export { DEFAULT_STELLAR_TX, toStellarScVal };
export { DEFAULT_APTOS_TX };

/** Every chain's adapter, keyed by ChainId — the registry the dispatcher below looks up. */
const ADAPTERS: Record<ChainId, ChainAdapter> = {
    sui: suiAdapter,
    evm: evmAdapter,
    solana: solanaAdapter,
    stellar: stellarAdapter,
    aptos: aptosAdapter
};

/** The adapter for a given chain — throws rather than returning undefined for an unregistered chain. */
export const getAdapter = (chain: ChainId): ChainAdapter => {
    const adapter = ADAPTERS[chain];
    if (!adapter) throw new Error(`No chain adapter registered for "${chain}".`);
    return adapter;
};

export const TX_CHAIN_LABELS: Record<ChainId, string> = {
    sui: suiAdapter.label,
    evm: evmAdapter.label,
    solana: solanaAdapter.label,
    stellar: stellarAdapter.label,
    aptos: aptosAdapter.label
};

export const getTxChain = (request: RequestItem): ChainId => request.rpcParams?.chain ?? 'sui';

/**
 * The chain-native params for a TRANSACTION request, whichever of
 * moveParams/evmTxParams/solanaTxParams/stellarTxParams applies — this is
 * what a saved History entry needs to actually replay/redisplay a
 * transaction instead of just recording that one ran. Undefined for RPC
 * requests, which already have their own method/params in history.
 */
export const getTxParamsForHistory = (request: RequestItem): unknown => {
    if (request.type !== RequestType.TRANSACTION) return undefined;
    switch (getTxChain(request)) {
        case 'sui':
            return request.moveParams;
        case 'evm':
            return request.evmTxParams;
        case 'solana':
            return request.solanaTxParams;
        case 'stellar':
            return request.stellarTxParams;
        case 'aptos':
            return request.aptosTxParams;
    }
};

/** Wallet family that can sign for each chain. */
export const walletFamilyForChain = (chain: ChainId): WalletChainFamily => chain;

/** Switches a request to `chain`, seeding that chain's params if missing. */
export const withTxChain = (request: RequestItem, chain: ChainId): RequestItem => ({
    ...request,
    rpcParams: { ...request.rpcParams, chain },
    moveParams: request.moveParams ?? { ...DEFAULT_MOVE_CALL },
    ...(chain === 'evm' && !request.evmTxParams ? { evmTxParams: { ...DEFAULT_EVM_TX } } : {}),
    ...(chain === 'solana' && !request.solanaTxParams ? { solanaTxParams: { ...DEFAULT_SOLANA_TX } } : {}),
    ...(chain === 'stellar' && !request.stellarTxParams ? { stellarTxParams: { ...DEFAULT_STELLAR_TX } } : {}),
    ...(chain === 'aptos' && !request.aptosTxParams ? { aptosTxParams: { ...DEFAULT_APTOS_TX } } : {})
});

// ---------------------------------------------------------------------------
// Validation, description & dispatch
// ---------------------------------------------------------------------------

/** Returns a user-facing problem with the request, or null when it's runnable. */
export const validateTransaction = (request: RequestItem): string | null =>
    getAdapter(getTxChain(request)).validate(request);

/**
 * The single raw contract/module/program address a transaction targets, for
 * verification-badge lookups — narrower than `describeTransaction().target`,
 * which for Sui includes the module/function too.
 */
export const getTxTargetAddress = (request: RequestItem): string | null =>
    getAdapter(getTxChain(request)).targetAddress(request);

/** Human-readable summary for review screens and terminal logs. */
export const describeTransaction = (request: RequestItem) => getAdapter(getTxChain(request)).describe(request);

/** Whether executing this request spends real funds. */
export const isMainnetExecution = (request: RequestItem, network: Network): boolean =>
    getAdapter(getTxChain(request)).isMainnetExecution(request, network);

/** Block-explorer link for a transaction on any supported chain. */
export const txExplorerUrl = (chain: ChainId, network: Network, hash: string, evmChainId?: number): string | undefined => {
    const fauxRequest = evmChainId ? ({ evmTxParams: { chainId: evmChainId } } as RequestItem) : undefined;
    return getAdapter(chain).explorerUrl(network, hash, fauxRequest);
};

/** The connected wallet's address when it can sign for this request's chain. */
export const signerAddressFor = (request: RequestItem, wallet: ConnectedWallet | null): string | null =>
    wallet && wallet.family === walletFamilyForChain(getTxChain(request)) ? wallet.address : null;

/** Runs the transaction against current chain state without signing it. */
export const simulateTransaction = async (request: RequestItem, ctx: TxContext): Promise<TxResult> => {
    const adapter = getAdapter(getTxChain(request));
    // Names (ENS, Aptos Names, federation) become addresses before validation
    // and before anything is sent. A name that cannot be resolved stops here.
    const { request: resolved, resolutions } = await resolveRequestNames(request, ctx.network, getTxChain(request));
    const problem = adapter.validate(resolved);
    if (problem) throw new Error(problem);
    const result = await adapter.simulate(resolved, ctx);
    return resolutions.length > 0 ? { ...result, resolvedNames: resolutions } : result;
};

/** Signs with the connected wallet and submits the transaction on-chain. */
export const executeTransaction = async (request: RequestItem, ctx: TxContext): Promise<TxResult> => {
    const adapter = getAdapter(getTxChain(request));
    const { request: resolved, resolutions } = await resolveRequestNames(request, ctx.network, getTxChain(request));
    const problem = adapter.validate(resolved);
    if (problem) throw new Error(problem);
    const result = await adapter.execute(resolved, ctx);
    return resolutions.length > 0 ? { ...result, resolvedNames: resolutions } : result;
};

// ---------------------------------------------------------------------------
// Pre-trade simulation summary
// ---------------------------------------------------------------------------

export interface SimulationBalanceChange {
    asset: string;
    amount: string;
    direction: 'in' | 'out';
    /** Account the change applies to, when the simulation reports more than the signer's own. */
    account?: string;
}

/**
 * Plain-language view of a simulation, layered on top of the raw `TxResult`.
 *
 * Optional sections follow one rule: `undefined` means the chain's native
 * simulation did not report that data, and the UI hides the section. An empty
 * array means the simulation reported it and there was nothing to list.
 * Nothing here is ever filled with a zero or a guess.
 */
export interface SimulationSummary {
    chain: ChainId;
    success: boolean;
    /** Value changes per asset; `undefined` when the chain's simulation does not report them. */
    balanceChanges?: SimulationBalanceChange[];
    /** Estimated network fee, formatted with its unit; null when the chain's simulation doesn't report one. */
    fee: string | null;
    /** Objects/accounts the call would touch, one short line each; empty when the chain doesn't report them. */
    touched: string[];
    /** Events/logs emitted during the simulated run; empty when the chain doesn't report them. */
    events: string[];
    /** State difference, one short line per change; `undefined` when the chain's simulation does not report it. */
    stateDiff?: string[];
    /** How each derived section was obtained, e.g. "simulated account states", "framework events". */
    sources: { balanceChanges?: string; events?: string; stateDiff?: string };
    warnings: string[];
    /** Names that were replaced by addresses before the simulation ran. */
    resolvedNames?: { name: string; address: string }[];
    /** The underlying TxResult.result, preserved for the raw/JSON view. */
    raw: unknown;
}

const MAX_UINT256 = (BigInt(2) ** BigInt(256) - BigInt(1)).toString();

/** ERC-20/721 `approve(address,uint256)` selector. */
const APPROVE_SELECTOR = '0x095ea7b3';
/** ERC-721/1155 `setApprovalForAll(address,bool)` selector. */
const SET_APPROVAL_FOR_ALL_SELECTOR = '0xa22cb465';

/** Flags an EVM request that grants a token spend approval, especially an unlimited one. */
const evmApprovalWarnings = (p: EvmTxParams): string[] => {
    const warnings: string[] = [];
    const signature = p.functionSignature.trim().toLowerCase();
    const isApprove = signature.startsWith('approve(') || p.data.trim().toLowerCase().startsWith(APPROVE_SELECTOR);
    const isApprovalForAll =
        signature.startsWith('setapprovalforall(') || p.data.trim().toLowerCase().startsWith(SET_APPROVAL_FOR_ALL_SELECTOR);

    if (isApprovalForAll) {
        warnings.push('Grants approval for ALL tokens in this contract, not a fixed amount — a common phishing pattern.');
    } else if (isApprove) {
        const amountArg = p.args[1]?.trim();
        if (amountArg === MAX_UINT256 || amountArg?.toLowerCase() === 'max' || amountArg?.toLowerCase() === 'unlimited') {
            warnings.push('Grants an unlimited spending approval — the spender can move any amount, at any time, until revoked.');
        } else {
            warnings.push('Grants a token spending approval to another address.');
        }
    }

    return warnings;
};

const MAX_LIST = 20;

/** Formats an integer amount string in base units as a decimal string with `decimals` places, trimming trailing zeros. */
const formatBaseUnits = (raw: string | number | bigint, decimals: number): string => {
    let value: bigint;
    try {
        value = BigInt(raw);
    } catch {
        return String(raw);
    }
    const negative = value < BigInt(0);
    const digits = (negative ? -value : value).toString().padStart(decimals + 1, '0');
    const whole = digits.slice(0, digits.length - decimals);
    const fraction = digits.slice(digits.length - decimals).replace(/0+$/, '');
    return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
};

const short = (value: string): string => (value.length > 24 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value);

const signedDelta = (delta: bigint, decimals: number): { amount: string; direction: 'in' | 'out' } => {
    const negative = delta < BigInt(0);
    return { amount: formatBaseUnits(negative ? -delta : delta, decimals), direction: negative ? 'out' : 'in' };
};

/** Solana: per-account deltas computed from the accounts the simulation returned versus their pre-state. */
interface SolanaBalanceDiffEntry {
    account: string;
    /** 'SOL' for lamports, otherwise the SPL token mint address. */
    asset: string;
    delta: string;
    decimals: number | null;
}

/** Soroban: token transfer events involving the simulated source account. */
interface StellarTransferEvent {
    contract: string;
    from: string;
    to: string;
    amount: string;
    asset?: string;
}

const APTOS_COIN_EVENT = /^0x0*1::coin::Coin(Deposit|Withdraw)$/;

const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

interface EvmSimLog {
    address: string;
    topics: string[];
    data: string;
}

/** Turns a raw TxResult into a plain-language balance-change/fee/touched/event/warning summary. */
export const summarizeSimulation = (
    request: RequestItem,
    txResult: TxResult
): SimulationSummary => {
    const chain = getTxChain(request);
    const success = txResult.status < 400;
    const warnings: string[] = chain === 'evm' && request.evmTxParams ? evmApprovalWarnings(request.evmTxParams) : [];
    const base = { chain, success, raw: txResult.result, ...(txResult.resolvedNames ? { resolvedNames: txResult.resolvedNames } : {}) };

    if (chain === 'sui') {
        const result = txResult.result as {
            balanceChanges?: { coinType: string; amount: string }[];
            objectChanges?: { type?: string; objectType?: string; objectId?: string; packageId?: string }[];
            events?: { type?: string }[];
            effects?: { gasUsed?: { computationCost: string; storageCost: string; storageRebate: string } };
        } | undefined;
        const balanceChanges: SimulationBalanceChange[] | undefined = result?.balanceChanges?.map((change) => {
            const negative = change.amount.trim().startsWith('-');
            return {
                asset: change.coinType,
                amount: negative ? change.amount.slice(1) : change.amount,
                direction: negative ? 'out' : 'in'
            };
        });
        const gas = result?.effects?.gasUsed;
        const fee = gas
            ? `${formatBaseUnits(BigInt(gas.computationCost) + BigInt(gas.storageCost) - BigInt(gas.storageRebate), 9)} SUI`
            : null;
        const touched = (result?.objectChanges ?? [])
            .slice(0, MAX_LIST)
            .map((c) => `${c.type ?? 'changed'} ${short(c.objectType ?? c.packageId ?? '')} ${short(c.objectId ?? '')}`.trim());
        const events = (result?.events ?? []).slice(0, MAX_LIST).map((e) => e.type ?? 'event');
        return {
            ...base,
            balanceChanges,
            fee,
            touched,
            events,
            sources: { balanceChanges: balanceChanges ? 'dry-run balance changes' : undefined },
            warnings
        };
    }

    if (chain === 'evm') {
        const p = request.evmTxParams;
        const result = txResult.result as {
            from?: string | null;
            gasEstimate?: string | number | null;
            logs?: EvmSimLog[];
            stateDiff?: { pre?: Record<string, EvmAccountState>; post?: Record<string, EvmAccountState> };
            simulationSource?: string;
        } | undefined;
        const net = p ? getEvmTxChain(p.chainId) : undefined;
        const native = net?.nativeCurrency.symbol ?? 'native';
        const sources: SimulationSummary['sources'] = {};
        let balanceChanges: SimulationBalanceChange[] | undefined;
        let stateDiff: string[] | undefined;

        // 1. A state diff, when the node's tracer reported one: exact native balance deltas.
        if (result?.stateDiff) {
            const { pre = {}, post = {} } = result.stateDiff;
            balanceChanges = [];
            stateDiff = [];
            for (const address of new Set([...Object.keys(pre), ...Object.keys(post)])) {
                const before = pre[address];
                const after = post[address];
                if (before?.balance !== undefined || after?.balance !== undefined) {
                    const delta = BigInt(after?.balance ?? before?.balance ?? '0') - BigInt(before?.balance ?? '0');
                    if (delta !== BigInt(0)) {
                        const { amount, direction } = signedDelta(delta, 18);
                        balanceChanges.push({ asset: native, amount, direction, account: address });
                        stateDiff.push(`${short(address)} balance ${direction === 'out' ? '-' : '+'}${amount} ${native}`);
                    }
                }
                if (before?.nonce !== undefined && after?.nonce !== undefined && before.nonce !== after.nonce) {
                    stateDiff.push(`${short(address)} nonce ${before.nonce} → ${after.nonce}`);
                }
                const slots = new Set([...Object.keys(before?.storage ?? {}), ...Object.keys(after?.storage ?? {})]);
                if (slots.size > 0) stateDiff.push(`${short(address)} ${slots.size} storage slot${slots.size === 1 ? '' : 's'} changed`);
            }
            sources.balanceChanges = 'state diff (prestate tracer)';
            sources.stateDiff = 'state diff (prestate tracer)';
        }

        // 2. ERC-20 Transfer logs involving the sender, when logs were reported.
        const from = (result?.from ?? '').toLowerCase();
        if (result?.logs && from) {
            const tokenChanges: SimulationBalanceChange[] = [];
            for (const log of result.logs) {
                if (log.topics.length !== 3 || log.topics[0].toLowerCase() !== ERC20_TRANSFER_TOPIC) continue;
                const sender = `0x${log.topics[1].slice(-40)}`.toLowerCase();
                const receiver = `0x${log.topics[2].slice(-40)}`.toLowerCase();
                if (sender !== from && receiver !== from) continue;
                let amount: string;
                try {
                    amount = BigInt(log.data).toString();
                } catch {
                    continue;
                }
                // ERC-7528: with traceTransfers, native ETH transfers are logged from this pseudo-address.
                const isNative = log.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
                // The state diff already gave exact native deltas; don't count them twice.
                if (isNative && result.stateDiff) continue;
                tokenChanges.push({
                    asset: isNative ? native : log.address,
                    amount: isNative ? formatBaseUnits(amount, 18) : amount,
                    direction: sender === from ? 'out' : 'in'
                });
            }
            if (tokenChanges.length > 0) {
                balanceChanges = [...(balanceChanges ?? []), ...tokenChanges];
                sources.balanceChanges = sources.balanceChanges ? `${sources.balanceChanges} + Transfer logs` : 'Transfer logs (base units)';
            }
        }

        // 3. Otherwise only what the request itself declares; labelled as such.
        if (!balanceChanges && p && p.value.trim() && p.value.trim() !== '0') {
            balanceChanges = [{ asset: native, amount: p.value.trim(), direction: 'out' }];
            sources.balanceChanges = 'transaction value (not a simulation output)';
        }

        const logs = result?.logs;
        const events = logs ? logs.slice(0, MAX_LIST).map((l) => `${short(l.address)} ${short(l.topics[0] ?? '')}`) : [];
        if (logs) sources.events = result?.simulationSource ?? 'simulated logs';

        // eth_call returns no logs or state diff, and the estimate is in gas
        // units — no gas price is fetched, so it can't be shown as a currency.
        const gas = result?.gasEstimate;
        const fee = gas !== undefined && gas !== null ? `~${gas} gas` : null;
        return { ...base, balanceChanges, fee, touched: [], events, stateDiff, sources, warnings };
    }

    if (chain === 'solana') {
        const result = txResult.result as {
            err?: unknown;
            logs?: string[] | null;
            unitsConsumed?: number | null;
            balanceDiff?: SolanaBalanceDiffEntry[];
        } | undefined;
        if (result?.err) {
            warnings.push(`Simulation failed: ${JSON.stringify(result.err)}`);
        }
        const fee = typeof result?.unitsConsumed === 'number' ? `${result.unitsConsumed} compute units` : null;
        const balanceChanges = result?.balanceDiff
            ?.filter((entry) => BigInt(entry.delta) !== BigInt(0))
            .map((entry): SimulationBalanceChange => {
                const { amount, direction } = signedDelta(BigInt(entry.delta), entry.decimals ?? 0);
                return { asset: entry.asset, amount, direction, account: entry.account };
            });
        return {
            ...base,
            balanceChanges,
            fee,
            touched: [],
            events: (result?.logs ?? []).slice(0, MAX_LIST),
            sources: {
                balanceChanges: balanceChanges ? 'simulated account states (SOL change includes the fee)' : undefined,
                events: result?.logs ? 'program logs' : undefined
            },
            warnings
        };
    }

    if (chain === 'aptos') {
        const result = txResult.result as {
            gas_used?: string;
            gas_unit_price?: string;
            events?: { type?: string; data?: { account?: string; amount?: string; coin_type?: string } }[];
            changes?: { type?: string; address?: string; data?: { type?: string } }[];
            vm_status?: string;
        } | undefined;
        if (!success) {
            warnings.push(`Simulation failed: ${result?.vm_status ?? 'this call would abort on-chain.'}`);
        }
        const fee =
            result?.gas_used && result.gas_unit_price
                ? `${formatBaseUnits(BigInt(result.gas_used) * BigInt(result.gas_unit_price), 8)} APT`
                : null;
        const touched = (result?.changes ?? [])
            .filter((c) => c.type === 'write_resource' || c.type === 'delete_resource')
            .slice(0, MAX_LIST)
            .map((c) => `${c.type === 'delete_resource' ? 'deleted' : 'wrote'} ${short(c.data?.type ?? '')} @ ${short(c.address ?? '')}`);
        const events = (result?.events ?? []).slice(0, MAX_LIST).map((e) => e.type ?? 'event');

        // Coin movements come only from the framework's CoinDeposit/CoinWithdraw
        // events (they carry account, coin type and amount). If none were
        // emitted the simulation says nothing about balances, so the section
        // is hidden rather than reported as "no change".
        const totals = new Map<string, bigint>();
        for (const event of result?.events ?? []) {
            const match = event.type ? APTOS_COIN_EVENT.exec(event.type) : null;
            const { account, amount, coin_type: coinType } = event.data ?? {};
            if (!match || !account || !amount || !coinType) continue;
            const key = `${account}|${coinType}`;
            totals.set(key, (totals.get(key) ?? BigInt(0)) + (match[1] === 'Deposit' ? BigInt(amount) : -BigInt(amount)));
        }
        const balanceChanges: SimulationBalanceChange[] | undefined =
            totals.size > 0
                ? [...totals.entries()]
                      .filter(([, delta]) => delta !== BigInt(0))
                      .map(([key, delta]) => {
                          const [account, coinType] = key.split('|');
                          // Decimals are only known for the native coin; other coins stay in base units.
                          const decimals = /^0x0*1::aptos_coin::AptosCoin$/.test(coinType) ? 8 : 0;
                          const { amount, direction } = signedDelta(delta, decimals);
                          return { asset: decimals === 8 ? 'APT' : coinType, amount, direction, account };
                      })
                : undefined;
        return {
            ...base,
            balanceChanges,
            fee,
            touched,
            events,
            sources: {
                balanceChanges: balanceChanges ? 'framework coin events (coins without known decimals shown in base units)' : undefined
            },
            warnings
        };
    }

    // stellar — a Soroban simulation returns a resource fee, a return value and
    // contract events. Token transfers come from `transfer` events involving the
    // source account; a failure is surfaced instead of a fabricated diff.
    if (!success) {
        warnings.push('Simulation failed — this call would revert on-chain.');
    }
    const stellar = txResult.result as { minResourceFee?: string; source?: string; transfers?: StellarTransferEvent[] } | undefined;
    const fee = stellar?.minResourceFee ? `${formatBaseUnits(stellar.minResourceFee, 7)} XLM` : null;
    const account = stellar?.source;
    const balanceChanges: SimulationBalanceChange[] | undefined =
        account && stellar?.transfers && stellar.transfers.length > 0
            ? stellar.transfers
                  .filter((t) => t.from === account || t.to === account)
                  .map((t) => ({
                      asset: t.asset ?? t.contract,
                      // Token decimals are not part of the event; the amount is in the token's base units.
                      amount: t.amount,
                      direction: t.from === account ? ('out' as const) : ('in' as const)
                  }))
            : undefined;
    return {
        ...base,
        balanceChanges: balanceChanges && balanceChanges.length > 0 ? balanceChanges : undefined,
        fee,
        touched: [],
        events: [],
        sources: { balanceChanges: balanceChanges && balanceChanges.length > 0 ? 'contract transfer events (token base units)' : undefined },
        warnings
    };
};

interface EvmAccountState {
    balance?: string;
    nonce?: number;
    storage?: Record<string, string>;
}
