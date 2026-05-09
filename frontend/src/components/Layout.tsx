
import React, { useState, useRef, useEffect } from 'react';
import { PanelLeft, PanelRight, Settings, ChevronDown, Globe, Loader2, Key, LayoutGrid, User, LogOut, MoreVertical, Trash2, Save, RotateCcw, Bookmark, Plus, Layers, Command, Sparkles, Search, X, CheckCircle, AlertCircle, Info, Server, Check } from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { Tab } from './ui/Tabs';
import { TabItem, Network } from '../types';
import { NetworkSwitcherModal } from './NetworkSwitcherModal';
import { Avatar } from './ui/Avatar';
import { fetchRPCHealth } from '../services/mockService';
import { CommandPalette } from './CommandPalette';

interface LayoutProps {
    sidebar: React.ReactNode;
    workspace: React.ReactNode;
    inspector: React.ReactNode;
    tabs?: TabItem[];
    activeTabId?: string;
    onSelectTab?: (id: string | null) => void;
    onCloseTab?: (id: string) => void;
    onRenameTab?: (id: string, title: string) => void;
    onNewTab?: () => void;
}

const FlowLogoSmall = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]">
    <defs>
      <linearGradient id="swirl1-small" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67e8f9" />
        <stop offset="100%" stopColor="#22d3ee" />
      </linearGradient>
      <linearGradient id="swirl2-small" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0ea5e9" />
      </linearGradient>
      <linearGradient id="swirl3-small" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
    </defs>
    <g transform="translate(50, 20) scale(0.55)">
        <path d="M100 0 C 100 0 60 50 40 90 C 20 130 40 160 60 170 C 50 150 40 110 100 0 Z" fill="url(#swirl1-small)" />
        <path d="M100 10 C 100 10 50 70 30 120 C 20 150 40 180 80 190 C 60 170 50 120 100 10 Z" fill="url(#swirl2-small)" opacity="0.9" />
        <path d="M100 25 C 100 25 70 80 60 130 C 50 170 90 200 140 180 C 110 180 90 120 100 25 Z" fill="url(#swirl3-small)" opacity="0.9" />
    </g>
  </svg>
);

