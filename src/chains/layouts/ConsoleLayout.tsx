/**
 * Stellar workspace: a console layout. Edge to edge with no floating panels:
 * a header, then one row with every tool visible and grouped (Build, Assets,
 * Operate), then the page. Nothing is hidden behind a menu, so moving between
 * Soroban RPC, Horizon and transaction work is one click.
 */
import React from 'react';
import { PanelRight, Plus, Search, Terminal } from 'lucide-react';
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

export function ConsoleLayout(props: ChainLayoutProps) {
    const { def, workspace, inspector, activeTabId, onSelectTab, onCloseTab, onRenameTab, onNewTab, onCreateWorkspace } = props;
    const { isInspectorOpen } = useAppStore();
    const shell = useChainShell(props);
    const groups = [...def.nav, { label: 'Help', items: shell.footer }];

    return (
        <div className="flex flex-col h-screen bg-surface text-fg overflow-hidden font-sans text-[14px] relative">
            <ShellOverlays />

            <header className="h-12 shrink-0 flex items-center gap-2 px-3 border-b border-line">
                <WorkspaceMenu onCreateWorkspace={onCreateWorkspace} iconOnly />
                <ChainSwitcher />
                <span className="hidden sm:inline text-fg-subtle">/</span>
                <span className="hidden sm:inline font-medium text-fg truncate">{shell.pageTitle}</span>
                <div className="flex-1" />
                <button
                    onClick={() => appStore.setCommandPalette(true)}
                    className="hidden md:flex items-center gap-2 h-8 rounded-[7px] border border-line px-2.5 text-fg-subtle hover:text-fg hover:border-line-strong transition-colors"
                >
                    <Search size={13} /> Search <Kbd>⌘K</Kbd>
                </button>
                <IconButton label="Search" className="md:hidden" onClick={() => appStore.setCommandPalette(true)}>
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

            <nav aria-label="Main navigation" className="shrink-0 flex items-center gap-1 px-2 h-11 border-b border-line bg-sunken/40 overflow-x-auto no-scrollbar">
                {groups.map((group, gi) => (
                    <div key={group.label} role="group" aria-label={group.label} className="flex items-center gap-0.5 shrink-0">
                        {gi > 0 && <span className="mx-2 h-5 w-px bg-line" aria-hidden />}
                        <span className="hidden 2xl:inline px-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{group.label}</span>
                        {group.items.map((item) => {
                            const active = shell.isActive(item);
                            // Help links are rarely used: icons only, so the row fits at laptop widths.
                            const iconOnly = group.label === 'Help';
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => shell.open(item)}
                                    aria-current={active ? 'page' : undefined}
                                    title={item.label}
                                    aria-label={item.label}
                                    className={cx(
                                        'flex items-center gap-1.5 h-7 px-2 rounded-[6px] text-[13px] whitespace-nowrap transition-colors',
                                        active ? 'bg-surface text-fg font-medium border border-line shadow-card' : 'text-fg-muted hover:text-fg hover:bg-hover border border-transparent'
                                    )}
                                >
                                    <item.icon size={13} strokeWidth={active ? 2.2 : 1.8} />
                                    {!iconOnly && item.label}
                                </button>
                            );
                        })}
                    </div>
                ))}
                <div className="flex-1" />
                <button onClick={onNewTab} className="shrink-0 flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] text-[13px] font-medium bg-inverse text-on-inverse hover:opacity-90">
                    <Plus size={13} /> New request
                </button>
                {shell.isRequestView && (
                    <IconButton label="Terminal" size="sm" active={shell.isTerminalOpen} onClick={() => appStore.toggleTerminal()}>
                        <Terminal size={14} />
                    </IconButton>
                )}
            </nav>

            <div className="flex-1 flex min-h-0">
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
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
                <div className={cx('flex', isInspectorOpen && 'md:border-l md:border-line')}>
                    <ShellInspector>{inspector}</ShellInspector>
                </div>
            </div>
        </div>
    );
}
