import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft, PanelRight, Settings, Command, Search, Plus, Play, Layers, Sparkles, Terminal } from 'lucide-react';
import { useAppStore, appStore } from './lib/store';
import { shortenAddress, useWallet } from '@/wallet';
import { Tab } from './components/ui/Tabs';
import { Avatar } from './components/ui/Avatar';
import { TabItem, RequestType } from './types';
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
        <div className="flex flex-col h-screen bg-canvas text-fg">
            {/* Command Bar / Header */}
            <header className="h-11 bg-elevated border-b border-line flex items-center justify-between px-3 shrink-0 z-20">
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
                        className={`p-1.5 rounded-md transition-colors hover:bg-hover ${isSidebarOpen ? 'text-fg' : 'text-fg-subtle hover:text-fg'}`}
                        aria-label="Toggle sidebar"
                    >
                        <PanelLeft size={14} />
                    </button>
                    <button className="flex items-center gap-2 bg-sunken border border-line hover:border-white/[0.12] hover:bg-hover px-2.5 py-1 rounded-md text-xs text-fg-subtle hover:text-fg w-64 transition-colors group">
                        <Search size={12} className="text-fg-subtle" />
                        <span>Search commands…</span>
                        <div className="ml-auto flex items-center gap-0.5 text-fg-subtle group-hover:text-slate-400">
                            <kbd className="bg-white/[0.05] border border-line px-1 rounded text-[11px] font-mono">⌘</kbd>
                            <kbd className="bg-white/[0.05] border border-line px-1 rounded text-[11px] font-mono">K</kbd>
                        </div>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-hover border border-line text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-inverse animate-pulse"></div>
                        <span className="text-fg font-medium">Mainnet</span>
                    </div>
                    <button
                        onClick={() => appStore.toggleInspector()}
                        className={`p-1.5 rounded-md transition-colors hover:bg-hover ${isInspectorOpen ? 'text-fg' : 'text-fg-subtle hover:text-fg'}`}
                        aria-label="Toggle inspector"
                    >
                        <PanelRight size={14} />
                    </button>
                    <button
                        onClick={() => appStore.setAuthModal(true)}
                        className="relative group transition-transform outline-none ml-1"
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
                            className="bg-elevated border-r border-line flex flex-col shrink-0 overflow-hidden"
                        >
                            <div className="w-64 flex flex-col h-full">
                                {sidebar}
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Workspace */}
                <main className="flex-1 flex flex-col min-w-0 bg-canvas relative">
                    {/* Tab Bar */}
                    <div className="h-9 bg-canvas border-b border-line flex items-center overflow-x-auto no-scrollbar">
                        {tabs.map(tab => (
                            <Tab
                                key={tab.id}
                                id={tab.id}
                                title={tab.title}
                                isActive={tab.id === activeTabId}
                                onSelect={() => onSelectTab && onSelectTab(tab.id)}
                                onClose={() => onCloseTab && onCloseTab(tab.id)}
                                onRename={(newTitle) => onRenameTab && onRenameTab(tab.id, newTitle)}
                                icon={tab.type === 'ptb' || (tab.type === 'rpc' && tab.data?.type === RequestType.TRANSACTION) ? <Layers size={12}/> : tab.type === 'rpc' ? <Command size={12}/> : undefined}
                            />
                        ))}
                        <button
                            onClick={onNewTab}
                            className="px-2.5 py-2 text-fg-subtle hover:text-fg hover:bg-hover transition-colors"
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
                            className="bg-elevated border-l border-line flex flex-col shrink-0 overflow-hidden"
                        >
                            <div className="w-80 flex flex-col h-full">
                                {inspector}
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Status Bar */}
            <footer className="h-7 bg-canvas border-t border-line flex items-center justify-between px-3 text-[11px] text-fg-subtle select-none">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 hover:text-fg cursor-pointer transition-colors"><Settings size={11} /> v2.4.0</span>
                    <button
                        type="button"
                        aria-label="Toggle terminal"
                        onClick={() => appStore.toggleTerminal()}
                        className={`flex items-center gap-1.5 cursor-pointer transition-colors ${useAppStore().isTerminalOpen ? 'text-fg' : 'hover:text-fg'}`}
                    >
                        <Terminal size={11} /> Terminal
                    </button>
                    <span className="hover:text-fg cursor-pointer transition-colors">0 Errors</span>
                </div>
                <div className="flex items-center gap-4">
                     <span>Gas Budget: Auto</span>
                     <span className={currentWallet ? 'text-fg' : 'text-fg-subtle'}>
                        {currentWallet
                            ? `Wallet ${shortenAddress(currentWallet.address)}`
                            : 'Wallet disconnected'}
                     </span>
                </div>
            </footer>
        </div>
    );
};
