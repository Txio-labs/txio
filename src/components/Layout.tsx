
import React, { useState, useRef, useEffect } from 'react';
import {
    Settings,
    ChevronDown,
    Globe,
    Loader2,
    LayoutGrid,
    Plus,
    Layers,
    Command,
    Sparkles,
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
    CircleDot,
    Wallet,
    Activity,
    MoreHorizontal,
    ShieldCheck,
    Menu,
    KeyRound,
    CheckCircle2,
    XCircle,
    Info,
    X,
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
import logoDark from '../assets/txio2.png';
import logoLight from '../assets/txio3.png';

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

interface NavRailItem {
    id: FeatureId;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NAV_RAIL_TOP: NavRailItem[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'rpc', label: 'Requests', icon: Zap },
    { id: 'history', label: 'History', icon: Activity },
    { id: 'collections', label: 'Collections', icon: FolderKanban },
    { id: 'workspace_overview', label: 'Workspaces', icon: Briefcase },
    { id: 'infrastructure', label: 'Networks', icon: NetworkIcon },
    { id: 'profile', label: 'Wallets', icon: WalletIcon },
    { id: 'approvals', label: 'Approvals', icon: KeyRound },
];

const NAV_RAIL_BOTTOM: NavRailItem[] = [
    { id: 'docs', label: 'Documentation', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
];

// Only rendered for accounts with the server-side is_admin flag; the backend
// rejects /admin requests from anyone else regardless of what the UI shows.
const ADMIN_NAV_ITEM: NavRailItem = { id: 'admin', label: 'Admin', icon: ShieldCheck };

const NOTIF_META = {
    success: { icon: CheckCircle2, className: 'text-emerald-500 bg-emerald-500/10' },
    error: { icon: XCircle, className: 'text-red-500 bg-red-500/10' },
    info: { icon: Info, className: 'text-sky-500 bg-sky-500/10' }
} as const;

function notifTimeAgo(ts: number): string {
    const diffMs = Date.now() - ts;
    const secs = Math.floor(diffMs / 1000);
    if (secs < 5) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
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
    onCreateWorkspace
}) => {
    const {
        theme,
        isInspectorOpen,
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
        user
    } = useAppStore();
    const navRailBottom = user?.isAdmin ? [ADMIN_NAV_ITEM, ...NAV_RAIL_BOTTOM] : NAV_RAIL_BOTTOM;
    const logo = theme === 'dark' ? logoDark : logoLight;
    const { currentWallet, isConnected, openModal } = useWallet();
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
    const [isCreateWsModalOpen, setIsCreateWsModalOpen] = useState(false);
    const [isTabMenuOpen, setIsTabMenuOpen] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const wsMenuRef = useRef<HTMLDivElement>(null);
    const tabMenuRef = useRef<HTMLDivElement>(null);

    const activeTab = storeTabs.find((t) => t.id === (activeTabId ?? storeActiveTabId));
    const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];

    // The Terminal is the execution console for requests — it only makes
    // sense while an actual request-editing view is open (RPC/PTB/Move/
    // Playground/Collection Runner). "new_request" is just the type-picker
    // screen shown before a request exists yet, and "new_collection" isn't
    // a request at all — neither has anything for the Terminal to log.
    const REQUEST_TAB_TYPES: ReadonlySet<FeatureId> = new Set([
        'rpc', 'ptb', 'move', 'playground', 'runner'
    ]);
    const isRequestView = Boolean(activeTab && REQUEST_TAB_TYPES.has(activeTab.type));

    // Only a request has a chain — outside one, show no chain rather than
    // implying a default.
    const activeChainId = isRequestView ? activeTab?.data?.rpcParams?.chain ?? 'sui' : null;
    const activeChainLabel = activeChainId ? RPC_CHAINS.find((c) => c.id === activeChainId)?.label ?? activeChainId : null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
            if (wsMenuRef.current && !wsMenuRef.current.contains(event.target as Node)) {
                setIsWsDropdownOpen(false);
            }
            if (tabMenuRef.current && !tabMenuRef.current.contains(event.target as Node)) {
                setIsTabMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-near-black text-slate-700 dark:text-slate-200 overflow-hidden font-sans relative selection:bg-electric-violet/30">
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
                title="Create Workspace"
                description="Give your new workspace a name."
                label="Workspace name"
                placeholder="e.g. My Team"
                confirmLabel="Create"
                icon={LayoutGrid}
                onSubmit={(name) => {
                    setIsCreateWsModalOpen(false);
                    onCreateWorkspace?.(name);
                }}
            />

            {/* Top Energy Line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-slate-400 z-50 shadow-[0_0_15px_rgba(163,163,163,0.4)]"></div>

            {isSyncing && (
                <div className="fixed inset-0 z-[110] bg-white/90 dark:bg-near-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="relative">
                        <Loader2 className="text-electric-violet animate-spin mb-4 drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]" size={48} />
                        <div className="absolute inset-0 bg-electric-violet/20 blur-xl rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-slate-900 dark:text-white text-sm font-mono tracking-wider font-bold">{scanStep || 'Syncing...'}</p>
                </div>
            )}

            <div className="flex-1 flex min-h-0">
                {/* Below md the rail can't sit permanently beside a full-width
                    main view, so it's hidden by default and opens as an
                    off-canvas drawer from the hamburger trigger in the header. */}
                {isMobileNavOpen && (
                    <button
                        onClick={() => setIsMobileNavOpen(false)}
                        aria-label="Close navigation"
                        className="md:hidden fixed inset-0 z-30 bg-near-black/50 animate-in fade-in duration-150"
                    />
                )}
                {/* Icon + label nav rail */}
                <nav
                    className={`fixed inset-y-0 left-0 z-40 md:static md:z-20 w-[76px] shrink-0 flex flex-col items-center bg-slate-50 dark:bg-near-black border-r border-slate-200 dark:border-white/10 py-3 transition-transform duration-200 md:translate-x-0 ${
                        isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    <button
                        className="flex flex-col items-center gap-1 mb-4 group cursor-pointer"
                        onClick={() => { appStore.setActiveTab(null); setIsMobileNavOpen(false); }}
                        title="TXIO"
                    >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                            <img src={logo.src} alt="txio" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-[9px] font-black tracking-[0.2em] text-slate-900 dark:text-slate-100 group-hover:text-electric-violet transition-colors">
                            TXIO
                        </span>
                    </button>

                    <div className="w-8 h-px bg-slate-200 dark:bg-white/10 mb-3" />

                    <div className="flex-1 flex flex-col items-center gap-1 w-full px-2">
                        {NAV_RAIL_TOP.map((item) => {
                            const isActive = activeTab?.type === item.id || (!activeTab && item.id === 'dashboard');
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => { appStore.openTab(item.id); setIsMobileNavOpen(false); }}
                                    title={item.label}
                                    className={`w-full flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${
                                        isActive
                                            ? 'bg-electric-violet/10 text-electric-violet'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <item.icon size={16} />
                                    <span className="text-[9px] font-bold leading-none text-center">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-col items-center gap-1 w-full px-2 mb-1">
                        {navRailBottom.map((item) => {
                            const isActive = activeTab?.type === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => { appStore.openTab(item.id); setIsMobileNavOpen(false); }}
                                    title={item.label}
                                    className={`w-full flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${
                                        isActive
                                            ? 'bg-electric-violet/10 text-electric-violet'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <item.icon size={15} />
                                    <span className="text-[9px] font-bold leading-none text-center">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </nav>

                <div className="flex-1 flex flex-col min-w-0">
                    {/* Top bar: workspace, chain, network, search, notifications, wallet, profile */}
                    <header className="h-12 bg-slate-50 dark:bg-near-black border-b border-slate-200 dark:border-white/10 flex items-center px-3 shrink-0 z-20 gap-1.5">
                            <button
                                onClick={() => setIsMobileNavOpen(true)}
                                aria-label="Open navigation"
                                className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shrink-0"
                            >
                                <Menu size={16} />
                            </button>

                            {currentWorkspace && (
                                <div className="relative shrink-0" ref={wsMenuRef}>
                                    <button
                                        onClick={() => setIsWsDropdownOpen((o) => !o)}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-white dark:bg-dark-indigo-glow border text-xs shadow-sm transition-colors ${
                                            isWsDropdownOpen ? 'border-slate-300 dark:border-white/20' : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                                        }`}
                                        title="Switch workspace"
                                    >
                                        <LayoutGrid size={11} className="text-slate-500" />
                                        <span className="hidden sm:inline text-slate-600 dark:text-slate-300 font-medium truncate max-w-[120px]">{currentWorkspace.name}</span>
                                        <ChevronDown size={10} className={`hidden sm:block text-slate-500 transition-transform duration-200 shrink-0 ${isWsDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isWsDropdownOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-3 pt-2.5 pb-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400 dark:text-slate-600">
                                                {workspaces.length === 1 ? '1 workspace' : `${workspaces.length} workspaces`}
                                            </div>
                                            <div className="px-1.5 pb-1.5 max-h-64 overflow-y-auto custom-scrollbar space-y-0.5">
                                                {workspaces.map((ws) => {
                                                    const isActive = ws.id === currentWorkspace.id;
                                                    return (
                                                        <button
                                                            key={ws.id}
                                                            onClick={() => { appStore.setWorkspace(ws); setIsWsDropdownOpen(false); }}
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
                                            {onCreateWorkspace && (
                                                <div className="p-1.5 bg-slate-50 dark:bg-white/[0.015] border-t border-slate-200 dark:border-white/[0.06]">
                                                    <button
                                                        onClick={() => {
                                                            setIsWsDropdownOpen(false);
                                                            setIsCreateWsModalOpen(true);
                                                        }}
                                                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white transition-colors"
                                                    >
                                                        <Plus size={14} className="text-electric-violet shrink-0" />
                                                        <span>Create workspace</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeChainLabel && (
                            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/10 text-xs shadow-sm shrink-0">
                                <Globe size={11} className="text-slate-500" />
                                <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[110px]">{activeChainLabel}</span>
                            </div>
                            )}

                            <div className="flex-1 flex justify-center px-2 min-w-0">
                                <button
                                    onClick={() => appStore.setCommandPalette(true)}
                                    className="flex items-center justify-center sm:justify-start gap-1.5 bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100 dark:hover:bg-[#111] p-1.5 sm:px-2.5 sm:py-1 rounded-full text-xs text-slate-400 w-8 sm:w-full sm:max-w-md transition-all group shadow-inner shrink-0 sm:shrink"
                                    title="Search requests, collections, networks... (Ctrl+K)"
                                >
                                    <Search size={11} className="group-hover:text-electric-violet shrink-0" />
                                    <span className="hidden sm:inline whitespace-nowrap truncate">Search requests, collections, networks...</span>
                                    <div className="ml-auto hidden md:flex items-center gap-0.5">
                                        <span className="bg-slate-100 dark:bg-white/5 px-1 rounded text-[9px] text-slate-500 group-hover:text-slate-600 dark:text-slate-300">⌘</span>
                                        <span className="bg-slate-100 dark:bg-white/5 px-1 rounded text-[9px] text-slate-500 group-hover:text-slate-600 dark:text-slate-300">K</span>
                                    </div>
                                </button>
                            </div>

                            <div className="relative shrink-0" ref={notifRef}>
                                <button
                                    onClick={() => setIsNotifOpen((o) => !o)}
                                    className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors relative ${isNotifOpen ? 'text-electric-violet' : 'text-slate-500'}`}
                                    title="Notifications"
                                >
                                    <Bell size={14} />
                                    {notifications.length > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-electric-violet flex items-center justify-center text-[7px] font-bold text-near-black">
                                            {notifications.length}
                                        </span>
                                    )}
                                </button>
                                {isNotifOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-white/10">
                                            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">Notifications</h3>
                                            {notifications.length > 0 && (
                                                <button
                                                    onClick={() => appStore.clearNotifications()}
                                                    className="text-[10px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                                                >
                                                    Clear all
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                            {notifications.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center gap-2 py-10 px-4">
                                                    <BellOff size={22} className="text-slate-300 dark:text-slate-700" />
                                                    <p className="text-xs text-slate-500">You're all caught up</p>
                                                </div>
                                            ) : (
                                                <div className="p-1.5 space-y-0.5">
                                                    {notifications.slice().reverse().map((n) => {
                                                        const meta = NOTIF_META[n.type];
                                                        return (
                                                            <div
                                                                key={n.id}
                                                                className="group flex items-start gap-2.5 px-2.5 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
                                                            >
                                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${meta.className}`}>
                                                                    <meta.icon size={13} />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug">{n.message}</p>
                                                                    <p className="text-[10px] text-slate-400 mt-0.5">{notifTimeAgo(n.timestamp)}</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => appStore.dismissNotification(n.id)}
                                                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-opacity shrink-0 mt-0.5"
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
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium transition-all shadow-sm shrink-0 ${
                                    isConnected
                                        ? 'bg-white dark:bg-dark-indigo-glow border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                                        : 'bg-electric-violet/10 border-electric-violet/20 text-electric-violet hover:bg-electric-violet/20'
                                }`}
                                title={isConnected ? 'Wallet connected' : 'Connect a wallet'}
                            >
                                <Wallet size={11} />
                                {isConnected && currentWallet ? (
                                    <>
                                        <span className="font-mono">{shortenAddress(currentWallet.address)}</span>
                                        <CircleDot size={8} className="text-emerald-500 fill-emerald-500" />
                                        <ChevronDown size={10} className="text-slate-500 shrink-0" />
                                    </>
                                ) : (
                                    <span>Connect</span>
                                )}
                            </button>

                            <ProfileMenu />
                    </header>

                    <div className="flex-1 flex overflow-hidden">
                        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-near-black relative">
                            <div className="h-9 bg-slate-50 dark:bg-near-black border-b border-slate-200 dark:border-white/10 flex items-center">
                                <div className="flex items-center overflow-x-auto no-scrollbar min-w-0 flex-1">
                                    {tabs.map(tab => (
                                        <Tab
                                            key={tab.id}
                                            id={tab.id}
                                            title={tab.title}
                                            isActive={tab.id === activeTabId}
                                            onSelect={() => onSelectTab && onSelectTab(tab.id)}
                                            onClose={() => onCloseTab && onCloseTab(tab.id)}
                                            onRename={(newTitle) => onRenameTab && onRenameTab(tab.id, newTitle)}
                                            icon={tab.type === 'ptb' || (tab.type === 'rpc' && tab.data?.type === RequestType.TRANSACTION) ? <Layers size={12}/> : tab.type === 'rpc' ? <Command size={12}/> : tab.type === 'ai_chat' ? <Sparkles size={12} className="text-electric-violet"/> : undefined}
                                        />
                                    ))}
                                </div>

                                <div className="flex items-center shrink-0 border-l border-slate-200 dark:border-white/10">
                                    <button
                                        onClick={onNewTab}
                                        className="p-2 text-slate-500 hover:text-electric-violet hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shrink-0"
                                    >
                                        <Plus size={14} />
                                    </button>

                                    {tabs.length > 0 && (
                                        <div className="relative shrink-0" ref={tabMenuRef}>
                                            <button
                                                onClick={() => setIsTabMenuOpen((v) => !v)}
                                                className="p-2 text-slate-500 hover:text-electric-violet hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                                title="Tab options"
                                            >
                                                <MoreHorizontal size={14} />
                                            </button>

                                            {isTabMenuOpen && (
                                                <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 p-1.5">
                                                    <button
                                                        onClick={() => {
                                                            appStore.closeAllTabs();
                                                            setIsTabMenuOpen(false);
                                                        }}
                                                        className="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
                                                    >
                                                        <span>Close All</span>
                                                        <span className="text-[10px] text-slate-400">Ctrl+K W</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            appStore.closeSavedTabs();
                                                            setIsTabMenuOpen(false);
                                                        }}
                                                        className="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
                                                    >
                                                        <span>Close Saved</span>
                                                        <span className="text-[10px] text-slate-400">Ctrl+K U</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-hidden relative">
                                {workspace}
                            </div>

                            {isRequestView && <TerminalPanel />}
                        </main>

                        {isInspectorOpen && (
                            <>
                                {/* Below md the panel can't dock beside a full-width main
                                    view without clipping its own content, so it becomes a
                                    full-screen overlay instead — same panel, same close
                                    button, just not squeezed into the row. */}
                                <button
                                    onClick={() => appStore.toggleInspector()}
                                    aria-label="Close inspector overlay"
                                    className="md:hidden fixed inset-0 z-30 bg-near-black/50 animate-in fade-in duration-150"
                                />
                                <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-sm md:static md:z-10 md:w-80 md:max-w-none bg-slate-50 dark:bg-near-black border-l border-slate-200 dark:border-white/10 flex flex-col shrink-0 shadow-2xl animate-in slide-in-from-right duration-200 md:animate-none">
                                    {inspector}
                                </aside>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <footer className="h-7 bg-slate-50 dark:bg-near-black border-t border-slate-200 dark:border-white/10 flex items-center justify-between px-3 text-[10px] text-slate-500 select-none z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => appStore.openTab('settings')}
                        className="flex items-center gap-1 hover:text-electric-violet cursor-pointer transition-colors"
                    >
                        <Settings size={10} /> v2.6.0-beta
                    </button>
                    <button
                        onClick={() => appStore.showToast('System operational. No errors.', 'success')}
                        className="hover:text-emerald-400 cursor-pointer transition-colors flex items-center gap-1"
                    >
                        <div className="w-1 h-1 bg-emerald-500 rounded-full"></div> System Optimal
                    </button>
                    {isRequestView && (
                        <button
                            onClick={() =>
                                appStore.toggleTerminal()
                            }
                            className={`flex items-center gap-1 cursor-pointer transition-colors ${
                                isTerminalOpen
                                    ? 'text-electric-violet'
                                    : 'hover:text-slate-600 dark:text-slate-300'
                            }`}
                        >
                            <Terminal size={10} /> Terminal
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-4">
                     <span className="font-mono text-slate-600">GAS: <span className="text-amber-500">AUTO</span></span>
                </div>
            </footer>
        </div>
    );
};