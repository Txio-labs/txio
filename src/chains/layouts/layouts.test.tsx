import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import React from 'react';
import type { ChainId, TabItem } from '@/types';

const store = vi.hoisted(() => ({
    setActiveTab: vi.fn(),
    openTab: vi.fn(),
    setActiveChain: vi.fn(),
    cancelNetworkSwitch: vi.fn(),
    confirmNetworkSwitch: vi.fn(),
    toggleInspector: vi.fn(),
    toggleSidebar: vi.fn(),
    toggleTerminal: vi.fn(),
    setCommandPalette: vi.fn(),
    closeAllTabs: vi.fn(),
    closeSavedTabs: vi.fn(),
    toggleCollectionExpand: vi.fn(),
    createCollection: vi.fn(),
    clearNotifications: vi.fn(),
    dismissNotification: vi.fn(),
}));

const snapshot = vi.hoisted(() => ({
    theme: 'dark' as const,
    isInspectorOpen: true,
    isSidebarOpen: true,
    network: 'mainnet' as const,
    isSyncing: false,
    scanStep: '',
    isTerminalOpen: false,
    pendingNetworkSwitch: null,
    tabs: [] as unknown[],
    activeTabId: null as string | null,
    activeChain: 'sui' as string,
    workspaces: [{ id: 'ws-1', name: 'Core Protocol', type: 'Personal' as const, activeEnvId: '' }],
    currentWorkspaceId: 'ws-1',
    notifications: [],
    activityLogs: [],
    collections: [],
    history: [],
    envVariables: [],
    settings: { theme: 'dark' },
    user: { id: 'u1', email: 'ada@example.com', name: 'Ada', isAdmin: false },
}));

vi.mock('@/lib/store', () => ({ appStore: { ...store, getSnapshot: () => snapshot }, useAppStore: () => snapshot }));
vi.mock('@/wallet', () => ({
    useWallet: () => ({ currentWallet: null, isConnected: false, openModal: vi.fn(), linkedWallets: {} }),
}));
vi.mock('@/wallet/utils', () => ({ shortenAddress: (a: string) => a }));
vi.mock('@/components/NetworkMenu', () => ({ NetworkMenu: () => <div>network-menu</div> }));
vi.mock('@/components/NetworkSwitcherModal', () => ({ NetworkSwitcherModal: () => null }));
vi.mock('@/components/CommandPalette', () => ({ CommandPalette: () => null }));
vi.mock('@/components/TerminalPanel', () => ({ TerminalPanel: () => null }));
vi.mock('@/components/ProfileMenu', () => ({ ProfileMenu: () => <div>profile-menu</div> }));

import { ChainWorkspaceLayout } from '../ChainWorkspaceLayout';
import { CHAIN_ORDER, CHAIN_WORKSPACES } from '../registry';

const tab = (id: string, type: TabItem['type'], chain?: ChainId): TabItem => ({
    id,
    type,
    title: id,
    data: chain ? { rpcParams: { method: '', params: [], chain } } : undefined,
});

const renderChain = (chain: ChainId, tabs: TabItem[] = []) => {
    snapshot.activeChain = chain;
    snapshot.tabs = tabs;
    return render(
        <ChainWorkspaceLayout
            def={CHAIN_WORKSPACES[chain]}
            workspace={<div>workspace-content</div>}
            inspector={<div>inspector-content</div>}
            tabs={tabs}
        />
    );
};

const mainNav = () => screen.getByRole('navigation', { name: 'Main navigation' });

beforeEach(() => {
    vi.clearAllMocks();
    snapshot.isSidebarOpen = true;
    snapshot.activeTabId = null;
});

describe('chain workspace layouts', () => {
    it.each(CHAIN_ORDER)('%s renders its own page, inspector and chain switcher', (chain) => {
        renderChain(chain);
        expect(screen.getByText('workspace-content')).toBeInTheDocument();
        expect(screen.getByText('inspector-content')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: `Chain: ${CHAIN_WORKSPACES[chain].name}. Switch chain` })).toBeInTheDocument();
    });

    it('uses a different page structure for every chain', () => {
        const structures = CHAIN_ORDER.map((chain) => {
            const { container } = renderChain(chain);
            // Element names in document order, without text: two layouts only match if their structure does.
            const shape = Array.from(container.querySelectorAll('*'))
                .slice(0, 40)
                .map((el) => el.tagName)
                .join(',');
            cleanup();
            return shape;
        });
        expect(new Set(structures).size).toBe(CHAIN_ORDER.length);
    });

    it('shows only the active chain\'s tabs, plus tabs every chain shares', () => {
        renderChain('starknet', [tab('a', 'rpc', 'starknet'), tab('b', 'rpc', 'evm'), tab('c', 'settings'), tab('d', 'evm_explorer')]);
        const tablist = screen.getByRole('tablist');
        expect(within(tablist).getByText('a')).toBeInTheDocument();
        expect(within(tablist).getByText('c')).toBeInTheDocument();
        expect(within(tablist).queryByText('b')).toBeNull();
        expect(within(tablist).queryByText('d')).toBeNull();
    });

    it('opens "Requests" as a new request on the workspace\'s chain', () => {
        renderChain('sui');
        fireEvent.click(within(mainNav()).getByRole('button', { name: 'Requests' }));
        expect(store.openTab).toHaveBeenCalledWith('new_request', { rpcParams: { method: '', params: [], chain: 'sui' } });
    });

    it('treats Overview as the home page, not a tab', () => {
        renderChain('sui');
        fireEvent.click(within(mainNav()).getByRole('button', { name: 'Overview' }));
        expect(store.setActiveTab).toHaveBeenCalledWith(null);
        expect(store.openTab).not.toHaveBeenCalled();
    });

    it('switches chains and returns to the picker from the chain switcher', () => {
        renderChain('aptos');
        fireEvent.click(screen.getByRole('button', { name: 'Chain: Aptos. Switch chain' }));
        fireEvent.click(screen.getByRole('menuitemradio', { name: 'Solana' }));
        expect(store.setActiveChain).toHaveBeenCalledWith('solana');

        fireEvent.click(screen.getByRole('button', { name: 'Chain: Aptos. Switch chain' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'All chains' }));
        expect(store.setActiveChain).toHaveBeenCalledWith(null);
    });

    it('renders the inspector as a dismissible overlay on a phone', () => {
        renderChain('solana');
        const backdrop = screen.getByRole('button', { name: 'Close inspector overlay' });
        expect(backdrop.className).toContain('md:hidden');
        fireEvent.click(backdrop);
        expect(store.toggleInspector).toHaveBeenCalledTimes(1);
    });
});

