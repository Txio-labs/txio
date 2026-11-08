import type { Assertion, AssertionResult, ChainId, Network, RequestItem } from '../types';
import { RequestType } from '../types';

/**
 * Collection Runner engine: which (request, network) cells to run, how they
 * are scheduled, and the structured report a CI job can consume. Pure logic —
 * the component supplies the executor that talks to a chain.
 */

export type RunMode = 'sequential' | 'parallel';

export interface RunConfig {
    mode: RunMode;
    /** Maximum cells in flight when mode is 'parallel'. Ignored for sequential runs. */
    concurrency: number;
    /** Networks to run the whole collection against; one entry reproduces the classic single-network run. */
    networks: Network[];
}

export const MIN_CONCURRENCY = 2;
export const MAX_CONCURRENCY = 8;
export const DEFAULT_CONCURRENCY = 4;

export type CellStatus = 'pending' | 'running' | 'pass' | 'fail' | 'error' | 'skipped';

export interface PlannedCell {
    /** Stable position of the request in the collection. */
    requestIndex: number;
    request: RequestItem;
    network: Network;
    /** Set when the cell will not run, with the reason shown in the report. */
    skipReason?: string;
}

export interface RunCellResult {
    requestIndex: number;
    requestId: string;
    requestName: string;
    chain: ChainId;
    network: Network;
    status: CellStatus;
    durationMs: number;
    httpStatus?: number;
    assertions: { name: string; passed: boolean; message?: string }[];
    /** JSON-RPC style: -32000 upstream unreachable, -32001 name resolution failed, -32002 internal. */
    error?: { code: number; message: string };
    skipReason?: string;
    /** Runner cells are dry runs: nothing is signed or broadcast. */
    simulated: true;
}

export interface RunReport {
    schema: 'txio.run/v1';
    startedAt: string;
    finishedAt: string;
    config: RunConfig;
    collection: { id?: string; name: string };
    totals: { pass: number; fail: number; error: number; skipped: number; cells: number };
    results: RunCellResult[];
}

export const requestChain = (request: RequestItem): ChainId => request.rpcParams?.chain ?? 'sui';

export const clampConcurrency = (value: number): number =>
    Math.min(MAX_CONCURRENCY, Math.max(MIN_CONCURRENCY, Math.round(Number.isFinite(value) ? value : DEFAULT_CONCURRENCY)));

/**
 * Cells in request order, then network order. An EVM request targets a chain
 * id rather than a network tier, so it runs once (on the first selected
 * network) and is reported as skipped on the rest instead of being run again
 * with an identical result.
 */
export const planCells = (requests: RequestItem[], networks: Network[]): PlannedCell[] => {
    const cells: PlannedCell[] = [];
    requests.forEach((request, requestIndex) => {
        networks.forEach((network, networkIndex) => {
            const cell: PlannedCell = { requestIndex, request, network };
            if (requestChain(request) === 'evm' && networkIndex > 0) {
                cell.skipReason = 'EVM requests target a chain id, not a network; already run on the first selected network';
            }
            cells.push(cell);
        });
    });
    return cells;
};

export interface CellOutcome {
    durationMs: number;
    httpStatus?: number;
    assertions: AssertionResult[];
    /** The request itself failed (transport or chain error), independent of assertions. */
    error?: { code: number; message: string };
}

export const skippedResult = (cell: PlannedCell): RunCellResult => ({
    requestIndex: cell.requestIndex,
    requestId: cell.request.id,
    requestName: cell.request.name,
    chain: requestChain(cell.request),
    network: cell.network,
    status: 'skipped',
    durationMs: 0,
    assertions: [],
    skipReason: cell.skipReason,
    simulated: true
});

