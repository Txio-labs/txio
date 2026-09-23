import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { parseAbi } from 'viem';

const mocks = vi.hoisted(() => ({
    readContract: vi.fn(),
    loadTokenMeta: vi.fn(),
    fetchVerifiedAbi: vi.fn(),
    addToHistory: vi.fn(),
    showToast: vi.fn()
}));

vi.mock('@/services/evmContract', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/services/evmContract')>()),
    readContract: mocks.readContract,
    loadTokenMeta: mocks.loadTokenMeta,
    fetchVerifiedAbi: mocks.fetchVerifiedAbi
}));

vi.mock('@/lib/store', () => ({
    appStore: { addToHistory: mocks.addToHistory, showToast: mocks.showToast }
}));

import { EvmTransactionBuilder } from './EvmTransactionBuilder';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { DEFAULT_EVM_TX } from '@/services/transactionService';
import { RequestItem, RequestType } from '../../../types';

const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const ALICE = '0x7a16fF8270133F063aAb6C9977183D9e72835428';

const erc20 = parseAbi([
    'function balanceOf(address owner) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function setPaused(bool paused)',
    'function deposit() payable'
]);

const initial: RequestItem = {
    id: 'r1',
    name: 'call',
    type: RequestType.TRANSACTION,
    rpcParams: { method: '', params: [], chain: 'evm' },
    moveParams: { ...DEFAULT_MOVE_CALL },
    evmTxParams: { ...DEFAULT_EVM_TX, to: USDC }
};

let latest: RequestItem = initial;

const Harness: React.FC<{ start?: RequestItem }> = ({ start = initial }) => {
    const [req, setReq] = useState(start);
    return (
        <EvmTransactionBuilder
            request={req}
            activeAddress={null}
            onChange={(r) => {
                latest = r;
                setReq(r);
            }}
        />
    );
};

const pickOption = (placeholder: RegExp, label: string) => {
    fireEvent.click(screen.getByRole('button', { name: placeholder }));
    fireEvent.click(screen.getByRole('button', { name: label }));
};

describe('EvmTransactionBuilder', () => {
    beforeEach(() => {
        mocks.loadTokenMeta.mockResolvedValue({ decimals: 6, symbol: 'USDC' });
        mocks.fetchVerifiedAbi.mockResolvedValue(erc20);
    });

    it('loads the verified ABI and splits read from write functions', async () => {
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: /load verified abi/i }));

        expect(await screen.findByText(/ABI loaded · 1 read · 3 write · USDC token/)).toBeInTheDocument();
        expect(mocks.fetchVerifiedAbi).toHaveBeenCalledWith(1, USDC);
        expect(screen.getByRole('tab', { name: /write \(3\)/i })).toHaveAttribute('aria-selected', 'true');
    });

    it('falls back to pasting the ABI when the contract is not verified', async () => {
        mocks.fetchVerifiedAbi.mockRejectedValueOnce(new Error('This contract isn’t verified on Sourcify. Paste or upload its ABI JSON instead.'));
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: /load verified abi/i }));

        expect(await screen.findByText(/isn’t verified/)).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('ABI JSON'), { target: { value: JSON.stringify(erc20) } });
        fireEvent.click(screen.getByRole('button', { name: /use this abi/i }));
        expect(await screen.findByText(/ABI loaded · 1 read · 3 write/)).toBeInTheDocument();
    });

    it('builds a validated form for a write function', async () => {
        render(<Harness start={{ ...initial, evmTxParams: { ...initial.evmTxParams!, abi: JSON.stringify(erc20) } }} />);

        pickOption(/choose a write function/i, 'transfer(address to, uint256 amount)');
        expect(latest.evmTxParams?.functionSignature).toBe('transfer(address to, uint256 amount)');

        fireEvent.change(screen.getByLabelText('Argument to'), { target: { value: '0x123' } });
        expect(screen.getByText(/not a valid address/)).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Argument to'), { target: { value: ALICE } });
        expect(screen.queryByText(/not a valid address/)).not.toBeInTheDocument();

        // Non-payable: no value field.
        expect(screen.queryByLabelText(/value sent/i)).not.toBeInTheDocument();
    });

    it('uses a toggle for booleans and shows the value field for payable functions', () => {
        render(<Harness start={{ ...initial, evmTxParams: { ...initial.evmTxParams!, abi: JSON.stringify(erc20) } }} />);

        pickOption(/choose a write function/i, 'setPaused(bool paused)');
        const toggle = screen.getByRole('switch', { name: 'Argument paused' });
        fireEvent.click(toggle);
        expect(latest.evmTxParams?.args).toEqual(['true']);

        pickOption(/setPaused/, 'deposit()');
        expect(screen.getByLabelText(/value sent \(ETH\)/i)).toBeInTheDocument();
    });

    it('runs read functions instantly and shows the decoded answer', async () => {
        mocks.readContract.mockResolvedValue(BigInt('4210550000'));
        render(<Harness start={{ ...initial, evmTxParams: { ...initial.evmTxParams!, abi: JSON.stringify(erc20) } }} />);

        fireEvent.click(screen.getByRole('tab', { name: /read/i }));
        pickOption(/choose a read function/i, 'balanceOf(address owner)');
        fireEvent.change(screen.getByLabelText('Argument owner'), { target: { value: ALICE } });
        fireEvent.click(screen.getByRole('button', { name: /^read$/i }));

        await waitFor(() => expect(mocks.readContract).toHaveBeenCalled());
        expect(mocks.readContract.mock.calls[0][0].args).toEqual([ALICE]);
        expect(await screen.findByText('balanceOf → 4210.55 USDC (4210550000)')).toBeInTheDocument();
        // Passes the decoded value through as `result`, keyed the same way
        // TxTracker/simulateEvm shape a read result, so a reopened History
        // entry for this call shows the same "4210.55 USDC" answer.
        expect(mocks.addToHistory).toHaveBeenCalledWith(
            expect.anything(),
            200,
            expect.any(Number),
            { decoded: '4210.55 USDC (4210550000)' }
        );
    });

    it('shows the revert reason when a read fails, and records it to history', async () => {
        mocks.readContract.mockRejectedValue(new Error('Reverted: paused'));
        render(<Harness start={{ ...initial, evmTxParams: { ...initial.evmTxParams!, abi: JSON.stringify(erc20) } }} />);

        fireEvent.click(screen.getByRole('tab', { name: /read/i }));
        pickOption(/choose a read function/i, 'balanceOf(address owner)');
        fireEvent.change(screen.getByLabelText('Argument owner'), { target: { value: ALICE } });
        fireEvent.click(screen.getByRole('button', { name: /^read$/i }));

        expect(await screen.findByText('Reverted: paused')).toBeInTheDocument();
        expect(mocks.addToHistory).toHaveBeenCalledWith(
            expect.anything(),
            500,
            expect.any(Number),
            { error: 'Reverted: paused' }
        );
    });
});
