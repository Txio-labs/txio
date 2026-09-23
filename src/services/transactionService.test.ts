import { describe, it, expect } from 'vitest';
import { decodeFunctionData, parseAbi } from 'viem';
import {
    DEFAULT_EVM_TX,
    DEFAULT_SOLANA_TX,
    DEFAULT_STELLAR_TX,
    buildEvmCalldata,
    checkEvmArg,
    describeTransaction,
    getTxChain,
    getTxParamsForHistory,
    isMainnetExecution,
    signerAddressFor,
    toStellarScVal,
    txExplorerUrl,
    validateTransaction,
    withTxChain
} from './transactionService';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { RequestItem, RequestType } from '../types';
import type { ConnectedWallet } from '@/wallet/types';

const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const ALICE = '0x7a16fF8270133F063aAb6C9977183D9e72835428';

const txRequest = (overrides: Partial<RequestItem> = {}): RequestItem => ({
    id: 't1',
    name: 'tx',
    type: RequestType.TRANSACTION,
    rpcParams: { method: '', params: [] },
    moveParams: { ...DEFAULT_MOVE_CALL, packageId: '', module: '', function: '' },
    ...overrides
});

const wallet = (family: ConnectedWallet['family'], address = ALICE): ConnectedWallet =>
    ({ id: 'w', name: family === 'sui' ? 'Slush' : 'MetaMask', address, family, chain: { id: 'x', family, name: 'x', network: 'mainnet', isSupported: true }, connectorName: 'x', connectedAt: 0 }) as unknown as ConnectedWallet;

describe('chain selection', () => {
    it('treats legacy transaction requests without a chain as Sui', () => {
        expect(getTxChain(txRequest())).toBe('sui');
    });

    it('seeds the target chain params when switching chains', () => {
        const evm = withTxChain(txRequest(), 'evm');
        expect(evm.rpcParams.chain).toBe('evm');
        expect(evm.evmTxParams).toEqual(DEFAULT_EVM_TX);

        const stellar = withTxChain(evm, 'stellar');
        expect(stellar.stellarTxParams).toEqual({ contractId: '', function: '', args: [] });
        // Params for other chains are kept, so switching back loses nothing.
        expect(stellar.evmTxParams).toEqual(DEFAULT_EVM_TX);
    });
});

describe('getTxParamsForHistory', () => {
    it('returns undefined for a plain RPC request — it already has method/params in history', () => {
        const rpc = { ...txRequest(), type: RequestType.RPC };
        expect(getTxParamsForHistory(rpc)).toBeUndefined();
    });

    it("picks the request's active chain's native params, not another chain's", () => {
        const move = { ...DEFAULT_MOVE_CALL, packageId: '0x2', module: 'coin', function: 'split' };
        const sui = txRequest({ moveParams: move });
        expect(getTxParamsForHistory(sui)).toBe(move);

        const evm = withTxChain(txRequest(), 'evm');
        expect(getTxParamsForHistory(evm)).toEqual(DEFAULT_EVM_TX);
        // Switching chain doesn't leak the previous chain's params through.
        expect(getTxParamsForHistory(evm)).not.toBe(move);

        expect(getTxParamsForHistory(withTxChain(txRequest(), 'solana'))).toEqual(DEFAULT_SOLANA_TX);
        expect(getTxParamsForHistory(withTxChain(txRequest(), 'stellar'))).toEqual(DEFAULT_STELLAR_TX);
    });
});

describe('signer matching', () => {
    it('never uses a wallet from another chain family to sign or pay gas', () => {
        const evmTx = withTxChain(txRequest(), 'evm');
        expect(signerAddressFor(evmTx, wallet('sui'))).toBeNull();
        expect(signerAddressFor(evmTx, wallet('evm'))).toBe(ALICE);
        expect(signerAddressFor(evmTx, null)).toBeNull();
    });
});

describe('validateTransaction', () => {
    it('requires the Sui move call target', () => {
        expect(validateTransaction(txRequest())).toMatch(/package id/i);
    });

    it('validates EVM address, value and arguments', () => {
        const base = withTxChain(txRequest(), 'evm');
        expect(validateTransaction(base)).toMatch(/"to" address/);

        const call = { ...base, evmTxParams: { ...DEFAULT_EVM_TX, to: USDC, functionSignature: 'transfer(address to, uint256 amount)', args: [ALICE, 'abc'] } };
        expect(validateTransaction(call)).toMatch(/not a whole number/);

        call.evmTxParams.args = [ALICE, '500'];
        expect(validateTransaction(call)).toBeNull();

        expect(validateTransaction({ ...call, evmTxParams: { ...call.evmTxParams, value: '1e5' } })).toMatch(/decimal amount/);
    });

    it('requires Solana program and Stellar contract + function', () => {
        expect(validateTransaction(withTxChain(txRequest(), 'solana'))).toMatch(/program id/i);
        expect(validateTransaction(withTxChain(txRequest(), 'stellar'))).toMatch(/contract id/i);
    });
});

