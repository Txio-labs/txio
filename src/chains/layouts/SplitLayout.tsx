/**
 * EVM workspace: one chain family, many networks. Tools sit in a menu bar
 * across the top, grouped the way the other workspaces group them, and a
 * column on the left lists every EVM network TXIO supports. Each network
 * entry starts a request on that network or opens it in the explorer.
 */
import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, Menu, PanelLeft, PanelRight, Plus, Search, Terminal, X } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { cx, IconButton, Input } from '@/components/ui/primitives';
import { NetworkMenu } from '@/components/NetworkMenu';
import { ProfileMenu } from '@/components/ProfileMenu';
import { ChainSwitcher } from '@/components/shell/ChainSwitcher';
import { NotificationsMenu } from '@/components/shell/NotificationsMenu';
import { StatusFooter } from '@/components/shell/StatusFooter';
import { TabStrip } from '@/components/shell/TabStrip';
import { WalletButton } from '@/components/shell/WalletButton';
import { WorkspaceMenu } from '@/components/shell/WorkspaceMenu';
import { useClickOutside } from '@/components/shell/useClickOutside';
import {
    ShellContent,
    ShellInspector,
    ShellOverlays,
    ShellTerminal,
    useChainShell,
    type ChainLayoutProps,
} from '@/components/shell/frame';
import { DEFAULT_MOVE_CALL, EVM_CHAINS, type EvmChainInfo } from '@/lib/constants';
import { RequestType } from '@/types';
import type { ChainNavGroup, ChainNavItem } from '../registry';

const newEvmRequest = (chain: EvmChainInfo) =>
    appStore.openTab('rpc', {
        id: `rpc-${Date.now()}`,
        name: `${chain.name} request`,
        type: RequestType.RPC,
        network: appStore.getSnapshot().network,
        rpcParams: { method: '', params: [], chain: 'evm', evmChainId: chain.id },
        moveParams: { ...DEFAULT_MOVE_CALL },
    });

