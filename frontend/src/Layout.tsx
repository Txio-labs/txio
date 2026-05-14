import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft, PanelRight, Settings, Command, Search, Plus, Play, Layers, Sparkles, Terminal } from 'lucide-react';
import { useAppStore, appStore } from './lib/store';
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

    return (
        <div className="flex flex-col h-screen bg-near-black text-slate-200">
            {/* Command Bar / Header */}
            <header className="h-12 bg-dark-indigo-glow border-b border-white/5 flex items-center justify-between px-4 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 font-bold text-slate-100">
                        <div className="w-6 h-6 flex items-center justify-center transition-transform duration-300 hover:rotate-12">
                            <img src={(useAppStore().theme === 'dark' ? logoDark : logoLight) as any} alt="txio" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-sm tracking-tight glow-text font-bold lowercase">txio</span>
                    </div>
                    <div className="h-4 w-px bg-white/10 mx-2"></div>
                    <button onClick={() => appStore.toggleSidebar()} className={`p-1.5 rounded hover:bg-white/5 ${isSidebarOpen ? 'text-electric-violet' : 'text-slate-500'}`}>
                        <PanelLeft size={16} />
                    </button>
                    <button className="flex items-center gap-2 bg-near-black border border-white/5 hover:border-white/10 px-3 py-1.5 rounded text-xs text-slate-400 w-64 transition-colors group">
                        <Search size={12} />
                        <span>Search commands...</span>
                        <div className="ml-auto flex items-center gap-1">
                            <span className="bg-white/5 px-1 rounded text-[10px] text-slate-500 group-hover:text-slate-400">⌘</span>
                            <span className="bg-white/5 px-1 rounded text-[10px] text-slate-500 group-hover:text-slate-400">K</span>
                        </div>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-electric-violet/10 border border-electric-violet/20 text-xs">
                        <div className="w-2 h-2 rounded-full bg-soft-purple animate-pulse"></div>
                        <span className="text-electric-violet/80 font-medium">Mainnet</span>
                    </div>
                     <button onClick={() => appStore.toggleInspector()} className={`p-1.5 rounded hover:bg-white/5 ${isInspectorOpen ? 'text-electric-violet' : 'text-slate-500'}`}>
                        <PanelRight size={16} />
                    </button>
                    <button 
                        onClick={() => appStore.setAuthModal(true)} 
                        className="relative group transition-transform active:scale-95 outline-none"
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
                    <div className="h-9 bg-near-black border-b border-white/5 flex items-center overflow-x-auto no-scrollbar">
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
                            className="p-2 text-slate-500 hover:text-electric-violet hover:bg-white/5 transition-colors"
                        >
                            <Plus size={14} />
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
            <footer className="h-6 bg-near-black border-t border-white/5 flex items-center justify-between px-3 text-[10px] text-slate-500 select-none">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 hover:text-slate-300 cursor-pointer"><Settings size={10} /> v2.4.0</span>
                    <span 
                        onClick={() => appStore.toggleTerminal()}
                        className={`flex items-center gap-1 cursor-pointer transition-colors ${useAppStore().isTerminalOpen ? 'text-electric-violet' : 'hover:text-slate-300'}`}
                    >
                        <Terminal size={10} /> Terminal
                    </span>
                    <span className="hover:text-slate-300 cursor-pointer">0 Errors</span>
                </div>
                <div className="flex items-center gap-4">
                     <span>Gas Budget: Auto</span>
                     <span className="text-electric-violet">Connected: 0x7d2...94d1</span>
                </div>
            </footer>
        </div>
    );
};
