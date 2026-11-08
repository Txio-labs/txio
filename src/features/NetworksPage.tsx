/**
 * Networks page — stat cards and the network table are driven by REAL data:
 * endpoints come from NETWORKS/EVM_NETWORKS/STELLAR_NETWORKS/SOLANA_NETWORKS
 * in @/lib/constants, and status/latency come from live `getChainRpcHealth`
 * checks against each endpoint (same mechanism the RPC Builder's header
 * uses), not fabricated numbers. Aptos speaks REST rather than JSON-RPC, so
 * its rows are health-checked with a plain GET of the fullnode's ledger info.
 *
 * The "Add Network" panel adds a backup RPC endpoint to an existing
 * chain+environment pair (the same AppSettings.*CustomRpc arrays the
 * Settings page's "Network & RPC" editor and the RPC failover client both
 * already read) — not a genuinely new chain. Aptos has no custom-endpoint
 * setting yet, so it isn't offered there.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    Boxes,
    Copy,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    Shield,
    X
} from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { ALL_NETWORKS, AppSettings, ChainId, Network } from '@/types';
import { APTOS_NETWORKS } from '@/lib/constants';
import { resolveChainRpcUrlList } from '@/lib/appConfig';
import { getChainRpcHealth } from '@/services/suiService';
import { Select } from '@/components/Select';
import { ChainIcon } from '@/components/ui/ChainIcon';

type ChainFamily = 'sui' | 'evm' | 'solana' | 'stellar' | 'aptos';
type RpcChain = Exclude<ChainFamily, 'aptos'>;
type NetworkStatus = 'online' | 'degraded' | 'offline' | 'checking';

type RpcSettingsKey = 'customRpc' | 'evmCustomRpc' | 'stellarCustomRpc' | 'solanaCustomRpc';

const SETTINGS_KEY_FOR_CHAIN: Record<RpcChain, RpcSettingsKey> = {
    sui: 'customRpc',
    evm: 'evmCustomRpc',
    solana: 'solanaCustomRpc',
    stellar: 'stellarCustomRpc'
};

const CHAIN_META: Record<ChainFamily, { label: string; color: string }> = {
    sui: { label: 'Sui', color: '#6fbcf0' },
    evm: { label: 'Ethereum', color: '#a5a8f7' },
    solana: { label: 'Solana', color: '#14f195' },
    stellar: { label: 'Stellar', color: '#f5d060' },
    aptos: { label: 'Aptos', color: '#2dd8a3' }
};

const DEGRADED_LATENCY_MS = 1500;

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
    /** Extra endpoints tried after `endpoint` fails (custom overrides + the built-in default). */
    fallbackCount: number;
    chainId: string;
    status: NetworkStatus;
    latencyMs: number;
}

const CHAIN_ID_LABELS: Record<ChainFamily, Partial<Record<Network, string>>> = {
    sui: { mainnet: 'sui:mainnet', testnet: 'sui:testnet', devnet: 'sui:devnet', localnet: 'sui:localnet' },
    evm: { mainnet: '1', testnet: '11155111', devnet: '11155111', localnet: '31337' },
    solana: { mainnet: 'mainnet-beta', testnet: 'testnet', devnet: 'devnet', localnet: 'localnet' },
    stellar: { mainnet: 'public', testnet: 'testnet', devnet: 'testnet', localnet: 'standalone' },
    aptos: { mainnet: '1', testnet: '2', devnet: '—', localnet: '4' }
};

const endpointsFor = (chain: ChainFamily, net: Network, settings: AppSettings): string[] =>
    chain === 'aptos' ? [APTOS_NETWORKS[net]] : resolveChainRpcUrlList(chain, net, settings);

/** Rows reflect the endpoint actually used first — a custom override when one is set. */
const buildRows = (settings: AppSettings): NetworkRow[] =>
    (Object.keys(CHAIN_META) as ChainFamily[]).flatMap((chain) =>
        ALL_NETWORKS.map((net) => {
            const endpoints = endpointsFor(chain, net, settings);
            return {
                id: `${chain}-${net}`,
                name: `${CHAIN_META[chain].label} ${net.charAt(0).toUpperCase()}${net.slice(1)}`,
                chain,
                environment: net,
                endpoint: endpoints[0],
                fallbackCount: endpoints.length - 1,
                chainId: CHAIN_ID_LABELS[chain][net] ?? '—',
                status: 'checking' as NetworkStatus,
                latencyMs: 0
            };
        })
    );