export const outcomeToResult = (cell: PlannedCell, outcome: CellOutcome): RunCellResult => {
    const assertions = outcome.assertions.map((a) => ({
        name: `${a.target} ${a.operator}${a.expected !== undefined && a.expected !== '' ? ` ${a.expected}` : ''}`,
        passed: a.passed,
        message: a.message
    }));
    const status: CellStatus = outcome.error ? 'error' : assertions.some((a) => !a.passed) ? 'fail' : 'pass';
    return {
        requestIndex: cell.requestIndex,
        requestId: cell.request.id,
        requestName: cell.request.name,
        chain: requestChain(cell.request),
        network: cell.network,
        status,
        durationMs: outcome.durationMs,
        httpStatus: outcome.httpStatus,
        assertions,
        ...(outcome.error ? { error: outcome.error } : {}),
        simulated: true
    };
};

export interface RunHooks {
    onCellStart?: (cell: PlannedCell, index: number) => void;
    onCellDone?: (result: RunCellResult, index: number) => void;
    shouldAbort?: () => boolean;
}

/**
 * Runs cells with a sliding window: one at a time for 'sequential', up to
 * `concurrency` for 'parallel'. Cells already started are always allowed to
 * finish; once `shouldAbort()` is true no new cell starts. Results come back
 * in plan order regardless of completion order, and cells that never started
 * are simply absent from the returned array's `undefined` slots.
 */
export const runCells = async (
    cells: PlannedCell[],
    execute: (cell: PlannedCell) => Promise<CellOutcome>,
    config: Pick<RunConfig, 'mode' | 'concurrency'>,
    hooks: RunHooks = {}
): Promise<(RunCellResult | undefined)[]> => {
    const results: (RunCellResult | undefined)[] = new Array(cells.length).fill(undefined);
    const width = config.mode === 'parallel' ? clampConcurrency(config.concurrency) : 1;
    let next = 0;

    const worker = async () => {
        while (next < cells.length) {
            if (hooks.shouldAbort?.()) return;
            const index = next++;
            const cell = cells[index];

            if (cell.skipReason) {
                results[index] = skippedResult(cell);
                hooks.onCellDone?.(results[index]!, index);
                continue;
            }

            hooks.onCellStart?.(cell, index);
            let outcome: CellOutcome;
            try {
                outcome = await execute(cell);
            } catch (error) {
                outcome = {
                    durationMs: 0,
                    assertions: [],
                    error: { code: -32002, message: error instanceof Error ? error.message : 'Runner failed' }
                };
            }
            results[index] = outcomeToResult(cell, outcome);
            hooks.onCellDone?.(results[index]!, index);
        }
    };

    await Promise.all(Array.from({ length: Math.min(width, Math.max(cells.length, 1)) }, worker));
    return results;
};

export const buildReport = (params: {
    startedAt: Date;
    finishedAt: Date;
    config: RunConfig;
    collection: { id?: string; name: string };
    results: (RunCellResult | undefined)[];
}): RunReport => {
    const results = params.results.filter((r): r is RunCellResult => Boolean(r));
    const count = (status: CellStatus) => results.filter((r) => r.status === status).length;
    return {
        schema: 'txio.run/v1',
        startedAt: params.startedAt.toISOString(),
        finishedAt: params.finishedAt.toISOString(),
        config: { ...params.config, concurrency: params.config.mode === 'parallel' ? clampConcurrency(params.config.concurrency) : 1 },
        collection: params.collection,
        totals: { pass: count('pass'), fail: count('fail'), error: count('error'), skipped: count('skipped'), cells: results.length },
        results
    };
};

/** Exit status a CI job should use: 0 all good, 1 any assertion failure or request error. */
export const reportExitCode = (report: RunReport): 0 | 1 => (report.totals.fail + report.totals.error > 0 ? 1 : 0);

const cell = (value: string) => value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

