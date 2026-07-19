
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Command, ArrowRight, Layers, Terminal, Settings, User, CreditCard, Play, Plus, Box, RotateCcw } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { CollectionNode, RequestType, FeatureId } from '../types';
import { COMMON_RPC_METHODS } from '@/lib/constants';

interface CommandItem {
    id: string;
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    action: () => void;
    keywords: string[];
}

export const CommandPalette: React.FC = () => {
    const { isCommandPaletteOpen, collections, currentWorkspaceId, workspaces } = useAppStore();
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when opened
    useEffect(() => {
        if (isCommandPaletteOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setSearch('');
            setSelectedIndex(0);
        }
    }, [isCommandPaletteOpen]);

    const commands = useMemo(() => {
        // Recursive helper to flatten collections
        const flattenCollections = (nodes: CollectionNode[], items: CommandItem[] = []) => {
            nodes.forEach(node => {
                if (node.workspaceId === currentWorkspaceId || !node.workspaceId) {
                    if (node.type === 'request' && node.requestData) {
                        items.push({
                            id: node.id,
                            title: node.name,
                            subtitle: node.requestData.type === RequestType.RPC
                                ? `RPC: ${node.requestData.rpcParams.method}`
                                : `TX: ${node.requestData.moveParams.module}::${node.requestData.moveParams.function}`,
                            icon: node.requestData.type === RequestType.RPC ? <Terminal size={14} /> : <Layers size={14} />,
                            action: () => appStore.openTab(node.requestData?.type === RequestType.RPC ? 'rpc' : 'ptb', node.requestData),
                            keywords: [node.name, 'request', 'collection']
                        });
                    }
                    if (node.children) {
                        flattenCollections(node.children, items);
                    }
                }
            });
            return items;
        };

        const items: CommandItem[] = [];

        // 1. Global Actions
        items.push(
            { id: 'new-req', title: 'New Request', subtitle: 'Create a blank JSON-RPC or Move Call', icon: <Plus size={14} />, action: () => appStore.openTab('new_request'), keywords: ['new', 'create', 'request'] },
            { id: 'new-ptb', title: 'New PTB', subtitle: 'Programmable Transaction Block Builder', icon: <Layers size={14} />, action: () => appStore.openTab('ptb'), keywords: ['new', 'create', 'ptb', 'transaction'] },
            { id: 'settings', title: 'Settings', icon: <Settings size={14} />, action: () => appStore.openTab('settings'), keywords: ['config', 'preferences'] },
            { id: 'profile', title: 'Profile', icon: <User size={14} />, action: () => appStore.openTab('profile'), keywords: ['account', 'user'] },
            { id: 'switch-net', title: 'Switch Network', subtitle: 'Toggle between Mainnet/Testnet', icon: <RotateCcw size={14} />, action: () => appStore.requestNetworkSwitch(appStore.getSnapshot().network === 'mainnet' ? 'testnet' : 'mainnet'), keywords: ['network', 'mainnet', 'testnet'] }
        );

        // 2. Collection Requests (Scoped to Workspace)
        flattenCollections(collections, items);

        // 3. Move Commands (Common RPCs)
        COMMON_RPC_METHODS.forEach(method => {
            items.push({
                id: `rpc-${method}`,
                title: method,
                subtitle: 'Create new RPC request',
                icon: <Terminal size={14} className="text-emerald-500" />,
                action: () => appStore.openTab('rpc', { name: method, type: RequestType.RPC, rpcParams: { method, params: [] } }),
                keywords: [method, 'rpc', 'move']
            });
        });

        // 4. Workspace Switching
        workspaces.forEach(ws => {
            if (ws.id !== currentWorkspaceId) {
                items.push({
                    id: `ws-${ws.id}`,
                    title: `Switch to ${ws.name}`,
                    subtitle: `Workspace: ${ws.type}`,
                    icon: <Box size={14} />,
                    action: () => appStore.setWorkspace(ws),
                    keywords: ['switch', 'workspace', ws.name]
                });
            }
        });

        return items;
    }, [collections, currentWorkspaceId, workspaces]);

    const filteredCommands = useMemo(() => {
        if (!search.trim()) return commands.slice(0, 15); // Default view
        const lowerSearch = search.toLowerCase();
        return commands.filter(cmd => 
            cmd.title.toLowerCase().includes(lowerSearch) || 
            cmd.subtitle?.toLowerCase().includes(lowerSearch) ||
            cmd.keywords.some(k => k.toLowerCase().includes(lowerSearch))
        ).slice(0, 50);
    }, [search, commands]);

    // Key Handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isCommandPaletteOpen) {
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    appStore.setCommandPalette(true);
                }
                return;
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    filteredCommands[selectedIndex].action();
                    appStore.setCommandPalette(false);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                appStore.setCommandPalette(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCommandPaletteOpen, filteredCommands, selectedIndex]);

    if (!isCommandPaletteOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[9999] flex flex-col items-center pt-[20vh] bg-near-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => appStore.setCommandPalette(false)}
        >
            <div 
                className="w-full max-w-2xl bg-[#003152] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] relative animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center px-4 py-3 border-b border-white/5 bg-dark-indigo-glow/50">
                    <Search className="text-slate-500 mr-3" size={18} />
                    <input
                        ref={inputRef}
                        className="flex-1 bg-transparent text-slate-200 placeholder:text-slate-600 outline-none text-sm"
                        placeholder="Search commands, requests, or workspaces..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setSelectedIndex(0); }}
                    />
                    <div className="flex gap-2">
                        <kbd className="hidden sm:inline-block bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/10">↑↓</kbd>
                        <kbd className="hidden sm:inline-block bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/10">↵</kbd>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {filteredCommands.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">No results found.</div>
                    ) : (
                        <div className="space-y-1">
                            {filteredCommands.map((cmd, idx) => (
                                <button
                                    key={cmd.id}
                                    onClick={() => { cmd.action(); appStore.setCommandPalette(false); }}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                                        idx === selectedIndex ? 'bg-electric-violet text-white' : 'text-slate-400 hover:bg-white/5'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded ${idx === selectedIndex ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                        {cmd.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-medium ${idx === selectedIndex ? 'text-white' : 'text-slate-200'}`}>{cmd.title}</div>
                                        {cmd.subtitle && (
                                            <div className={`text-xs truncate ${idx === selectedIndex ? 'text-white/70' : 'text-slate-500'}`}>{cmd.subtitle}</div>
                                        )}
                                    </div>
                                    {idx === selectedIndex && <ArrowRight size={14} className="text-white/70" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="px-4 py-2 border-t border-white/5 bg-dark-indigo-glow/50 text-[10px] text-slate-500 flex justify-between">
                     <span>{filteredCommands.length} commands</span>
                     <span>Current Workspace: {workspaces.find(w => w.id === currentWorkspaceId)?.name}</span>
                </div>
            </div>
        </div>
    );
};
