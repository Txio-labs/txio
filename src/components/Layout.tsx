
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
    CircleDot,
    Wallet,
    Activity,
    MoreHorizontal,
    ShieldCheck,
} from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { Tab } from './ui/Tabs';
import { ALL_NETWORKS, TabItem, Network, RPCHealthMetric, FeatureId, RequestType } from '../types';
import { NetworkSwitcherModal } from './NetworkSwitcherModal';
import { CommandPalette } from './CommandPalette';
import { TerminalPanel } from './TerminalPanel';
import { getSuiRpcHealth } from '../services/suiService';
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
];

const NAV_RAIL_BOTTOM: NavRailItem[] = [
    { id: 'docs', label: 'Documentation', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
];

// Only rendered for accounts with the server-side is_admin flag; the backend
// rejects /admin requests from anyone else regardless of what the UI shows.
const ADMIN_NAV_ITEM: NavRailItem = { id: 'admin', label: 'Admin', icon: ShieldCheck };

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
    const [rpcHealth, setRpcHealth] =
        useState<RPCHealthMetric | null>(
            null
        );
    const [isNetworkMenuOpen, setIsNetworkMenuOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
    const [isTabMenuOpen, setIsTabMenuOpen] = useState(false);
    const networkMenuRef = useRef<HTMLDivElement>(null);
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
        let mounted = true;
        const updateHealth = async () => {
            const health =
                await getSuiRpcHealth(network);

            if (mounted) {
                setRpcHealth(health);
            }
        };
        updateHealth();
        const interval = setInterval(
            updateHealth,
            15000
        );
        return () => { mounted = false; clearInterval(interval); };
    }, [network]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (networkMenuRef.current && !networkMenuRef.current.contains(event.target as Node)) {
                setIsNetworkMenuOpen(false);
            }
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

    const handleNetworkSwitch = (newNetwork: Network) => {
        if (newNetwork === network) {
            setIsNetworkMenuOpen(false);
            return;
        }
        appStore.requestNetworkSwitch(newNetwork);
        setIsNetworkMenuOpen(false);
    };

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
                {/* Icon + label nav rail */}
                <nav className="w-[76px] shrink-0 flex flex-col items-center bg-slate-50 dark:bg-near-black border-r border-slate-200 dark:border-white/10 z-20 py-3">
                    <button
                        className="flex flex-col items-center gap-1 mb-4 group cursor-pointer"
                        onClick={() => appStore.setActiveTab(null)}
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
                                    onClick={() => appStore.openTab(item.id)}
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
                                    onClick={() => appStore.openTab(item.id)}
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
                            {currentWorkspace && (
                                <div className="relative" ref={wsMenuRef}>
                                    <button
                                        onClick={() => setIsWsDropdownOpen((o) => !o)}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-white dark:bg-dark-indigo-glow border text-xs shadow-sm transition-colors ${
                                            isWsDropdownOpen ? 'border-slate-300 dark:border-white/20' : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                                        }`}
                                        title="Switch workspace"
                                    >
                                        <LayoutGrid size={11} className="text-slate-500" />
                                        <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[120px]">{currentWorkspace.name}</span>
                                        <ChevronDown size={10} className={`text-slate-500 transition-transform duration-200 shrink-0 ${isWsDropdownOpen ? 'rotate-180' : ''}`} />
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
                                                            const name = window.prompt('Workspace name');
                                                            if (name?.trim()) onCreateWorkspace(name.trim());
                                                            setIsWsDropdownOpen(false);
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
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/10 text-xs shadow-sm">
                                <Globe size={11} className="text-slate-500" />
                                <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[110px]">{activeChainLabel}</span>
                            </div>
                            )}

                            <div className="relative" ref={networkMenuRef}>
                                <button
                                    onClick={() => setIsNetworkMenuOpen(!isNetworkMenuOpen)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/10 text-xs hover:bg-slate-100 dark:hover:bg-[#111] transition-all hover:border-slate-300 dark:hover:border-white/20 shadow-sm ${isNetworkMenuOpen ? 'border-slate-600 bg-slate-200 dark:bg-slate-800' : ''} w-24`}
                                    title="Network"
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${rpcHealth?.status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : rpcHealth?.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'} animate-pulse`}></div>
                                    <span className="text-slate-600 dark:text-slate-300 capitalize font-medium truncate max-w-[40px]">{network}</span>
                                    <ChevronDown size={10} className={`text-slate-500 transition-transform duration-200 shrink-0 ${isNetworkMenuOpen ? 'rotate-180' : ''}`}/>
                                </button>

                                {isNetworkMenuOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-44 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                        <div className="p-1">
                                            {ALL_NETWORKS.map((net) => (
                                                <button
                                                    key={net}
                                                    onClick={() => handleNetworkSwitch(net)}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold capitalize transition-colors ${
                                                        network === net
                                                        ? 'bg-white/10 text-slate-900 dark:text-white'
                                                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:text-slate-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                                            net === 'mainnet' ? 'bg-emerald-500' :
                                                            net === 'testnet' ? 'bg-amber-500' :
                                                            'bg-blue-500'
                                                        }`}></div>
                                                        {net}
                                                    </div>
                                                    {network === net && <Check size={12} className="text-electric-violet" />}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="border-t border-slate-200 dark:border-white/10 p-1.5 bg-slate-100/60 dark:bg-near-black/20">
                                            <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                                                <span>Latency</span>
                                                <span className={rpcHealth?.status === 'healthy' ? 'text-emerald-500' : rpcHealth?.status === 'degraded' ? 'text-amber-500' : 'text-red-400'}>
                                                    {rpcHealth?.latency?.[0]
                                                        ? `${Math.round(rpcHealth.latency[0])}ms`
                                                        : '--'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 flex justify-center px-2">
                                <button
                                    onClick={() => appStore.setCommandPalette(true)}
                                    className="flex items-center gap-1.5 bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100 dark:hover:bg-[#111] px-2.5 py-1 rounded-full text-xs text-slate-400 w-full max-w-md transition-all group shadow-inner"
                                    title="Search requests, collections, networks... (Ctrl+K)"
                                >
                                    <Search size={11} className="group-hover:text-electric-violet" />
                                    <span className="whitespace-nowrap">Search requests, collections, networks...</span>
                                    <div className="ml-auto hidden md:flex items-center gap-0.5">
                                        <span className="bg-slate-100 dark:bg-white/5 px-1 rounded text-[9px] text-slate-500 group-hover:text-slate-600 dark:text-slate-300">⌘</span>
                                        <span className="bg-slate-100 dark:bg-white/5 px-1 rounded text-[9px] text-slate-500 group-hover:text-slate-600 dark:text-slate-300">K</span>
                                    </div>
                                </button>
                            </div>

                            <div className="relative" ref={notifRef}>
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
                                    <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                        <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
                                            {notifications.length === 0 ? (
                                                <p className="text-xs text-slate-500 text-center py-4">No notifications</p>
                                            ) : (
                                                notifications.map((n) => (
                                                    <div key={n.id} className="px-2 py-2 text-xs text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-white/5 last:border-0">
                                                        {n.message}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={openModal}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium transition-all shadow-sm ${
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
                            <aside className="w-80 bg-slate-50 dark:bg-near-black border-l border-slate-200 dark:border-white/10 flex flex-col shrink-0 z-10 shadow-2xl">
                                {inspector}
                            </aside>
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