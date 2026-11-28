/**
 * Aptos workspace: an editor layout. A narrow activity rail on the far left
 * holds every tool as an icon; next to it a panel keeps this chain's
 * collections and recent history in view while a request is open, the way a
 * code editor keeps the file tree next to the file.
 */
import React, { useState } from 'react';
import { ChevronRight, Menu, PanelLeft, PanelRight, Plus, Search, Terminal, X } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { cx, IconButton } from '@/components/ui/primitives';
import { NetworkMenu } from '@/components/NetworkMenu';
import { ProfileMenu } from '@/components/ProfileMenu';
import { ChainSwitcher } from '@/components/shell/ChainSwitcher';
import { NotificationsMenu } from '@/components/shell/NotificationsMenu';
import { ResourcePanel } from '@/components/shell/ResourcePanel';
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

export function ActivityRailLayout(props: ChainLayoutProps) {
    const { def, workspace, inspector, activeTabId, onSelectTab, onCloseTab, onRenameTab, onNewTab, onCreateWorkspace } = props;
    const { isSidebarOpen, isInspectorOpen } = useAppStore();
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
                title={item.label}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={cx(
                    'relative h-10 w-full flex items-center justify-center transition-colors',
                    active ? 'text-fg' : 'text-fg-subtle hover:text-fg'
                )}
            >
                {active && <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-fg" />}
                <item.icon size={18} strokeWidth={active ? 2.1 : 1.75} />
            </button>
        );
    };

    return (
        <div className="flex h-screen bg-canvas text-fg overflow-hidden font-sans text-[14px] relative">
            <ShellOverlays />

            {isMobileNavOpen && (
                <button onClick={() => setIsMobileNavOpen(false)} aria-label="Close navigation" className="md:hidden fixed inset-0 z-30 bg-black/50 animate-in fade-in" />
            )}

            <div
                className={cx(
                    'fixed inset-y-0 left-0 z-40 flex md:static md:z-auto md:translate-x-0 transition-transform duration-200',
                    isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <nav aria-label="Main navigation" className="w-12 shrink-0 flex flex-col items-center bg-canvas border-r border-line py-2">
                    <WorkspaceMenu onCreateWorkspace={onCreateWorkspace} iconOnly />
                    <div className="w-6 h-px bg-line my-2" />
                    <div className="flex-1 min-h-0 w-full overflow-y-auto no-scrollbar">
                        {def.nav.map((group, i) => (
                            <div key={group.label} role="group" aria-label={group.label}>
                                {i > 0 && <div className="mx-3 my-1.5 h-px bg-line" />}
                                {group.items.map(railButton)}
                            </div>
                        ))}
                    </div>
                    <div className="w-full pt-1 border-t border-line">{shell.footer.map(railButton)}</div>
                    <div className="pt-1">
                        <ProfileMenu avatarOnly placement="right" />
                    </div>
                </nav>

                {isSidebarOpen && (
                    <aside aria-label="Collections and history" className="w-[248px] shrink-0 flex flex-col bg-surface border-r border-line">
                        <div className="h-12 flex items-center gap-1 px-2.5 border-b border-line shrink-0">
                            <span className="flex-1 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle">{def.name} workspace</span>
                            <IconButton label="New request" size="sm" onClick={onNewTab}>
                                <Plus size={14} />
                            </IconButton>
                            <IconButton label="Close menu" size="sm" className="md:hidden" onClick={() => setIsMobileNavOpen(false)}>
                                <X size={14} />
                            </IconButton>
                        </div>
                        <ResourcePanel className="flex-1" />
                    </aside>
                )}
            </div>

            <div className="flex-1 flex min-w-0 gap-2 md:p-2">
                <main className="flex-1 flex flex-col min-w-0 bg-surface md:rounded-panel md:border md:border-line md:shadow-card overflow-hidden relative">
                    <header className="h-12 flex items-center gap-2 px-3 border-b border-line shrink-0">
                        <IconButton label="Open navigation" className="md:hidden -ml-1" onClick={() => setIsMobileNavOpen(true)}>
                            <Menu size={16} />
                        </IconButton>
                        <IconButton
                            label={isSidebarOpen ? 'Hide collections panel' : 'Show collections panel'}
                            className="hidden md:inline-flex -ml-1"
                            active={isSidebarOpen}
                            onClick={() => appStore.toggleSidebar()}
                        >
                            <PanelLeft size={15} />
                        </IconButton>
                        <ChainSwitcher />
                        <div className="flex items-center gap-1.5 min-w-0 text-[14px] ml-1">
                            {shell.pageSection && <span className="hidden lg:inline text-fg-subtle">{shell.pageSection}</span>}
                            {shell.pageSection && <ChevronRight size={13} className="hidden lg:inline text-fg-subtle/70 shrink-0" />}
                            <span className="font-medium text-fg truncate">{shell.pageTitle}</span>
                        </div>
                        <div className="flex-1" />
                        <IconButton label="Search" onClick={() => appStore.setCommandPalette(true)}>
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
