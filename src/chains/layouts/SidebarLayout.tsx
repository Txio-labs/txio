/**
 * Sui workspace: a collapsible sidebar with grouped navigation on the left,
 * the page in a raised panel, and the inspector docked on the right. This is
 * the layout TXIO started with, kept for the chain it started on.
 */
import React, { useState } from 'react';
import { ChevronRight, Menu, PanelLeft, PanelRight, Plus, Search, Terminal, X } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { cx, IconButton, Kbd } from '@/components/ui/primitives';
import { NetworkMenu } from '@/components/NetworkMenu';
import { ProfileMenu } from '@/components/ProfileMenu';
import { ChainSwitcher } from '@/components/shell/ChainSwitcher';
import { NotificationsMenu } from '@/components/shell/NotificationsMenu';
import { StatusFooter } from '@/components/shell/StatusFooter';
import { TabStrip } from '@/components/shell/TabStrip';
import { WalletButton } from '@/components/shell/WalletButton';
import { WorkspaceMenu } from '@/components/shell/WorkspaceMenu';
import {
    ShellContent,
    ShellInspector,
    ShellOverlays,
    ShellTerminal,
    useChainShell,
    type ChainLayoutProps,
} from '@/components/shell/frame';
import type { ChainNavItem } from '../registry';

