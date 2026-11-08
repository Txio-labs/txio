import React, { useState, useRef, useEffect } from 'react';
import {
    Settings,
    ChevronsUpDown,
    Loader2,
    LayoutGrid,
    Plus,
    Layers,
    Command,
    Search,
    Check,
    Terminal,
    LayoutDashboard,
    Zap,
    FolderKanban,
    Briefcase,
    Network as NetworkIcon,
    Wallet as WalletIcon,
    BookOpen,
    HelpCircle,
    Bell,
    BellOff,
    Activity,
    MoreHorizontal,
    PanelRight,
    PanelLeft,
    ShieldCheck,
    Menu,
    Code2,
    KeyRound,
    Repeat,
    CheckCircle2,
    XCircle,
    Info,
    X,
    UserCog,
    Hammer,
    ChevronRight,
} from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { Tab } from './ui/Tabs';
import { TabItem, FeatureId, RequestType } from '../types';
import { NetworkSwitcherModal } from './NetworkSwitcherModal';
import { PromptModal } from './PromptModal';
import { CommandPalette } from './CommandPalette';
import { TerminalPanel } from './TerminalPanel';
import { useWallet } from '@/wallet';
import { shortenAddress } from '@/wallet/utils';
import { RPC_CHAINS } from '@/lib/constants';
import { ProfileMenu } from './ProfileMenu';
import { cx, IconButton, Kbd, StatusDot, networkTone } from './ui/primitives';
import { TxioMark } from './ui/TxioMark';
import { useEnter } from '@/lib/motion';

interface LayoutProps {
    workspace: React.ReactNode;
    inspector: React.ReactNode;
    tabs?: TabItem[];
    activeTabId?: string;
    onSelectTab?: (id: string | null) => void;
    onCloseTab?: (id: string) => void;
    onRenameTab?: (id: string, title: string) => void;
    onNewTab?: () => void;
    onCreateWorkspace?: (name: string) => void;
}

interface NavItem {
    id: FeatureId;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
    {
        label: 'Build',
        items: [
            { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
            { id: 'rpc', label: 'Requests', icon: Zap },
            { id: 'move', label: 'Contracts', icon: Hammer },
            { id: 'collections', label: 'Collections', icon: FolderKanban },
            { id: 'history', label: 'History', icon: Activity },
        ],
    },
    {
        label: 'Assets',
        items: [
            { id: 'send', label: 'Send', icon: Repeat },
            { id: 'profile', label: 'Wallets', icon: WalletIcon },
            { id: 'approvals', label: 'Approvals', icon: KeyRound },
        ],
    },
    {
        label: 'Operate',
        items: [
            { id: 'infrastructure', label: 'Networks', icon: NetworkIcon },
            { id: 'automation', label: 'Automation', icon: ShieldCheck },
            { id: 'workspace_overview', label: 'Workspaces', icon: Briefcase },
        ],
    },
];

const NAV_FOOTER: NavItem[] = [
    { id: 'docs', label: 'Documentation', icon: BookOpen },
    { id: 'developers', label: 'Developers', icon: Code2 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
];

// Only rendered for accounts with the server-side is_admin flag; the backend
// rejects /admin requests from anyone else regardless of what the UI shows.
const ADMIN_NAV_ITEM: NavItem = { id: 'admin', label: 'Admin', icon: UserCog };

const PAGE_TITLES: Partial<Record<FeatureId, string>> = {
    dashboard: 'Overview',
    rpc: 'Request',
    ptb: 'Request',
    move: 'Contracts',
    collections: 'Collections',
    history: 'History',
    send: 'Send',
    profile: 'Wallets',
    account: 'Profile',
    approvals: 'Approvals',
    infrastructure: 'Networks',
    automation: 'Automation',
    workspace_overview: 'Workspaces',
    docs: 'Documentation',
    developers: 'Developers',
    settings: 'Settings',
    help: 'Help',
    admin: 'Admin',
    new_request: 'New request',
    new_collection: 'New collection',
    runner: 'Collection runner',
    ecosystem: 'Ecosystem',
    features: 'Features',
    integrations: 'Integrations',
    partners: 'Partners',
};

const NOTIF_META = {
    success: { icon: CheckCircle2, className: 'text-emerald-500' },
    error: { icon: XCircle, className: 'text-red-500' },
    info: { icon: Info, className: 'text-sky-500' },
} as const;

function notifTimeAgo(ts: number): string {
    const secs = Math.floor((Date.now() - ts) / 1000);
    if (secs < 5) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
}

// The Terminal is the execution console for requests: it only makes sense while a
// request-editing view is open. "new_request" is the type picker shown before a
// request exists, and "new_collection" isn't a request at all.
const REQUEST_TAB_TYPES: ReadonlySet<FeatureId> = new Set(['rpc', 'ptb', 'move', 'runner']);

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
    const callback = useRef(onOutside);
    useEffect(() => {
        callback.current = onOutside;
    });
    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) callback.current();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [ref]);
}

