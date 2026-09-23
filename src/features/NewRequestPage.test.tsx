import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

const store = vi.hoisted(() => ({
    finalizeRequest: vi.fn(),
    setActiveTab: vi.fn(),
    showToast: vi.fn()
}));

vi.mock('@/lib/store', () => ({
    appStore: {
        ...store,
        getSnapshot: () => ({ network: 'testnet', collections: [] })
    },
    useAppStore: () => ({ collections: [] })
}));

vi.mock('@/services/api', () => ({ apiService: { addRequest: vi.fn() } }));

import { NewRequestPage } from './NewRequestPage';
import { RequestType } from '../types';

// Generic open (tab bar "+"): pick "No Collection" to reach the type picker.
const openTypePicker = () => {
    render(<NewRequestPage tabId="tab-1" />);
    fireEvent.click(screen.getByRole('button', { name: /no collection/i }));
};

describe('NewRequestPage', () => {
    it('asks for a chain before offering request types — no chain is preselected', () => {
        openTypePicker();
        expect(screen.getByText('Pick the chain this request targets.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /json-rpc/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /transaction/i })).toBeDisabled();
    });

    it('labels both options for the chosen chain and creates a transaction for it', () => {
        openTypePicker();
        fireEvent.click(screen.getByRole('radio', { name: 'Ethereum / EVM' }));

        expect(screen.getByRole('button', { name: /Ethereum \/ EVM JSON-RPC/ })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: /EVM Contract Call/ }));

        const [tabId, tabType, request] = store.finalizeRequest.mock.calls.at(-1)!;
        expect(tabId).toBe('tab-1');
        expect(tabType).toBe('rpc');
        expect(request.type).toBe(RequestType.TRANSACTION);
        expect(request.rpcParams.chain).toBe('evm');
        expect(request.evmTxParams).toBeDefined();
    });

    it('never routes to the removed Sui PTB canvas', () => {
        openTypePicker();
        fireEvent.click(screen.getByRole('radio', { name: 'Sui' }));
        fireEvent.click(screen.getByRole('button', { name: /Sui Transaction/ }));

        const [, tabType, request] = store.finalizeRequest.mock.calls.at(-1)!;
        expect(tabType).toBe('rpc');
        expect(request.rpcParams.chain).toBe('sui');
    });

    it('remembers the last chosen chain', () => {
        openTypePicker();
        fireEvent.click(screen.getByRole('radio', { name: 'Solana' }));
        cleanup();
        openTypePicker();
        expect(screen.getByRole('radio', { name: 'Solana' })).toHaveAttribute('aria-checked', 'true');
    });
});