describe('buildEvmCalldata', () => {
    const abi = parseAbi(['function transfer(address to, uint256 amount) returns (bool)']);

    it('ABI-encodes the call from signature and args', () => {
        const { data } = buildEvmCalldata({ ...DEFAULT_EVM_TX, to: USDC, functionSignature: 'transfer(address to, uint256 amount)', args: [ALICE, '500'] });
        expect(decodeFunctionData({ abi, data }).args).toEqual([ALICE, BigInt(500)]);
    });

    it('scales amounts by the selected unit', () => {
        const { data } = buildEvmCalldata({
            ...DEFAULT_EVM_TX,
            to: USDC,
            functionSignature: 'transfer(address to, uint256 amount)',
            args: [ALICE, '1.5'],
            argDecimals: [null, 6]
        });
        expect(decodeFunctionData({ abi, data }).args?.[1]).toBe(BigInt(1_500_000));
    });

    it('sends raw calldata, or 0x for a plain transfer', () => {
        expect(buildEvmCalldata({ ...DEFAULT_EVM_TX, data: '0xdeadbeef' }).data).toBe('0xdeadbeef');
        expect(buildEvmCalldata({ ...DEFAULT_EVM_TX }).data).toBe('0x');
    });

    it('rejects the wrong number of arguments', () => {
        expect(() =>
            buildEvmCalldata({ ...DEFAULT_EVM_TX, functionSignature: 'transfer(address,uint256)', args: [ALICE] })
        ).toThrow(/takes 2 argument/);
    });

    it('prefers the loaded ABI entry so outputs are available', () => {
        const { fn } = buildEvmCalldata({
            ...DEFAULT_EVM_TX,
            functionSignature: 'transfer(address to, uint256 amount)',
            args: [ALICE, '1'],
            abi: JSON.stringify(abi)
        });
        expect(fn?.outputs).toEqual([{ type: 'bool' }]);
    });
});

describe('checkEvmArg', () => {
    it('checks each field as the user types', () => {
        expect(checkEvmArg('address', '0x123')).toMatch(/not a valid address/);
        expect(checkEvmArg('address', ALICE)).toBeNull();
        expect(checkEvmArg('bool', 'yes')).toMatch(/true or false/);
        expect(checkEvmArg('uint256', '1.25', 18)).toBeNull();
        expect(checkEvmArg('uint256', '1.1234567', 6)).toMatch(/decimal places/);
        expect(checkEvmArg('address[]', 'not json')).toMatch(/JSON/);
        expect(checkEvmArg('uint8', '')).toBe('Required');
    });
});

describe('describeTransaction / isMainnetExecution / explorer links', () => {
    it('summarizes each chain in its own terms', () => {
        const sui = txRequest({ moveParams: { ...DEFAULT_MOVE_CALL, packageId: '0x2', module: 'coin', function: 'split' } });
        expect(describeTransaction(sui)).toMatchObject({ chain: 'sui', kind: 'Move call', target: '0x2::coin::split' });

        const evm = { ...withTxChain(txRequest(), 'evm'), evmTxParams: { ...DEFAULT_EVM_TX, to: ALICE, value: '0.1' } };
        expect(describeTransaction(evm)).toMatchObject({ chain: 'evm', kind: 'Transfer' });
        expect(describeTransaction(evm).details).toContainEqual(['Value', '0.1 ETH']);
    });

    it('asks for mainnet confirmation based on the actual target network', () => {
        const evm = withTxChain(txRequest(), 'evm');
        expect(isMainnetExecution({ ...evm, evmTxParams: { ...DEFAULT_EVM_TX, chainId: 1 } }, 'testnet')).toBe(true);
        expect(isMainnetExecution({ ...evm, evmTxParams: { ...DEFAULT_EVM_TX, chainId: 11155111 } }, 'mainnet')).toBe(false);
        expect(isMainnetExecution(withTxChain(txRequest(), 'solana'), 'mainnet')).toBe(true);
        expect(isMainnetExecution(withTxChain(txRequest(), 'stellar'), 'testnet')).toBe(false);
    });

    it('links each chain to its explorer', () => {
        expect(txExplorerUrl('evm', 'mainnet', '0xabc', 8453)).toBe('https://basescan.org/tx/0xabc');
        expect(txExplorerUrl('sui', 'testnet', 'D1g')).toBe('https://suiscan.xyz/testnet/tx/D1g');
        expect(txExplorerUrl('solana', 'devnet', 'sig')).toBe('https://explorer.solana.com/tx/sig?cluster=devnet');
        expect(txExplorerUrl('solana', 'mainnet', 'sig')).toBe('https://explorer.solana.com/tx/sig');
        expect(txExplorerUrl('stellar', 'mainnet', 'h')).toBe('https://stellar.expert/explorer/public/tx/h');
    });
});

describe('toStellarScVal', () => {
    it('converts typed form values to Soroban values', async () => {
        const { scValToNative } = await import('@stellar/stellar-sdk');
        const addr = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
        expect(scValToNative(await toStellarScVal({ id: '1', type: 'address', value: addr }))).toBe(addr);
        expect(scValToNative(await toStellarScVal({ id: '2', type: 'i128', value: '-42' }))).toBe(BigInt(-42));
        expect(scValToNative(await toStellarScVal({ id: '3', type: 'u32', value: '7' }))).toBe(7);
        expect(scValToNative(await toStellarScVal({ id: '4', type: 'bool', value: 'true' }))).toBe(true);
        expect(scValToNative(await toStellarScVal({ id: '5', type: 'symbol', value: 'hello' }))).toBe('hello');
        await expect(toStellarScVal({ id: '6', type: 'u64', value: '1.5' })).rejects.toThrow(/whole number/);
        await expect(toStellarScVal({ id: '7', type: 'bytes', value: '0xabc' })).rejects.toThrow(/hex/);
    });
});
