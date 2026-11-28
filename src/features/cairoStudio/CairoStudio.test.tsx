import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import strkAbi from '@/services/cairo/fixtures/strk-abi.json';

const store = vi.hoisted(() => ({ openTab: vi.fn() }));
vi.mock('@/lib/store', () => ({ appStore: store, useAppStore: () => ({ network: 'mainnet' }) }));

const readCall = vi.hoisted(() => vi.fn());
vi.mock('@/services/cairo/contract', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/services/cairo/contract')>()),
    readCall,
    loadClassAt: vi.fn(),
}));

import { ContractStudio } from './ContractStudio';

const STRK = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
const ACCOUNT = '0x123';

const pasteStrkAbi = async () => {
    render(<ContractStudio />);
    fireEvent.click(screen.getByRole('tab', { name: 'Paste or upload' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'ABI JSON' }), { target: { value: JSON.stringify(strkAbi) } });
    fireEvent.click(screen.getByRole('button', { name: 'Parse ABI' }));
    await screen.findByText('Pasted or uploaded ABI');
    fireEvent.change(screen.getByLabelText('Contract address for calls'), { target: { value: STRK } });
};

const pick = (name: string) => {
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter functions' }), { target: { value: name } });
    const list = screen.getByRole('complementary');
    fireEvent.click(within(list).getAllByRole('button').find((b) => b.textContent?.startsWith(name + 'view') || b.textContent?.startsWith(name + 'write'))!);
};

describe('Cairo Studio contract page', () => {
    beforeEach(() => vi.clearAllMocks());

    it('lists a pasted ABI and calls a view function, showing decoded and raw results', async () => {
        readCall.mockResolvedValue({ calldata: [ACCOUNT], result: ['0x5', '0x0'], decoded: '5', decodeError: null, block: 'latest', durationMs: 12 });
        await pasteStrkAbi();
        expect(screen.getByText(/Cairo 1/)).toBeInTheDocument();

        pick('balanceOf');
        fireEvent.change(screen.getByLabelText(/^account/), { target: { value: ACCOUNT } });
        fireEvent.click(screen.getByRole('button', { name: 'Call' }));

        await screen.findByText(/Read with starknet_call at/);
        expect(readCall).toHaveBeenCalledWith('mainnet', STRK, expect.anything(), expect.objectContaining({ name: 'balanceOf' }), [ACCOUNT], 'latest');
        expect(screen.getByText('Decoded result')).toBeInTheDocument();
        expect(screen.getByText('Raw result (felts)')).toBeInTheDocument();
        expect(screen.getByText(/Nothing was signed or submitted/)).toBeInTheDocument();
    });

    it('encodes calldata with starknet.js and reports a bad argument by name', async () => {
        await pasteStrkAbi();
        pick('transfer');
        fireEvent.change(screen.getByLabelText(/^recipient/), { target: { value: ACCOUNT } });
        fireEvent.change(screen.getByLabelText(/^amount/), { target: { value: (2n ** 128n + 1n).toString() } });
        fireEvent.click(screen.getByRole('button', { name: 'Encode calldata' }));
        // recipient, then the u256 as low and high.
        await screen.findByText('Calldata (3 felts)');

        fireEvent.change(screen.getByLabelText(/^amount/), { target: { value: '-1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Encode calldata' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('amount: -1 is out of range (expected u256)');
    });

    it('hands a write function to the transaction builder instead of signing here', async () => {
        await pasteStrkAbi();
        pick('transfer');
        expect(screen.queryByRole('button', { name: 'Call' })).toBeNull();
        fireEvent.change(screen.getByLabelText(/^recipient/), { target: { value: ACCOUNT } });
        fireEvent.change(screen.getByLabelText(/^amount/), { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Prepare transaction' }));
        await waitFor(() => expect(store.openTab).toHaveBeenCalled());
        const [type, request] = store.openTab.mock.calls[0];
        expect(type).toBe('rpc');
        expect(request).toMatchObject({
            type: 'TRANSACTION',
            rpcParams: { chain: 'starknet' },
            starknetTxParams: { calls: [{ contractAddress: STRK, entrypoint: 'transfer', args: [ACCOUNT, '1'] }] },
        });
    });

    it('opens a view call as a starknet_call request that can be saved to a collection', async () => {
        await pasteStrkAbi();
        pick('balanceOf');
        fireEvent.change(screen.getByLabelText(/^account/), { target: { value: ACCOUNT } });
        fireEvent.click(screen.getByRole('button', { name: 'Open as RPC request' }));
        await waitFor(() => expect(store.openTab).toHaveBeenCalled());
        expect(store.openTab.mock.calls[0][1].rpcParams).toEqual({
            method: 'starknet_call',
            params: [{ contract_address: STRK, entry_point_selector: '0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e', calldata: [ACCOUNT] }, 'latest'],
            chain: 'starknet',
        });
    });

    it('explains a bad paste', async () => {
        render(<ContractStudio />);
        fireEvent.click(screen.getByRole('tab', { name: 'Paste or upload' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'ABI JSON' }), { target: { value: '{"hello": 1}' } });
        fireEvent.click(screen.getByRole('button', { name: 'Parse ABI' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(/Expected an ABI array/);
    });
});
