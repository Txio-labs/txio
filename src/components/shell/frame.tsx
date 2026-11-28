/**
 * Pieces every chain layout shares: the overlays that sit above any layout,
 * the inspector column, the request terminal, and the state each layout
 * derives from the store (which tabs it shows, the page title, the nav item
 * that is active). Layouts differ in structure, not in this behaviour.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { ADMIN_NAV_ITEM, type ChainNavItem, type ChainWorkspaceDef } from '@/chains/registry';
import { tabBelongsTo } from '@/chains/scope';
import type { FeatureId, TabItem } from '@/types';
import { CommandPalette } from '../CommandPalette';
import { NetworkSwitcherModal } from '../NetworkSwitcherModal';
import { TerminalPanel } from '../TerminalPanel';
import { useEnter } from '@/lib/motion';

export interface ChainLayoutProps {
    def: ChainWorkspaceDef;
    workspace: React.ReactNode;
    inspector: React.ReactNode;
    tabs?: TabItem[];
    activeTabId?: string;
    onSelectTab?: (id: string | null) => void;
    onCloseTab?: (id: string) => void;
    onRenameTab?: (id: string, title: string) => void;
    onNewTab?: () => void;
    onCreateWorkspace?: (name: string) => void;
}

// The terminal is the execution console for requests, so it only shows while a request is open.
const REQUEST_TAB_TYPES: ReadonlySet<FeatureId> = new Set(['rpc', 'ptb', 'move', 'runner']);

const PAGE_TITLES: Partial<Record<FeatureId, string>> = {
    new_request: 'New request',
    new_collection: 'New collection',
    runner: 'Collection runner',
    account: 'Profile',
    ecosystem: 'Ecosystem',
    features: 'Features',
    integrations: 'Integrations',
    partners: 'Partners',
};

export function useChainShell(props: ChainLayoutProps) {
    const { def, tabs = [], activeTabId } = props;
    const { tabs: storeTabs, activeTabId: storeActiveTabId, isTerminalOpen, user } = useAppStore();
    const footer = useMemo(() => (user?.isAdmin ? [ADMIN_NAV_ITEM, ...def.footer] : def.footer), [user?.isAdmin, def.footer]);
    const visibleTabs = useMemo(() => tabs.filter((t) => tabBelongsTo(t, def.id)), [tabs, def.id]);
    const activeTab = storeTabs.find((t) => t.id === (activeTabId ?? storeActiveTabId));
    const isRequestView = Boolean(activeTab && REQUEST_TAB_TYPES.has(activeTab.type));
    const navItems = useMemo(() => [...def.nav.flatMap((g) => g.items), ...footer], [def, footer]);
    const activeItem = activeTab ? navItems.find((i) => i.id === activeTab.type) : navItems.find((i) => i.id === 'dashboard');
    const pageTitle = activeTab
        ? REQUEST_TAB_TYPES.has(activeTab.type)
            ? activeTab.title
            : activeItem?.label ?? PAGE_TITLES[activeTab.type] ?? activeTab.title
        : 'Overview';
    const pageSection = activeTab ? def.nav.find((g) => g.items.some((i) => i.id === activeTab.type))?.label : def.nav[0]?.label;
    const isActive = (item: ChainNavItem) => activeTab?.type === item.id || (!activeTab && item.id === 'dashboard');
    const open = (item: ChainNavItem) => {
        // "Overview" is the home page: no tab, so it never piles up in the tab strip.
        if (item.id === 'dashboard') appStore.setActiveTab(null);
        else if (item.id === 'rpc') appStore.openTab('new_request', { rpcParams: { method: '', params: [], chain: def.id } });
        else appStore.openTab(item.id);
    };
    return { footer, visibleTabs, activeTab, isRequestView, isTerminalOpen, pageTitle, pageSection, isActive, open };
}

/** Command palette, network-switch confirmation and the network-switch overlay. Rendered once by every layout. */
export function ShellOverlays() {
    const { network, pendingNetworkSwitch, isSyncing, scanStep } = useAppStore();
    return (
        <>
            <CommandPalette />
            <NetworkSwitcherModal
                isOpen={pendingNetworkSwitch !== null}
                onClose={() => appStore.cancelNetworkSwitch()}
                onConfirm={() => appStore.confirmNetworkSwitch()}
                from={network}
                to={pendingNetworkSwitch || network}
            />
            {isSyncing && (
                <div className="fixed inset-0 z-[110] bg-canvas/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 animate-in fade-in">
                    <Loader2 className="text-fg-muted animate-spin" size={28} />
                    <p className="text-fg text-xs font-mono">{scanStep || 'Syncing…'}</p>
                </div>
            )}
        </>
    );
}

/** The page content area, with the enter animation keyed to the active tab. */
export function ShellContent({ children, activeKey }: { children: React.ReactNode; activeKey: string }) {
    const ref = useRef<HTMLDivElement>(null);
    useEnter(ref, activeKey);
    return (
        <div ref={ref} className="flex-1 min-h-0 overflow-hidden relative">
            {children}
        </div>
    );
}

export function ShellTerminal({ isRequestView }: { isRequestView: boolean }) {
    return isRequestView ? <TerminalPanel /> : null;
}

/** The inspector column. Docked at md and up; a full-screen overlay on a phone. */
export function ShellInspector({ children }: { children: React.ReactNode }) {
    const { isInspectorOpen } = useAppStore();

    // On a phone the inspector covers the app, so it must not open on first load just because it is docked open on desktop.
    useEffect(() => {
        if (window.matchMedia?.('(max-width: 767px)').matches && appStore.getSnapshot().isInspectorOpen) {
            appStore.toggleInspector();
        }
    }, []);

    if (!isInspectorOpen) return null;
    return (
        <>
            <button
                onClick={() => appStore.toggleInspector()}
                aria-label="Close inspector overlay"
                className="md:hidden fixed inset-0 z-30 bg-black/50 animate-in fade-in"
            />
            <aside className="fixed inset-y-0 right-0 z-40 w-full sm:max-w-sm md:static md:z-10 md:w-[320px] md:max-w-none bg-surface md:rounded-panel border-l md:border border-line md:shadow-card flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right md:animate-none">
                {children}
            </aside>
        </>
    );
}
