import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mocks = vi.hoisted(() => ({ compile: vi.fn(), openTab: vi.fn() }));

vi.mock('@/lib/store', () => ({
    appStore: { openTab: mocks.openTab, showToast: vi.fn() },
    useAppStore: () => ({ network: 'testnet' })
}));
vi.mock('@/services/compile/solidity', async (orig) => ({
    ...(await orig<typeof import('@/services/compile/solidity')>()),
    compileSolidity: mocks.compile
}));

import { ContractBuilder } from './ContractBuilder';
import { evmAdapter } from '@/services/adapters/evmAdapter';
import { DEFAULT_EVM_TX } from '@/services/adapters/evmAdapter';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { RequestItem, RequestType } from '../types';

const artifact = (over = {}) => ({
    name: 'Box',
    abi: [{ type: 'constructor', inputs: [{ name: 'initial', type: 'uint256' }] }],
    bytecode: '0x6080',
    runtimeSize: 100,
    hasConstructorArgs: true,
    ...over
});

describe('ContractBuilder', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('compiles for real, streams the log, then opens a deployment request instead of fabricating a hash', async () => {
        mocks.compile.mockImplementation(async (_file: string, _src: string, opts: { onLog: (l: string) => void }) => {
            opts.onLog('Compiling Box.sol');
            return { ok: true, contracts: [artifact()], diagnostics: [], compilerVersion: '0.8.28' };
        });
        render(<ContractBuilder />);
        expect(screen.getByText('Experimental')).toBeTruthy();
        expect((screen.getByRole('button', { name: /review deployment/i }) as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: /^compile$/i }));
        await screen.findByLabelText('Compiled contract');
        expect(screen.getByText(/Compiling Box.sol/)).toBeTruthy();

        // The constructor argument is required and encoded into the creation code.
        fireEvent.click(screen.getByRole('button', { name: /review deployment/i }));
        expect(screen.getByRole('alert').textContent).toMatch(/every constructor argument/i);
        fireEvent.change(screen.getByLabelText(/Constructor argument initial/), { target: { value: '42' } });
        fireEvent.click(screen.getByRole('button', { name: /review deployment/i }));

        expect(mocks.openTab).toHaveBeenCalledTimes(1);
        const [type, request] = mocks.openTab.mock.calls[0] as [string, RequestItem];
        expect(type).toBe('rpc');
        expect(request.type).toBe(RequestType.TRANSACTION);
        expect(request.evmTxParams?.deploy).toBe(true);
        expect(request.evmTxParams?.to).toBe('');
        expect(request.evmTxParams?.data.startsWith('0x6080')).toBe(true);
        expect(request.evmTxParams?.data.endsWith('2a')).toBe(true); // uint256(42) appended
        expect(request.evmTxParams?.chainId).toBe(11155111);
    });

    it('blocks deployment when the source has compile errors', async () => {
        mocks.compile.mockResolvedValue({
            ok: false, contracts: [], compilerVersion: '0.8.28',
            diagnostics: [{ severity: 'error', message: 'Expected ;', formatted: 'ParserError: Expected ;', line: 3, column: 2 }]
        });
        render(<ContractBuilder />);
        fireEvent.click(screen.getByRole('button', { name: /^compile$/i }));
        await screen.findByText(/Line 3:2/);
        expect((screen.getByRole('button', { name: /review deployment/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('invalidates the artifact when the source changes', async () => {
        mocks.compile.mockResolvedValue({ ok: true, contracts: [artifact({ hasConstructorArgs: false, abi: [] })], diagnostics: [], compilerVersion: '0.8.28' });
        render(<ContractBuilder />);
        fireEvent.click(screen.getByRole('button', { name: /^compile$/i }));
        await screen.findByLabelText('Compiled contract');
        fireEvent.change(screen.getByLabelText('Contract source'), { target: { value: 'contract Changed {}' } });
        expect(screen.queryByLabelText('Compiled contract')).toBeNull();
    });

    it('does not pretend to compile or deploy for chains without a compiler', () => {
        render(<ContractBuilder />);
        fireEvent.click(screen.getByRole('button', { name: /ethereum/i }));
        fireEvent.click(screen.getByRole('button', { name: 'Sui' }));
        expect(screen.getByRole('note').textContent).toMatch(/not built yet/i);
        expect((screen.getByRole('button', { name: /^compile$/i }) as HTMLButtonElement).disabled).toBe(true);
        expect((screen.getByRole('button', { name: /review deployment/i }) as HTMLButtonElement).disabled).toBe(true);
        expect(screen.queryByText(/Successfully deployed/)).toBeNull();
        expect(screen.queryByText(/Resource Leak/)).toBeNull();
    });

    it('saves drafts to this browser only', () => {
        render(<ContractBuilder />);
        fireEvent.change(screen.getByLabelText('Contract source'), { target: { value: 'contract Mine {}' } });
        fireEvent.click(screen.getByRole('button', { name: /save draft/i }));
        expect(JSON.parse(localStorage.getItem('txio_contract_builder')!).codeByChain.evm).toBe('contract Mine {}');
    });
});

describe('EVM adapter: contract creation', () => {
    const deployRequest = (over = {}): RequestItem => ({
        id: 'd', name: 'Deploy', type: RequestType.TRANSACTION,
        rpcParams: { method: '', params: [], chain: 'evm' }, moveParams: { ...DEFAULT_MOVE_CALL },
        evmTxParams: { ...DEFAULT_EVM_TX, chainId: 11155111, to: '', deploy: true, data: '0x6080', ...over }
    });

    it('validates creation code instead of a recipient', () => {
        expect(evmAdapter.validate(deployRequest())).toBeNull();
        expect(evmAdapter.validate(deployRequest({ data: '' }))).toMatch(/bytecode/);
        expect(evmAdapter.validate(deployRequest({ data: 'zz' }))).toMatch(/bytecode/);
        expect(evmAdapter.validate(deployRequest({ deploy: false }))).toMatch(/to/);
    });

    it('describes it as a deployment with no target address', () => {
        expect(evmAdapter.targetAddress(deployRequest())).toBeNull();
        const described = evmAdapter.describe(deployRequest());
        expect(described.kind).toBe('Contract deployment');
        expect(described.target).toContain('2 bytes');
    });
});
