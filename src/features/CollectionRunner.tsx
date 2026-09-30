
import React, { useState, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, XCircle, Clock, Square, Download, MinusCircle } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { useWallet } from '@/wallet';
import { CollectionNode, Network, RequestItem, RequestType, ALL_NETWORKS } from '../types';
import { executeChainRpc, simulateMoveCall } from '../services/suiService';
import { simulateTransaction } from '../services/transactionService';
import {
    DEFAULT_CONCURRENCY, MAX_CONCURRENCY, MIN_CONCURRENCY, buildReport, clampConcurrency, errorCodeFor, planCells, reportToMarkdown, requestChain, runCells, toCliCollection,
    type CellOutcome, type PlannedCell, type RunConfig, type RunMode, type RunReport, type RunCellResult
} from '@/lib/collectionRun';
import { evaluateAssertions } from '@/lib/assertionsEngine';
import { ensureTerminalOpen } from '@/lib/terminalLog';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

const resolveVariables = (raw: string, vars: { key: string; value: string }[]): string =>
    vars.reduce((str, v) => str.replaceAll(`{{${v.key}}}`, v.value), raw);

const resolveRequestVars = (request: RequestItem, vars: { key: string; value: string }[]): RequestItem => {
    if (!vars.length) return request;
    try {
        if (request.type === RequestType.RPC) {
            const raw = JSON.stringify(request.rpcParams.params);
            const resolved = resolveVariables(raw, vars);
            return {
                ...request,
                rpcParams: {
                    ...request.rpcParams,
                    method: resolveVariables(request.rpcParams.method, vars),
                    params: JSON.parse(resolved),
                },
            };
        }
        const mp = request.moveParams;
        return {
            ...request,
            moveParams: {
                ...mp,
                packageId: resolveVariables(mp.packageId, vars),
                module: resolveVariables(mp.module, vars),
                function: resolveVariables(mp.function, vars),
                typeArguments: mp.typeArguments.map((t: string) => resolveVariables(t, vars)),
                arguments: mp.arguments.map((a) => ({
                    ...a,
                    value: resolveVariables(String(a.value), vars),
                })),
            },
        };
    } catch {
        return request;
    }
};

