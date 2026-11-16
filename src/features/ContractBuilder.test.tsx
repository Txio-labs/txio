import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';

const mocks = vi.hoisted(() => ({
    compile: vi.fn(),
    openTab: vi.fn(),
    compileRemote: vi.fn(),
    getToolchains: vi.fn(),
    deployStellar: vi.fn(),
    linkedWallets: {} as Record<string, unknown>
}));

vi.mock('@mysten/dapp-kit', () => ({ useSignAndExecuteTransaction: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('@/wallet/hooks/useWallet', () => ({ useWallet: () => ({ linkedWallets: mocks.linkedWallets, openModal: vi.fn() }) }));
vi.mock('@/services/compile/remote', async (orig) => ({
    ...(await orig<typeof import('@/services/compile/remote')>()),
    compileRemote: mocks.compileRemote,
    getToolchains: mocks.getToolchains
}));
vi.mock('@/services/deploy', async (orig) => ({
    ...(await orig<typeof import('@/services/deploy')>()),
    deployStellar: mocks.deployStellar
}));

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
        mocks.linkedWallets = {};
        mocks.getToolchains.mockResolvedValue({
            sui: { available: false, tool: 'sui' },
            stellar: { available: true, tool: 'stellar' }
        });
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

    it('says so when the compiler host lacks a chain toolchain, instead of pretending to compile', async () => {
        render(<ContractBuilder />);
        fireEvent.click(screen.getByRole('button', { name: /target chain/i }));
        fireEvent.click(screen.getByRole('button', { name: 'Sui' }));
        await waitFor(() => expect(screen.getByRole('note').textContent).toMatch(/no Sui Move toolchain/i));
        expect((screen.getByRole('button', { name: /^compile$/i }) as HTMLButtonElement).disabled).toBe(true);
        expect((screen.getByRole('button', { name: /^deploy$/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('explains an unreachable compiler service', async () => {
        const { CompilerUnavailableError } = await import('@/services/compile/remote');
        mocks.getToolchains.mockRejectedValue(new CompilerUnavailableError('The compiler service at http://x is not reachable.'));
        render(<ContractBuilder />);
        fireEvent.click(screen.getByRole('button', { name: /target chain/i }));
        fireEvent.click(screen.getByRole('button', { name: 'Stellar' }));
        await waitFor(() => expect(screen.getByRole('note').textContent).toMatch(/not reachable/));
    });

    it('compiles Soroban on the server and deploys with the connected Stellar wallet', async () => {
        mocks.linkedWallets = { stellar: { id: 'freighter', family: 'stellar', address: 'GABC123456789' } };
        mocks.compileRemote.mockResolvedValue({ ok: true, logs: 'Finished', artifact: { wasm: 'AGFzbQ==' } });
        mocks.deployStellar.mockResolvedValue({ address: 'CCONTRACT', explorerUrl: 'https://x', transactions: [] });
        render(<ContractBuilder />);
        fireEvent.click(screen.getByRole('button', { name: /target chain/i }));
        fireEvent.click(screen.getByRole('button', { name: 'Stellar' }));
        await waitFor(() => expect((screen.getByRole('button', { name: /^compile$/i }) as HTMLButtonElement).disabled).toBe(false));
        fireEvent.click(screen.getByRole('button', { name: /^compile$/i }));
        await screen.findByLabelText('Built artifact');
        expect(mocks.compileRemote).toHaveBeenCalledWith('stellar', expect.objectContaining({ name: 'Counter' }), expect.anything());
        fireEvent.click(screen.getByRole('button', { name: /^deploy$/i }));
        await screen.findByText('CCONTRACT');
        expect(mocks.deployStellar).toHaveBeenCalledWith('AGFzbQ==', mocks.linkedWallets.stellar, 'testnet', expect.any(Function));
    });

    it('shows compiler output and blocks deploy when a server build fails', async () => {
        mocks.linkedWallets = { stellar: { id: 'freighter', family: 'stellar', address: 'GABC' } };
        mocks.compileRemote.mockResolvedValue({ ok: false, logs: 'error[E0425]: cannot find value `x`' });
        render(<ContractBuilder />);
        fireEvent.click(screen.getByRole('button', { name: /target chain/i }));
        fireEvent.click(screen.getByRole('button', { name: 'Stellar' }));
        await waitFor(() => expect((screen.getByRole('button', { name: /^compile$/i }) as HTMLButtonElement).disabled).toBe(false));
        fireEvent.click(screen.getByRole('button', { name: /^compile$/i }));
        await screen.findByText(/cannot find value/);
        expect((screen.getByRole('button', { name: /^deploy$/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('saves drafts to this browser only', () => {
        render(<ContractBuilder />);
        fireEvent.change(screen.getByLabelText('Contract source'), { target: { value: 'contract Mine {}' } });
        fireEvent.click(screen.getByRole('button', { name: /save draft/i }));
        const saved = JSON.parse(localStorage.getItem('txio_contract_builder')!);
        expect(saved.modulesByChain.evm.find((d: { id: string }) => d.id === saved.activeIdByChain.evm).code).toBe('contract Mine {}');
    });

    it('keeps several modules per chain: new, switch, delete', () => {
        localStorage.clear();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<ContractBuilder />);
        const source = () => screen.getByLabelText('Contract source') as HTMLTextAreaElement;
        fireEvent.change(source(), { target: { value: 'contract First {}' } });

        fireEvent.click(screen.getAllByRole('button', { name: /new ethereum \/ evm module/i })[0]);
        const list = () => screen.getByRole('list', { name: /your ethereum \/ evm modules/i });
        expect(within(list()).getAllByRole('button', { name: /\.sol$/ })).toHaveLength(2);
        expect(source().value).not.toBe('contract First {}');
        fireEvent.change(source(), { target: { value: 'contract Second {}' } });

        // The first module kept its code.
        fireEvent.click(within(list()).getAllByRole('button', { name: /\.sol$/ })[0]);
        expect(source().value).toBe('contract First {}');
        const saved = JSON.parse(localStorage.getItem('txio_contract_builder')!);
        expect(saved.modulesByChain.evm.map((d: { code: string }) => d.code)).toEqual(['contract First {}', 'contract Second {}']);

        fireEvent.click(within(list()).getAllByRole('button', { name: /^delete/i })[0]);
        expect(within(list()).getAllByRole('button', { name: /\.sol$/ })).toHaveLength(1);
        expect(source().value).toBe('contract Second {}');
        vi.restoreAllMocks();
    });

    it('opens drafts saved in the earlier one-per-chain format', () => {
        localStorage.setItem('txio_contract_builder', JSON.stringify({ codeByChain: { evm: 'contract Old {}' }, contractNames: { evm: 'Old' } }));
        render(<ContractBuilder />);
        expect((screen.getByLabelText('Contract source') as HTMLTextAreaElement).value).toBe('contract Old {}');
        localStorage.clear();
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
