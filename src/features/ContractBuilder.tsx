import React, { useEffect, useRef, useState } from 'react';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { motion } from 'framer-motion';
import { encodeDeployData, isHex, type Abi, type AbiFunction } from 'viem';
import {
    Code2, Box, Zap, Shield, Play, Save, Share2,
    Plus, Loader2, Check, AlertTriangle, Hammer
} from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { Select } from '@/components/Select';
import { DEFAULT_MOVE_CALL, RPC_CHAINS } from '@/lib/constants';
import { ChainId, RequestItem, RequestType } from '@/types';
import { compileSolidity, MAX_RUNTIME_BYTES, type CompileResult, type CompiledContract } from '@/services/compile/solidity';
import { coerceEvmArgs, DEFAULT_EVM_TX } from '@/services/adapters/evmAdapter';
import { getEvmTxChain } from '@/services/adapters/evmAdapter';
import {
    compileRemote,
    getToolchains,
    type AptosArtifact,
    type RemoteCompileChain,
    type SolanaArtifact,
    type StarknetArtifact,
    type StellarArtifact,
    type SuiArtifact,
    type ToolchainStatus
} from '@/services/compile/remote';
import { deployAptos, deploySolana, deployStarknet, deployStellar, deploySui, newSolanaProgramKeypair, type DeployResult } from '@/services/deploy';
import { useWallet } from '@/wallet/hooks/useWallet';
import type { WalletChainFamily } from '@/wallet/types';

interface ChainContractConfig {
    label: string;
    fileExt: string;
    compilerLabel: string;
    compilerVersion: string;
    editionLabel: string;
    editions: string[];
    defaultContractName: string;
    defaultCode: string;
    /** 'browser': solc in the page. 'server': txio-compiler (see services/compile/remote). */
    compiler: 'browser' | 'server';
}

const SERVER_CHAINS = ['sui', 'aptos', 'stellar', 'solana', 'starknet'] as const;
const isServerChain = (chain: ChainId): chain is RemoteCompileChain => (SERVER_CHAINS as readonly string[]).includes(chain);