const downloadText = (filename: string, text: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

const safeName = (name: string) => name.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'collection';

interface CollectionRunnerProps {
    collectionId?: string;
}

export const CollectionRunner: React.FC<CollectionRunnerProps> = ({ collectionId }) => {
    const { collections, currentWorkspaceId, network, envVariables } = useAppStore();
    const { linkedWallets } = useWallet();
    // Sui-specific: use the linked Sui wallet regardless of which chain's
    // wallet is currently the default signer.
    const connectedAddress = linkedWallets.sui?.address ?? null;
    const [isRunning, setIsRunning] = useState(false);
    const [mode, setMode] = useState<RunMode>('sequential');
    const [concurrency, setConcurrency] = useState(DEFAULT_CONCURRENCY);
    const [selectedNetworks, setSelectedNetworks] = useState<Network[]>([network]);
    const [results, setResults] = useState<Record<number, RunCellResult>>({});
    const [runningCells, setRunningCells] = useState<Set<number>>(new Set());
    const [report, setReport] = useState<RunReport | null>(null);
    const abortRef = useRef(false);

    // Filter collections by current workspace
    const workspaceCollections = useMemo(() => {
        return collections.filter(c => !c.workspaceId || c.workspaceId === currentWorkspaceId);
    }, [collections, currentWorkspaceId]);

    // Helper to find collection by ID recursively within filtered list
    const findCollection = (nodes: CollectionNode[], id: string): CollectionNode | null => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findCollection(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    // Flatten requests from collection hierarchy
    const getRequests = (node: CollectionNode): RequestItem[] => {
        let reqs: RequestItem[] = [];
        if (node.type === 'request' && node.requestData) {
            reqs.push(node.requestData);
        }
        if (node.children) {
            node.children.forEach(c => reqs = [...reqs, ...getRequests(c)]);
        }
        return reqs;
    };

    const targetCollection = collectionId ? findCollection(workspaceCollections, collectionId) : null;
    // Default to first collection if none specified
    const runSource = targetCollection || (!collectionId && workspaceCollections.length > 0 ? workspaceCollections[0] : null);

    const [requests, setRequests] = useState<RequestItem[]>(runSource ? getRequests(runSource) : []);
    const [prevRunSource, setPrevRunSource] = useState(runSource);

    // Re-initialize the run list whenever the targeted collection changes
    if (runSource !== prevRunSource) {
        setPrevRunSource(runSource);
        setRequests(runSource ? getRequests(runSource) : []);
        setResults({});
        setReport(null);
    }

    const config: RunConfig = { mode, concurrency: clampConcurrency(concurrency), networks: selectedNetworks };
    const plan = useMemo(() => planCells(requests, selectedNetworks), [requests, selectedNetworks]);
    const collectionName = targetCollection ? targetCollection.name : (workspaceCollections[0]?.name || 'Collection');
    const multiNetwork = selectedNetworks.length > 1;

    const executeCell = async (cell: PlannedCell): Promise<CellOutcome> => {
        const activeEnvVars = envVariables.filter(
            v => v.enabled && (!v.network || v.network === 'all' || v.network === cell.network)
        );
        const req = cell.request;
        const resolved = resolveRequestVars(req, activeEnvVars);
        const chain = requestChain(req);
        const startTime = performance.now();

        try {
            let result: unknown;
            let status: number;
            let duration: number;
            let sender: string | undefined;

            if (resolved.type === RequestType.TRANSACTION) {
                if (chain === 'sui') {
                    const { packageId, module, function: func, typeArguments, arguments: args } = resolved.moveParams;
                    sender = connectedAddress || ZERO_ADDRESS;
                    ({ result, status, duration } = await simulateMoveCall(cell.network, sender, packageId, module, func, typeArguments, args));
                } else {
                    const wallet = linkedWallets[chain] ?? null;
                    ({ result, status, duration } = await simulateTransaction(resolved, { network: cell.network, wallet }));
                }
            } else {
                ({ result, status, duration } = await executeChainRpc(
                    chain, cell.network, resolved.rpcParams.method, resolved.rpcParams.params, resolved.rpcParams.evmChainId
                ));
            }

            return {
                durationMs: duration,
                httpStatus: status,
                assertions: evaluateAssertions(req.tests, { requestType: resolved.type, httpStatus: status, duration, result, sender })
            };
        } catch (error) {
            const durationMs = Math.round(performance.now() - startTime);
            const message = error instanceof Error && error.message.trim() ? error.message : 'Request failed';
            const httpStatus = (error as { status?: number } | null)?.status ?? 0;
            return {
                durationMs,
                httpStatus,
                assertions: evaluateAssertions(req.tests, { requestType: resolved.type, httpStatus, duration: durationMs, error: message }),
                error: { code: errorCodeFor(error), message }
            };
        }
    };

    const handleRun = async () => {
        ensureTerminalOpen();
        abortRef.current = false;
        setIsRunning(true);
        setResults({});
        setReport(null);
        setRunningCells(new Set());
        const startedAt = new Date();
        const cells = plan; // snapshot: edits during a run do not shift indices

        const outcomes = await runCells(cells, executeCell, config, {
            shouldAbort: () => abortRef.current,
            onCellStart: (_cell, index) => setRunningCells((prev) => new Set(prev).add(index)),
            onCellDone: (result, index) => {
                setRunningCells((prev) => {
                    const next = new Set(prev);
                    next.delete(index);
                    return next;
                });
                setResults((prev) => ({ ...prev, [index]: result }));
            }
        });

        setReport(buildReport({
            startedAt,
            finishedAt: new Date(),
            config,
            collection: { id: collectionId, name: collectionName },
            results: outcomes
        }));
        setIsRunning(false);
        setRunningCells(new Set());
    };

    const handleStop = () => {
        abortRef.current = true;
    };

    const handleReset = () => {
        abortRef.current = true;
        setResults({});
        setReport(null);
        setRunningCells(new Set());
    };

    const toggleNetwork = (n: Network) =>
        setSelectedNetworks((prev) => {
            if (prev.includes(n)) return prev.length > 1 ? prev.filter((x) => x !== n) : prev;
            return ALL_NETWORKS.filter((x) => x === n || prev.includes(x));
        });

    const doneCount = Object.keys(results).length;
    const progress = plan.length ? (doneCount / plan.length) * 100 : 0;
    const passCount = Object.values(results).filter((r) => r.status === 'pass').length;
    const failedCount = Object.values(results).filter((r) => r.status === 'fail' || r.status === 'error').length;
    const skippedCount = Object.values(results).filter((r) => r.status === 'skipped').length;

    if (!targetCollection && !collectionId && workspaceCollections.length === 0) {
         return <div className="p-10 text-slate-500">No collections found in this workspace. Create one in the sidebar to start running.</div>;
    }

    const chipClass = (active: boolean) =>
        `px-2.5 py-1 rounded text-[11px] font-bold border transition-colors disabled:opacity-50 ${
            active
                ? 'bg-slate-900 dark:bg-white text-white dark:text-near-black border-transparent'
                : 'bg-transparent text-slate-500 border-slate-300 dark:border-white/10 hover:text-slate-700 dark:hover:text-slate-300'
        }`;

    return (
        <div className="h-full bg-white dark:bg-near-black flex flex-col font-sans">
             {/* Header */}
            <div className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-dark-indigo-glow/50 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                             <Play size={20} className="text-electric-violet"/> Collection Runner
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Executing sequence: <span className="text-slate-900 dark:text-white font-bold">{collectionName}</span></p>
                    </div>
                    <div className="flex gap-3">
                        {isRunning && (
                            <button onClick={handleStop} className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs font-bold rounded flex items-center gap-2 transition-colors border border-red-900/30">
                                <Square size={14}/> Stop
                            </button>
                        )}
                        <button onClick={handleReset} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded flex items-center gap-2 transition-colors">
                            <RotateCcw size={14}/> Reset
                        </button>
                        <button
                            onClick={handleRun}
                            disabled={isRunning || plan.length === 0}
                            className={`px-6 py-2 bg-slate-900 dark:bg-white hover:opacity-90 text-white dark:text-near-black text-xs font-bold rounded shadow-lg flex items-center gap-2 transition-all ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isRunning ? <Pause size={14}/> : <Play size={14}/>}
                            {isRunning ? 'Running...' : 'Run Collection'}
                        </button>
                    </div>
                </div>

                {/* Run options */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-5">
                    <div className="flex items-center gap-2" role="group" aria-label="Run mode">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mode</span>
                        {(['sequential', 'parallel'] as RunMode[]).map((m) => (
                            <button key={m} type="button" disabled={isRunning} onClick={() => setMode(m)} aria-pressed={mode === m} className={chipClass(mode === m)}>
                                {m === 'sequential' ? 'Sequential' : 'Parallel'}
                            </button>
                        ))}
                        {mode === 'parallel' && (
                            <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                Concurrency
                                <input
                                    type="number"
                                    min={MIN_CONCURRENCY}
                                    max={MAX_CONCURRENCY}
                                    value={concurrency}
                                    disabled={isRunning}
                                    onChange={(e) => setConcurrency(Number(e.target.value))}
                                    className="w-14 bg-white dark:bg-near-black border border-slate-300 dark:border-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-slate-700 dark:text-slate-200"
                                />
                            </label>
                        )}
                    </div>
                    <div className="flex items-center gap-2" role="group" aria-label="Networks">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Networks</span>
                        {ALL_NETWORKS.map((n) => (
                            <button key={n} type="button" disabled={isRunning} onClick={() => toggleNetwork(n)} aria-pressed={selectedNetworks.includes(n)} className={chipClass(selectedNetworks.includes(n))}>
                                {n}
                            </button>
                        ))}
                    </div>
                    <span className="text-[10px] text-slate-500">Dry runs only: nothing is signed or sent.</span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div
                        className="h-full bg-electric-violet transition-all duration-300 ease-out relative"
                        style={{ width: `${progress}%` }}
                    >
                         <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 animate-pulse"></div>
                    </div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>
                        {passCount} / {plan.length} Passed
                        {failedCount > 0 && <span className="text-red-400 ml-2">· {failedCount} Failed</span>}
                        {skippedCount > 0 && <span className="ml-2">· {skippedCount} Skipped</span>}
                    </span>
                    <span className="flex items-center gap-3">
                        {requests.length > 0 && (
                            <button
                                type="button"
                                title="A file for `txio run`, to run this collection from CI. Transactions are left out."
                                onClick={() => {
                                    const { file, skipped } = toCliCollection(collectionName, requests);
                                    downloadText(`${safeName(collectionName)}.txio.json`, JSON.stringify(file, null, 2), 'application/json');
                                    if (skipped.length > 0) {
                                        appStore.showToast(`Left out ${skipped.length} request${skipped.length === 1 ? '' : 's'} the CLI runner cannot run: ${skipped.slice(0, 3).join(', ')}${skipped.length > 3 ? '…' : ''}`, 'info');
                                    }
                                }}
                                className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-electric-violet"
                            >
                                <Download size={12}/> CLI file
                            </button>
                        )}
                        {report && (
                            <>
                                <button type="button" onClick={() => downloadText(`${safeName(collectionName)}-run.json`, JSON.stringify(report, null, 2), 'application/json')} className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-electric-violet">
                                    <Download size={12}/> JSON
                                </button>
                                <button type="button" onClick={() => downloadText(`${safeName(collectionName)}-run.md`, reportToMarkdown(report), 'text/markdown')} className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-electric-violet">
                                    <Download size={12}/> Markdown
                                </button>
                            </>
                        )}
                        <span>{Math.round(progress)}%</span>
                    </span>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="border border-slate-200 dark:border-white/5 rounded-xl bg-slate-50 dark:bg-dark-indigo-glow overflow-hidden shadow-xl">
                    <table className="w-full text-left">
                        <thead className="bg-slate-100 dark:bg-near-black text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200 dark:border-white/5">
                            <tr>
                                <th className="px-6 py-3 w-12">#</th>
                                <th className="px-6 py-3">Request Name</th>
                                {multiNetwork && <th className="px-6 py-3">Network</th>}
                                <th className="px-6 py-3">Method</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Tests</th>
                                <th className="px-6 py-3">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                            {plan.map((cell, i) => {
                                const r = results[i];
                                const req = cell.request;
                                const running = runningCells.has(i);
                                return (
                                    <tr key={i} className={`transition-colors ${running ? 'bg-electric-violet/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-600 font-mono text-xs">{cell.requestIndex + 1}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                            {req.name}
                                        </td>
                                        {multiNetwork && <td className="px-6 py-4 font-mono text-xs text-slate-500">{cell.network}</td>}
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{req.rpcParams?.method || req.txType || 'Transaction'}</td>
                                        <td className="px-6 py-4">
                                            {r?.status === 'error' ? (
                                                <span className="inline-flex items-center gap-1.5 text-red-400 text-xs font-bold bg-red-900/10 px-2 py-1 rounded border border-red-900/20" title={r.error?.message}>
                                                    <XCircle size={14}/> {r.error?.code ?? 'ERR'}
                                                </span>
                                            ) : r?.status === 'fail' ? (
                                                <span className="inline-flex items-center gap-1.5 text-red-400 text-xs font-bold bg-red-900/10 px-2 py-1 rounded border border-red-900/20">
                                                    <XCircle size={14}/> {r.httpStatus || 200} Failed
                                                </span>
                                            ) : r?.status === 'pass' ? (
                                                <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-900/10 px-2 py-1 rounded border border-emerald-900/20">
                                                    <CheckCircle2 size={14}/> {r.httpStatus || 200} OK
                                                </span>
                                            ) : r?.status === 'skipped' ? (
                                                <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-bold" title={r.skipReason}>
                                                    <MinusCircle size={14}/> Skipped
                                                </span>
                                            ) : running ? (
                                                <span className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-bold bg-amber-900/10 px-2 py-1 rounded border border-amber-900/20">
                                                    <Clock size={14} className="animate-spin"/> Running
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 dark:text-slate-600 text-xs italic flex items-center gap-1"><Clock size={12}/> Pending</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {r && r.assertions.length > 0 ? (
                                                <span
                                                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded border ${
                                                        r.assertions.every((a) => a.passed)
                                                            ? 'text-emerald-400 bg-emerald-900/10 border-emerald-900/20'
                                                            : 'text-red-400 bg-red-900/10 border-red-900/20'
                                                    }`}
                                                    title={r.assertions.map((a) => a.message ?? a.name).join('\n')}
                                                >
                                                    {r.assertions.filter((a) => a.passed).length}/{r.assertions.length}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 dark:text-slate-600 text-xs italic">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                                            {r && r.durationMs > 0 ? `${r.durationMs}ms` : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                     {plan.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm italic">
                            Empty collection. Add requests to &quot;{collectionName}&quot; to see them here.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