export const Layout: React.FC<LayoutProps> = ({ 
    sidebar, 
    workspace, 
    inspector,
    tabs = [],
    activeTabId,
    onSelectTab,
    onCloseTab,
    onRenameTab,
    onNewTab
}) => {
    const { isSidebarOpen, isInspectorOpen, user, network, isSyncing, scanStep, notifications } = useAppStore();
    const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy');
    const [isNetworkMenuOpen, setIsNetworkMenuOpen] = useState(false);
    const networkMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let mounted = true;
        const updateHealth = async () => {
            try {
                const metrics = await fetchRPCHealth();
                if (!mounted) return;
                const currentMetric = metrics.find(m => m.endpoint.includes(network));
                if (currentMetric) setHealthStatus(currentMetric.status);
            } catch (error) {
            }
        };
        updateHealth();
        const interval = setInterval(updateHealth, 5000); 
        return () => { mounted = false; clearInterval(interval); };
    }, [network]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (networkMenuRef.current && !networkMenuRef.current.contains(event.target as Node)) {
                setIsNetworkMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNetworkSwitch = (newNetwork: Network) => {
        appStore.setNetwork(newNetwork);
        setIsNetworkMenuOpen(false);
    };

    return (
        <div className="flex flex-col h-screen bg-black text-slate-200 overflow-hidden font-sans relative selection:bg-sui-500/30">
            <CommandPalette />

            {/* Top Energy Line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 z-50 shadow-[0_0_15px_rgba(14,165,233,0.6)]"></div>

            {/* Notification Toasts */}
            <div className="fixed top-16 right-6 z-[120] flex flex-col gap-3 pointer-events-none">
                {notifications.map(n => (
                    <div key={n.id} className="animate-in slide-in-from-right-10 fade-in duration-300 pointer-events-auto">
                        <div className="bg-[#0A0A0A] border border-white/10 text-slate-200 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px]">
                            {n.type === 'success' && <CheckCircle size={16} className="text-emerald-400" />}
                            {n.type === 'error' && <AlertCircle size={16} className="text-red-400" />}
                            {n.type === 'info' && <Info size={16} className="text-blue-400" />}
                            <span className="text-xs font-bold">{n.message}</span>
                        </div>
                    </div>
                ))}
            </div>

            {isSyncing && (
                <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="relative">
                        <Loader2 className="text-sui-400 animate-spin mb-4 drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]" size={48} />
                        <div className="absolute inset-0 bg-sui-400/20 blur-xl rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-white text-sm font-mono tracking-wider font-bold">{scanStep || 'Syncing...'}</p>
                </div>
            )}

            <header className="h-12 bg-black border-b border-white/10 flex items-center justify-between px-4 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <div 
                        className="flex items-center gap-2 font-bold text-slate-100 group cursor-pointer"
                        onClick={() => appStore.setActiveTab(null)}
                    >
                        <div className="w-6 h-6 rounded flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <FlowLogoSmall />
                        </div>
                        <span className="text-sm tracking-tight group-hover:text-sui-300 transition-colors">Flow</span>
                    </div>
                    <div className="h-4 w-px bg-white/10 mx-2"></div>
                    <button onClick={() => appStore.toggleSidebar()} className={`p-1.5 rounded hover:bg-white/10 transition-colors ${isSidebarOpen ? 'text-sui-400' : 'text-slate-500'}`}>
                        <PanelLeft size={16} />
                    </button>
                    <button 
                        onClick={() => appStore.setCommandPalette(true)}
                        className="flex items-center gap-2 bg-[#0A0A0A] border border-white/5 hover:border-white/20 hover:bg-[#111] px-3 py-1.5 rounded-full text-xs text-slate-400 w-64 transition-all group shadow-inner"
                    >
                        <Search size={12} className="group-hover:text-sui-400" />
                        <span>Search commands...</span>
                        <div className="ml-auto flex items-center gap-1">
                            <span className="bg-white/5 px-1 rounded text-[10px] text-slate-500 group-hover:text-slate-300">⌘</span>
                            <span className="bg-white/5 px-1 rounded text-[10px] text-slate-500 group-hover:text-slate-300">K</span>
                        </div>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative" ref={networkMenuRef}>
                        <button 
                            onClick={() => setIsNetworkMenuOpen(!isNetworkMenuOpen)}
                            className={`flex items-center gap-2 px-3 py-1 rounded-full bg-[#0A0A0A] border border-white/10 text-xs hover:bg-[#111] transition-all hover:border-white/20 shadow-sm ${isNetworkMenuOpen ? 'border-slate-600 bg-slate-800' : ''}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${healthStatus === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-500'} animate-pulse`}></div>
                            <span className="text-slate-300 capitalize font-medium">{network}</span>
                            <ChevronDown size={10} className={`text-slate-500 transition-transform duration-200 ${isNetworkMenuOpen ? 'rotate-180' : ''}`}/>
                        </button>

                        {isNetworkMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-[#0c0c0e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                <div className="p-1">
                                    {(['mainnet', 'testnet', 'devnet'] as Network[]).map((net) => (
                                        <button
                                            key={net}
                                            onClick={() => handleNetworkSwitch(net)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold capitalize transition-colors ${
                                                network === net 
                                                ? 'bg-white/10 text-white' 
                                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                    net === 'mainnet' ? 'bg-emerald-500' : 
                                                    net === 'testnet' ? 'bg-amber-500' : 
                                                    'bg-blue-500'
                                                }`}></div>
                                                {net}
                                            </div>
                                            {network === net && <Check size={12} className="text-sui-400" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="border-t border-white/10 p-2 bg-black/20">
                                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                                        <span>Latency</span>
                                        <span className={healthStatus === 'healthy' ? 'text-emerald-500' : 'text-amber-500'}>
                                            {healthStatus === 'healthy' ? '~120ms' : '~400ms'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <button onClick={() => appStore.toggleInspector()} className={`p-1.5 rounded hover:bg-white/10 transition-colors ${isInspectorOpen ? 'text-sui-400' : 'text-slate-500'}`}>
                        <PanelRight size={16} />
                    </button>
                    
                    <button onClick={() => appStore.setAuthModal(true)} className="w-8 h-8 cursor-pointer hover:ring-2 ring-sui-500/50 rounded-xl transition-all">
                        <Avatar size="sm" src={user?.avatarUrl} />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {isSidebarOpen && (
                    <aside className="w-64 flex flex-col shrink-0 z-10 bg-black">
                        {sidebar}
                    </aside>
                )}

                <main className="flex-1 flex flex-col min-w-0 bg-[#050505] relative">
                    <div className="h-9 bg-black border-b border-white/10 flex items-center overflow-x-auto no-scrollbar">
                        {tabs.map(tab => (
                            <Tab 
                                key={tab.id}
                                id={tab.id}
                                title={tab.title}
                                isActive={tab.id === activeTabId}
                                onSelect={() => onSelectTab && onSelectTab(tab.id)}
                                onClose={() => onCloseTab && onCloseTab(tab.id)}
                                onRename={(newTitle) => onRenameTab && onRenameTab(tab.id, newTitle)}
                                icon={tab.type === 'ptb' ? <Layers size={12}/> : tab.type === 'rpc' ? <Command size={12}/> : tab.type === 'ai_chat' ? <Sparkles size={12} className="text-sui-400"/> : undefined}
                            />
                        ))}
                        <button 
                            onClick={onNewTab}
                            className="p-2 text-slate-500 hover:text-sui-400 hover:bg-white/5 transition-colors"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative">
                        {workspace}
                    </div>
                </main>

                {isInspectorOpen && (
                    <aside className="w-80 bg-black border-l border-white/10 flex flex-col shrink-0 z-10 shadow-2xl">
                        {inspector}
                    </aside>
                )}
            </div>
            
            <footer className="h-7 bg-black border-t border-white/10 flex items-center justify-between px-3 text-[10px] text-slate-500 select-none z-20">
                <div className="flex items-center gap-4">
                    <span 
                        onClick={() => appStore.openTab('settings')}
                        className="flex items-center gap-1 hover:text-sui-400 cursor-pointer transition-colors"
                    >
                        <Settings size={10} /> v2.6.0-beta
                    </span>
                    <span 
                        onClick={() => appStore.showToast('System operational. No errors.', 'success')}
                        className="hover:text-emerald-400 cursor-pointer transition-colors flex items-center gap-1"
                    >
                        <div className="w-1 h-1 bg-emerald-500 rounded-full"></div> System Optimal
                    </span>
                </div>
                <div className="flex items-center gap-4">
                     <span className="font-mono text-slate-600">GAS: <span className="text-amber-500">AUTO</span></span>
                </div>
            </footer>
        </div>
    );
};