// Every chain has a compiler and a deploy path. Solidity compiles in the
// browser; Move, Soroban, Solana and Cairo compile on txio-compiler, and the
// result is deployed with the connected wallet.
const CHAIN_CONTRACT_CONFIG: Record<ChainId, ChainContractConfig> = {
    sui: {
        label: 'Sui',
        fileExt: 'move',
        compilerLabel: 'Sui Move',
        compilerVersion: 'sui move build',
        editionLabel: 'Move Edition',
        editions: ['2024'],
        defaultContractName: 'Counter',
        defaultCode:
            'module counter::counter {\n' +
            '    public struct Counter has key {\n' +
            '        id: UID,\n' +
            '        value: u64,\n' +
            '    }\n\n' +
            '    public fun create(ctx: &mut TxContext) {\n' +
            '        transfer::share_object(Counter { id: object::new(ctx), value: 0 })\n' +
            '    }\n\n' +
            '    public fun increment(counter: &mut Counter) {\n' +
            '        counter.value = counter.value + 1;\n' +
            '    }\n' +
            '}\n',
        compiler: 'server'
    },
    evm: {
        label: 'Ethereum / EVM',
        fileExt: 'sol',
        compilerLabel: 'Solidity Compiler',
        compilerVersion: 'v0.8.28',
        editionLabel: 'EVM Version',
        editions: ['Cancun', 'Shanghai', 'Paris'],
        defaultContractName: 'AssetBridge',
        defaultCode:
            '// SPDX-License-Identifier: MIT\n' +
            'pragma solidity ^0.8.20;\n\n' +
            'contract AssetBridge {\n' +
            '    mapping(address => uint256) public balances;\n\n' +
            '    function initializeMarket(address admin) external {\n' +
            '        // Initialize the market configuration\n' +
            '    }\n\n' +
            '    function mintCollectionToken(uint256 amount) external returns (uint256) {\n' +
            '        balances[msg.sender] += amount;\n' +
            '        return amount;\n' +
            '    }\n' +
            '}',
        compiler: 'browser'
    },
    stellar: {
        label: 'Stellar',
        fileExt: 'rs',
        compilerLabel: 'Soroban SDK',
        compilerVersion: 'stellar contract build',
        editionLabel: 'Rust Edition',
        editions: ['2021'],
        defaultContractName: 'Counter',
        defaultCode:
            '#![no_std]\n' +
            'use soroban_sdk::{contract, contractimpl, symbol_short, Env, Symbol};\n\n' +
            'const COUNT: Symbol = symbol_short!("COUNT");\n\n' +
            '#[contract]\n' +
            'pub struct Counter;\n\n' +
            '#[contractimpl]\n' +
            'impl Counter {\n' +
            '    pub fn increment(env: Env) -> u64 {\n' +
            '        let count: u64 = env.storage().instance().get(&COUNT).unwrap_or(0) + 1;\n' +
            '        env.storage().instance().set(&COUNT, &count);\n' +
            '        count\n' +
            '    }\n\n' +
            '    pub fn value(env: Env) -> u64 {\n' +
            '        env.storage().instance().get(&COUNT).unwrap_or(0)\n' +
            '    }\n' +
            '}\n',
        compiler: 'server'
    },
    solana: {
        label: 'Solana',
        fileExt: 'rs',
        compilerLabel: 'Anchor / solana-program',
        compilerVersion: 'cargo build-sbf',
        editionLabel: 'Rust Edition',
        editions: ['2021'],
        defaultContractName: 'AssetBridge',
        defaultCode:
            'use anchor_lang::prelude::*;\n\n' +
            '// Replaced with a fresh program id each time you compile.\n' +
            'declare_id!("11111111111111111111111111111111");\n\n' +
            '#[program]\n' +
            'pub mod asset_bridge {\n' +
            '    use super::*;\n\n' +
            '    pub fn initialize_market(_ctx: Context<InitializeMarket>) -> Result<()> {\n' +
            '        Ok(())\n' +
            '    }\n' +
            '}\n\n' +
            '#[derive(Accounts)]\n' +
            'pub struct InitializeMarket {}\n',
        compiler: 'server'
    },
    aptos: {
        label: 'Aptos',
        fileExt: 'move',
        compilerLabel: 'Aptos Move',
        compilerVersion: 'aptos move build-publish-payload',
        editionLabel: 'Move Edition',
        editions: ['2'],
        defaultContractName: 'Counter',
        defaultCode:
            'module counter::counter {\n' +
            '    use std::signer;\n\n' +
            '    struct Counter has key { value: u64 }\n\n' +
            '    public entry fun increment(account: &signer) acquires Counter {\n' +
            '        let addr = signer::address_of(account);\n' +
            '        if (!exists<Counter>(addr)) {\n' +
            '            move_to(account, Counter { value: 0 });\n' +
            '        };\n' +
            '        let counter = borrow_global_mut<Counter>(addr);\n' +
            '        counter.value = counter.value + 1;\n' +
            '    }\n\n' +
            '    #[view]\n' +
            '    public fun value(addr: address): u64 acquires Counter {\n' +
            '        if (exists<Counter>(addr)) borrow_global<Counter>(addr).value else 0\n' +
            '    }\n' +
            '}\n',
        compiler: 'server'
    },
    starknet: {
        label: 'Starknet',
        fileExt: 'cairo',
        compilerLabel: 'Cairo',
        compilerVersion: 'scarb build',
        editionLabel: 'Cairo Edition',
        editions: ['2024_07'],
        defaultContractName: 'Counter',
        defaultCode:
            '#[starknet::interface]\n' +
            'pub trait ICounter<TContractState> {\n' +
            '    fn increment(ref self: TContractState);\n' +
            '    fn get(self: @TContractState) -> u64;\n' +
            '}\n\n' +
            '#[starknet::contract]\n' +
            'mod Counter {\n' +
            '    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};\n\n' +
            '    #[storage]\n' +
            '    struct Storage {\n' +
            '        count: u64,\n' +
            '    }\n\n' +
            '    #[abi(embed_v0)]\n' +
            '    impl CounterImpl of super::ICounter<ContractState> {\n' +
            '        fn increment(ref self: ContractState) {\n' +
            '            self.count.write(self.count.read() + 1);\n' +
            '        }\n\n' +
            '        fn get(self: @ContractState) -> u64 {\n' +
            '            self.count.read()\n' +
            '        }\n' +
            '    }\n' +
            '}\n',
        compiler: 'server'
    }
};

