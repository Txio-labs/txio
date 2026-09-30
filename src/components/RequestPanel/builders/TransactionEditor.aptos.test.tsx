import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';

vi.mock('@/lib/store', () => ({
    appStore: { showToast: vi.fn(), addToHistory: vi.fn() },
    useAppStore: () => ({ history: [], collections: [] })
}));

import { TransactionEditor } from './TransactionEditor';
import { AptosTransactionBuilder } from './AptosTransactionBuilder';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { DEFAULT_APTOS_TX } from '@/services/transactionService';
import { RequestItem, RequestType, ChainId } from '../../../types';

const base = (chain: ChainId): RequestItem => ({
    id: 'r1',
    name: 'tx',
    type: RequestType.TRANSACTION,
    rpcParams: { method: '', params: [], chain },
    moveParams: { ...DEFAULT_MOVE_CALL },
    aptosTxParams: { ...DEFAULT_APTOS_TX }
});

const coinModule = [
    {
        abi: {
            address: '0x1',
            name: 'coin',
            exposed_functions: [
                {
                    name: 'transfer',
                    visibility: 'public',
                    is_entry: true,
                    is_view: false,
                    generic_type_params: [{ constraints: [] }],
                    params: ['&signer', 'address', 'u64'],
                    return: []
                },
                {
                    name: 'balance',
                    visibility: 'public',
                    is_entry: false,
                    is_view: true,
                    generic_type_params: [],
                    params: ['address'],
                    return: ['u64']
                }
            ]
        }
    }
];

const editor = (chain: ChainId) => (
    <TransactionEditor request={base(chain)} activeAddress={null} envVars={[]} network="mainnet" onChange={() => undefined} />
);

describe('Aptos transaction builder', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('renders only for the Aptos chain', () => {
        const { unmount } = render(editor('aptos'));
        expect(screen.getByText('Aptos entry function call')).toBeTruthy();
        unmount();
        for (const chain of ['sui', 'evm', 'solana', 'stellar'] as ChainId[]) {
            const view = render(editor(chain));
            expect(screen.queryByText('Aptos entry function call')).toBeNull();
            view.unmount();
        }
    });

    it('offers Aptos in the chain selector', () => {
        render(editor('sui'));
        fireEvent.click(screen.getByRole('button', { name: /sui/i }));
        expect(screen.getByRole('button', { name: 'Aptos' })).toBeTruthy();
    });

    it('lists only entry functions and hides the signer argument', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(coinModule))));

        const Harness = () => {
            const [req, setReq] = useState<RequestItem>({
                ...base('aptos'),
                aptosTxParams: { ...DEFAULT_APTOS_TX, moduleAddress: '0x1', module: 'coin' }
            });
            return <AptosTransactionBuilder request={req} activeAddress={null} network="mainnet" onChange={setReq} />;
        };
        render(<Harness />);

        await waitFor(() => expect(screen.getByRole('button', { name: /select a function/i })).toBeTruthy());
        fireEvent.click(screen.getByRole('button', { name: /select a function/i }));
        expect(screen.getByRole('button', { name: 'transfer' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'balance' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'transfer' }));
        expect(screen.getByLabelText('Type argument T0')).toBeTruthy();
        expect(screen.getByLabelText('Argument 1 (address)')).toBeTruthy();
        expect(screen.getByLabelText('Argument 2 (u64)')).toBeTruthy();
        expect(screen.queryByLabelText(/signer/i)).toBeNull();
    });

    it('shows the empty-address prompt and a fullnode failure message', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
        const { rerender } = render(editor('aptos'));
        expect(screen.getByText(/enter a module address/i)).toBeTruthy();

        const Failing = () => {
            const [req, setReq] = useState<RequestItem>({
                ...base('aptos'),
                aptosTxParams: { ...DEFAULT_APTOS_TX, moduleAddress: '0x1' }
            });
            return <AptosTransactionBuilder request={req} activeAddress={null} network="mainnet" onChange={setReq} />;
        };
        rerender(<Failing />);
        await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/fullnode unreachable/i));
    });
});
