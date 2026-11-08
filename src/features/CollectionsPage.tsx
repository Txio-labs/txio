/**
 * Collections page — a left list of collections, a right detail pane with
 * tabs for Requests/Description/Settings. The collections list and each
 * collection's requests are REAL data from the app store
 * (`useAppStore().collections`); Settings surfaces the one real mutation the
 * store exposes today (`appStore.deleteCollection`). Per-collection chain
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
            <div className="h-full flex flex-col items-center justify-center bg-surface p-8 text-center">
                <div className="w-14 h-14 rounded-card bg-hover flex items-center justify-center mb-4">
                    <FileText size={22} className="text-fg-subtle" />
                </div>
                <h2 className="text-base font-semibold text-fg">No collections yet</h2>
                <p className="text-sm text-fg-subtle mt-1 max-w-xs">Create a collection to organize related requests together.</p>
                <button
                    onClick={() => appStore.openTab('new_collection')}
                    className="mt-5 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-inverse text-on-inverse text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                    <Plus size={14} /> New Collection
                </button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-surface p-6 md:p-8">
            <div className="space-y-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-fg">Collections</h1>
                        <p className="text-sm text-fg-subtle mt-1">Organize your requests, share with your team, and keep your workflows structured.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-xs font-semibold text-fg-muted hover:bg-hover transition-colors">
                            <Upload size={12} /> Import
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-xs font-semibold text-fg-muted hover:bg-hover transition-colors">
                            <Download size={12} /> Export
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-xs font-semibold text-fg-muted hover:bg-hover transition-colors">
                            <Share2 size={12} /> Share
                        </button>
                        <button
                            onClick={() => appStore.openTab('new_collection')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-inverse text-on-inverse text-xs font-semibold hover:opacity-90 transition-opacity"
                        >
                            <Plus size={12} /> New Collection
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
                    {/* Collections list */}
                    <div className="rounded-card border border-line bg-sunken overflow-hidden">
                        <div className="p-3 border-b border-line">
                            <label className="relative block">
                                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search collections..."
                                    className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-xs text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-line-strong"
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
                                                ? 'border-fg/40 bg-surface'
                                                : 'border-transparent hover:bg-hover'
                                        }`}
                                    >
                                        <span
                                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border text-[12px] font-semibold mt-0.5"
                                            style={{ backgroundColor: `${CHAIN_META[chain].color}1a`, borderColor: `${CHAIN_META[chain].color}40`, color: CHAIN_META[chain].color }}
                                        >
                                            {CHAIN_META[chain].label.slice(0, 2)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-fg truncate">{col.name}</span>
                                                <span className="text-[12px] font-semibold text-fg-subtle shrink-0">{requestCount} requests</span>
                                            </div>
                                            {col.description && (
                                                <p className="text-[12px] text-fg-subtle truncate mt-0.5">{col.description}</p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                            {filteredCollections.length === 0 && (
                                <div className="px-4 py-8 text-center text-xs text-fg-subtle">No collections match &ldquo;{search}&rdquo;.</div>
                            )}
                        </div>
                    </div>

                    {/* Collection detail */}
                    {selected ? (
                        <div className="rounded-card border border-line bg-sunken overflow-hidden">
                            <div className="p-5 border-b border-line">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <span
                                            className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 border text-xs font-semibold"
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
                                                <h2 className="font-semibold text-fg truncate">{selected.name}</h2>
                                                <span className="text-[12px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-active text-fg-muted shrink-0">
                                                    {selected.isShared ? 'Shared' : 'Personal'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-fg-subtle mt-0.5">{selected.description || 'No description yet.'}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setTab('settings')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-fg-muted hover:bg-hover transition-colors shrink-0"
                                    >
                                        <Settings2 size={12} /> Edit Collection
                                    </button>
                                </div>

                                <div className="flex items-center gap-6 mt-4 text-sm">
                                    <div>
                                        <div className="font-semibold text-fg">{countRequests(selected)}</div>
                                        <div className="text-[12px] text-fg-subtle">Requests</div>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-fg">{countFolders(selected)}</div>
                                        <div className="text-[12px] text-fg-subtle">Folders</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 px-5 pt-3 border-b border-line">
                                {(['requests', 'description', 'settings'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTab(t)}
                                        className={`px-3 py-2 text-xs font-semibold capitalize border-b-2 transition-colors -mb-px ${
                                            tab === t
                                                ? 'border-fg/40 text-fg'
                                                : 'border-transparent text-fg-subtle hover:text-fg'
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
                                            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                                            <input
                                                value={requestSearch}
                                                onChange={(e) => setRequestSearch(e.target.value)}
                                                placeholder="Search requests..."
                                                className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-xs text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-line-strong"
                                            />
                                        </label>
                                        <button className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-line text-xs font-semibold text-fg-muted hover:bg-hover transition-colors shrink-0">
                                            <Filter size={12} /> Filter
                                        </button>
                                        <button
                                            onClick={() => selectedId && appStore.openTab('new_request', { collectionId: selectedId })}
                                            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-inverse text-on-inverse text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
                                        >
                                            <Plus size={12} /> Add Request
                                        </button>
                                    </div>

                                    <div className="rounded-[10px] border border-line overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-fg-subtle bg-surface border-b border-line">
                                                    <th className="px-4 py-2.5">Name</th>
                                                    <th className="px-4 py-2.5">Method</th>
                                                    <th className="px-4 py-2.5">Network</th>
                                                    <th className="px-4 py-2.5">Last modified</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-line">
                                                {requests.map(({ node }) => {
                                                    const req = node.requestData;
                                                    const method = req?.type === RequestType.RPC ? req.rpcParams.method : req?.txType;
                                                    return (
                                                        <tr
                                                            key={node.id}
                                                            onClick={() => req && appStore.openTab('rpc', req)}
                                                            className="cursor-pointer hover:bg-hover transition-colors"
                                                        >
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <FileText size={13} className="text-fg-subtle shrink-0" />
                                                                    <span className="font-medium text-fg truncate">{node.name}</span>
                                                                    <ChevronRight size={12} className="text-fg-subtle shrink-0" />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <span className="font-mono text-xs text-fg">{method ?? '—'}</span>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
                                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CHAIN_META[inferChain(selected.name)].color }} />
                                                                    {CHAIN_META[inferChain(selected.name)].label} Mainnet
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-xs text-fg-subtle">—</td>
                                                        </tr>
                                                    );
                                                })}
                                                {requests.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-8 text-center text-xs text-fg-subtle">
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
                                <div className="p-5 text-sm text-fg-muted">
                                    {selected.description || 'No description has been added to this collection yet.'}
                                </div>
                            )}

                            {tab === 'settings' && (
                                <div className="p-5 max-w-md space-y-4">
                                    <div className="rounded-[10px] border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-4">
                                        <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Delete collection</h3>
                                        <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1 mb-3">
                                            Permanently deletes &ldquo;{selected.name}&rdquo; and all {countRequests(selected)} of its requests. This cannot be undone.
                                        </p>
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Delete "${selected.name}"? This deletes all ${countRequests(selected)} of its requests. This cannot be undone.`)) {
                                                    appStore.deleteCollection(selected.id);
                                                    setSelectedId(null);
                                                }
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                                        >
                                            Delete collection
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
