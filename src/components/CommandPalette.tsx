
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Command, ArrowRight, Layers, Terminal, Settings, User, Plus, Box, RotateCcw, Code2 } from 'lucide-react';
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
                            action: () => appStore.openTab('rpc', node.requestData),
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
            { id: 'new-req', title: 'New Request', subtitle: 'JSON-RPC call or transaction on any chain', icon: <Plus size={14} />, action: () => appStore.openTab('new_request'), keywords: ['new', 'create', 'request', 'transaction', 'contract'] },
            { id: 'contracts', title: 'Contract Builder', subtitle: 'Compile Solidity in the browser and deploy it', icon: <Code2 size={14} />, action: () => appStore.openTab('move'), keywords: ['contract', 'compile', 'deploy', 'solidity', 'builder'] },
            { id: 'settings', title: 'Settings', icon: <Settings size={14} />, action: () => appStore.openTab('settings'), keywords: ['config', 'preferences'] },
            { id: 'profile', title: 'Wallets', icon: <User size={14} />, action: () => appStore.openTab('profile'), keywords: ['account', 'user', 'wallet', 'wallets'] },
            { id: 'switch-net', title: 'Switch Network', subtitle: 'Toggle between Mainnet/Testnet', icon: <RotateCcw size={14} />, action: () => appStore.requestNetworkSwitch(appStore.getSnapshot().network === 'mainnet' ? 'testnet' : 'mainnet'), keywords: ['network', 'mainnet', 'testnet'] }
        );

        // 2. Collection Requests (Scoped to Workspace)
        flattenCollections(collections, items);

        // 3. Move Commands (Common RPCs, across all supported chains)
        Object.entries(COMMON_RPC_METHODS).forEach(([chain, methods]) => {
            methods.forEach(method => {
                items.push({
                    id: `rpc-${method}`,
                    title: method,
                    subtitle: `Create new RPC request (${chain})`,
                    icon: <Terminal size={14} className="text-emerald-500" />,
                    action: () => appStore.openTab('rpc', { name: method, type: RequestType.RPC, rpcParams: { method, params: [], chain } }),
                    keywords: [method, 'rpc', chain]
                });
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
            className="fixed inset-0 z-[9999] flex flex-col items-center pt-[20vh] bg-surface/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => appStore.setCommandPalette(false)}
            role="button"
            tabIndex={-1}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') appStore.setCommandPalette(false); }}
        >
            <div 
                className="w-full max-w-2xl bg-elevated border border-line rounded-[10px] shadow-card overflow-hidden flex flex-col max-h-[60vh] relative animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-label="Command palette"
            >
                <div className="flex items-center px-4 py-3 border-b border-line bg-hover">
                    <Search className="text-fg-subtle mr-3" size={18} />
                    <input
                        ref={inputRef}
                        className="flex-1 bg-transparent text-fg placeholder:text-fg-subtle outline-none text-sm"
                        placeholder="Search commands, requests, or workspaces..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setSelectedIndex(0); }}
                    />
                    <div className="flex gap-2">
                        <kbd className="hidden sm:inline-block bg-active text-fg-subtle px-1.5 py-0.5 rounded text-[12px] font-mono border border-line">↑↓</kbd>
                        <kbd className="hidden sm:inline-block bg-active text-fg-subtle px-1.5 py-0.5 rounded text-[12px] font-mono border border-line">↵</kbd>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {filteredCommands.length === 0 ? (
                        <div className="p-8 text-center text-fg-subtle text-sm">No results found.</div>
                    ) : (
                        <div className="space-y-1">
                            {filteredCommands.map((cmd, idx) => (
                                <button
                                    key={cmd.id}
                                    onClick={() => { cmd.action(); appStore.setCommandPalette(false); }}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                                        idx === selectedIndex ? 'bg-hover' : 'text-fg-subtle hover:bg-hover'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded ${idx === selectedIndex ? 'bg-active text-fg' : 'bg-active text-fg-subtle'}`}>
                                        {cmd.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-medium ${idx === selectedIndex ? 'text-fg' : 'text-fg'}`}>{cmd.title}</div>
                                        {cmd.subtitle && (
                                            <div className={`text-xs truncate ${idx === selectedIndex ? 'text-fg-muted' : 'text-fg-subtle'}`}>{cmd.subtitle}</div>
                                        )}
                                    </div>
                                    {idx === selectedIndex && <ArrowRight size={14} className="text-fg" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="px-4 py-2 border-t border-line bg-hover text-[12px] text-fg-subtle flex justify-between">
                     <span>{filteredCommands.length} commands</span>
                     <span>Current Workspace: {workspaces.find(w => w.id === currentWorkspaceId)?.name}</span>
                </div>
            </div>
        </div>
    );
};