/** Human/CI-log friendly summary: failures first, then the full table. */
export const reportToMarkdown = (report: RunReport): string => {
    const { totals } = report;
    const lines: string[] = [
        `# Collection run: ${report.collection.name}`,
        '',
        `- Schema: \`${report.schema}\``,
        `- Started: ${report.startedAt}`,
        `- Finished: ${report.finishedAt}`,
        `- Mode: ${report.config.mode}${report.config.mode === 'parallel' ? ` (concurrency ${report.config.concurrency})` : ''}`,
        `- Networks: ${report.config.networks.join(', ')}`,
        `- Dry runs only: nothing was signed or broadcast`,
        '',
        `**${totals.pass} passed, ${totals.fail} failed, ${totals.error} errored, ${totals.skipped} skipped** of ${totals.cells} cells`,
        ''
    ];

    const failing = report.results.filter((r) => r.status === 'fail' || r.status === 'error');
    if (failing.length > 0) {
        lines.push('## Failures', '');
        for (const r of failing) {
            lines.push(`### ${r.requestName} on ${r.network} (${r.chain})`);
            if (r.error) lines.push(`- Error ${r.error.code}: ${r.error.message}`);
            for (const a of r.assertions.filter((x) => !x.passed)) lines.push(`- Assertion failed: ${a.name}${a.message ? ` (${a.message})` : ''}`);
            lines.push('');
        }
    }

    lines.push('## All cells', '', '| # | Request | Chain | Network | Status | Time | Detail |', '|---|---|---|---|---|---|---|');
    for (const r of report.results) {
        const detail = r.skipReason ?? r.error?.message ?? (r.assertions.length ? `${r.assertions.filter((a) => a.passed).length}/${r.assertions.length} assertions` : '');
        lines.push(`| ${r.requestIndex + 1} | ${cell(r.requestName)} | ${r.chain} | ${r.network} | ${r.status} | ${r.durationMs}ms | ${cell(detail)} |`);
    }
    return lines.join('\n') + '\n';
};

/** JSON-RPC style code for a failed cell. */
export const errorCodeFor = (error: unknown): number => {
    const code = (error as { code?: unknown } | null)?.code;
    if (code === -32001) return -32001;
    const status = (error as { status?: unknown } | null)?.status;
    if (typeof status === 'number' && (status === 0 || status >= 500)) return -32000;
    if (error instanceof TypeError) return -32000; // fetch could not reach the endpoint
    return -32002;
};

/** One check in a `txio run` collection file (see the txio-cli README). */
export type CliExpectation =
    | { contains: string }
    | { path: string; equals: unknown }
    | { status: 'success' | 'failure' }
    | { gasUsed: { eq?: string; gte?: string; lte?: string } }
    | { balanceChange: { account: string; asset: string; direction?: 'in' | 'out' | 'none'; amount?: { eq: string } } }
    | { event: string };

export interface CliRequest {
    name: string;
    chain: string;
    kind?: 'simulate';
    method?: string;
    params?: unknown;
    tx?: Record<string, unknown>;
    expect?: CliExpectation[];
}

export interface CliCollectionExport {
    file: { name: string; requests: CliRequest[] };
    /** Requests left out, as "name: reason". */
    skipped: string[];
    /** Checks the CLI cannot express, as "request: check", left out of exported requests. */
    dropped: string[];
}

