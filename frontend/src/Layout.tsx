
import React from 'react';
import { PanelLeft, PanelRight, Settings, Command, Search, Plus, Play, Layers, Sparkles } from 'lucide-react';
import { useAppStore, appStore } from './lib/store';
import { Tab } from './components/ui/Tabs';
import { Avatar } from './components/ui/Avatar';
import { TabItem } from './types';

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
        <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
            {/* Command Bar / Header */}
            <header className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 font-bold text-slate-100">
                        <div className="w-6 h-6 bg-sui-600 rounded flex items-center justify-center text-[10px] shadow-lg shadow-sui-500/20">S</div>
                        <span className="text-sm tracking-tight">Postman Pro</span>
                    </div>
                    <div className="h-4 w-px bg-slate-700 mx-2"></div>
                    <button onClick={() => appStore.toggleSidebar()} className={`p-1.5 rounded hover:bg-slate-800 ${isSidebarOpen ? 'text-sui-400' : 'text-slate-500'}`}>
                        <PanelLeft size={16} />
                    </button>
                    <button className="flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded text-xs text-slate-400 w-64 transition-colors group">
                        <Search size={12} />
                        <span>Search commands...</span>
                        <div className="ml-auto flex items-center gap-1">
                            <span className="bg-slate-800 px-1 rounded text-[10px] text-slate-500 group-hover:text-slate-400">⌘</span>
                            <span className="bg-slate-800 px-1 rounded text-[10px] text-slate-500 group-hover:text-slate-400">K</span>
                        </div>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-800 text-xs">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-slate-400">Mainnet</span>
                    </div>
                     <button onClick={() => appStore.toggleInspector()} className={`p-1.5 rounded hover:bg-slate-800 ${isInspectorOpen ? 'text-sui-400' : 'text-slate-500'}`}>
                        <PanelRight size={16} />
                    </button>
                    <button onClick={() => appStore.setAuthModal(true)} className="hover:ring-2 ring-sui-500/50 rounded-xl transition-all">
                        <Avatar size="sm" seed={user?.email || 'flow-user'} status="online" className="cursor-pointer" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                {isSidebarOpen && (
                    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 animate-slide-in">
                        {sidebar}
                    </aside>
                )}

                {/* Workspace */}
                <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
                    {/* Tab Bar */}
                    <div className="h-9 bg-slate-950 border-b border-slate-800 flex items-center overflow-x-auto no-scrollbar">
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
                            className="p-2 text-slate-500 hover:text-sui-400 hover:bg-slate-800 transition-colors"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    
                    {/* Content View */}
                    <div className="flex-1 overflow-hidden relative">
                        {workspace}
                    </div>
                </main>

                {/* Inspector */}
                {isInspectorOpen && (
                    <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
                        {inspector}
                    </aside>
                )}
            </div>
            
            {/* Status Bar */}
            <footer className="h-6 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-3 text-[10px] text-slate-500 select-none">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 hover:text-slate-300 cursor-pointer"><Settings size={10} /> v2.4.0</span>
                    <span className="hover:text-slate-300 cursor-pointer">0 Errors</span>
                </div>
                <div className="flex items-center gap-4">
                     <span>Gas Budget: Auto</span>
                     <span className="text-sui-500">Connected: 0x7d2...94d1</span>
                </div>
            </footer>
        </div>
    );
};
