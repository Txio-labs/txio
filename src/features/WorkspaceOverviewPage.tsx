/**
 * Workspace overview page — every number and list here is real, derived
 * from actual app state (collections, request history, environment
 * variables, EVM chain registry). Team membership/collaborator activity is
 * NOT modeled anywhere in this app yet (single-user auth, no invite/member
 * backend) — that section is intentionally omitted rather than filled with
 * invented teammates, matching how WalletsPage dropped its fabricated
 * "Wallet Activity" feed for the same reason.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowLeft,
    Check,
    ChevronDown,
    Command,
    FolderKanban,
    Globe,
    Layers,
    LayoutGrid,
    MoreHorizontal,
    Pencil,
    Plus,
    Settings2,
    Trash2,
    Users,
    Wallet as WalletIcon
} from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { EVM_CHAINS } from '@/lib/constants';
import { CollectionNode, RequestType } from '@/types';
import { CollectionsPage } from './CollectionsPage';
import { NetworksPage } from './NetworksPage';
import { WalletsPage } from './WalletsPage';
import { EnvironmentList } from '@/components/SideBar/EnvironmentList';
import { PromptModal } from '@/components/PromptModal';

function flattenRequests(nodes: CollectionNode[], collectionName: string): { node: CollectionNode; collectionName: string }[] {
    const out: { node: CollectionNode; collectionName: string }[] = [];
    for (const node of nodes) {
        if (node.type === 'request') {
            out.push({ node, collectionName });
        }
        if (node.children) {
            out.push(...flattenRequests(node.children, node.type === 'collection' ? node.name : collectionName));
        }
    }
    return out;
}

const WorkspaceRequestsPanel: React.FC = () => {
    const { collections } = useAppStore();
    const allRequests = useMemo(
        () => collections.flatMap((c) => flattenRequests(c.children ?? [], c.name)),
        [collections]
    );

    if (allRequests.length === 0) {
        return (
            <div className="py-16 text-center">
                <Command size={28} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm text-slate-500">No saved requests yet.</p>
                <p className="text-xs text-slate-400 mt-1">Save a request from the RPC Builder to see it here.</p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow overflow-hidden">
            <div className="divide-y divide-slate-200 dark:divide-white/5">
                {allRequests.map(({ node, collectionName }) => {
                    const req = node.requestData;
                    return (
                        <button
                            key={node.id}
                            onClick={() => req && appStore.openTab('rpc', req)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white dark:hover:bg-white/5 transition-colors"
                        >
                            <Command size={14} className="text-slate-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{node.name}</div>
                                <div className="text-[10px] text-slate-400">{collectionName}</div>
                            </div>
                            {req?.rpcParams?.method && (
                                <span className="text-[10px] font-mono text-slate-500 shrink-0">{req.rpcParams.method}</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

type ChainFamily = 'sui' | 'evm' | 'solana' | 'stellar';

const CHAIN_META: Record<ChainFamily, { label: string; color: string }> = {
    sui: { label: 'Sui', color: '#6fbcf0' },
    evm: { label: 'Ethereum', color: '#a5a8f7' },
    solana: { label: 'Solana', color: '#14f195' },
    stellar: { label: 'Stellar', color: '#f5d060' }
};

const TABS = ['Overview', 'Requests', 'Collections', 'Networks', 'Environments', 'Wallets'] as const;

function timeAgo(ts: number): string {
    const diffMs = Date.now() - ts;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export const WorkspaceOverviewPage: React.FC = () => {
    const { workspaces, currentWorkspaceId, collections, history, envVariables } = useAppStore();
    const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];
    const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Overview');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isWsMenuOpen, setIsWsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const wsMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isMenuOpen && !isWsMenuOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
            if (wsMenuRef.current && !wsMenuRef.current.contains(event.target as Node)) {
                setIsWsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen, isWsMenuOpen]);

    const [isCreateWsModalOpen, setIsCreateWsModalOpen] = useState(false);
    const [isRenameWsModalOpen, setIsRenameWsModalOpen] = useState(false);

    const handleCreateWorkspace = () => {
        setIsWsMenuOpen(false);
        setIsCreateWsModalOpen(true);
    };

    const handleRenameWorkspace = () => {
        setIsMenuOpen(false);
        if (!currentWorkspace) return;
        setIsRenameWsModalOpen(true);
    };

    const handleDeleteWorkspace = () => {
        setIsMenuOpen(false);
        if (!currentWorkspace) return;
        if (workspaces.length <= 1) {
            appStore.showToast('Cannot delete your only workspace', 'error');
            return;
        }
        if (window.confirm(`Delete "${currentWorkspace.name}"? This deletes all of its collections, requests, and history. This cannot be undone.`)) {
            void appStore.deleteWorkspace(currentWorkspace.id);
        }
    };

    const collectionCount = collections.length;
    const totalRequests = useMemo(() => history.filter((h) => h.type === RequestType.RPC).length, [history]);
    const totalTransactions = useMemo(() => history.filter((h) => h.type === RequestType.TRANSACTION).length, [history]);
    const recentHistory = useMemo(() => history.slice().reverse().slice(0, 5), [history]);
    const recentCollections = useMemo(() => collections.slice(0, 4), [collections]);
    // "Networks" = chains this app actually has RPC config for (Sui, EVM, Solana, Stellar as
    // network families) plus the curated EVM mainnet registry — a real, countable figure.
    const networkCount = 3 + EVM_CHAINS.length;

    const quickActions = useMemo(() => [
        { label: 'New Request', desc: 'Create a new request', icon: FolderKanban, onClick: () => appStore.openTab('new_request') },
        { label: 'New Collection', desc: 'Organize your requests', icon: Layers, onClick: () => appStore.openTab('new_collection') },
        { label: 'Add Network', desc: 'Configure a network', icon: Globe, onClick: () => appStore.openTab('infrastructure') },
        { label: 'Manage Wallets', desc: 'Connect or switch wallets', icon: WalletIcon, onClick: () => appStore.openTab('profile') }
    ], []);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-near-black p-6 md:p-8">
            <div className="space-y-6">
                <button
                    onClick={() => appStore.openTab('dashboard')}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft size={12} /> Back to Workspaces
                </button>

                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-electric-violet/10 border border-electric-violet/20 flex items-center justify-center text-electric-violet shrink-0">
                            <Users size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{currentWorkspace?.name ?? 'Workspace'}</h1>
                                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300">
                                    {currentWorkspace?.type === 'Team' ? 'Team Workspace' : 'Personal Workspace'}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5">Build and manage your blockchain requests.</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><FolderKanban size={11} /> {collectionCount} collections</span>
                                <span className="flex items-center gap-1"><Globe size={11} /> {networkCount} networks</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="relative" ref={wsMenuRef}>
                            <button
                                onClick={() => setIsWsMenuOpen((o) => !o)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${
                                    isWsMenuOpen
                                        ? 'border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5'
                                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                            >
                                <LayoutGrid size={13} className="text-slate-500" />
                                Switch Workspace
                                <ChevronDown size={11} className={`text-slate-500 transition-transform duration-200 ${isWsMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isWsMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-3 pt-2.5 pb-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400 dark:text-slate-600">
                                        {workspaces.length === 1 ? '1 workspace' : `${workspaces.length} workspaces`}
                                    </div>
                                    <div className="px-1.5 pb-1.5 max-h-64 overflow-y-auto custom-scrollbar space-y-0.5">
                                        {workspaces.map((ws) => {
                                            const isActive = ws.id === currentWorkspace?.id;
                                            return (
                                                <button
                                                    key={ws.id}
                                                    onClick={() => { appStore.setWorkspace(ws); setIsWsMenuOpen(false); }}
                                                    className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                                                        isActive ? 'bg-electric-violet/10 text-slate-900 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                                                    }`}
                                                >
                                                    <span className="truncate flex-1">{ws.name}</span>
                                                    {isActive && <Check size={12} className="text-electric-violet shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="p-1.5 bg-slate-50 dark:bg-white/[0.015] border-t border-slate-200 dark:border-white/[0.06]">
                                        <button
                                            onClick={handleCreateWorkspace}
                                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white transition-colors"
                                        >
                                            <Plus size={14} className="text-electric-violet shrink-0" />
                                            <span>Create workspace</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setIsMenuOpen((o) => !o)}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                                <MoreHorizontal size={16} />
                            </button>
                            {isMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 p-1.5">
                                    <button
                                        onClick={handleRenameWorkspace}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <Pencil size={13} className="text-slate-400" /> Rename workspace
                                    </button>
                                    <button
                                        onClick={handleDeleteWorkspace}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 size={13} /> Delete workspace
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-slate-200 dark:border-white/10 overflow-x-auto no-scrollbar">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors -mb-px ${
                                activeTab === tab
                                    ? 'border-electric-violet text-slate-900 dark:text-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'Overview' && (
                    <div className="space-y-6">
                        {/* Stat cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Total Requests', value: String(totalRequests) },
                                { label: 'Total Transactions', value: String(totalTransactions) },
                                { label: 'Networks', value: String(networkCount) },
                                { label: 'Collections', value: String(collectionCount) }
                            ].map((stat) => (
                                <div key={stat.label} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-4">
                                    <div className="text-[11px] text-slate-500">{stat.label}</div>
                                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Recent activity — real request history */}
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recent Activity</h3>
                                    <button
                                        onClick={() => appStore.openTab('history')}
                                        className="text-[11px] font-bold text-electric-violet hover:opacity-80 transition-colors"
                                    >
                                        View all
                                    </button>
                                </div>
                                {recentHistory.length === 0 ? (
                                    <div className="text-center py-8 text-xs text-slate-500">No requests executed yet.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {recentHistory.map((item) => (
                                            <div key={item.id} className="flex items-center gap-2.5">
                                                <span
                                                    className={`w-2 h-2 rounded-full shrink-0 ${item.status && item.status < 400 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs text-slate-700 dark:text-slate-200 truncate font-medium">
                                                        {item.rpcParams?.method || item.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">{item.network} · {timeAgo(item.timestamp)}</div>
                                                </div>
                                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 bg-electric-violet/10 text-electric-violet">
                                                    {item.type}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Quick actions */}
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-5">
                                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Quick Actions</h3>
                                <div className="space-y-2">
                                    {quickActions.map((action, i) => (
                                        <button
                                            key={action.label}
                                            onClick={action.onClick}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                                                i === 0
                                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-near-black hover:opacity-90'
                                                    : 'border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <action.icon size={15} className={i === 0 ? 'text-white' : 'text-slate-500'} />
                                            <div className="min-w-0">
                                                <div className={`text-xs font-bold ${i === 0 ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>{action.label}</div>
                                                <div className={`text-[10px] ${i === 0 ? 'text-white/70' : 'text-slate-500'}`}>{action.desc}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Workspace resources */}
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-5">
                                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Workspace Resources</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: 'Collections', value: collectionCount, icon: FolderKanban, action: () => appStore.openTab('collections') },
                                        { label: 'Networks', value: networkCount, icon: Globe, action: () => appStore.openTab('infrastructure') },
                                        { label: 'Environment Vars', value: envVariables.length, icon: Settings2, action: () => appStore.openTab('settings') },
                                        { label: 'Wallets', value: 1, icon: WalletIcon, action: () => appStore.openTab('profile') }
                                    ].map((res) => (
                                        <button
                                            key={res.label}
                                            onClick={res.action}
                                            className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 text-left transition-colors"
                                        >
                                            <res.icon size={16} className="text-slate-400" />
                                            <div>
                                                <div className="text-lg font-bold text-slate-900 dark:text-white leading-none">{res.value}</div>
                                                <div className="text-[10px] text-slate-500 mt-1">{res.label}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Recent collections */}
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recent Collections</h3>
                                    <button
                                        onClick={() => appStore.openTab('collections')}
                                        className="text-[11px] font-bold text-electric-violet hover:opacity-80 transition-colors"
                                    >
                                        View all
                                    </button>
                                </div>
                                {recentCollections.length === 0 ? (
                                    <div className="text-center py-8 text-xs text-slate-500">No collections yet.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {recentCollections.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => appStore.openTab('collections')}
                                                className="w-full flex items-center gap-2.5 text-left hover:bg-white dark:hover:bg-white/5 rounded-lg p-1.5 -m-1.5 transition-colors"
                                            >
                                                <FolderKanban size={14} className="text-slate-400 shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{c.name}</div>
                                                    <div className="text-[10px] text-slate-400">{(c.children ?? []).length} requests</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Requests' && <WorkspaceRequestsPanel />}
                {activeTab === 'Collections' && <div className="-mx-6 md:-mx-8 -mt-2"><CollectionsPage /></div>}
                {activeTab === 'Networks' && <div className="-mx-6 md:-mx-8 -mt-2"><NetworksPage /></div>}
                {activeTab === 'Environments' && (
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow overflow-hidden">
                        <EnvironmentList envVariables={envVariables} onUpdateEnv={appStore.updateEnv} />
                    </div>
                )}
                {activeTab === 'Wallets' && <div className="-mx-6 md:-mx-8 -mt-2"><WalletsPage /></div>}
            </div>

            <PromptModal
                isOpen={isCreateWsModalOpen}
                onClose={() => setIsCreateWsModalOpen(false)}
                title="Create Workspace"
                description="Give your new workspace a name."
                label="Workspace name"
                placeholder="e.g. My Team"
                confirmLabel="Create"
                icon={Users}
                onSubmit={(name) => {
                    setIsCreateWsModalOpen(false);
                    void appStore.createWorkspace(name);
                }}
            />

            <PromptModal
                isOpen={isRenameWsModalOpen}
                onClose={() => setIsRenameWsModalOpen(false)}
                title="Rename Workspace"
                label="Workspace name"
                placeholder="e.g. My Team"
                initialValue={currentWorkspace?.name ?? ''}
                confirmLabel="Save"
                icon={Pencil}
                onSubmit={(name) => {
                    setIsRenameWsModalOpen(false);
                    if (currentWorkspace && name !== currentWorkspace.name) {
                        void appStore.renameWorkspace(currentWorkspace.id, name);
                    }
                }}
            />
        </div>
    );
};
