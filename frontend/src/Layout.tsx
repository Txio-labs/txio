import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft, PanelRight, Settings, Command, Search, Plus, Play, Layers, Sparkles, Terminal } from 'lucide-react';
import { useAppStore, appStore } from './lib/store';
import { shortenAddress, useWallet } from '@/wallet';
import { Tab } from './components/ui/Tabs';
import { Avatar } from './components/ui/Avatar';
import { TabItem } from './types';
import logoDark from '@/assets/txio2.png';
import logoLight from '@/assets/txio3.png';

import { TerminalPanel } from './components/TerminalPanel';

interface LayoutProps {
    sidebar: React.ReactNode;
    workspace: React.ReactNode;
    inspector: React.ReactNode;
    tabs?: TabItem[];
    activeTabId?: string;
    onSelectTab?: (id: string) => void;
    onCloseTab?: (id: string) => void;
    onRenameTab?: (id: string, title: string) => void;
    onNewTab?: () => void;
}

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
    const { isSidebarOpen, isInspectorOpen, user } = useAppStore();
    const { currentWallet } = useWallet();

    return (
        <div className="flex flex-col h-screen bg-near-black text-slate-200">
            {/* Command Bar / Header */}
            <header className="h-11 bg-dark-indigo-glow border-b border-white/[0.06] flex items-center justify-between px-3 shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-slate-100">
                        <div className="w-5 h-5 flex items-center justify-center transition-transform duration-300 hover:rotate-12">
                            <img src={useAppStore().theme === 'dark' ? logoDark.src : logoLight.src} alt="txio" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-sm tracking-tight font-semibold lowercase">txio</span>
                    </div>
                    <div className="h-4 w-px bg-white/[0.08] mx-1"></div>
                    <button
                        onClick={() => appStore.toggleSidebar()}
                        className={`p-1.5 rounded-md transition-colors hover:bg-white/[0.05] ${isSidebarOpen ? 'text-electric-violet' : 'text-slate-500 hover:text-slate-300'}`}
                        aria-label="Toggle sidebar"
                    >
                        <PanelLeft size={14} />
                    </button>
                    <button className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] px-2.5 py-1 rounded-md text-xs text-slate-400 hover:text-slate-300 w-64 transition-colors group">
                        <Search size={12} className="text-slate-500" />
                        <span>Search commands…</span>
                        <div className="ml-auto flex items-center gap-0.5 text-slate-500 group-hover:text-slate-400">
                            <kbd className="bg-white/[0.05] border border-white/[0.06] px-1 rounded text-[10px] font-mono">⌘</kbd>
                            <kbd className="bg-white/[0.05] border border-white/[0.06] px-1 rounded text-[10px] font-mono">K</kbd>
                        </div>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-electric-violet/[0.08] border border-electric-violet/20 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-electric-violet animate-pulse"></div>
                        <span className="text-electric-violet font-medium">Mainnet</span>
                    </div>
                    <button
                        onClick={() => appStore.toggleInspector()}
                        className={`p-1.5 rounded-md transition-colors hover:bg-white/[0.05] ${isInspectorOpen ? 'text-electric-violet' : 'text-slate-500 hover:text-slate-300'}`}
                        aria-label="Toggle inspector"
                    >
                        <PanelRight size={14} />
                    </button>
                    <button
                        onClick={() => appStore.setAuthModal(true)}
                        className="relative group transition-transform active:scale-95 outline-none ml-1"
                    >
                        <Avatar size="sm" seed={user?.email || 'txio-user'} status="online" className="cursor-pointer" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <AnimatePresence mode="wait">
                    {isSidebarOpen && (
                        <motion.aside 
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 256, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-dark-indigo-glow border-r border-white/5 flex flex-col shrink-0 overflow-hidden"
                        >
                            <div className="w-64 flex flex-col h-full">
                                {sidebar}
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Workspace */}
                <main className="flex-1 flex flex-col min-w-0 bg-near-black relative">
                    {/* Tab Bar */}
                    <div className="h-9 bg-near-black border-b border-white/[0.06] flex items-center overflow-x-auto no-scrollbar">
                        {tabs.map(tab => (
                            <Tab
                                key={tab.id}
                                id={tab.id}
                                title={tab.title}
                                isActive={tab.id === activeTabId}
                                onSelect={() => onSelectTab && onSelectTab(tab.id)}
                                onClose={() => onCloseTab && onCloseTab(tab.id)}
                                onRename={(newTitle) => onRenameTab && onRenameTab(tab.id, newTitle)}
                                icon={tab.type === 'ptb' ? <Layers size={12}/> : tab.type === 'rpc' ? <Command size={12}/> : tab.type === 'ai_chat' ? <Sparkles size={12} className="text-soft-purple"/> : undefined}
                            />
                        ))}
                        <button
                            onClick={onNewTab}
                            className="px-2.5 py-2 text-slate-500 hover:text-electric-violet hover:bg-white/[0.03] transition-colors"
                            aria-label="New tab"
                        >
                            <Plus size={13} />
                        </button>
                    </div>
                    
                    {/* Content View */}
                    <div className="flex-1 overflow-hidden relative">
                        {workspace}
                    </div>

                    {/* Bottom Terminal */}
                    <TerminalPanel />
                </main>

                {/* Inspector */}
                <AnimatePresence mode="wait">
                    {isInspectorOpen && (
                        <motion.aside 
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-dark-indigo-glow border-l border-white/5 flex flex-col shrink-0 overflow-hidden"
                        >
                            <div className="w-80 flex flex-col h-full">
                                {inspector}
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Status Bar */}
            <footer className="h-7 bg-near-black border-t border-white/[0.06] flex items-center justify-between px-3 text-[11px] text-slate-500 select-none">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 hover:text-slate-300 cursor-pointer transition-colors"><Settings size={11} /> v2.4.0</span>
                    <span
                        onClick={() => appStore.toggleTerminal()}
                        className={`flex items-center gap-1.5 cursor-pointer transition-colors ${useAppStore().isTerminalOpen ? 'text-electric-violet' : 'hover:text-slate-300'}`}
                    >
                        <Terminal size={11} /> Terminal
                    </span>
                    <span className="hover:text-slate-300 cursor-pointer transition-colors">0 Errors</span>
                </div>
                <div className="flex items-center gap-4">
                     <span>Gas Budget: Auto</span>
                     <span className={currentWallet ? 'text-electric-violet' : 'text-slate-500'}>
                        {currentWallet
                            ? `Wallet ${shortenAddress(currentWallet.address)}`
                            : 'Wallet disconnected'}
                     </span>
                </div>
            </footer>
        </div>
    );
};
