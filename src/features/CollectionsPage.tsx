/**
 * Collections page — scaffolded to match a reference layout (a left list of
 * collections, a right detail pane with tabs for Requests/Description/
 * Settings). The collections list and each collection's requests are REAL
 * data from the app store (`useAppStore().collections`). Per-collection chain
 * icon/stat decoration (network, request counts by method) is PLACEHOLDER —
 * `CollectionNode` has no chain field yet, so chain assignment here is
 * inferred crudely from the collection name and won't reflect real data
 * until that's added to the model.
 */
import React, { useMemo, useState } from 'react';
import {
    ChevronRight,
    Download,
    FileText,
    Filter,
    Plus,
    Search,
    Settings2,
    Share2,
    Upload
} from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { CollectionNode, RequestType } from '@/types';

type ChainFamily = 'sui' | 'evm' | 'solana' | 'aptos' | 'stellar';

const CHAIN_META: Record<ChainFamily, { label: string; color: string }> = {
    sui: { label: 'Sui', color: '#6fbcf0' },
    evm: { label: 'Ethereum', color: '#a5a8f7' },
    solana: { label: 'Solana', color: '#14f195' },
    aptos: { label: 'Aptos', color: '#2ed3b7' },
    stellar: { label: 'Stellar', color: '#f5d060' }
};

// Placeholder chain inference — CollectionNode has no chain field, so this
// guesses from the name just to give each row a visual identity until the
// data model carries a real chain association.
const inferChain = (name: string): ChainFamily => {
    const n = name.toLowerCase();
    if (n.includes('sui')) return 'sui';
    if (n.includes('sol')) return 'solana';
    if (n.includes('apt')) return 'aptos';
    if (n.includes('stellar') || n.includes('soroban')) return 'stellar';
    return 'evm';
};

const countRequests = (node: CollectionNode): number => {
    if (node.type === 'request') return 1;
    return (node.children ?? []).reduce((sum, child) => sum + countRequests(child), 0);
};

const countFolders = (node: CollectionNode): number => {
    if (node.type !== 'collection' && node.type !== 'folder') return 0;
    const own = node.type === 'folder' ? 1 : 0;
    return own + (node.children ?? []).reduce((sum, child) => sum + countFolders(child), 0);
};

const flattenRequests = (node: CollectionNode, path: string[] = []): { node: CollectionNode; path: string[] }[] => {
    if (node.type === 'request') return [{ node, path }];
    return (node.children ?? []).flatMap((child) => flattenRequests(child, [...path, node.name]));
};