export const Layout: React.FC<LayoutProps> = ({
    workspace,
    inspector,
    tabs = [],
    activeTabId,
    onSelectTab,
    onCloseTab,
    onRenameTab,
    onNewTab,
    onCreateWorkspace,
}) => {
    const {
        isInspectorOpen,
        isSidebarOpen,
        network,
        isSyncing,
        scanStep,
        isTerminalOpen,
        pendingNetworkSwitch,
        tabs: storeTabs,
        activeTabId: storeActiveTabId,
        workspaces,
        currentWorkspaceId,
        notifications,
        activityLogs,
        user,
    } = useAppStore();
    const navFooter = user?.isAdmin ? [ADMIN_NAV_ITEM, ...NAV_FOOTER] : NAV_FOOTER;
    const { currentWallet, isConnected, openModal } = useWallet();
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
    const [isCreateWsModalOpen, setIsCreateWsModalOpen] = useState(false);
    const [isTabMenuOpen, setIsTabMenuOpen] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const notifRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const wsMenuRef = useRef<HTMLDivElement>(null);
    const tabMenuRef = useRef<HTMLDivElement>(null);

    useClickOutside(notifRef, () => setIsNotifOpen(false));
    useClickOutside(wsMenuRef, () => setIsWsDropdownOpen(false));
    useClickOutside(tabMenuRef, () => setIsTabMenuOpen(false));

    const activeTab = storeTabs.find((t) => t.id === (activeTabId ?? storeActiveTabId));
    useEnter(contentRef, activeTab?.id ?? 'home');
    const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];
    const isRequestView = Boolean(activeTab && REQUEST_TAB_TYPES.has(activeTab.type));

    // Only a request has a chain: outside one, show no chain rather than implying a default.
    // Contracts and the runner pick their own chain, so the chip only shows on a request.
    const activeChainId = activeTab && (activeTab.type === 'rpc' || activeTab.type === 'ptb') ? activeTab.data?.rpcParams?.chain ?? null : null;
    const activeChainLabel = activeChainId ? RPC_CHAINS.find((c) => c.id === activeChainId)?.label ?? activeChainId : null;
    const pageTitle = activeTab ? (REQUEST_TAB_TYPES.has(activeTab.type) ? activeTab.title : PAGE_TITLES[activeTab.type] ?? activeTab.title) : 'Overview';
    const pageSection = activeTab ? NAV_GROUPS.find((g) => g.items.some((i) => i.id === activeTab.type))?.label : 'Build';

    useEffect(() => {
        const update = () => setIsOnline(navigator.onLine);
        update();
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);

    // On a phone the inspector is a full-screen overlay, so it must not open over the
    // app on first load just because it's docked open on desktop.
    useEffect(() => {
        if (window.matchMedia?.('(max-width: 767px)').matches && appStore.getSnapshot().isInspectorOpen) {
            appStore.toggleInspector();
        }
    }, []);

    const recentErrorCount = (activityLogs ?? []).filter((log) => log.type === 'error').length;
    const collapsed = !isSidebarOpen;

    const navButton = (item: NavItem, isActive: boolean) => (
        <button
            key={item.id}
            onClick={() => {
                appStore.openTab(item.id);
                setIsMobileNavOpen(false);
            }}
            title={item.label}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className={cx(
                'group relative w-full flex items-center gap-2.5 h-8 rounded-[7px] text-[14px] transition-colors',
                collapsed ? 'md:justify-center md:px-0 px-2.5' : 'px-2.5',
                isActive ? 'bg-active text-fg font-medium' : 'text-fg-muted hover:text-fg hover:bg-hover'
            )}
        >
            <item.icon size={15} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-fg' : 'text-fg-subtle group-hover:text-fg-muted'} />
            <span className={cx('truncate', collapsed && 'md:hidden')}>{item.label}</span>
        </button>
    );

    return (
        <div className="flex h-screen bg-canvas text-fg overflow-hidden font-sans text-[14px] relative">
            <CommandPalette />
            <NetworkSwitcherModal
                isOpen={pendingNetworkSwitch !== null}
                onClose={() => appStore.cancelNetworkSwitch()}
                onConfirm={() => appStore.confirmNetworkSwitch()}
                from={network}
                to={pendingNetworkSwitch || network}
            />
            <PromptModal
                isOpen={isCreateWsModalOpen}
                onClose={() => setIsCreateWsModalOpen(false)}
                title="Create workspace"
                description="Workspaces hold collections, environments and history. Invite your team later."
                label="Workspace name"
                placeholder="e.g. Protocol team"
                confirmLabel="Create workspace"
                icon={LayoutGrid}
                onSubmit={(name) => {
                    setIsCreateWsModalOpen(false);
                    onCreateWorkspace?.(name);
                }}
            />

            {isSyncing && (
                <div className="fixed inset-0 z-[110] bg-canvas/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 animate-in fade-in">
                    <Loader2 className="text-fg-muted animate-spin" size={28} />
                    <p className="text-fg text-xs font-mono">{scanStep || 'Syncing…'}</p>
                </div>
            )}

            {isMobileNavOpen && (
                <button
                    onClick={() => setIsMobileNavOpen(false)}
                    aria-label="Close navigation"
                    className="md:hidden fixed inset-0 z-30 bg-black/50 animate-in fade-in"
                />
            )}

            {/* Sidebar */}
            <nav
                aria-label="Main navigation"
                className={cx(
                    'fixed inset-y-0 left-0 z-40 md:static md:z-auto shrink-0 flex flex-col bg-canvas transition-[width,transform] duration-200 w-[264px] md:translate-x-0',
                    collapsed ? 'md:w-[60px]' : 'md:w-[244px]',
                    isMobileNavOpen ? 'translate-x-0 border-r border-line' : '-translate-x-full'
                )}
            >
                {/* Workspace switcher */}
                <div className={cx('relative px-2.5 pt-2.5 pb-1', collapsed && 'md:px-2')} ref={wsMenuRef}>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsWsDropdownOpen((o) => !o)}
                            className={cx(
                                'flex-1 min-w-0 flex items-center gap-2.5 h-10 rounded-[9px] px-1.5 hover:bg-hover transition-colors text-left',
                                collapsed && 'md:justify-center md:px-0'
                            )}
                            aria-label="txio TXIO"
                            title="Switch workspace"
                        >
                            <span className="h-7 w-7 rounded-[8px] bg-surface border border-line shadow-card flex items-center justify-center shrink-0">
                                <TxioMark size={18} />
                            </span>
                            <span className={cx('min-w-0 flex-1', collapsed && 'md:hidden')}>
                                <span className="block text-[14px] font-semibold text-fg truncate leading-tight">
                                    {currentWorkspace?.name ?? 'Txio'}
                                </span>
                                <span className="block text-[12px] text-fg-subtle truncate leading-tight mt-0.5">
                                    {user ? user.email ?? user.name : 'Local workspace'}
                                </span>
                            </span>
                            <ChevronsUpDown size={13} className={cx('text-fg-subtle shrink-0', collapsed && 'md:hidden')} />
                        </button>
                        <IconButton
                            label="Close menu"
                            size="sm"
                            className="md:hidden"
                            onClick={() => setIsMobileNavOpen(false)}
                        >
                            <X size={14} />
                        </IconButton>
                    </div>

                    {isWsDropdownOpen && (
                        <div className="absolute left-2.5 top-full mt-1 w-[248px] bg-elevated border border-line rounded-card shadow-pop overflow-hidden z-50 animate-in fade-in zoom-in-95">
                            <div className="px-3 pt-2.5 pb-1.5 text-[12px] font-medium text-fg-subtle">
                                Workspaces
                            </div>
                            <div className="px-1 pb-1 max-h-64 overflow-y-auto custom-scrollbar">
                                {workspaces.map((ws, i) => {
                                    const isActive = ws.id === currentWorkspace?.id;
                                    return (
                                        <button
                                            key={ws.id}
                                            onClick={() => {
                                                appStore.setWorkspace(ws);
                                                setIsWsDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center gap-2.5 rounded-[7px] px-2 h-8 text-left text-[14px] text-fg hover:bg-hover transition-colors"
                                        >
                                            <span className="h-5 w-5 rounded-[5px] bg-active text-[12px] font-semibold flex items-center justify-center text-fg-muted">
                                                {ws.name.slice(0, 1).toUpperCase()}
                                            </span>
                                            <span className="truncate flex-1">{ws.name}</span>
                                            {isActive ? <Check size={13} className="text-fg shrink-0" /> : i < 9 && <Kbd>{i + 1}</Kbd>}
                                        </button>
                                    );
                                })}
                            </div>
                            {onCreateWorkspace && (
                                <div className="p-1 border-t border-line">
                                    <button
                                        onClick={() => {
                                            setIsWsDropdownOpen(false);
                                            setIsCreateWsModalOpen(true);
                                        }}
                                        className="w-full flex items-center gap-2.5 rounded-[7px] px-2 h-8 text-left text-[14px] text-fg-muted hover:bg-hover hover:text-fg transition-colors"
                                    >
                                        <Plus size={14} className="shrink-0" />
                                        <span>Create workspace</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Search + new */}
                <div className={cx('px-2.5 pb-2 space-y-1', collapsed && 'md:px-2')}>
                    <button
                        onClick={() => appStore.setCommandPalette(true)}
                        className={cx(
                            'w-full flex items-center gap-2 h-8 rounded-[7px] border border-line bg-surface hover:border-line-strong px-2.5 text-fg-subtle transition-colors shadow-card',
                            collapsed && 'md:justify-center md:px-0'
                        )}
                        title="Search requests, collections, networks... (Ctrl+K)"
                    >
                        <Search size={13} className="shrink-0" />
                        <span className={cx('flex-1 text-left text-[14px] truncate', collapsed && 'md:hidden')}>Search…</span>
                        <span className={cx('flex items-center gap-0.5', collapsed && 'md:hidden')}>
                            <Kbd>⌘</Kbd>
                            <Kbd>K</Kbd>
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            onNewTab?.();
                            setIsMobileNavOpen(false);
                        }}
                        className={cx(
                            'w-full flex items-center gap-2 h-8 rounded-[7px] px-2.5 text-fg-muted hover:text-fg hover:bg-hover transition-colors',
                            collapsed && 'md:justify-center md:px-0'
                        )}
                        title="New request"
                    >
                        <Plus size={14} className="shrink-0" />
                        <span className={cx('flex-1 text-left text-[14px]', collapsed && 'md:hidden')}>New request</span>
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-2.5 pb-2 flex flex-col">
                    {NAV_GROUPS.map((group) => (
                        <div key={group.label} className="mb-3">
                            <div className={cx('px-2.5 h-6 flex items-center text-[12px] font-medium text-fg-subtle', collapsed && 'md:hidden')}>
                                {group.label}
                            </div>
                            {collapsed && <div className="hidden md:block mx-3 my-2 h-px bg-line" />}
                            <div className="space-y-px">
                                {group.items.map((item) =>
                                    navButton(item, activeTab?.type === item.id || (!activeTab && item.id === 'dashboard'))
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="mt-auto pt-2 space-y-px">
                        {navFooter.map((item) => navButton(item, activeTab?.type === item.id))}
                    </div>
                </div>

                {/* Footer: status + account */}
                <div className={cx('border-t border-line px-2.5 py-2 flex items-center gap-2', collapsed && 'md:flex-col md:px-2')}>
                    <ProfileMenu compact={collapsed} />
                    <div className={cx('flex-1', collapsed && 'md:hidden')} />
                    <IconButton
                        label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        size="sm"
                        className="hidden md:inline-flex"
                        onClick={() => appStore.toggleSidebar()}
                    >
                        <PanelLeft size={14} />
                    </IconButton>
                </div>
            </nav>

            {/* Main frame */}
            <div className="flex-1 flex min-w-0 md:py-2 md:pr-2 gap-2">
                <main className="flex-1 flex flex-col min-w-0 bg-surface md:rounded-panel md:border md:border-line md:shadow-card overflow-hidden relative">
                    <header className="h-12 flex items-center gap-2 px-3 border-b border-line shrink-0">
                        <IconButton label="Open navigation" className="md:hidden -ml-1" onClick={() => setIsMobileNavOpen(true)}>
                            <Menu size={16} />
                        </IconButton>

                        <div className="flex items-center gap-1.5 min-w-0 text-[14px]">
                            {pageSection && <span className="hidden sm:inline text-fg-subtle">{pageSection}</span>}
                            {pageSection && <ChevronRight size={13} className="hidden sm:inline text-fg-subtle/70 shrink-0" />}
                            <span className="font-medium text-fg truncate">{pageTitle}</span>
                            {activeChainLabel && (
                                <span className="hidden sm:inline-flex items-center gap-1.5 ml-1.5 h-[22px] px-2 rounded-md border border-line bg-sunken text-[12px] text-fg-muted">
                                    {activeChainLabel}
                                </span>
                            )}
                        </div>

                        <div className="flex-1" />

                        <button
                            onClick={() => appStore.openTab('infrastructure')}
                            className="hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[7px] border border-line hover:border-line-strong text-xs text-fg-muted hover:text-fg transition-colors capitalize"
                            title="Network"
                        >
                            <StatusDot tone={networkTone(network)} />
                            {network}
                        </button>

                        {isRequestView && (
                            <IconButton label="Terminal" active={isTerminalOpen} onClick={() => appStore.toggleTerminal()}>
                                <Terminal size={15} />
                            </IconButton>
                        )}

                        <div className="relative" ref={notifRef}>
                            <IconButton label="Notifications" active={isNotifOpen} onClick={() => setIsNotifOpen((o) => !o)} className="relative">
                                <Bell size={15} />
                                {notifications.length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-fg ring-2 ring-surface" />
                                )}
                            </IconButton>
                            {isNotifOpen && (
                                <div className="absolute top-full right-0 mt-1.5 w-80 bg-elevated border border-line rounded-card shadow-pop overflow-hidden z-50 animate-in fade-in zoom-in-95">
                                    <div className="flex items-center justify-between px-3.5 h-10 border-b border-line">
                                        <h3 className="text-[14px] font-semibold">Notifications</h3>
                                        {notifications.length > 0 && (
                                            <button
                                                onClick={() => appStore.clearNotifications()}
                                                className="text-xs text-fg-subtle hover:text-fg transition-colors"
                                            >
                                                Clear all
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                        {notifications.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center gap-2 py-10 px-4">
                                                <BellOff size={18} className="text-fg-subtle" />
                                                <p className="text-xs text-fg-subtle">You&apos;re all caught up</p>
                                            </div>
                                        ) : (
                                            <div className="p-1">
                                                {notifications
                                                    .slice()
                                                    .reverse()
                                                    .map((n) => {
                                                        const meta = NOTIF_META[n.type];
                                                        return (
                                                            <div
                                                                key={n.id}
                                                                className="group flex items-start gap-2.5 px-2.5 py-2 rounded-[7px] hover:bg-hover transition-colors"
                                                            >
                                                                <meta.icon size={14} className={cx('mt-0.5 shrink-0', meta.className)} />
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-[14px] text-fg leading-snug">{n.message}</p>
                                                                    <p className="text-[12px] text-fg-subtle mt-0.5">{notifTimeAgo(n.timestamp)}</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => appStore.dismissNotification(n.id)}
                                                                    className="opacity-0 group-hover:opacity-100 text-fg-subtle hover:text-fg transition-opacity shrink-0 mt-0.5"
                                                                    aria-label="Dismiss"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={openModal}
                            className={cx(
                                'inline-flex items-center gap-2 h-8 px-3 rounded-control text-[14px] font-medium transition-all shrink-0',
                                isConnected
                                    ? 'border border-line bg-surface hover:border-line-strong text-fg shadow-card'
                                    : 'bg-inverse text-on-inverse hover:opacity-90'
                            )}
                            aria-label={isConnected ? 'Open wallet manager' : 'Connect wallet'}
                            title={isConnected ? 'Open wallet manager' : 'Connect wallet'}
                        >
                            {isConnected && currentWallet ? (
                                <>
                                    <StatusDot tone="success" />
                                    <span className="font-mono text-xs">{shortenAddress(currentWallet.address)}</span>
                                </>
                            ) : (
                                <>
                                    <WalletIcon size={14} />
                                    <span className="hidden sm:inline">Connect wallet</span>
                                </>
                            )}
                        </button>

                        <IconButton
                            label={isInspectorOpen ? 'Close inspector' : 'Open wallet panel'}
                            active={isInspectorOpen}
                            onClick={() => appStore.toggleInspector()}
                        >
                            <PanelRight size={15} />
                        </IconButton>
                    </header>

                    {tabs.length > 0 && (
                        <div className="h-10 flex items-end gap-1 px-2 border-b border-line bg-sunken/50 shrink-0">
                            <div role="tablist" className="flex items-end gap-0.5 overflow-x-auto no-scrollbar min-w-0 flex-1 h-full pt-1.5">
                                {tabs.map((tab) => (
                                    <Tab
                                        key={tab.id}
                                        id={tab.id}
                                        title={tab.title}
                                        isActive={tab.id === activeTabId}
                                        onSelect={() => onSelectTab && onSelectTab(tab.id)}
                                        onClose={() => onCloseTab && onCloseTab(tab.id)}
                                        onRename={(newTitle) => onRenameTab && onRenameTab(tab.id, newTitle)}
                                        icon={
                                            tab.type === 'ptb' || (tab.type === 'rpc' && tab.data?.type === RequestType.TRANSACTION) ? (
                                                <Layers size={12} />
                                            ) : tab.type === 'rpc' ? (
                                                <Command size={12} />
                                            ) : undefined
                                        }
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-0.5 self-center shrink-0">
                                <IconButton label="New tab" size="sm" onClick={onNewTab}>
                                    <Plus size={14} />
                                </IconButton>
                                <div className="relative" ref={tabMenuRef}>
                                    <IconButton label="Tab options" size="sm" active={isTabMenuOpen} onClick={() => setIsTabMenuOpen((v) => !v)}>
                                        <MoreHorizontal size={14} />
                                    </IconButton>
                                    {isTabMenuOpen && (
                                        <div className="absolute top-full right-0 mt-1 w-52 bg-elevated border border-line rounded-card shadow-pop overflow-hidden z-50 p-1 animate-in fade-in zoom-in-95">
                                            <button
                                                onClick={() => {
                                                    appStore.closeAllTabs();
                                                    setIsTabMenuOpen(false);
                                                }}
                                                className="w-full flex items-center justify-between gap-3 px-2.5 h-8 rounded-[7px] text-left text-[14px] text-fg hover:bg-hover transition-colors"
                                            >
                                                <span>Close all</span>
                                                <span className="text-[12px] text-fg-subtle">Ctrl+K W</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    appStore.closeSavedTabs();
                                                    setIsTabMenuOpen(false);
                                                }}
                                                className="w-full flex items-center justify-between gap-3 px-2.5 h-8 rounded-[7px] text-left text-[14px] text-fg hover:bg-hover transition-colors"
                                            >
                                                <span>Close saved</span>
                                                <span className="text-[12px] text-fg-subtle">Ctrl+K U</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={contentRef} className="flex-1 overflow-hidden relative">
                        {workspace}
                    </div>

                    {isRequestView && <TerminalPanel />}

                    <footer className="h-7 flex items-center gap-4 px-3 border-t border-line text-[12px] text-fg-subtle shrink-0 select-none">
                        {!isOnline ? (
                            <span className="flex items-center gap-1.5 text-red-500">
                                <StatusDot tone="danger" /> Offline
                            </span>
                        ) : recentErrorCount > 0 ? (
                            <button
                                onClick={() => appStore.openTab('workspace_overview')}
                                className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 hover:underline"
                                title="See workspace activity"
                            >
                                <StatusDot tone="warning" />
                                {recentErrorCount} recent error{recentErrorCount === 1 ? '' : 's'}
                            </button>
                        ) : (
                            <span className="flex items-center gap-1.5">
                                <StatusDot tone="success" /> Online
                            </span>
                        )}
                        {isRequestView && (
                            <button
                                onClick={() => appStore.toggleTerminal()}
                                className={cx('flex items-center gap-1 transition-colors', isTerminalOpen ? 'text-fg' : 'hover:text-fg')}
                            >
                                <Terminal size={11} /> Terminal
                            </button>
                        )}
                        <div className="flex-1" />
                        <button onClick={() => appStore.setCommandPalette(true)} className="hidden sm:flex items-center gap-1.5 hover:text-fg transition-colors">
                            Commands <Kbd>⌘K</Kbd>
                        </button>
                        <button onClick={() => appStore.openTab('settings')} className="hover:text-fg transition-colors font-mono">
                            v2.6.0
                        </button>
                    </footer>
                </main>

                {isInspectorOpen && (
                    <>
                        {/* Below md the panel becomes a full-screen overlay instead of a docked column. */}
                        <button
                            onClick={() => appStore.toggleInspector()}
                            aria-label="Close inspector overlay"
                            className="md:hidden fixed inset-0 z-30 bg-black/50 animate-in fade-in"
                        />
                        <aside className="fixed inset-y-0 right-0 z-40 w-full sm:max-w-sm md:static md:z-10 md:w-[320px] md:max-w-none bg-surface md:rounded-panel border-l md:border border-line md:shadow-card flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right md:animate-none">
                            {inspector}
                        </aside>
                    </>
                )}
            </div>
        </div>
    );
};
