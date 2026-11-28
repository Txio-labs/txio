import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const store = vi.hoisted(() => ({ setActiveChain: vi.fn() }));
const snapshot = vi.hoisted(() => ({
    user: { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' },
    workspaces: [{ id: 'ws-1', name: 'Core Protocol', type: 'Personal' as const, activeEnvId: '' }],
    currentWorkspaceId: 'ws-1',
}));

vi.mock('@/lib/store', () => ({ appStore: store, useAppStore: () => snapshot }));
vi.mock('@/components/ProfileMenu', () => ({ ProfileMenu: () => null }));

import { ChainPicker } from './ChainPicker';
import { CHAIN_ORDER, CHAIN_WORKSPACES } from './registry';

describe('ChainPicker', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('offers every chain workspace and greets the user by first name', () => {
        render(<ChainPicker />);
        expect(screen.getByRole('heading', { name: 'Which chain today, Ada?' })).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(CHAIN_ORDER.length);
        for (const id of CHAIN_ORDER) expect(screen.getByText(CHAIN_WORKSPACES[id].name)).toBeInTheDocument();
    });

    it('opens the picked chain workspace', () => {
        render(<ChainPicker />);
        fireEvent.click(screen.getByText('Starknet').closest('button')!);
        expect(store.setActiveChain).toHaveBeenCalledWith('starknet');
    });

    it('marks the chain used last on this device', () => {
        localStorage.setItem('txio_lastChain', 'stellar');
        render(<ChainPicker />);
        expect(screen.getByText('Stellar').closest('button')).toHaveTextContent('Last used');
        expect(screen.getByText('Sui').closest('button')).not.toHaveTextContent('Last used');
    });

    it('focuses the first chain so the keyboard can pick straight away', () => {
        render(<ChainPicker />);
        expect(document.activeElement).toBe(screen.getByText(CHAIN_WORKSPACES[CHAIN_ORDER[0]].name).closest('button'));
    });
});