// Chains the Contract Builder offers, in RPC_CHAINS' display order.
export const CONTRACT_BUILDER_CHAINS = RPC_CHAINS.filter((c) => c.id in CHAIN_CONTRACT_CONFIG);

const mapChains = <T,>(pick: (c: ChainContractConfig) => T) =>
    Object.fromEntries(Object.entries(CHAIN_CONTRACT_CONFIG).map(([id, c]) => [id, pick(c)])) as Record<ChainId, T>;

const DEFAULT_CONTRACT_NAMES = mapChains((c) => c.defaultContractName);
const DEFAULT_CODE_BY_CHAIN = mapChains((c) => c.defaultCode);
const DEFAULT_EDITION_BY_CHAIN = mapChains((c) => c.editions[0]);

const STORAGE_KEY = 'txio_contract_builder';

interface SavedDrafts {
    codeByChain?: Partial<Record<ChainId, string>>;
    contractNames?: Partial<Record<ChainId, string>>;
}

const readDrafts = (): SavedDrafts => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as SavedDrafts;
    } catch {
        return {};
    }
};

type CompileState =
    | { status: 'idle' }
    | { status: 'compiling'; logs: string[] }
    | { status: 'done'; logs: string[]; result: CompileResult }
    /** A server-compiled artifact (every chain but EVM). */
    | { status: 'built'; logs: string[]; chain: RemoteCompileChain; artifact: unknown }
    | { status: 'failed'; logs: string[]; message: string };

type DeployState =
    | { status: 'idle' }
    | { status: 'deploying'; logs: string[] }
    | { status: 'deployed'; logs: string[]; result: DeployResult }
    | { status: 'failed'; logs: string[]; message: string };

type ToolchainState = { status: 'loading' } | { status: 'ready'; chains: ToolchainStatus } | { status: 'unreachable'; message: string };

