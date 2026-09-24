/**
 * Networks page — stat cards and the network table are driven by REAL data:
 * endpoints come from NETWORKS/EVM_NETWORKS/STELLAR_NETWORKS/SOLANA_NETWORKS
 * in @/lib/constants, and status/latency come from live `getChainRpcHealth`
 * checks against each endpoint (same mechanism the RPC Builder's header
 * uses), not fabricated numbers. Aptos has no RPC endpoint infrastructure in
 * this app yet (it's a REST API, not JSON-RPC) — it's omitted rather than
 * shown with invented data.
 *
 * The "Add Network" panel adds a backup RPC endpoint to an existing
 * chain+environment pair (the same AppSettings.*CustomRpc arrays the
 * Settings page's "Network & RPC" editor and the RPC failover client both
 * already read) — not a genuinely new chain. ChainId is a fixed 4-member
 * union with no "custom chain" variant, so that's out of scope here.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    Boxes,
    Copy,
    Loader2,
    Plus,
    Search,
    Shield,
    X
} from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { ALL_NETWORKS, AppSettings, ChainId, Network } from '@/types';
import { EVM_NETWORKS, NETWORKS, SOLANA_NETWORKS, STELLAR_NETWORKS } from '@/lib/constants';
import { getChainRpcHealth } from '@/services/suiService';

type ChainFamily = 'sui' | 'evm' | 'solana' | 'stellar';
type NetworkStatus = 'online' | 'degraded' | 'offline' | 'checking';

type RpcSettingsKey = 'customRpc' | 'evmCustomRpc' | 'stellarCustomRpc' | 'solanaCustomRpc';

const SETTINGS_KEY_FOR_CHAIN: Record<ChainFamily, RpcSettingsKey> = {
    sui: 'customRpc',
    evm: 'evmCustomRpc',
    solana: 'solanaCustomRpc',
    stellar: 'stellarCustomRpc'
};

const CHAIN_META: Record<ChainFamily, { label: string; color: string }> = {
    sui: { label: 'Sui', color: '#6fbcf0' },
    evm: { label: 'Ethereum', color: '#a5a8f7' },
    solana: { label: 'Solana', color: '#14f195' },
    stellar: { label: 'Stellar', color: '#f5d060' }
};

const ENV_LABEL: Record<Network, string> = {
    mainnet: 'Production',
    testnet: 'Staging',
    devnet: 'Development',
    localnet: 'Local'
};

interface NetworkRow {
    id: string;
    name: string;
    chain: ChainFamily;
    environment: Network;
    endpoint: string;
    chainId: string;
    status: NetworkStatus;
    latencyMs: number;
}

const CHAIN_ID_LABELS: Record<ChainFamily, Partial<Record<Network, string>>> = {
    sui: { mainnet: 'sui:mainnet', testnet: 'sui:testnet', devnet: 'sui:devnet', localnet: 'sui:localnet' },
    evm: { mainnet: '1', testnet: '11155111', devnet: '11155111', localnet: '31337' },
    solana: { mainnet: 'mainnet-beta', testnet: 'testnet', devnet: 'devnet', localnet: 'localnet' },
    stellar: { mainnet: 'public', testnet: 'testnet', devnet: 'testnet', localnet: 'standalone' }
};

const buildRows = (): NetworkRow[] => {
    const rows: NetworkRow[] = [];
    const sources: { chain: ChainFamily; map: Record<Network, string> }[] = [
        { chain: 'sui', map: NETWORKS },
        { chain: 'evm', map: EVM_NETWORKS },
        { chain: 'solana', map: SOLANA_NETWORKS },
        { chain: 'stellar', map: STELLAR_NETWORKS }
    ];

    for (const { chain, map } of sources) {
        for (const net of ALL_NETWORKS) {
            rows.push({
                id: `${chain}-${net}`,
                name: `${CHAIN_META[chain].label} ${net.charAt(0).toUpperCase()}${net.slice(1)}`,
                chain,
                environment: net,
                endpoint: map[net],
                chainId: CHAIN_ID_LABELS[chain][net] ?? '—',
                status: 'checking',
                latencyMs: 0
            });
        }
    }

    return rows;
};

const ALL_ROWS: NetworkRow[] = buildRows();

const STATUS_META: Record<NetworkStatus, { label: string; dot: string; text: string }> = {
    online: { label: 'Online', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    degraded: { label: 'Degraded', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    offline: { label: 'Offline', dot: 'bg-slate-400 dark:bg-slate-600', text: 'text-slate-500' },
    checking: { label: 'Checking…', dot: 'bg-slate-300 dark:bg-slate-700 animate-pulse', text: 'text-slate-400' }
};

const ROWS_PER_PAGE = 12;

export const NetworksPage: React.FC = () => {
    const { settings } = useAppStore();
    const [search, setSearch] = useState('');
    const [chainFilter, setChainFilter] = useState<ChainFamily | 'all'>('all');
    const [page, setPage] = useState(1);
    const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
    const [rows, setRows] = useState<NetworkRow[]>(ALL_ROWS);

    const [addChain, setAddChain] = useState<ChainFamily>('sui');
    const [addNetwork, setAddNetwork] = useState<Network>('mainnet');
    const [addRpcUrl, setAddRpcUrl] = useState('');
    const [addError, setAddError] = useState<string | null>(null);
    const [addSuccess, setAddSuccess] = useState(false);

    // Live health check per row — same `getChainRpcHealth` mechanism the RPC
    // Builder's header uses, run once on mount rather than mocked figures.
    useEffect(() => {
        let cancelled = false;

        ALL_ROWS.forEach((row) => {
            getChainRpcHealth(row.chain as ChainId, row.environment)
                .then((health) => {
                    if (cancelled) return;
                    setRows((prev) =>
                        prev.map((r) =>
                            r.id === row.id
                                ? {
                                      ...r,
                                      status:
                                          health.status === 'healthy'
                                              ? 'online'
                                              : health.status === 'degraded'
                                                ? 'degraded'
                                                : 'offline',
                                      latencyMs: health.latency[0] ?? 0
                                  }
                                : r
                        )
                    );
                })
                .catch(() => {
                    if (cancelled) return;
                    setRows((prev) =>
                        prev.map((r) => (r.id === row.id ? { ...r, status: 'offline', latencyMs: 0 } : r))
                    );
                });
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((row) => {
            if (chainFilter !== 'all' && row.chain !== chainFilter) return false;
            if (!q) return true;
            return [row.name, row.endpoint, row.chainId].join(' ').toLowerCase().includes(q);
        });
    }, [rows, search, chainFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
    const pageRows = filteredRows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

    const onlineCount = rows.filter((r) => r.status === 'online').length;
    const degradedCount = rows.filter((r) => r.status === 'degraded').length;
    const checkedRows = rows.filter((r) => r.status === 'online' || r.status === 'degraded');
    const avgLatency = checkedRows.length
        ? Math.round(checkedRows.reduce((sum, r) => sum + r.latencyMs, 0) / checkedRows.length)
        : 0;
    const activeChainCount = new Set(rows.map((r) => r.chain)).size;

    const resetAddForm = () => {
        setAddChain('sui');
        setAddNetwork('mainnet');
        setAddRpcUrl('');
        setAddError(null);
        setAddSuccess(false);
    };

    const closeAddPanel = () => {
        setIsAddPanelOpen(false);
        resetAddForm();
    };

    const handleAddNetwork = () => {
        setAddError(null);
        const url = addRpcUrl.trim();

        if (!url) {
            setAddError('Enter an RPC URL.');
            return;
        }

        try {
            const parsed = new URL(url);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:' && parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
                setAddError('URL must use http(s):// or ws(s)://.');
                return;
            }
        } catch {
            setAddError('Enter a valid URL, e.g. https://...');
            return;
        }

        const settingsKey = SETTINGS_KEY_FOR_CHAIN[addChain];
        const existing = settings[settingsKey][addNetwork] ?? [];
        if (existing.includes(url)) {
            setAddError('This endpoint is already configured for this chain and network.');
            return;
        }

        appStore.updateSettings({
            [settingsKey]: {
                ...settings[settingsKey],
                [addNetwork]: [...existing, url]
            }
        } as Partial<AppSettings>);

        setAddSuccess(true);
        setAddRpcUrl('');
        setTimeout(() => {
            closeAddPanel();
        }, 900);
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-near-black p-6 md:p-8 relative">
            <div className="space-y-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Networks</h1>
                        <p className="text-sm text-slate-500 mt-1">Manage and configure blockchain networks and RPC endpoints.</p>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-electric-violet/10 flex items-center justify-center text-electric-violet shrink-0">
                            <Boxes size={16} />
                        </div>
                        <div>
                            <div className="text-lg font-bold text-slate-900 dark:text-white leading-none">{ALL_ROWS.length}</div>
                            <div className="text-[11px] text-slate-500 mt-1">Total Networks</div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                            <Activity size={16} />
                        </div>
                        <div>
                            <div className="text-lg font-bold text-slate-900 dark:text-white leading-none">{avgLatency}ms</div>
                            <div className="text-[11px] text-slate-500 mt-1">Average Latency</div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500 shrink-0">
                            <Shield size={16} />
                        </div>
                        <div>
                            <div className="text-lg font-bold text-slate-900 dark:text-white leading-none">{activeChainCount}</div>
                            <div className="text-[11px] text-slate-500 mt-1">Blockchains</div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 leading-none">{degradedCount === 0 ? 'Excellent' : 'Degraded'}</div>
                            <div className="text-[11px] text-slate-500 mt-1">{onlineCount} online · {degradedCount} degraded</div>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-3 flex-wrap">
                    <label className="relative flex-1 min-w-[200px]">
                        <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search networks..."
                            className="h-9 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] pl-9 pr-3 text-xs text-slate-900 dark:text-white outline-none transition-colors placeholder:text-slate-400 focus:border-electric-violet/50"
                        />
                    </label>
                    <select
                        value={chainFilter}
                        onChange={(e) => { setChainFilter(e.target.value as ChainFamily | 'all'); setPage(1); }}
                        className="h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-electric-violet/50"
                    >
                        <option value="all">All Blockchains</option>
                        {(Object.keys(CHAIN_META) as ChainFamily[]).map((c) => (
                            <option key={c} value={c}>{CHAIN_META[c].label}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setIsAddPanelOpen(true)}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black text-xs font-bold hover:opacity-90 transition-opacity shrink-0"
                    >
                        <Plus size={13} /> Add Network
                    </button>
                </div>

                {/* Table */}
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-indigo-glow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-white/5">
                                    <th className="px-5 py-3">Network</th>
                                    <th className="px-5 py-3">Blockchain</th>
                                    <th className="px-5 py-3">Environment</th>
                                    <th className="px-5 py-3">RPC Endpoint</th>
                                    <th className="px-5 py-3">Chain ID</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Latency</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {pageRows.map((row) => {
                                    const status = STATUS_META[row.status];
                                    return (
                                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border text-[10px] font-bold"
                                                        style={{ backgroundColor: `${CHAIN_META[row.chain].color}1a`, borderColor: `${CHAIN_META[row.chain].color}40`, color: CHAIN_META[row.chain].color }}
                                                    >
                                                        {CHAIN_META[row.chain].label.slice(0, 2)}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-slate-900 dark:text-white truncate">{row.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CHAIN_META[row.chain].color }} />
                                                    {CHAIN_META[row.chain].label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                                                    {ENV_LABEL[row.environment]}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500 max-w-[220px]">
                                                    <span className="truncate">{row.endpoint}</span>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(row.endpoint)}
                                                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors shrink-0"
                                                        title="Copy endpoint"
                                                    >
                                                        <Copy size={11} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="font-mono text-xs text-slate-500">{row.chainId}</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`flex items-center gap-1.5 text-xs font-medium w-fit ${status.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="text-xs font-mono text-slate-500">
                                                    {row.status === 'offline' ? '—' : `${row.latencyMs}ms`}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors text-xs font-bold">
                                                    ···
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-white/5 text-xs text-slate-500">
                        <span>
                            Showing {filteredRows.length === 0 ? 0 : (page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filteredRows.length)} of {filteredRows.length} networks
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                                ‹
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                                <button
                                    key={n}
                                    onClick={() => setPage(n)}
                                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                                        n === page ? 'bg-slate-900 dark:bg-white text-white dark:text-near-black' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                                ›
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Network slide-out */}
            {isAddPanelOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
                        onClick={closeAddPanel}
                    />
                    <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-[#18181b] border-l border-slate-200 dark:border-white/10 z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10 shrink-0">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Add Network</h2>
                                <p className="text-[11px] text-slate-500 mt-0.5">Add a backup RPC endpoint for an existing chain and environment.</p>
                            </div>
                            <button
                                onClick={closeAddPanel}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Blockchain *</label>
                                <select
                                    value={addChain}
                                    onChange={(e) => setAddChain(e.target.value as ChainFamily)}
                                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black px-3 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-electric-violet/50"
                                >
                                    {(Object.keys(CHAIN_META) as ChainFamily[]).map((c) => (
                                        <option key={c} value={c}>{CHAIN_META[c].label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Environment *</label>
                                <select
                                    value={addNetwork}
                                    onChange={(e) => setAddNetwork(e.target.value as Network)}
                                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black px-3 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-electric-violet/50"
                                >
                                    {ALL_NETWORKS.map((net) => (
                                        <option key={net} value={net}>{ENV_LABEL[net]} ({net})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">RPC URL *</label>
                                <input
                                    value={addRpcUrl}
                                    onChange={(e) => { setAddRpcUrl(e.target.value); setAddError(null); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddNetwork(); }}
                                    placeholder="https://..."
                                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet/50"
                                />
                                <p className="text-[10px] text-slate-500">
                                    Tried before the built-in default for {CHAIN_META[addChain].label} {ENV_LABEL[addNetwork]}. Same list as Settings → Network & RPC.
                                </p>
                            </div>

                            {addError && (
                                <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-[11px] text-red-600 dark:text-red-400">
                                    <AlertTriangle size={13} className="shrink-0" /> {addError}
                                </div>
                            )}
                            {addSuccess && (
                                <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                                    Endpoint added.
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-4 border-t border-slate-200 dark:border-white/10 shrink-0">
                            <button
                                onClick={handleAddNetwork}
                                className="w-full h-10 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black text-sm font-bold hover:opacity-90 transition-opacity"
                            >
                                Add Network
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