export const CollectionsPage: React.FC = () => {
    const { collections } = useAppStore();
    const [search, setSearch] = useState('');
    const [requestSearch, setRequestSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(collections[0]?.id ?? null);
    const [tab, setTab] = useState<'requests' | 'description' | 'settings'>('requests');

    const filteredCollections = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return collections;
        return collections.filter((c) => c.name.toLowerCase().includes(q));
    }, [collections, search]);

    const selected = collections.find((c) => c.id === selectedId) ?? collections[0] ?? null;

    const requests = useMemo(() => {
        if (!selected) return [];
        const flat = flattenRequests(selected);
        const q = requestSearch.trim().toLowerCase();
        if (!q) return flat;
        return flat.filter(({ node }) => node.name.toLowerCase().includes(q));
    }, [selected, requestSearch]);

    if (collections.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-near-black p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                    <FileText size={22} className="text-slate-400" />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">No collections yet</h2>
                <p className="text-sm text-slate-500 mt-1 max-w-xs">Create a collection to organize related requests together.</p>
                <button
                    onClick={() => appStore.openTab('new_collection')}
                    className="mt-5 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black text-sm font-bold hover:opacity-90 transition-opacity"
                >
                    <Plus size={14} /> New Collection
                </button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-near-black p-6 md:p-8">
            <div className="space-y-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Collections</h1>
                        <p className="text-sm text-slate-500 mt-1">Organize your requests, share with your team, and keep your workflows structured.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                            <Upload size={12} /> Import
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                            <Download size={12} /> Export
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                            <Share2 size={12} /> Share
                        </button>
                        <button
                            onClick={() => appStore.openTab('new_collection')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black text-xs font-bold hover:opacity-90 transition-opacity"
                        >
                            <Plus size={12} /> New Collection
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
                    {/* Collections list */}
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow overflow-hidden">
                        <div className="p-3 border-b border-slate-200 dark:border-white/5">
                            <label className="relative block">
                                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search collections..."
                                    className="h-9 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] pl-9 pr-3 text-xs text-slate-900 dark:text-white outline-none transition-colors placeholder:text-slate-400 focus:border-electric-violet/50"
                                />
                            </label>
                        </div>
                        <div className="max-h-[560px] overflow-y-auto custom-scrollbar">
                            {filteredCollections.map((col) => {
                                const chain = inferChain(col.name);
                                const isSelected = col.id === selected?.id;
                                const requestCount = countRequests(col);
                                return (
                                    <button
                                        key={col.id}
                                        onClick={() => setSelectedId(col.id)}
                                        className={`w-full flex items-start gap-3 px-4 py-3 text-left border-l-2 transition-colors ${
                                            isSelected
                                                ? 'border-electric-violet bg-white dark:bg-white/[0.04]'
                                                : 'border-transparent hover:bg-white dark:hover:bg-white/[0.02]'
                                        }`}
                                    >
                                        <span
                                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border text-[10px] font-bold mt-0.5"
                                            style={{ backgroundColor: `${CHAIN_META[chain].color}1a`, borderColor: `${CHAIN_META[chain].color}40`, color: CHAIN_META[chain].color }}
                                        >
                                            {CHAIN_META[chain].label.slice(0, 2)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{col.name}</span>
                                                <span className="text-[10px] font-bold text-slate-400 shrink-0">{requestCount} requests</span>
                                            </div>
                                            {col.description && (
                                                <p className="text-[11px] text-slate-500 truncate mt-0.5">{col.description}</p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                            {filteredCollections.length === 0 && (
                                <div className="px-4 py-8 text-center text-xs text-slate-500">No collections match &ldquo;{search}&rdquo;.</div>
                            )}
                        </div>
                    </div>

                    {/* Collection detail */}
                    {selected ? (
                        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow overflow-hidden">
                            <div className="p-5 border-b border-slate-200 dark:border-white/5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <span
                                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border text-xs font-bold"
                                            style={{
                                                backgroundColor: `${CHAIN_META[inferChain(selected.name)].color}1a`,
                                                borderColor: `${CHAIN_META[inferChain(selected.name)].color}40`,
                                                color: CHAIN_META[inferChain(selected.name)].color
                                            }}
                                        >
                                            {CHAIN_META[inferChain(selected.name)].label.slice(0, 2)}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h2 className="font-bold text-slate-900 dark:text-white truncate">{selected.name}</h2>
                                                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 shrink-0">
                                                    {selected.isShared ? 'Shared' : 'Personal'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">{selected.description || 'No description yet.'}</p>
                                        </div>
                                    </div>
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 transition-colors shrink-0">
                                        <Settings2 size={12} /> Edit Collection
                                    </button>
                                </div>

                                <div className="flex items-center gap-6 mt-4 text-sm">
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{countRequests(selected)}</div>
                                        <div className="text-[11px] text-slate-500">Requests</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{countFolders(selected)}</div>
                                        <div className="text-[11px] text-slate-500">Folders</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-200 dark:border-white/5">
                                {(['requests', 'description', 'settings'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTab(t)}
                                        className={`px-3 py-2 text-xs font-bold capitalize border-b-2 transition-colors -mb-px ${
                                            tab === t
                                                ? 'border-electric-violet text-slate-900 dark:text-white'
                                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>

                            {tab === 'requests' && (
                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <label className="relative flex-1">
                                            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                value={requestSearch}
                                                onChange={(e) => setRequestSearch(e.target.value)}
                                                placeholder="Search requests..."
                                                className="h-9 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] pl-9 pr-3 text-xs text-slate-900 dark:text-white outline-none transition-colors placeholder:text-slate-400 focus:border-electric-violet/50"
                                            />
                                        </label>
                                        <button className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 transition-colors shrink-0">
                                            <Filter size={12} /> Filter
                                        </button>
                                        <button
                                            onClick={() => appStore.openTab('new_request')}
                                            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black text-xs font-bold hover:opacity-90 transition-opacity shrink-0"
                                        >
                                            <Plus size={12} /> Add Request
                                        </button>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 bg-white dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/5">
                                                    <th className="px-4 py-2.5">Name</th>
                                                    <th className="px-4 py-2.5">Method</th>
                                                    <th className="px-4 py-2.5">Network</th>
                                                    <th className="px-4 py-2.5">Last modified</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-transparent">
                                                {requests.map(({ node }) => {
                                                    const req = node.requestData;
                                                    const method = req?.type === RequestType.RPC ? req.rpcParams.method : req?.txType;
                                                    return (
                                                        <tr
                                                            key={node.id}
                                                            onClick={() => req && appStore.openTab('rpc', req)}
                                                            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                                                        >
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <FileText size={13} className="text-slate-400 shrink-0" />
                                                                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{node.name}</span>
                                                                    <ChevronRight size={12} className="text-slate-300 dark:text-slate-600 shrink-0" />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <span className="font-mono text-xs text-electric-violet">{method ?? '—'}</span>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CHAIN_META[inferChain(selected.name)].color }} />
                                                                    {CHAIN_META[inferChain(selected.name)].label} Mainnet
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-xs text-slate-400">—</td>
                                                        </tr>
                                                    );
                                                })}
                                                {requests.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500">
                                                            {requestSearch ? `No requests match "${requestSearch}".` : 'No requests in this collection yet.'}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {tab === 'description' && (
                                <div className="p-5 text-sm text-slate-600 dark:text-slate-300">
                                    {selected.description || 'No description has been added to this collection yet.'}
                                </div>
                            )}

                            {tab === 'settings' && (
                                <div className="p-5 text-sm text-slate-500">
                                    Collection settings (rename, delete, sharing permissions) live in the collection&rsquo;s own menu — this tab is a placeholder pending that flow being surfaced here directly.
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