/** The CLI's chain names. */
const CLI_CHAIN: Record<ChainId, string> = { sui: 'sui', evm: 'eth', solana: 'solana', aptos: 'aptos', stellar: 'soroban' };
/** The CLI's `eth` adapter speaks to Ethereum mainnet or Sepolia (by --network), nothing else. */
const CLI_EVM_CHAIN_IDS = new Set([1, 11155111]);
const CLI_APTOS_ARG_TYPES = new Set(['u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'bool', 'address', 'object', 'string', 'vector<u8>', 'json']);

const isUint = (v: string) => /^\d+$/.test(v);
const isDecimal = (v: string) => /^\d+(\.\d+)?$/.test(v) || /^\.\d+$/.test(v);

/** A typed form value as the JSON the RPC result would hold: `7` → 7, `true` → true, `"x"` → "x", other text stays text. */
const jsonish = (text: string): unknown => {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

/** Whole units → base units, exactly; null when it has more decimals than the unit allows. */
const toBaseUnits = (amount: string, decimals: number): string | null => {
    const value = amount.trim();
    if (!isDecimal(value)) return null;
    const [whole, fraction = ''] = value.split('.');
    if (fraction.length > decimals) return null;
    return BigInt(`${whole || '0'}${fraction.padEnd(decimals, '0')}`).toString();
};

/** The `tx` object of a simulate cell, or why the CLI cannot dry-run this request. */
const cliTx = (request: RequestItem, chain: ChainId, sender: string | undefined): { tx: Record<string, unknown> } | { reason: string } => {
    if (chain === 'sui' || chain === 'stellar') return { reason: `the CLI cannot simulate ${chain === 'sui' ? 'Sui' : 'Soroban'} transactions yet` };

    if (chain === 'evm') {
        const p = request.evmTxParams;
        if (!p) return { reason: 'no EVM transaction' };
        if (p.deploy) return { reason: 'contract deployment is not available in the CLI' };
        if (!CLI_EVM_CHAIN_IDS.has(p.chainId)) return { reason: `the CLI targets Ethereum mainnet or Sepolia only (chain ${p.chainId})` };
        const tx: Record<string, unknown> = { to: p.to.trim() };
        if (p.value.trim() && p.value.trim() !== '0') tx.value = p.value.trim();
        if (p.functionSignature.trim()) {
            const args: string[] = [];
            for (const [i, arg] of p.args.entries()) {
                const decimals = p.argDecimals?.[i];
                if (!decimals) {
                    args.push(arg.trim());
                    continue;
                }
                const scaled = toBaseUnits(arg, decimals);
                if (scaled === null) return { reason: `argument ${i + 1} ("${arg}") is not a decimal with at most ${decimals} places` };
                args.push(scaled);
            }
            tx.sig = p.functionSignature.trim();
            tx.args = args;
        } else if (p.data.trim() && p.data.trim() !== '0x') {
            tx.data = p.data.trim();
        }
        if (sender) tx.from = sender;
        return { tx };
    }

    if (chain === 'aptos') {
        const p = request.aptosTxParams;
        if (!p) return { reason: 'no Aptos transaction' };
        if (!sender) return { reason: 'link an Aptos wallet: the CLI needs a sender account' };
        const unsupported = p.arguments.find((a) => !CLI_APTOS_ARG_TYPES.has(a.type));
        if (unsupported) return { reason: `the CLI does not take ${unsupported.type} arguments` };
        const tx: Record<string, unknown> = {
            function: `${p.moduleAddress.trim()}::${p.module.trim()}::${p.function.trim()}`,
            sender,
            args: p.arguments.map((a) => `${a.type}:${a.value}`)
        };
        if (p.typeArguments.length > 0) tx.typeArgs = p.typeArguments;
        if (p.maxGasAmount && isUint(p.maxGasAmount.trim())) tx.maxGas = Number(p.maxGasAmount.trim());
        if (p.gasUnitPrice && isUint(p.gasUnitPrice.trim())) tx.gasPrice = Number(p.gasUnitPrice.trim());
        return { tx };
    }

    const p = request.solanaTxParams;
    if (!p) return { reason: 'no Solana instruction' };
    if (!sender) return { reason: 'link a Solana wallet: the CLI needs a fee payer' };
    const tx: Record<string, unknown> = {
        program: p.programId.trim(),
        accounts: p.accounts.map((a) => `${a.pubkey.trim()}${a.isSigner ? ':s' : ''}${a.isWritable ? ':w' : ''}`),
        payer: sender
    };
    if (p.data) tx.data = p.dataEncoding === 'hex' ? p.data.trim() : `${p.dataEncoding}:${p.data}`;
    return { tx };
};

/** The CLI form of one app check, or null when the CLI has no equivalent. */
const cliExpectation = (a: Assertion, simulate: boolean): CliExpectation | null => {
    const value = (a.value ?? '').trim();
    const key = `${a.category}:${a.target}`;
    if (!simulate) {
        if (key !== 'response:json_path' || a.operator !== 'equals') return null;
        const sep = value.indexOf('::');
        const path = (sep === -1 ? value : value.slice(0, sep)).trim();
        if (!path || sep === -1 || /[[\]]/.test(path)) return null;
        return { path, equals: jsonish(value.slice(sep + 2).trim()) };
    }
    switch (key) {
        case 'transaction:tx_status':
            return a.operator === 'equals' && (value === 'success' || value === 'failure') ? { status: value } : null;
        case 'transaction:gas_used': {
            if (!isUint(value)) return null;
            const n = BigInt(value);
            if (a.operator === 'equals') return { gasUsed: { eq: n.toString() } };
            if (a.operator === 'less_than') return n > BigInt(0) ? { gasUsed: { lte: (n - BigInt(1)).toString() } } : null;
            if (a.operator === 'greater_than') return { gasUsed: { gte: (n + BigInt(1)).toString() } };
            return null;
        }
        case 'transaction:balance_change': {
            if (a.operator !== 'equals') return null;
            const sep = value.lastIndexOf('::');
            if (sep === -1) return null;
            const subject = value.slice(0, sep).trim();
            const expected = value.slice(sep + 2).trim();
            const at = subject.indexOf('@');
            const asset = at === -1 ? '' : subject.slice(0, at).trim();
            const account = at === -1 ? '' : subject.slice(at + 1).trim();
            const negative = expected.startsWith('-');
            const magnitude = negative ? expected.slice(1) : expected;
            if (!asset || !account || !isDecimal(magnitude)) return null;
            if (/^0*\.?0*$/.test(magnitude)) return { balanceChange: { account, asset, direction: 'none' } };
            return { balanceChange: { account, asset, direction: negative ? 'out' : 'in', amount: { eq: magnitude } } };
        }
        case 'event:event_type':
            return a.operator === 'contains' && value ? { event: value } : null;
        default:
            return null;
    }
};

/**
 * The collection file `txio run` reads: RPC requests as calls, and EVM, Aptos
 * and Solana transactions as dry runs (`"kind": "simulate"`). `senders` holds
 * the linked wallet address per chain, which the CLI needs as the Aptos
 * sender and the Solana fee payer. Requests and checks the CLI cannot express
 * come back in `skipped` and `dropped` for the caller to show instead of
 * silently disappearing.
 */
export const toCliCollection = (
    name: string,
    requests: RequestItem[],
    senders: Partial<Record<ChainId, string>> = {}
): CliCollectionExport => {
    const out: CliCollectionExport = { file: { name, requests: [] }, skipped: [], dropped: [] };
    for (const request of requests) {
        const chain = requestChain(request);
        const simulate = request.type === RequestType.TRANSACTION;
        let entry: CliRequest;
        if (simulate) {
            const built = cliTx(request, chain, senders[chain]);
            if ('reason' in built) {
                out.skipped.push(`${request.name}: ${built.reason}`);
                continue;
            }
            entry = { name: request.name, chain: CLI_CHAIN[chain], kind: 'simulate', tx: built.tx };
        } else {
            if (request.type !== RequestType.RPC || !request.rpcParams?.method) {
                out.skipped.push(`${request.name}: no RPC method`);
                continue;
            }
            const evmChainId = request.rpcParams.evmChainId;
            if (chain === 'evm' && evmChainId !== undefined && !CLI_EVM_CHAIN_IDS.has(evmChainId)) {
                out.skipped.push(`${request.name}: the CLI targets Ethereum mainnet or Sepolia only (chain ${evmChainId})`);
                continue;
            }
            entry = { name: request.name, chain: CLI_CHAIN[chain], method: request.rpcParams.method, params: request.rpcParams.params ?? [] };
        }
        const expect: CliExpectation[] = [];
        for (const assertion of (request.tests ?? []).filter((t) => t.enabled)) {
            const converted = cliExpectation(assertion, simulate);
            if (converted) expect.push(converted);
            else out.dropped.push(`${request.name}: ${assertion.target} ${assertion.operator}${assertion.value ? ` ${assertion.value}` : ''}`);
        }
        if (expect.length > 0) entry.expect = expect;
        out.file.requests.push(entry);
    }
    return out;
};

export const isTransactionRequest = (request: RequestItem): boolean => request.type === RequestType.TRANSACTION;