export function SidebarLayout(props: ChainLayoutProps) {
    const { def, workspace, inspector, activeTabId, onSelectTab, onCloseTab, onRenameTab, onNewTab, onCreateWorkspace } = props;
    const { isSidebarOpen, isInspectorOpen } = useAppStore();
    const shell = useChainShell(props);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const collapsed = !isSidebarOpen;

    const navButton = (item: ChainNavItem) => {
        const active = shell.isActive(item);
        return (
            <button
                key={item.id + item.label}
                onClick={() => {
                    shell.open(item);
                    setIsMobileNavOpen(false);
                }}
                title={item.label}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={cx(
                    'group relative w-full flex items-center gap-2.5 h-8 rounded-[7px] text-[14px] transition-colors',
                    collapsed ? 'md:justify-center md:px-0 px-2.5' : 'px-2.5',
                    active ? 'bg-active text-fg font-medium' : 'text-fg-muted hover:text-fg hover:bg-hover'
                )}
            >
                <item.icon size={15} strokeWidth={active ? 2.2 : 1.8} className={active ? 'text-fg' : 'text-fg-subtle group-hover:text-fg-muted'} />
                <span className={cx('truncate', collapsed && 'md:hidden')}>{item.label}</span>
            </button>
        );
    };

    return (
        <div className="flex h-screen bg-canvas text-fg overflow-hidden font-sans text-[14px] relative">
            <ShellOverlays />

            {isMobileNavOpen && (
                <button
                    onClick={() => setIsMobileNavOpen(false)}
                    aria-label="Close navigation"
                    className="md:hidden fixed inset-0 z-30 bg-black/50 animate-in fade-in"
                />
            )}

            <nav
                aria-label="Main navigation"
                className={cx(
                    'fixed inset-y-0 left-0 z-40 md:static md:z-auto shrink-0 flex flex-col bg-canvas transition-[width,transform] duration-200 w-[264px] md:translate-x-0',
                    collapsed ? 'md:w-[60px]' : 'md:w-[244px]',
                    isMobileNavOpen ? 'translate-x-0 border-r border-line' : '-translate-x-full'
                )}
            >
                <div className={cx('px-2.5 pt-2.5 pb-1 flex items-center gap-1', collapsed && 'md:px-2')}>
                    <WorkspaceMenu onCreateWorkspace={onCreateWorkspace} collapsed={collapsed} className="flex-1 min-w-0" />
                    <IconButton label="Close menu" size="sm" className="md:hidden" onClick={() => setIsMobileNavOpen(false)}>
                        <X size={14} />
                    </IconButton>
                </div>

                <div className={cx('px-2.5 pb-2 space-y-1', collapsed && 'md:px-2')}>
                    <button
                        onClick={() => appStore.setCommandPalette(true)}
                        className={cx(
                            'w-full flex items-center gap-2 h-8 rounded-[7px] border border-line bg-surface hover:border-line-strong px-2.5 text-fg-subtle transition-colors shadow-card',
                            collapsed && 'md:justify-center md:px-0'
                        )}
                        title="Search requests, collections, networks... (Ctrl+K)"
                    >
                        <Search size={13} className="shrink-0" />
                        <span className={cx('flex-1 text-left text-[14px] truncate', collapsed && 'md:hidden')}>Search…</span>
                        <span className={cx('flex items-center gap-0.5', collapsed && 'md:hidden')}>
                            <Kbd>⌘</Kbd>
                            <Kbd>K</Kbd>
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            onNewTab?.();
                            setIsMobileNavOpen(false);
                        }}
                        className={cx(
                            'w-full flex items-center gap-2 h-8 rounded-[7px] px-2.5 text-fg-muted hover:text-fg hover:bg-hover transition-colors',
                            collapsed && 'md:justify-center md:px-0'
                        )}
                        title="New request"
                    >
                        <Plus size={14} className="shrink-0" />
                        <span className={cx('flex-1 text-left text-[14px]', collapsed && 'md:hidden')}>New request</span>
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-2.5 pb-2 flex flex-col">
                    {def.nav.map((group) => (
                        <div key={group.label} className="mb-3">
                            <div className={cx('px-2.5 h-6 flex items-center text-[12px] font-medium text-fg-subtle', collapsed && 'md:hidden')}>{group.label}</div>
                            {collapsed && <div className="hidden md:block mx-3 my-2 h-px bg-line" />}
                            <div className="space-y-px">{group.items.map(navButton)}</div>
                        </div>
                    ))}
                    <div className="mt-auto pt-2 space-y-px">{shell.footer.map(navButton)}</div>
                </div>

                <div className={cx('border-t border-line px-2.5 py-2 flex items-center gap-2', collapsed && 'md:flex-col md:px-2')}>
                    <ProfileMenu compact={collapsed} />
                    <div className={cx('flex-1', collapsed && 'md:hidden')} />
                    <IconButton
                        label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        size="sm"
                        className="hidden md:inline-flex"
                        onClick={() => appStore.toggleSidebar()}
                    >
                        <PanelLeft size={14} />
                    </IconButton>
                </div>
            </nav>

            <div className="flex-1 flex min-w-0 md:py-2 md:pr-2 gap-2">
                <main className="flex-1 flex flex-col min-w-0 bg-surface md:rounded-panel md:border md:border-line md:shadow-card overflow-hidden relative">
                    <header className="h-12 flex items-center gap-2 px-3 border-b border-line shrink-0">
                        <IconButton label="Open navigation" className="md:hidden -ml-1" onClick={() => setIsMobileNavOpen(true)}>
                            <Menu size={16} />
                        </IconButton>
                        <ChainSwitcher />
                        <div className="flex items-center gap-1.5 min-w-0 text-[14px] ml-1">
                            {shell.pageSection && <span className="hidden sm:inline text-fg-subtle">{shell.pageSection}</span>}
                            {shell.pageSection && <ChevronRight size={13} className="hidden sm:inline text-fg-subtle/70 shrink-0" />}
                            <span className="font-medium text-fg truncate">{shell.pageTitle}</span>
                        </div>
                        <div className="flex-1" />
                        <NetworkMenu />
                        {shell.isRequestView && (
                            <IconButton label="Terminal" active={shell.isTerminalOpen} onClick={() => appStore.toggleTerminal()}>
                                <Terminal size={15} />
                            </IconButton>
                        )}
                        <NotificationsMenu />
                        <WalletButton />
                        <IconButton label={isInspectorOpen ? 'Close inspector' : 'Open wallet panel'} active={isInspectorOpen} onClick={() => appStore.toggleInspector()}>
                            <PanelRight size={15} />
                        </IconButton>
                    </header>

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
    );
}
