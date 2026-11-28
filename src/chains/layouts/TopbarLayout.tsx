/**
 * Starknet workspace: a studio layout. No sidebar: the chain's primary tools
 * run across the top as tabs, everything else sits in a "More" menu, and the
 * page uses the full width below. Contract and transaction work needs wide
 * calldata, ABI and trace views, which is why this chain gets the width.
 */
import React, { useRef, useState } from 'react';
import { ChevronDown, PanelRight, Plus, Search, Terminal } from 'lucide-react';
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
import { useClickOutside } from '@/components/shell/useClickOutside';
import {
    ShellContent,
    ShellInspector,
    ShellOverlays,
    ShellTerminal,
    useChainShell,
    type ChainLayoutProps,
} from '@/components/shell/frame';

export function TopbarLayout(props: ChainLayoutProps) {
    const { def, workspace, inspector, activeTabId, onSelectTab, onCloseTab, onRenameTab, onNewTab, onCreateWorkspace } = props;
    const { isInspectorOpen } = useAppStore();
    const shell = useChainShell(props);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);
    useClickOutside(moreRef, () => setIsMoreOpen(false));

    const [primary, ...secondary] = def.nav;
    const moreGroups = [...secondary, { label: 'Help and settings', items: shell.footer }];
    const moreActive = moreGroups.some((g) => g.items.some(shell.isActive));

    return (
        <div className="flex flex-col h-screen bg-canvas text-fg overflow-hidden font-sans text-[14px] relative">
            <ShellOverlays />

            <header className="shrink-0 border-b border-line bg-surface">
                <div className="h-12 flex items-center gap-2 px-3">
                    <WorkspaceMenu onCreateWorkspace={onCreateWorkspace} iconOnly />
                    <ChainSwitcher />
                    <div className="flex-1" />
                    <button
                        onClick={() => appStore.setCommandPalette(true)}
                        className="hidden md:flex items-center gap-2 h-8 w-56 rounded-[7px] border border-line bg-canvas hover:border-line-strong px-2.5 text-fg-subtle transition-colors"
                        title="Search requests, collections, networks... (Ctrl+K)"
                    >
                        <Search size={13} className="shrink-0" />
                        <span className="flex-1 text-left text-[14px] truncate">Search…</span>
                        <Kbd>⌘K</Kbd>
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
                </div>

                <nav aria-label="Main navigation" className="h-10 flex items-end gap-1 px-2">
                    <div className="flex items-end gap-0.5 overflow-x-auto no-scrollbar min-w-0">
                        {primary.items.map((item) => {
                            const active = shell.isActive(item);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => shell.open(item)}
                                    aria-current={active ? 'page' : undefined}
                                    className={cx(
                                        'relative flex items-center gap-1.5 h-9 px-3 text-[14px] whitespace-nowrap transition-colors',
                                        active ? 'text-fg font-medium' : 'text-fg-muted hover:text-fg'
                                    )}
                                >
                                    <item.icon size={14} strokeWidth={active ? 2.2 : 1.8} />
                                    {item.label}
                                    {active && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-fg" />}
                                </button>
                            );
                        })}
                    </div>
                    <div className="relative shrink-0" ref={moreRef}>
                        <button
                            onClick={() => setIsMoreOpen((o) => !o)}
                            aria-expanded={isMoreOpen}
                            aria-haspopup="menu"
                            className={cx(
                                'relative flex items-center gap-1 h-9 px-3 text-[14px] transition-colors',
                                moreActive ? 'text-fg font-medium' : 'text-fg-muted hover:text-fg'
                            )}
                        >
                            More <ChevronDown size={13} />
                            {moreActive && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-fg" />}
                        </button>
                        {isMoreOpen && (
                            <div role="menu" className="absolute top-full left-0 mt-1 w-60 bg-elevated border border-line rounded-card shadow-pop overflow-hidden z-50 p-1 animate-in fade-in zoom-in-95">
                                {moreGroups.map((group) => (
                                    <div key={group.label} className="py-0.5">
                                        <div className="px-2 h-6 flex items-center text-[12px] font-medium text-fg-subtle">{group.label}</div>
                                        {group.items.map((item) => (
                                            <button
                                                key={item.id}
                                                role="menuitem"
                                                onClick={() => {
                                                    shell.open(item);
                                                    setIsMoreOpen(false);
                                                }}
                                                className={cx(
                                                    'w-full flex items-center gap-2.5 rounded-[7px] px-2 h-8 text-left text-[14px] transition-colors',
                                                    shell.isActive(item) ? 'bg-active text-fg font-medium' : 'text-fg-muted hover:bg-hover hover:text-fg'
                                                )}
                                            >
                                                <item.icon size={14} className="shrink-0" />
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex-1" />
                    <button
                        onClick={onNewTab}
                        className="hidden sm:flex items-center gap-1.5 h-8 mb-1 px-2.5 rounded-[7px] text-[14px] text-fg-muted hover:text-fg hover:bg-hover transition-colors shrink-0"
                    >
                        <Plus size={14} /> New request
                    </button>
                    {shell.isRequestView && (
                        <IconButton label="Terminal" className="mb-1" active={shell.isTerminalOpen} onClick={() => appStore.toggleTerminal()}>
                            <Terminal size={15} />
                        </IconButton>
                    )}
                </nav>
            </header>

            <div className="flex-1 flex min-h-0 gap-2 md:p-2">
                <main className="flex-1 flex flex-col min-w-0 bg-surface md:rounded-panel md:border md:border-line md:shadow-card overflow-hidden relative">
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
