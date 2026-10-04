import type { AssertionResult, ChainId, Network, RequestItem } from '../types';
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

/**
 * The collection file `txio run` reads. RPC requests only: transactions are not
 * expressible there yet, so their names come back in `skipped` for the caller
 * to show instead of silently dropping them.
 */
export const toCliCollection = (
    name: string,
    requests: RequestItem[]
): { file: { name: string; requests: { name: string; chain: string; method: string; params: unknown }[] }; skipped: string[] } => {
    const file = { name, requests: [] as { name: string; chain: string; method: string; params: unknown }[] };
    const skipped: string[] = [];
    for (const request of requests) {
        if (request.type !== RequestType.RPC || !request.rpcParams?.method) {
            skipped.push(request.name);
            continue;
        }
        file.requests.push({
            name: request.name,
            chain: requestChain(request),
            method: request.rpcParams.method,
            params: request.rpcParams.params ?? []
        });
    }
    return { file, skipped };
};

export const isTransactionRequest = (request: RequestItem): boolean => request.type === RequestType.TRANSACTION;