describe('Sui sidebar layout', () => {
    it('keeps the sidebar off-screen on a phone until opened, and closes it after navigating', () => {
        renderChain('sui');
        const nav = mainNav();
        expect(nav.className).toContain('-translate-x-full');
        fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
        expect(nav.className).not.toContain('-translate-x-full');
        fireEvent.click(within(nav).getByRole('button', { name: 'Collections' }));
        expect(store.openTab).toHaveBeenCalledWith('collections');
        expect(nav.className).toContain('-translate-x-full');
    });

    it('links to the Sui object explorer', () => {
        renderChain('sui');
        fireEvent.click(within(mainNav()).getByRole('button', { name: 'Object explorer' }));
        expect(store.openTab).toHaveBeenCalledWith('explorer');
    });
});

describe('Starknet top-bar layout', () => {
    it('puts studio tools in the top bar and the rest under "More"', () => {
        renderChain('starknet');
        const nav = mainNav();
        expect(within(nav).getByRole('button', { name: 'Explorer' })).toBeInTheDocument();
        expect(within(nav).queryByRole('menuitem', { name: 'Networks' })).toBeNull();
        fireEvent.click(within(nav).getByRole('button', { name: 'More' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Networks' }));
        expect(store.openTab).toHaveBeenCalledWith('infrastructure');
    });
});

describe('EVM layout', () => {
    it('lists EVM networks and starts a request on the one picked', () => {
        renderChain('evm');
        const networks = screen.getByRole('complementary', { name: 'EVM networks' });
        fireEvent.click(within(networks).getByRole('button', { name: 'New request on Base, chain id 8453' }));
        expect(store.openTab).toHaveBeenCalledWith('rpc', expect.objectContaining({ rpcParams: expect.objectContaining({ chain: 'evm', evmChainId: 8453 }) }));
    });

    it('filters the network list', () => {
        renderChain('evm');
        const networks = screen.getByRole('complementary', { name: 'EVM networks' });
        fireEvent.change(within(networks).getByRole('textbox', { name: 'Filter EVM networks' }), { target: { value: 'arbitrum' } });
        expect(within(networks).getByText('Arbitrum One')).toBeInTheDocument();
        expect(within(networks).queryByText('Base')).toBeNull();
    });

    it('offers token approvals, which no other chain workspace shows', () => {
        renderChain('evm');
        fireEvent.click(within(mainNav()).getByRole('button', { name: 'Inspect' }));
        expect(screen.getByRole('menuitem', { name: 'Approvals' })).toBeInTheDocument();
    });
});

describe('Aptos activity-rail layout', () => {
    it('keeps collections and history next to the editor', () => {
        renderChain('aptos');
        const panel = screen.getByRole('complementary', { name: 'Collections and history' });
        expect(within(panel).getByText('No collections for this chain yet.')).toBeInTheDocument();
        fireEvent.click(within(panel).getByRole('tab', { name: 'History' }));
        expect(within(panel).getByText('Requests you send on this chain show up here.')).toBeInTheDocument();
    });

    it('hides the panel when the sidebar is toggled off', () => {
        snapshot.isSidebarOpen = false;
        renderChain('aptos');
        expect(screen.queryByRole('complementary', { name: 'Collections and history' })).toBeNull();
    });
});

describe('Stellar console layout', () => {
    it('shows every tool grouped in one row, with nothing behind a menu', () => {
        renderChain('stellar');
        const nav = mainNav();
        for (const group of CHAIN_WORKSPACES.stellar.nav) {
            const region = within(nav).getByRole('group', { name: group.label });
            for (const item of group.items) expect(within(region).getByRole('button', { name: item.label })).toBeInTheDocument();
        }
    });
});