/** Aptos fullnodes are REST: GET of the base URL returns ledger info. */
const checkAptos = async (url: string): Promise<{ status: NetworkStatus; latencyMs: number }> => {
    const start = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
        const res = await fetch(url, { signal: controller.signal });
        const latencyMs = Math.round(performance.now() - start);
        if (!res.ok) return { status: 'offline', latencyMs: 0 };
        return { status: latencyMs >= DEGRADED_LATENCY_MS ? 'degraded' : 'online', latencyMs };
    } catch {
        return { status: 'offline', latencyMs: 0 };
    } finally {
        clearTimeout(timer);
    }
};

const checkRow = async (row: NetworkRow): Promise<{ status: NetworkStatus; latencyMs: number }> => {
    if (row.chain === 'aptos') return checkAptos(row.endpoint);
    const health = await getChainRpcHealth(row.chain as ChainId, row.environment);
    return {
        status: health.status === 'healthy' ? 'online' : health.status === 'degraded' ? 'degraded' : 'offline',
        latencyMs: health.latency[0] ?? 0
    };
};

const STATUS_META: Record<NetworkStatus, { label: string; dot: string; text: string }> = {
    online: { label: 'Online', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    degraded: { label: 'Degraded', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    offline: { label: 'Offline', dot: 'bg-slate-400 dark:bg-slate-600', text: 'text-fg-subtle' },
    checking: { label: 'Checking…', dot: 'bg-line-strong animate-pulse', text: 'text-fg-subtle' }
};

const ROWS_PER_PAGE = 12;

export const NetworksPage: React.FC = () => {
    const { settings } = useAppStore();
    const [search, setSearch] = useState('');
    const [chainFilter, setChainFilter] = useState<ChainFamily | 'all'>('all');
    const [page, setPage] = useState(1);
    const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
    const [rows, setRows] = useState<NetworkRow[]>(() => buildRows(settings));
    const [checkRound, setCheckRound] = useState(0);

    const [addChain, setAddChain] = useState<RpcChain>('sui');
    const [addNetwork, setAddNetwork] = useState<Network>('mainnet');
    const [addRpcUrl, setAddRpcUrl] = useState('');
    const [addError, setAddError] = useState<string | null>(null);
    const [addSuccess, setAddSuccess] = useState(false);

    // Live health check per row — same `getChainRpcHealth` mechanism the RPC
    // Builder's header uses. Re-runs when endpoint settings change (a newly
    // added endpoint becomes the first one tried) or on a manual recheck.
    useEffect(() => {
        let cancelled = false;
        const fresh = buildRows(settings);
        // Reset to "checking" from a callback-free effect start; results land below.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRows(fresh);
        fresh.forEach((row) => {
            checkRow(row)
                .catch(() => ({ status: 'offline' as NetworkStatus, latencyMs: 0 }))
                .then((result) => {
                    if (cancelled) return;
                    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...result } : r)));
                });
        });
        return () => {
            cancelled = true;
        };
    }, [settings, checkRound]);

    const recheckRow = (row: NetworkRow) => {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: 'checking' } : r)));
        checkRow(row)
            .catch(() => ({ status: 'offline' as NetworkStatus, latencyMs: 0 }))
            .then((result) => setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...result } : r))));
    };

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
    const offlineCount = rows.filter((r) => r.status === 'offline').length;
    const checkingCount = rows.filter((r) => r.status === 'checking').length;
    // Localnet rows are expected to be offline unless a local node is running,
    // so they don't count against overall health.
    const remoteIssues = rows.filter((r) => r.environment !== 'localnet' && (r.status === 'offline' || r.status === 'degraded')).length;
    const overall =
        checkingCount > 0
            ? { label: 'Checking…', tone: 'text-fg-subtle', dot: 'bg-slate-400 animate-pulse', box: 'bg-slate-500/10' }
            : remoteIssues === 0
              ? { label: 'All remote online', tone: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', box: 'bg-emerald-500/10' }
              : { label: `${remoteIssues} need attention`, tone: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', box: 'bg-amber-500/10' };
    const checkedRows = rows.filter((r) => r.status === 'online' || r.status === 'degraded');
    const avgLatency = checkedRows.length
        ? Math.round(checkedRows.reduce((sum, r) => sum + r.latencyMs, 0) / checkedRows.length)
        : 0;
    const chainCount = Object.keys(CHAIN_META).length;

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
        <div className="h-full overflow-y-auto custom-scrollbar bg-surface p-6 md:p-8 relative">
            <div className="space-y-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-fg">Networks</h1>
                        <p className="text-sm text-fg-subtle mt-1">Manage and configure blockchain networks and RPC endpoints.</p>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-card border border-line bg-sunken p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[10px] bg-hover flex items-center justify-center text-fg shrink-0">
                            <Boxes size={16} />
                        </div>
                        <div>
                            <div className="text-lg font-semibold text-fg leading-none">{rows.length}</div>
                            <div className="text-[12px] text-fg-subtle mt-1">Total Networks</div>
                        </div>
                    </div>
                    <div className="rounded-card border border-line bg-sunken p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[10px] bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                            <Activity size={16} />
                        </div>
                        <div>
                            <div className="text-lg font-semibold text-fg leading-none">{checkedRows.length ? `${avgLatency}ms` : '—'}</div>
                            <div className="text-[12px] text-fg-subtle mt-1">Average Latency</div>
                        </div>
                    </div>
                    <div className="rounded-card border border-line bg-sunken p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[10px] bg-sky-500/10 flex items-center justify-center text-sky-500 shrink-0">
                            <Shield size={16} />
                        </div>
                        <div>
                            <div className="text-lg font-semibold text-fg leading-none">{chainCount}</div>
                            <div className="text-[12px] text-fg-subtle mt-1">Blockchains</div>
                        </div>
                    </div>
                    <div className="rounded-card border border-line bg-sunken p-4 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${overall.box}`}>
                            <span className={`w-2 h-2 rounded-full ${overall.dot}`} />
                        </div>
                        <div className="min-w-0">
                            <div className={`text-sm font-semibold leading-none ${overall.tone}`}>{overall.label}</div>
                            <div className="text-[12px] text-fg-subtle mt-1">{onlineCount} online · {degradedCount} slow · {offlineCount} offline</div>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-3 flex-wrap">
                    <label className="relative flex-1 min-w-[200px]">
                        <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                        <input
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search networks..."
                            className="h-9 w-full rounded-lg border border-line bg-sunken pl-9 pr-3 text-xs text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-line-strong"
                        />
                    </label>
                    <div className="w-44">
                        <Select
                            value={chainFilter}
                            options={[
                                { label: 'All blockchains', value: 'all' },
                                ...(Object.keys(CHAIN_META) as ChainFamily[]).map((c) => ({ label: CHAIN_META[c].label, value: c }))
                            ]}
                            onChange={(v) => { setChainFilter(v as ChainFamily | 'all'); setPage(1); }}
                            fullWidth
                        />
                    </div>
                    <button
                        onClick={() => setCheckRound((n) => n + 1)}
                        disabled={checkingCount > 0}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-line text-xs font-semibold text-fg-muted hover:bg-hover disabled:opacity-50 transition-colors shrink-0"
                    >
                        <RefreshCw size={13} className={checkingCount > 0 ? 'animate-spin' : ''} /> Recheck all
                    </button>
                    <button
                        onClick={() => setIsAddPanelOpen(true)}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-inverse text-on-inverse text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
                    >
                        <Plus size={13} /> Add Network
                    </button>
                </div>

                {/* Table */}
                <div className="rounded-card border border-line bg-elevated overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-fg-subtle border-b border-line">
                                    <th className="px-5 py-3">Network</th>
                                    <th className="px-5 py-3 hidden lg:table-cell">Blockchain</th>
                                    <th className="px-5 py-3 hidden sm:table-cell">Environment</th>
                                    <th className="px-5 py-3 hidden md:table-cell">RPC Endpoint</th>
                                    <th className="px-5 py-3 hidden xl:table-cell">Chain ID</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 hidden sm:table-cell">Latency</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {pageRows.map((row) => {
                                    const status = STATUS_META[row.status];
                                    return (
                                        <tr key={row.id} className="hover:bg-hover transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <ChainIcon chain={row.chain} size={28} />
                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-fg truncate">{row.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 hidden lg:table-cell">
                                                <span className="flex items-center gap-1.5 text-xs text-fg-muted">
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CHAIN_META[row.chain].color }} />
                                                    {CHAIN_META[row.chain].label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 hidden sm:table-cell">
                                                <span className="text-[12px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md bg-hover text-fg-muted">
                                                    {ENV_LABEL[row.environment]}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 hidden md:table-cell">
                                                <div className="flex items-center gap-1.5 font-mono text-xs text-fg-subtle max-w-[220px]">
                                                    <span className="truncate" title={row.endpoint}>{row.endpoint}</span>
                                                    {row.fallbackCount > 0 && (
                                                        <span className="shrink-0 font-sans text-[12px] text-fg-subtle" title="Endpoints tried next if this one fails">
                                                            +{row.fallbackCount}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(row.endpoint)}
                                                        className="text-fg-subtle hover:text-fg transition-colors shrink-0"
                                                        title="Copy endpoint"
                                                    >
                                                        <Copy size={11} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 hidden xl:table-cell">
                                                <span className="font-mono text-xs text-fg-subtle">{row.chainId}</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`flex items-center gap-1.5 text-xs font-medium w-fit ${status.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 hidden sm:table-cell">
                                                <span className="text-xs font-mono text-fg-subtle">
                                                    {row.status === 'offline' || row.status === 'checking' ? '—' : `${row.latencyMs}ms`}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button
                                                    onClick={() => recheckRow(row)}
                                                    disabled={row.status === 'checking'}
                                                    aria-label={`Recheck ${row.name}`}
                                                    title="Recheck"
                                                    className="p-1 text-fg-subtle hover:text-fg disabled:opacity-40 transition-colors"
                                                >
                                                    <RefreshCw size={12} className={row.status === 'checking' ? 'animate-spin' : ''} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between px-5 py-3 border-t border-line text-xs text-fg-subtle">
                        <span>
                            Showing {filteredRows.length === 0 ? 0 : (page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filteredRows.length)} of {filteredRows.length} networks
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-2 py-1 rounded-lg border border-line disabled:opacity-40 hover:bg-hover transition-colors"
                            >
                                ‹
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                                <button
                                    key={n}
                                    onClick={() => setPage(n)}
                                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                                        n === page ? 'bg-inverse text-on-inverse' : 'hover:bg-hover text-fg-muted'
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-2 py-1 rounded-lg border border-line disabled:opacity-40 hover:bg-hover transition-colors"
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
                    <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-elevated border-l border-line z-50 shadow-pop flex flex-col animate-in slide-in-from-right duration-200">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
                            <div>
                                <h2 className="text-sm font-semibold text-fg">Add Network</h2>
                                <p className="text-[12px] text-fg-subtle mt-0.5">Add a backup RPC endpoint for an existing chain and environment.</p>
                            </div>
                            <button
                                onClick={closeAddPanel}
                                className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-hover transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-fg">Blockchain *</label>
                                <Select
                                    value={addChain}
                                    options={(Object.keys(SETTINGS_KEY_FOR_CHAIN) as RpcChain[]).map((c) => ({ label: CHAIN_META[c].label, value: c }))}
                                    onChange={(v) => setAddChain(v as RpcChain)}
                                    fullWidth
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-fg">Environment *</label>
                                <Select
                                    value={addNetwork}
                                    options={ALL_NETWORKS.map((net) => ({ label: `${ENV_LABEL[net]} (${net})`, value: net }))}
                                    onChange={(v) => setAddNetwork(v as Network)}
                                    fullWidth
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-fg">RPC URL *</label>
                                <input
                                    value={addRpcUrl}
                                    onChange={(e) => { setAddRpcUrl(e.target.value); setAddError(null); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddNetwork(); }}
                                    placeholder="https://..."
                                    className="w-full h-9 rounded-lg border border-line bg-surface px-3 text-xs font-mono text-fg outline-none focus:border-line-strong"
                                />
                                <p className="text-[12px] text-fg-subtle">
                                    Tried before the built-in default for {CHAIN_META[addChain].label} {ENV_LABEL[addNetwork]}. Same list as Settings → Network & RPC.
                                </p>
                            </div>

                            {addError && (
                                <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-[12px] text-red-600 dark:text-red-400">
                                    <AlertTriangle size={13} className="shrink-0" /> {addError}
                                </div>
                            )}
                            {addSuccess && (
                                <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-2 text-[12px] text-emerald-600 dark:text-emerald-400">
                                    Endpoint added.
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-4 border-t border-line shrink-0">
                            <button
                                onClick={handleAddNetwork}
                                className="w-full h-10 rounded-lg bg-inverse text-on-inverse text-sm font-semibold hover:opacity-90 transition-opacity"
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
