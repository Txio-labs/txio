import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    isSidebarOpen: true,
    isInspectorOpen: false,
    user: null,
    network: 'mainnet',
    isSyncing: false,
    scanStep: '',
    notifications: [],
    isTerminalOpen: false,
    pendingNetworkSwitch: null,
    theme: 'dark'
}));

vi.mock('@/lib/store', () => ({
    useAppStore: () => state,
    appStore: {
        cancelNetworkSwitch: vi.fn(),
        confirmNetworkSwitch: vi.fn(),
        openTab: vi.fn(),
        requestNetworkSwitch: vi.fn(),
        setActiveTab: vi.fn(),
        setAuthModal: vi.fn(),
        setCommandPalette: vi.fn(),
        showToast: vi.fn(),
        toggleInspector: vi.fn(),
        toggleSidebar: vi.fn(),
        toggleTerminal: vi.fn()
    }
}));

vi.mock('@/assets/txio2.png', () => ({
    default: { src: '/txio2.png', width: 512, height: 512 }
}));
vi.mock('@/assets/txio3.png', () => ({
    default: { src: '/txio3.png', width: 512, height: 512 }
}));
vi.mock('../services/suiService', () => ({
    getSuiRpcHealth: vi.fn().mockResolvedValue(null)
}));
vi.mock('./CommandPalette', () => ({
    CommandPalette: () => null
}));
vi.mock('./NetworkSwitcherModal', () => ({
    NetworkSwitcherModal: () => null
}));
vi.mock('./TerminalPanel', () => ({
    TerminalPanel: () => null
}));

import { Layout } from './Layout';

const renderLayout = () => render(
    <Layout
        sidebar={<div>Sidebar</div>}
        workspace={<div>Workspace</div>}
        inspector={<div>Inspector</div>}
    />
);

describe('Layout header', () => {
    it('uses the shared theme-aware logo asset', () => {
        renderLayout();

        const logo = screen.getByRole('img', { name: 'txio' });
        const imageUrl = new URL(logo.getAttribute('src')!, window.location.href);

        expect(imageUrl.searchParams.get('url')).toBe('/txio2.png');
    });

    it('lets the search trigger grow up to a capped width', () => {
        renderLayout();

        const searchTrigger = screen.getByRole('button', {
            name: /Search commands/
        });

        expect(searchTrigger).toHaveClass('flex-1', 'max-w-xl');
        expect(searchTrigger).not.toHaveClass('w-64');
    });
});
