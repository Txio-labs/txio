import React, { useMemo, useState } from 'react';
import { FolderKanban, FolderPlus, History as HistoryIcon } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { useChainScope } from '@/chains/useChainScope';
import { CollectionTree } from '../SideBar/CollectionTree';
import { canEditWorkspace, RequestType, type HistoryItem } from '@/types';
import { cx, IconButton, Segmented } from '../ui/primitives';

const timeOf = (ts: number) => (ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

/**
 * A side panel with this chain's collections and recent history, for layouts
 * that keep saved work next to the editor instead of on its own page.
 */
export function ResourcePanel({ className }: { className?: string }) {
    const { activeTabId, currentWorkspaceId, workspaces } = useAppStore();
    const { collections, history } = useChainScope();
    const [view, setView] = useState<'collections' | 'history'>('collections');
    const canEdit = canEditWorkspace(workspaces.find((w) => w.id === currentWorkspaceId));

    const recent = useMemo(
        () =>
            history
                .filter((item) => !item.workspaceId || item.workspaceId === currentWorkspaceId)
                .slice(-30)
                .reverse(),
        [history, currentWorkspaceId]
    );

    const replay = (item: HistoryItem) => appStore.openTab('rpc', { ...item, id: undefined, name: item.name });

    return (
        <div className={cx('flex flex-col min-h-0', className)}>
            <div className="h-10 flex items-center gap-2 px-2.5 border-b border-line shrink-0">
                <Segmented<'collections' | 'history'>
                    size="sm"
                    value={view}
                    onChange={setView}
                    options={[
                        { value: 'collections', label: 'Collections' },
                        { value: 'history', label: 'History' },
                    ]}
                />
                <div className="flex-1" />
                {view === 'collections' && canEdit && (
                    <IconButton label="New collection" size="sm" onClick={() => appStore.openTab('new_collection')}>
                        <FolderPlus size={14} />
                    </IconButton>
                )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar py-2">
                {view === 'collections' ? (
                    collections.length === 0 ? (
                        <EmptyHint icon={<FolderKanban size={16} />} text="No collections for this chain yet." />
                    ) : (
                        <CollectionTree
                            collections={collections}
                            activeTabId={activeTabId}
                            onToggleExpand={(id) => appStore.toggleCollectionExpand(id)}
                            onSelectCollectionRequest={(node) => node.requestData && appStore.openTab('rpc', node.requestData)}
                            onCreateCollection={(name) => void appStore.createCollection(name)}
                            readOnly={!canEdit}
                        />
                    )
                ) : recent.length === 0 ? (
                    <EmptyHint icon={<HistoryIcon size={16} />} text="Requests you send on this chain show up here." />
                ) : (
                    <ul className="px-1.5 space-y-px">
                        {recent.map((item, i) => {
                            const ok = item.status > 0 && item.status < 400;
                            return (
                                <li key={item.id || i}>
                                    <button
                                        onClick={() => replay(item)}
                                        className="w-full flex items-center gap-2 h-8 px-2 rounded-[7px] text-left hover:bg-hover transition-colors"
                                        title="Open again"
                                    >
                                        <span className={cx('text-[11px] font-mono font-semibold w-6 shrink-0', item.type === RequestType.RPC ? 'text-fg-subtle' : 'text-fg-muted')}>
                                            {item.type === RequestType.RPC ? 'RPC' : 'TX'}
                                        </span>
                                        <span className={cx('flex-1 truncate text-[13px]', ok ? 'text-fg' : 'text-red-600 dark:text-red-400')}>
                                            {item.rpcParams?.method || item.name || 'Untitled request'}
                                        </span>
                                        <span className="text-[11px] text-fg-subtle tabular shrink-0">{timeOf(item.timestamp)}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}

function EmptyHint({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-fg-subtle">
            {icon}
            <p className="text-xs leading-relaxed">{text}</p>
        </div>
    );
}
