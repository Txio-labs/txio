import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const store = vi.hoisted(() => ({
    setActiveTab: vi.fn(),
    openTab: vi.fn(),
    cancelNetworkSwitch: vi.fn(),
    confirmNetworkSwitch: vi.fn(),
    requestNetworkSwitch: vi.fn(),
    toggleInspector: vi.fn()
}));

const snapshot = vi.hoisted(() => ({
    theme: 'dark' as const,
    isInspectorOpen: true,
    network: 'mainnet' as const,
    isSyncing: false,
    scanStep: '',
    isTerminalOpen: false,
    pendingNetworkSwitch: null,
    tabs: [],
    activeTabId: null,
    workspaces: [{ id: 'ws-1', name: 'Core Protocol', type: 'Personal' as const, activeEnvId: '' }],
    currentWorkspaceId: 'ws-1',
    notifications: [],
    user: { id: 'u1', email: 'ada@example.com', name: 'Ada', isAdmin: false }
}));

vi.mock('@/lib/store', () => ({
    appStore: store,
    useAppStore: () => snapshot
}));

vi.mock('@/wallet', () => ({
    useWallet: () => ({ currentWallet: null, isConnected: false, openModal: vi.fn() }),
    shortenAddress: (a: string) => a
}));

vi.mock('@/wallet/utils', () => ({ shortenAddress: (a: string) => a }));

vi.mock('../services/suiService', () => ({
    getSuiRpcHealth: vi.fn().mockResolvedValue({ endpoint: 'x', latency: [10], successRate: 1, status: 'healthy', blockHeight: 1 })
}));

vi.mock('./NetworkSwitcherModal', () => ({ NetworkSwitcherModal: () => null }));
vi.mock('./CommandPalette', () => ({ CommandPalette: () => null }));
vi.mock('./TerminalPanel', () => ({ TerminalPanel: () => null }));
vi.mock('./ProfileMenu', () => ({ ProfileMenu: () => <div>profile-menu</div> }));

import { Layout } from './Layout';

const renderLayout = () =>
    render(
        <Layout workspace={<div>workspace-content</div>} inspector={<div>inspector-content</div>} tabs={[]} />
    );

describe('Layout mobile navigation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('keeps the nav rail off-screen until the hamburger trigger opens it', () => {
        renderLayout();

        const rail = screen.getByRole('button', { name: 'txio TXIO' }).closest('nav')!;
        expect(rail.className).toContain('-translate-x-full');

        fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
        expect(rail.className).toContain('translate-x-0');
        expect(rail.className).not.toContain('-translate-x-full');
    });

    it('closes the drawer when a nav item is selected', () => {
        renderLayout();

        fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
        const rail = screen.getByRole('button', { name: 'txio TXIO' }).closest('nav')!;
        expect(rail.className).toContain('translate-x-0');

        fireEvent.click(screen.getByRole('button', { name: 'Requests' }));
        expect(store.openTab).toHaveBeenCalledWith('rpc');
        expect(rail.className).toContain('-translate-x-full');
    });

    it('closes the drawer via its backdrop, without changing the active tab', () => {
        renderLayout();

        fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
        fireEvent.click(screen.getByRole('button', { name: 'Close navigation' }));

        const rail = screen.getByRole('button', { name: 'txio TXIO' }).closest('nav')!;
        expect(rail.className).toContain('-translate-x-full');
        expect(store.openTab).not.toHaveBeenCalled();
        expect(store.setActiveTab).not.toHaveBeenCalled();
    });

    it('renders the inspector as a dismissible overlay with its own backdrop', () => {
        renderLayout();

        expect(screen.getByText('inspector-content')).toBeInTheDocument();
        const backdrop = screen.getByRole('button', { name: 'Close inspector overlay' });
        expect(backdrop.className).toContain('md:hidden');

        fireEvent.click(backdrop);
        expect(store.toggleInspector).toHaveBeenCalledTimes(1);
    });
});
