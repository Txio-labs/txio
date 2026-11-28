/**
 * Solana workspace: a labelled icon rail on the left, each tool an icon with a
 * short label under it, and the page beside it with no secondary panel. It is
 * the densest layout: Solana work is many short calls (accounts, slots,
 * signatures), so the request editor gets as much room as possible.
 */
import React, { useState } from 'react';
import { Menu, PanelRight, Plus, Search, Terminal, X } from 'lucide-react';
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

export function IconRailLayout(props: ChainLayoutProps) {
    const { def, workspace, inspector, activeTabId, onSelectTab, onCloseTab, onRenameTab, onNewTab, onCreateWorkspace } = props;
    const { isInspectorOpen } = useAppStore();
    const shell = useChainShell(props);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    const railButton = (item: ChainNavItem) => {
        const active = shell.isActive(item);
        return (
            <button
                key={item.id}
                onClick={() => {
                    shell.open(item);
                    setIsMobileNavOpen(false);
                }}
                aria-current={active ? 'page' : undefined}
                className={cx(
                    'w-full flex flex-col items-center gap-1 py-2 rounded-[9px] transition-colors',
                    active ? 'bg-active text-fg' : 'text-fg-subtle hover:text-fg hover:bg-hover'
                )}
            >
                <item.icon size={17} strokeWidth={active ? 2.1 : 1.75} />
                <span className="text-[10.5px] leading-none font-medium max-w-full truncate px-0.5">{item.label}</span>
            </button>
        );
    };

    return (
        <div className="flex h-screen bg-canvas text-fg overflow-hidden font-sans text-[14px] relative">
            <ShellOverlays />

            {isMobileNavOpen && (
                <button onClick={() => setIsMobileNavOpen(false)} aria-label="Close navigation" className="md:hidden fixed inset-0 z-30 bg-black/50 animate-in fade-in" />
            )}

            <nav
                aria-label="Main navigation"
                className={cx(
                    'fixed inset-y-0 left-0 z-40 md:static md:z-auto w-[84px] shrink-0 flex flex-col items-center bg-canvas py-2 px-1.5 gap-1 transition-transform duration-200 md:translate-x-0',
                    isMobileNavOpen ? 'translate-x-0 border-r border-line' : '-translate-x-full'
                )}
            >
                <div className="flex items-center">
                    <WorkspaceMenu onCreateWorkspace={onCreateWorkspace} iconOnly />
                    <IconButton label="Close menu" size="sm" className="md:hidden" onClick={() => setIsMobileNavOpen(false)}>
                        <X size={14} />
                    </IconButton>
                </div>
                <button
                    onClick={onNewTab}
                    title="New request"
                    aria-label="New request"
                    className="my-1 h-9 w-9 rounded-[10px] bg-inverse text-on-inverse flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                    <Plus size={16} />
                </button>
                <div className="flex-1 min-h-0 w-full overflow-y-auto no-scrollbar space-y-0.5">
                    {def.nav.map((group, i) => (
                        <div key={group.label} role="group" aria-label={group.label} className="space-y-0.5">
                            {i > 0 && <div className="mx-3 my-1.5 h-px bg-line" />}
                            {group.items.map(railButton)}
                        </div>
                    ))}
                </div>
                <div className="w-full pt-1 border-t border-line space-y-0.5">{shell.footer.map(railButton)}</div>
                <ProfileMenu avatarOnly placement="right" />
            </nav>

            <div className="flex-1 flex min-w-0 gap-2 md:py-2 md:pr-2">
                <main className="flex-1 flex flex-col min-w-0 bg-surface md:rounded-panel md:border md:border-line md:shadow-card overflow-hidden relative">
                    <header className="h-11 flex items-center gap-2 px-3 border-b border-line shrink-0">
                        <IconButton label="Open navigation" className="md:hidden -ml-1" onClick={() => setIsMobileNavOpen(true)}>
                            <Menu size={16} />
                        </IconButton>
                        <ChainSwitcher />
                        <span className="font-medium text-fg truncate ml-1">{shell.pageTitle}</span>
                        <div className="flex-1" />
                        <button
                            onClick={() => appStore.setCommandPalette(true)}
                            className="hidden lg:flex items-center gap-2 h-8 rounded-[7px] px-2 text-fg-subtle hover:text-fg hover:bg-hover transition-colors"
                            title="Search (Ctrl+K)"
                        >
                            <Search size={14} /> <Kbd>⌘K</Kbd>
                        </button>
                        <IconButton label="Search" className="lg:hidden" onClick={() => appStore.setCommandPalette(true)}>
                            <Search size={15} />
                        </IconButton>
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