function MenuBarGroup({ group, isActive, onOpen }: { group: ChainNavGroup; isActive: (i: ChainNavItem) => boolean; onOpen: (i: ChainNavItem) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, () => setIsOpen(false));
    const groupActive = group.items.some(isActive);
    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen((o) => !o)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className={cx(
                    'flex items-center gap-1 h-8 px-2.5 rounded-[7px] text-[14px] transition-colors',
                    groupActive ? 'text-fg font-medium bg-active' : 'text-fg-muted hover:text-fg hover:bg-hover',
                    isOpen && 'bg-hover text-fg'
                )}
            >
                {group.label}
                <ChevronDown size={12} className="text-fg-subtle" />
            </button>
            {isOpen && (
                <div role="menu" className="absolute top-full left-0 mt-1 w-56 bg-elevated border border-line rounded-card shadow-pop overflow-hidden z-50 p-1 animate-in fade-in zoom-in-95">
                    {group.items.map((item) => (
                        <button
                            key={item.id}
                            role="menuitem"
                            onClick={() => {
                                onOpen(item);
                                setIsOpen(false);
                            }}
                            className={cx(
                                'w-full flex items-center gap-2.5 rounded-[7px] px-2 h-8 text-left text-[14px] transition-colors',
                                isActive(item) ? 'bg-active text-fg font-medium' : 'text-fg-muted hover:bg-hover hover:text-fg'
                            )}
                        >
                            <item.icon size={14} className="shrink-0" />
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function NetworkColumn({ onPicked }: { onPicked: () => void }) {
    const [filter, setFilter] = useState('');
    const networks = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return q ? EVM_CHAINS.filter((c) => c.name.toLowerCase().includes(q) || String(c.id) === q) : EVM_CHAINS;
    }, [filter]);

    return (
        <div className="flex flex-col min-h-0 flex-1">
            <div className="px-2.5 pt-2 pb-2 shrink-0">
                <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter networks or chain id" aria-label="Filter EVM networks" />
            </div>
            <ul className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-1.5 pb-2 space-y-px">
                {networks.map((chain) => (
                    <li key={chain.id} className="group flex items-center gap-1 rounded-[7px] hover:bg-hover pr-1">
                        <button
                            onClick={() => {
                                newEvmRequest(chain);
                                onPicked();
                            }}
                            className="flex-1 min-w-0 flex items-center gap-2 h-8 px-2 text-left"
                            title={`New request on ${chain.name}`}
                            aria-label={`New request on ${chain.name}, chain id ${chain.id}`}
                        >
                            <span className="flex-1 truncate text-[13px] text-fg">{chain.name}</span>
                            <span className="text-[11px] font-mono text-fg-subtle tabular">{chain.id}</span>
                        </button>
                        <button
                            onClick={() => {
                                appStore.openTab('evm_explorer', { chainId: chain.id });
                                onPicked();
                            }}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 h-6 px-1.5 rounded-[5px] text-[11px] text-fg-muted hover:text-fg hover:bg-active transition-opacity"
                            aria-label={`Explore ${chain.name}`}
                        >
                            Explore
                        </button>
                    </li>
                ))}
                {networks.length === 0 && <li className="px-2 py-6 text-center text-xs text-fg-subtle">No EVM network matches.</li>}
            </ul>
        </div>
    );
}

export function SplitLayout(props: ChainLayoutProps) {
    const { def, workspace, inspector, activeTabId, onSelectTab, onCloseTab, onRenameTab, onNewTab, onCreateWorkspace } = props;
    const { isSidebarOpen, isInspectorOpen } = useAppStore();
    const shell = useChainShell(props);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const menuGroups = [...def.nav, { label: 'Help', items: shell.footer }];

    return (
        <div className="flex flex-col h-screen bg-canvas text-fg overflow-hidden font-sans text-[14px] relative">
            <ShellOverlays />

            <header className="h-12 shrink-0 flex items-center gap-1.5 px-2.5 border-b border-line bg-surface">
                <IconButton label="Open networks" className="md:hidden" onClick={() => setIsMobileNavOpen(true)}>
                    <Menu size={16} />
                </IconButton>
                <WorkspaceMenu onCreateWorkspace={onCreateWorkspace} iconOnly />
                <ChainSwitcher />
                <nav aria-label="Main navigation" className="hidden md:flex items-center gap-0.5 ml-2">
                    {menuGroups.map((group) => (
                        <MenuBarGroup key={group.label} group={group} isActive={shell.isActive} onOpen={shell.open} />
                    ))}
                </nav>
                <div className="flex-1" />
                <IconButton label="Search" onClick={() => appStore.setCommandPalette(true)}>
                    <Search size={15} />
                </IconButton>
                <NetworkMenu />
                <NotificationsMenu />
                <WalletButton />
                <IconButton label={isInspectorOpen ? 'Close inspector' : 'Open wallet panel'} active={isInspectorOpen} onClick={() => appStore.toggleInspector()}>
                    <PanelRight size={15} />
                </IconButton>
                <ProfileMenu avatarOnly placement="down-right" />
            </header>

            <div className="flex-1 flex min-h-0">
                {isMobileNavOpen && (
                    <button onClick={() => setIsMobileNavOpen(false)} aria-label="Close navigation" className="md:hidden fixed inset-0 z-30 bg-black/50 animate-in fade-in" />
                )}
                {(isSidebarOpen || isMobileNavOpen) && (
                    <aside
                        aria-label="EVM networks"
                        className={cx(
                            'w-[232px] shrink-0 flex flex-col bg-canvas border-r border-line',
                            isMobileNavOpen ? 'fixed inset-y-0 left-0 z-40 md:static md:z-auto' : 'hidden md:flex'
                        )}
                    >
                        <div className="h-10 flex items-center justify-between px-3 shrink-0">
                            <span className="text-[12px] font-medium text-fg-subtle">Networks</span>
                            <IconButton label="Close menu" size="sm" className="md:hidden" onClick={() => setIsMobileNavOpen(false)}>
                                <X size={14} />
                            </IconButton>
                        </div>
                        {/* On a phone the menu bar is hidden, so its tools are listed here. */}
                        <div className="md:hidden px-1.5 pb-2 border-b border-line">
                            {menuGroups.flatMap((g) => g.items).map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        shell.open(item);
                                        setIsMobileNavOpen(false);
                                    }}
                                    className={cx('w-full flex items-center gap-2.5 h-8 px-2 rounded-[7px] text-[14px]', shell.isActive(item) ? 'bg-active text-fg' : 'text-fg-muted hover:bg-hover')}
                                >
                                    <item.icon size={14} /> {item.label}
                                </button>
                            ))}
                        </div>
                        <NetworkColumn onPicked={() => setIsMobileNavOpen(false)} />
                    </aside>
                )}

                <div className="flex-1 flex min-w-0 gap-2 md:p-2">
                    <main className="flex-1 flex flex-col min-w-0 bg-surface md:rounded-panel md:border md:border-line md:shadow-card overflow-hidden relative">
                        <div className="h-10 flex items-center gap-2 px-3 border-b border-line shrink-0">
                            <IconButton
                                label={isSidebarOpen ? 'Hide networks' : 'Show networks'}
                                size="sm"
                                className="hidden md:inline-flex -ml-1"
                                active={isSidebarOpen}
                                onClick={() => appStore.toggleSidebar()}
                            >
                                <PanelLeft size={14} />
                            </IconButton>
                            <span className="font-medium text-fg truncate">{shell.pageTitle}</span>
                            <div className="flex-1" />
                            <button onClick={onNewTab} className="flex items-center gap-1.5 h-7 px-2 rounded-[7px] text-[13px] text-fg-muted hover:text-fg hover:bg-hover">
                                <Plus size={13} /> New request
                            </button>
                            {shell.isRequestView && (
                                <IconButton label="Terminal" size="sm" active={shell.isTerminalOpen} onClick={() => appStore.toggleTerminal()}>
                                    <Terminal size={14} />
                                </IconButton>
                            )}
                        </div>
                        <TabStrip
                            tabs={shell.visibleTabs}
                            activeTabId={activeTabId}
                            onSelectTab={onSelectTab}
                            onCloseTab={onCloseTab}
                            onRenameTab={onRenameTab}
                            onNewTab={onNewTab}
                        />
                        <ShellContent activeKey={shell.activeTab?.id ?? 'home'}>{workspace}</ShellContent>
                        <ShellTerminal isRequestView={shell.isRequestView} />
                        <StatusFooter isRequestView={shell.isRequestView} />
                    </main>
                    <ShellInspector>{inspector}</ShellInspector>
                </div>
            </div>
        </div>
    );
}