export const ContractBuilder: React.FC = () => {
    const [chain, setChain] = useState<ChainId>('evm');
    const [activeModule, setActiveModule] = useState('core');

    // Kept per-chain so switching chains doesn't clobber what you wrote for
    // another one — this is a workspace across chains, not just Sui/Move.
    const [contractNames, setContractNames] = useState<Record<ChainId, string>>(() => ({ ...DEFAULT_CONTRACT_NAMES, ...readDrafts().contractNames }));
    const [codeByChain, setCodeByChain] = useState<Record<ChainId, string>>(() => ({ ...DEFAULT_CODE_BY_CHAIN, ...readDrafts().codeByChain }));
    const [editionByChain, setEditionByChain] = useState(DEFAULT_EDITION_BY_CHAIN);

    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'failed'>('idle');
    const [compile, setCompile] = useState<CompileState>({ status: 'idle' });
    const [selectedName, setSelectedName] = useState<string>('');
    const [ctorArgs, setCtorArgs] = useState<string[]>([]);
    const [deployError, setDeployError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const { network } = useAppStore();
    const { linkedWallets, openModal } = useWallet();
    const { mutateAsync: suiSignAndExecute } = useSignAndExecuteTransaction();
    const [toolchains, setToolchains] = useState<ToolchainState>({ status: 'loading' });
    const [deploy, setDeploy] = useState<DeployState>({ status: 'idle' });
    const [starknetCtorArgs, setStarknetCtorArgs] = useState<string[]>([]);
    // Solana: the program id is fixed at compile time (declare_id!), so the
    // keypair that will own that address is generated just before compiling.
    const solanaKeypairRef = useRef<import('@solana/web3.js').Keypair | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        getToolchains(controller.signal)
            .then((chains) => setToolchains({ status: 'ready', chains }))
            .catch((err: Error) => {
                if (err.name !== 'AbortError') setToolchains({ status: 'unreachable', message: err.message });
            });
        return () => controller.abort();
    }, []);

    const config = CHAIN_CONTRACT_CONFIG[chain];
    const wallet = linkedWallets[chain as WalletChainFamily] ?? null;
    const serverAvailable = toolchains.status === 'ready' && isServerChain(chain) && Boolean(toolchains.chains[chain]?.available);
    const canCompile = config.compiler === 'browser' || serverAvailable;
    const unavailableReason =
        config.compiler === 'browser'
            ? undefined
            : toolchains.status === 'loading'
              ? 'Checking the compiler service…'
              : toolchains.status === 'unreachable'
                ? toolchains.message
                : `The compiler service has no ${config.compilerLabel} toolchain installed (${isServerChain(chain) ? toolchains.chains[chain]?.tool ?? '' : ''}).`;
    const contractName = contractNames[chain];
    const code = codeByChain[chain];
    const edition = editionByChain[chain];

    const setContractName = (name: string) =>
        setContractNames((prev) => ({ ...prev, [chain]: name }));
    const setCode = (nextCode: string) => {
        setCodeByChain((prev) => ({ ...prev, [chain]: nextCode }));
        // The compiled artifact belongs to the source that produced it.
        if (compile.status === 'done' || compile.status === 'built') setCompile({ status: 'idle' });
        setDeploy({ status: 'idle' });
    };
    const setEdition = (nextEdition: string) =>
        setEditionByChain((prev) => ({ ...prev, [chain]: nextEdition }));

    const handleChainChange = (nextChain: ChainId) => {
        abortRef.current?.abort();
        setChain(nextChain);
        setCompile({ status: 'idle' });
        setDeploy({ status: 'idle' });
        setDeployError(null);
    };

    const modules = [
        { id: 'core', name: 'Standard Assets', icon: Box },
        { id: 'defi', name: 'DeFi Primitives', icon: Zap },
        { id: 'identity', name: 'Identity & Auth', icon: Shield },
        { id: 'social', name: 'Social Graph', icon: Share2 }
    ];

    // Drafts are kept in this browser only; nothing is uploaded.
    const handleSave = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ codeByChain, contractNames }));
            setSaveStatus('success');
        } catch {
            setSaveStatus('failed');
        }
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    const artifacts: CompiledContract[] = compile.status === 'done' ? compile.result.contracts : [];
    const artifact = artifacts.find((c) => c.name === selectedName) ?? artifacts[0];
    const constructorInputs = ((artifact?.abi ?? []) as { type?: string; inputs?: { name: string; type: string }[] }[])
        .find((item) => item.type === 'constructor')?.inputs ?? [];

    const handleRemoteCompile = async (target: RemoteCompileChain) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setDeploy({ status: 'idle' });
        setCompile({ status: 'compiling', logs: [`Compiling ${contractName || 'contract'}.${config.fileExt} with ${config.compilerVersion}…`] });
        try {
            let programId: string | undefined;
            if (target === 'solana') {
                solanaKeypairRef.current = await newSolanaProgramKeypair();
                programId = solanaKeypairRef.current.publicKey.toBase58();
            }
            if (target === 'aptos' && !linkedWallets.aptos) {
                throw new Error('Connect an Aptos wallet first: the package is compiled for your account address.');
            }
            const res = await compileRemote(
                target,
                { name: contractName || 'contract', source: code, programId, sender: linkedWallets.aptos?.address },
                controller.signal
            );
            const logs = res.logs.trim().split('\n').slice(-60);
            if (!res.ok || !res.artifact) {
                setCompile({ status: 'failed', logs, message: 'Compilation failed. See the compiler output above.' });
                return;
            }
            setStarknetCtorArgs([]);
            setSelectedName(target === 'starknet' ? (res.artifact as StarknetArtifact).contracts[0]?.name ?? '' : '');
            setCompile({ status: 'built', logs: [...logs, programId ? `Program id: ${programId}` : 'Build succeeded.'], chain: target, artifact: res.artifact });
        } catch (error) {
            if ((error as { name?: string }).name === 'AbortError') return;
            setCompile({ status: 'failed', logs: [], message: error instanceof Error ? error.message : 'Compilation failed.' });
        }
    };

    const starknetContracts = compile.status === 'built' && compile.chain === 'starknet' ? (compile.artifact as StarknetArtifact).contracts : [];
    const starknetContract = starknetContracts.find((c) => c.name === selectedName) ?? starknetContracts[0];
    const starknetCtorInputs = (() => {
        if (!starknetContract) return [] as { name: string; type: string }[];
        const raw = starknetContract.sierra.abi;
        const abi = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { type: string; inputs?: { name: string; type: string }[] }[];
        return abi.find((i) => i.type === 'constructor')?.inputs ?? [];
    })();

    const handleRemoteDeploy = async () => {
        if (compile.status !== 'built') return;
        const logs: string[] = [];
        const log = (line: string) => {
            logs.push(line);
            setDeploy({ status: 'deploying', logs: [...logs] });
        };
        setDeploy({ status: 'deploying', logs });
        try {
            let result: DeployResult;
            switch (compile.chain) {
                case 'stellar':
                    result = await deployStellar((compile.artifact as StellarArtifact).wasm, wallet, network, log);
                    break;
                case 'solana': {
                    const keypair = solanaKeypairRef.current;
                    if (!keypair) throw new Error('Compile again: the program keypair is missing.');
                    result = await deploySolana((compile.artifact as SolanaArtifact).program, keypair, wallet, network, log);
                    break;
                }
                case 'sui':
                    result = await deploySui(
                        compile.artifact as SuiArtifact,
                        wallet,
                        (args) => suiSignAndExecute(args as never) as Promise<{ digest: string }>,
                        network,
                        log
                    );
                    break;
                case 'aptos':
                    result = await deployAptos(compile.artifact as AptosArtifact, wallet, network, log);
                    break;
                case 'starknet':
                    if (!starknetContract) throw new Error('No contract to deploy.');
                    result = await deployStarknet(starknetContract, starknetCtorArgs, wallet, network, log);
                    break;
            }
            setDeploy({ status: 'deployed', logs, result });
        } catch (error) {
            setDeploy({ status: 'failed', logs, message: error instanceof Error ? error.message : 'Deployment failed.' });
        }
    };

    const handleCompile = async () => {
        if (!canCompile || !code.trim()) return;
        if (isServerChain(chain)) return handleRemoteCompile(chain);
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const logs: string[] = [];
        const push = (line: string) => {
            logs.push(line);
            setCompile({ status: 'compiling', logs: [...logs] });
        };
        setDeployError(null);
        setCompile({ status: 'compiling', logs: [] });

        try {
            const result = await compileSolidity(`${contractName || 'Contract'}.sol`, code, { onLog: push, signal: controller.signal });
            const errors = result.diagnostics.filter((d) => d.severity === 'error').length;
            const warnings = result.diagnostics.filter((d) => d.severity === 'warning').length;
            logs.push(errors ? `Failed: ${errors} error${errors === 1 ? '' : 's'}` : `Compiled ${result.contracts.length} deployable contract${result.contracts.length === 1 ? '' : 's'}${warnings ? `, ${warnings} warning${warnings === 1 ? '' : 's'}` : ''}`);
            setCompile({ status: 'done', logs, result });
            setSelectedName(result.contracts[0]?.name ?? '');
            setCtorArgs([]);
        } catch (error) {
            if ((error as { name?: string }).name === 'AbortError') return;
            setCompile({ status: 'failed', logs, message: error instanceof Error ? error.message : 'Compilation failed.' });
        }
    };

    /**
     * Deployment is an ordinary EVM transaction, so it goes through the same
     * path as every other one: it opens as a Transaction request, where it is
     * simulated on the chain, reviewed, and only then signed with your wallet.
     */
    const handleDeploy = () => {
        if (!artifact) return;
        setDeployError(null);
        try {
            const abi = artifact.abi as Abi;
            const inputs = constructorInputs;
            if (ctorArgs.length < inputs.length || inputs.some((_, i) => !(ctorArgs[i] ?? '').trim())) {
                throw new Error('Fill in every constructor argument.');
            }
            const args = coerceEvmArgs({ inputs } as unknown as AbiFunction, ctorArgs);
            const data = inputs.length
                ? encodeDeployData({ abi, bytecode: artifact.bytecode, args })
                : artifact.bytecode;
            if (!isHex(data)) throw new Error('Encoding the creation code failed.');
            if (artifact.runtimeSize > MAX_RUNTIME_BYTES) {
                throw new Error(`Deployed code is ${artifact.runtimeSize} bytes; the EVM limit is ${MAX_RUNTIME_BYTES}.`);
            }

            // Sepolia by default; the chain can still be changed in the request.
            const chainId = network === 'mainnet' ? 1 : 11155111;
            const request: RequestItem = {
                id: `deploy-${Date.now()}`,
                name: `Deploy ${artifact.name}`,
                type: RequestType.TRANSACTION,
                network,
                rpcParams: { method: '', params: [], chain: 'evm', evmChainId: chainId },
                moveParams: { ...DEFAULT_MOVE_CALL },
                evmTxParams: {
                    ...DEFAULT_EVM_TX,
                    chainId: getEvmTxChain(chainId) ? chainId : DEFAULT_EVM_TX.chainId,
                    to: '',
                    value: '0',
                    data,
                    abi: JSON.stringify(artifact.abi),
                    deploy: true
                },
                localVars: []
            };
            appStore.openTab('rpc', request);
        } catch (error) {
            setDeployError(error instanceof Error ? error.message : 'Could not prepare the deployment.');
        }
    };

    const isCompiling = compile.status === 'compiling';
    const errors = compile.status === 'done' ? compile.result.diagnostics.filter((d) => d.severity === 'error') : [];
    const isRemote = config.compiler === 'server';
    const canDeploy = isRemote
        ? compile.status === 'built' && deploy.status !== 'deploying' && Boolean(wallet)
        : compile.status === 'done' && compile.result.ok && Boolean(artifact);
    const deployTitle = canDeploy
        ? undefined
        : !canCompile
          ? unavailableReason
          : isRemote && compile.status === 'built' && !wallet
            ? `Connect a ${config.label} wallet to deploy`
            : 'Compile without errors first';

    return (
        <div className="h-full flex bg-surface text-fg-muted font-sans overflow-hidden">
            {/* Module Sidebar */}
            <aside className="w-64 border-r border-line flex flex-col bg-sunken">
                <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        <div className="text-[12px] font-semibold text-fg-muted px-2">Contract Templates</div>
                        <div className="space-y-1">
                            {modules.map(mod => (
                                <button
                                    key={mod.id}
                                    onClick={() => setActiveModule(mod.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm font-semibold transition-all ${
                                        activeModule === mod.id
                                        ? 'bg-inverse text-on-inverse shadow-pop'
                                        : 'text-fg-subtle hover:bg-hover'
                                    }`}
                                >
                                    <mod.icon size={16} />
                                    <span>{mod.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-[12px] font-semibold text-fg-muted px-2">Your Modules</div>
                        <div className="p-4 rounded-[10px] border border-dashed border-line text-center space-y-2 group cursor-pointer hover:border-line-strong transition-all">
                            <Plus size={16} className="mx-auto text-fg-muted group-hover:text-fg" />
                            <div className="text-[12px] font-semibold text-fg-muted">New {config.label} Module</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-line bg-sunken">
                    <div className="flex items-center justify-between text-[12px] font-semibold text-fg-muted">
                        <span>{config.compilerLabel} {config.compilerVersion}</span>
                        <div className={`w-2 h-2 rounded-full ${canCompile ? 'bg-emerald-400' : 'bg-slate-600'}`} title={canCompile ? 'Compiler available' : unavailableReason} />
                    </div>
                </div>
            </aside>

            {/* Visual Canvas */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Header */}
                <header className="h-14 border-b border-line flex items-center justify-between px-6 bg-surface backdrop-blur-md relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-inverse" />
                            <span className="text-sm font-semibold text-fg">{contractName || 'Untitled_Contract'}.{config.fileExt}</span>
                            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-600 dark:text-amber-400">Experimental</span>
                        </div>
                        {saveStatus === 'success' && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Check size={12}/> Saved in this browser</span>}
                        {saveStatus === 'failed' && <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Could not save</span>}
                    </div>

                    <div className="absolute left-1/2 -translate-x-1/2 w-56">
                        <Select
                            value={chain}
                            onChange={(value) => handleChainChange(value as ChainId)}
                            options={CONTRACT_BUILDER_CHAINS.map((c) => ({ label: c.label, value: c.id }))}
                            fullWidth
                            variant="glass"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-hover hover:bg-active text-xs font-semibold transition-all">
                            <Save size={14} /> Save draft
                        </button>
                        <button
                            onClick={() => void handleCompile()}
                            disabled={!canCompile || isCompiling || !code.trim()}
                            title={canCompile ? undefined : unavailableReason}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-active hover:bg-active text-xs font-semibold transition-all disabled:opacity-40"
                        >
                            {isCompiling ? <Loader2 size={14} className="animate-spin" /> : <Hammer size={14} />} Compile
                        </button>
                        <button
                            onClick={isRemote ? () => void handleRemoteDeploy() : handleDeploy}
                            disabled={!canDeploy}
                            title={deployTitle}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-inverse text-on-inverse text-xs font-semibold shadow-card shadow-card hover:bg-soft-purple transition-all disabled:opacity-40"
                        >
                            {deploy.status === 'deploying' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {isRemote ? 'Deploy' : 'Review deployment'}
                        </button>
                    </div>
                </header>

                {/* Canvas Content */}
                <div className="flex-1 p-12 relative z-10 overflow-y-auto custom-scrollbar">
                    <div className="w-full space-y-6">
                        {!canCompile && (
                            <div role="note" className="p-4 rounded-[10px] bg-hover border border-line text-fg-subtle flex items-start gap-3 text-sm">
                                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>{unavailableReason} You can still write and save a draft here.</span>
                            </div>
                        )}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-1 rounded-panel bg-sunken border border-line shadow-card relative group h-[70vh] max-h-[480px] flex flex-col"
                        >
                            <div className="flex items-center gap-2 px-6 py-4 border-b border-line">
                                <Code2 size={18} className="text-fg-subtle"/>
                                <span className="text-xs font-semibold text-fg-subtle">Contract Editor</span>
                            </div>
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                spellCheck={false}
                                aria-label="Contract source"
                                className="flex-1 w-full bg-transparent text-sm font-mono text-fg-muted p-6 focus:outline-none resize-none custom-scrollbar"
                                placeholder={`// Write your ${config.label} contract here...`}
                            />
                        </motion.div>

                        {compile.status !== 'idle' && (
                            <section aria-label="Compiler output" className="rounded-card border border-line bg-sunken p-4 space-y-3">
                                <div className="text-[12px] font-semibold text-fg-subtle">Compiler output</div>
                                <pre className="text-xs font-mono text-fg-subtle whitespace-pre-wrap">{compile.logs.join('\n')}</pre>
                                {compile.status === 'failed' && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{compile.message}</p>}
                                {compile.status === 'done' && compile.result.diagnostics.length > 0 && (
                                    <ul className="space-y-2">
                                        {compile.result.diagnostics.map((d, i) => (
                                            <li key={i} className={`text-xs font-mono whitespace-pre-wrap ${d.severity === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                {d.line ? `Line ${d.line}:${d.column ?? 1}  ` : ''}{d.formatted.trim()}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        )}

                        {compile.status === 'built' && (
                            <section aria-label="Built artifact" className="rounded-card border border-line bg-sunken p-4 space-y-3">
                                <div className="text-[12px] font-semibold text-fg-subtle">Ready to deploy</div>
                                {starknetContracts.length > 1 && (
                                    <select
                                        aria-label="Contract to deploy"
                                        value={starknetContract?.name}
                                        onChange={(e) => { setSelectedName(e.target.value); setStarknetCtorArgs([]); }}
                                        className="bg-hover border border-line rounded-lg px-2 py-1 text-xs"
                                    >
                                        {starknetContracts.map((c) => <option key={c.name}>{c.name}</option>)}
                                    </select>
                                )}
                                {starknetCtorInputs.map((input, i) => (
                                    <label key={i} className="block text-[12px] font-semibold uppercase text-fg-muted">
                                        {input.name} <span className="font-mono normal-case text-fg-subtle">{input.type.replace(/\b(?:[a-z_][a-z0-9_]*::)+/g, '')}</span>
                                        <input
                                            aria-label={`Constructor argument ${input.name}`}
                                            value={starknetCtorArgs[i] ?? ''}
                                            onChange={(e) => setStarknetCtorArgs((prev) => { const next = [...prev]; next[i] = e.target.value; return next; })}
                                            className="mt-1 w-full bg-hover border border-line rounded-lg px-3 py-2 text-xs font-mono normal-case text-fg outline-none focus:border-line-strong"
                                        />
                                    </label>
                                ))}
                                {!wallet ? (
                                    <p className="text-xs text-fg-subtle">
                                        <button type="button" onClick={openModal} className="underline text-fg">Connect a {config.label} wallet</button> to deploy. It pays the fees and owns the result.
                                    </p>
                                ) : (
                                    <p className="text-[12px] text-fg-subtle">
                                        Deploys to {config.label} {network} from {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}. Your wallet asks you to approve each transaction{network === 'mainnet' ? ', and it spends real funds' : ''}.
                                    </p>
                                )}
                                {deploy.status !== 'idle' && (
                                    <pre className="text-xs font-mono text-fg-subtle whitespace-pre-wrap">{deploy.logs.join('\n')}</pre>
                                )}
                                {deploy.status === 'failed' && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{deploy.message}</p>}
                                {deploy.status === 'deployed' && (
                                    <div className="text-xs space-y-1">
                                        <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"><Check size={12} /> Deployed</div>
                                        <div className="font-mono break-all text-fg">{deploy.result.address}</div>
                                        {deploy.result.explorerUrl && <a href={deploy.result.explorerUrl} target="_blank" rel="noreferrer" className="underline text-fg-subtle">View on explorer</a>}
                                    </div>
                                )}
                            </section>
                        )}

                        {!isRemote && canDeploy && artifact && (
                            <section aria-label="Compiled contract" className="rounded-card border border-line bg-sunken p-4 space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="text-[12px] font-semibold text-fg-subtle">Compiled</div>
                                    {artifacts.length > 1 && (
                                        <select
                                            aria-label="Contract to deploy"
                                            value={artifact.name}
                                            onChange={(e) => { setSelectedName(e.target.value); setCtorArgs([]); }}
                                            className="bg-hover border border-line rounded-lg px-2 py-1 text-xs"
                                        >
                                            {artifacts.map((c) => <option key={c.name}>{c.name}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div className="text-xs text-fg-subtle">
                                    <span className="font-semibold text-fg">{artifact.name}</span> · {artifact.runtimeSize} bytes deployed code
                                    {artifact.runtimeSize > MAX_RUNTIME_BYTES && <span className="text-rose-600 dark:text-rose-400"> (over the {MAX_RUNTIME_BYTES}-byte limit)</span>}
                                </div>
                                {constructorInputs.map((input, i) => (
                                    <label key={i} className="block text-[12px] font-semibold uppercase text-fg-muted">
                                        {input.name || `arg${i}`} <span className="font-mono normal-case text-fg-subtle">{input.type}</span>
                                        <input
                                            aria-label={`Constructor argument ${input.name || i} (${input.type})`}
                                            value={ctorArgs[i] ?? ''}
                                            onChange={(e) => setCtorArgs((prev) => { const next = [...prev]; next[i] = e.target.value; return next; })}
                                            className="mt-1 w-full bg-hover border border-line rounded-lg px-3 py-2 text-xs font-mono normal-case text-fg outline-none focus:border-line-strong"
                                        />
                                    </label>
                                ))}
                                {deployError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{deployError}</p>}
                                <p className="text-[12px] text-fg-subtle">
                                    Deploying opens a Transaction request: it is simulated on the chain and reviewed before your wallet is asked to sign.
                                </p>
                            </section>
                        )}
                        {compile.status === 'done' && errors.length > 0 && <p className="text-xs text-rose-600 dark:text-rose-400">Fix the errors above, then compile again.</p>}
                    </div>
                </div>
            </main>

            {/* Inspector */}
            <aside className="w-80 border-l border-line bg-sunken p-6 space-y-8">
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-fg-subtle">Properties</h3>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-fg-muted uppercase">Contract Name</label>
                            <input
                                type="text"
                                value={contractName}
                                onChange={(e) => setContractName(e.target.value)}
                                className="w-full bg-hover border border-line rounded-[10px] px-4 py-2 text-sm font-semibold focus:border-line-strong transition-all outline-none text-fg"
                                placeholder="Enter contract name"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-fg-muted uppercase">{config.editionLabel}</label>
                            <select
                                value={edition}
                                onChange={(e) => setEdition(e.target.value)}
                                className="w-full bg-hover border border-line rounded-[10px] px-4 py-2 text-sm font-semibold outline-none"
                            >
                                {config.editions.map((option) => (
                                    <option key={option}>{option}</option>
                                ))}
                            </select>
                            {config.compiler === 'browser' ? (
                                <p className="text-[12px] text-fg-muted">Compiles with the built-in solc {config.compilerVersion} (optimizer on). This setting is not applied yet.</p>
                            ) : (
                                <p className="text-[12px] text-fg-muted">Built on txio-compiler with {config.compilerVersion}.</p>
                            )}
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
};
