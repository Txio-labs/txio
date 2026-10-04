import React, { useRef, useState } from 'react';
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

interface ChainContractConfig {
    label: string;
    fileExt: string;
    compilerLabel: string;
    compilerVersion: string;
    editionLabel: string;
    editions: string[];
    defaultContractName: string;
    defaultCode: string;
    /** Whether this chain has a real compiler wired in. Only EVM does today. */
    canCompile: boolean;
    /** Shown when `canCompile` is false. */
    unavailableReason?: string;
}

// Only chains with a Move/Solidity/Rust contract-building flow implemented
// here. Aptos has no ChainAdapter/contract-builder support yet,
// so they're intentionally absent — `Partial` (not `Record<ChainId, ...>`)
// keeps that honest, and CONTRACT_BUILDER_CHAINS below is what the chain
// selector actually iterates, so unsupported chains can't be picked.
const CHAIN_CONTRACT_CONFIG: Partial<Record<ChainId, ChainContractConfig>> = {
    sui: {
        label: 'Sui',
        fileExt: 'move',
        compilerLabel: 'Move Compiler',
        compilerVersion: 'v1.1.2',
        editionLabel: 'Move Edition',
        editions: ['2024 (Beta)', 'Legacy'],
        defaultContractName: 'AssetBridge',
        defaultCode:
            'public entry fun initialize_market(admin: address) {\n' +
            '    // Initialize the market configuration\n' +
            '}\n\n' +
            'public fun mint_collection_token(amount: u64, treasury_cap: &mut TreasuryCap<T>): Coin<T> {\n' +
            '    let token = coin::mint_balance(amount, treasury_cap);\n' +
            '    return token\n' +
            '}',
        canCompile: false,
        unavailableReason: 'Compiling Move needs the Sui toolchain, which runs on a server. That service is not built yet, so nothing here is compiled or deployed.'
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
        canCompile: true,
    },
    stellar: {
        label: 'Stellar',
        fileExt: 'rs',
        compilerLabel: 'Soroban SDK',
        compilerVersion: 'v21.7.0',
        editionLabel: 'Rust Edition',
        editions: ['2021', '2018'],
        defaultContractName: 'AssetBridge',
        defaultCode:
            '#![no_std]\n' +
            'use soroban_sdk::{contract, contractimpl, Address, Env};\n\n' +
            '#[contract]\n' +
            'pub struct AssetBridge;\n\n' +
            '#[contractimpl]\n' +
            'impl AssetBridge {\n' +
            '    pub fn initialize_market(env: Env, admin: Address) {\n' +
            '        // Initialize the market configuration\n' +
            '    }\n\n' +
            '    pub fn mint_collection_token(env: Env, amount: i128) -> i128 {\n' +
            '        amount\n' +
            '    }\n' +
            '}',
        canCompile: false,
        unavailableReason: 'Compiling Soroban contracts needs the Rust toolchain, which runs on a server. That service is not built yet, so nothing here is compiled or deployed.'
    },
    solana: {
        label: 'Solana',
        fileExt: 'rs',
        compilerLabel: 'Anchor',
        compilerVersion: 'v0.30.1',
        editionLabel: 'Rust Edition',
        editions: ['2021', '2018'],
        defaultContractName: 'AssetBridge',
        defaultCode:
            'use anchor_lang::prelude::*;\n\n' +
            'declare_id!("11111111111111111111111111111111111111111");\n\n' +
            '#[program]\n' +
            'pub mod asset_bridge {\n' +
            '    use super::*;\n\n' +
            '    pub fn initialize_market(_ctx: Context<InitializeMarket>) -> Result<()> {\n' +
            '        // Initialize the market configuration\n' +
            '        Ok(())\n' +
            '    }\n\n' +
            '    pub fn mint_collection_token(_ctx: Context<MintCollectionToken>, amount: u64) -> Result<u64> {\n' +
            '        Ok(amount)\n' +
            '    }\n' +
            '}\n\n' +
            '#[derive(Accounts)]\n' +
            'pub struct InitializeMarket {}\n\n' +
            '#[derive(Accounts)]\n' +
            'pub struct MintCollectionToken {}',
        canCompile: false,
        unavailableReason: 'Compiling Solana programs needs the Rust toolchain, which runs on a server. That service is not built yet, so nothing here is compiled or deployed.'
    }
};

// Chains the Contract Builder's chain selector offers — every chain that has
// an entry in CHAIN_CONTRACT_CONFIG above, in RPC_CHAINS' display order.
// Filtering RPC_CHAINS (rather than iterating ChainId directly) means a
// chain added to ChainId without a contract-builder config here — like
// Aptos today — simply doesn't appear as an option, instead of
// appearing and then crashing on the missing config lookup.
export const CONTRACT_BUILDER_CHAINS = RPC_CHAINS.filter((c) => c.id in CHAIN_CONTRACT_CONFIG);

const DEFAULT_CONTRACT_NAMES: Record<ChainId, string> = {
    sui: CHAIN_CONTRACT_CONFIG.sui!.defaultContractName,
    evm: CHAIN_CONTRACT_CONFIG.evm!.defaultContractName,
    stellar: CHAIN_CONTRACT_CONFIG.stellar!.defaultContractName,
    solana: CHAIN_CONTRACT_CONFIG.solana!.defaultContractName,
    aptos: ''
};

const DEFAULT_CODE_BY_CHAIN: Record<ChainId, string> = {
    sui: CHAIN_CONTRACT_CONFIG.sui!.defaultCode,
    evm: CHAIN_CONTRACT_CONFIG.evm!.defaultCode,
    stellar: CHAIN_CONTRACT_CONFIG.stellar!.defaultCode,
    solana: CHAIN_CONTRACT_CONFIG.solana!.defaultCode,
    aptos: ''
};

const DEFAULT_EDITION_BY_CHAIN: Record<ChainId, string> = {
    sui: CHAIN_CONTRACT_CONFIG.sui!.editions[0],
    evm: CHAIN_CONTRACT_CONFIG.evm!.editions[0],
    stellar: CHAIN_CONTRACT_CONFIG.stellar!.editions[0],
    solana: CHAIN_CONTRACT_CONFIG.solana!.editions[0],
    aptos: ''
};

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
    | { status: 'failed'; logs: string[]; message: string };

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

    // Non-null: `chain` only ever holds a value from CONTRACT_BUILDER_CHAINS
    // (see the Select below), which is filtered to CHAIN_CONTRACT_CONFIG's keys.
    const config = CHAIN_CONTRACT_CONFIG[chain]!;
    const contractName = contractNames[chain];
    const code = codeByChain[chain];
    const edition = editionByChain[chain];

    const setContractName = (name: string) =>
        setContractNames((prev) => ({ ...prev, [chain]: name }));
    const setCode = (nextCode: string) => {
        setCodeByChain((prev) => ({ ...prev, [chain]: nextCode }));
        // The compiled artifact belongs to the source that produced it.
        if (compile.status === 'done') setCompile({ status: 'idle' });
    };
    const setEdition = (nextEdition: string) =>
        setEditionByChain((prev) => ({ ...prev, [chain]: nextEdition }));

    const handleChainChange = (nextChain: ChainId) => {
        abortRef.current?.abort();
        setChain(nextChain);
        setCompile({ status: 'idle' });
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

    const handleCompile = async () => {
        if (!config.canCompile || !code.trim()) return;
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
    const canDeploy = compile.status === 'done' && compile.result.ok && Boolean(artifact);

    return (
        <div className="h-full flex bg-[#0a0a0a] text-slate-300 font-sans overflow-hidden">
            {/* Module Sidebar */}
            <aside className="w-64 border-r border-white/5 flex flex-col bg-[#18181b]">
                <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-2">Contract Templates</div>
                        <div className="space-y-1">
                            {modules.map(mod => (
                                <button
                                    key={mod.id}
                                    onClick={() => setActiveModule(mod.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                                        activeModule === mod.id
                                        ? 'bg-electric-violet text-white shadow-lg'
                                        : 'text-slate-500 hover:bg-white/5'
                                    }`}
                                >
                                    <mod.icon size={16} />
                                    <span>{mod.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-2">Your Modules</div>
                        <div className="p-4 rounded-xl border border-dashed border-white/10 text-center space-y-2 group cursor-pointer hover:border-electric-violet/30 transition-all">
                            <Plus size={16} className="mx-auto text-slate-600 group-hover:text-electric-violet" />
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">New {config.label} Module</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/5 bg-black/20">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-600">
                        <span>{config.compilerLabel} {config.compilerVersion}</span>
                        <div className={`w-2 h-2 rounded-full ${config.canCompile ? 'bg-emerald-400' : 'bg-slate-600'}`} title={config.canCompile ? 'Compiler available' : 'No compiler for this chain yet'} />
                    </div>
                </div>
            </aside>

            {/* Visual Canvas */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Header */}
                <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-electric-violet" />
                            <span className="text-sm font-black text-white">{contractName || 'Untitled_Contract'}.{config.fileExt}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400">Experimental</span>
                        </div>
                        {saveStatus === 'success' && <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><Check size={12}/> Saved in this browser</span>}
                        {saveStatus === 'failed' && <span className="text-xs font-bold text-rose-400">Could not save</span>}
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
                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition-all">
                            <Save size={14} /> Save draft
                        </button>
                        <button
                            onClick={() => void handleCompile()}
                            disabled={!config.canCompile || isCompiling || !code.trim()}
                            title={config.canCompile ? undefined : config.unavailableReason}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold transition-all disabled:opacity-40"
                        >
                            {isCompiling ? <Loader2 size={14} className="animate-spin" /> : <Hammer size={14} />} Compile
                        </button>
                        <button
                            onClick={handleDeploy}
                            disabled={!canDeploy}
                            title={canDeploy ? undefined : config.canCompile ? 'Compile without errors first' : config.unavailableReason}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-electric-violet text-white text-xs font-bold shadow-lg shadow-electric-violet/20 hover:bg-soft-purple transition-all disabled:opacity-40"
                        >
                            <Play size={14} /> Review deployment
                        </button>
                    </div>
                </header>

                {/* Canvas Content */}
                <div className="flex-1 p-12 relative z-10 overflow-y-auto custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {!config.canCompile && (
                            <div role="note" className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-slate-400 flex items-start gap-3 text-sm">
                                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
                                <span>{config.unavailableReason} You can still write and save a draft here.</span>
                            </div>
                        )}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-1 rounded-[1.5rem] bg-[#18181b] border border-white/10 shadow-2xl relative group h-[70vh] max-h-[480px] flex flex-col"
                        >
                            <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5">
                                <Code2 size={18} className="text-slate-500"/>
                                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Contract Editor</span>
                            </div>
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                spellCheck={false}
                                aria-label="Contract source"
                                className="flex-1 w-full bg-transparent text-sm font-mono text-slate-300 p-6 focus:outline-none resize-none custom-scrollbar"
                                placeholder={`// Write your ${config.label} contract here...`}
                            />
                        </motion.div>

                        {compile.status !== 'idle' && (
                            <section aria-label="Compiler output" className="rounded-2xl border border-white/10 bg-[#18181b] p-4 space-y-3">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Compiler output</div>
                                <pre className="text-xs font-mono text-slate-400 whitespace-pre-wrap">{compile.logs.join('\n')}</pre>
                                {compile.status === 'failed' && <p role="alert" className="text-xs text-rose-400">{compile.message}</p>}
                                {compile.status === 'done' && compile.result.diagnostics.length > 0 && (
                                    <ul className="space-y-2">
                                        {compile.result.diagnostics.map((d, i) => (
                                            <li key={i} className={`text-xs font-mono whitespace-pre-wrap ${d.severity === 'error' ? 'text-rose-400' : 'text-amber-400'}`}>
                                                {d.line ? `Line ${d.line}:${d.column ?? 1}  ` : ''}{d.formatted.trim()}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        )}

                        {canDeploy && artifact && (
                            <section aria-label="Compiled contract" className="rounded-2xl border border-white/10 bg-[#18181b] p-4 space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Compiled</div>
                                    {artifacts.length > 1 && (
                                        <select
                                            aria-label="Contract to deploy"
                                            value={artifact.name}
                                            onChange={(e) => { setSelectedName(e.target.value); setCtorArgs([]); }}
                                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs"
                                        >
                                            {artifacts.map((c) => <option key={c.name}>{c.name}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div className="text-xs text-slate-400">
                                    <span className="font-bold text-white">{artifact.name}</span> · {artifact.runtimeSize} bytes deployed code
                                    {artifact.runtimeSize > MAX_RUNTIME_BYTES && <span className="text-rose-400"> (over the {MAX_RUNTIME_BYTES}-byte limit)</span>}
                                </div>
                                {constructorInputs.map((input, i) => (
                                    <label key={i} className="block text-[10px] font-black uppercase text-slate-600">
                                        {input.name || `arg${i}`} <span className="font-mono normal-case text-slate-500">{input.type}</span>
                                        <input
                                            aria-label={`Constructor argument ${input.name || i} (${input.type})`}
                                            value={ctorArgs[i] ?? ''}
                                            onChange={(e) => setCtorArgs((prev) => { const next = [...prev]; next[i] = e.target.value; return next; })}
                                            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono normal-case text-white outline-none focus:border-electric-violet/40"
                                        />
                                    </label>
                                ))}
                                {deployError && <p role="alert" className="text-xs text-rose-400">{deployError}</p>}
                                <p className="text-[11px] text-slate-500">
                                    Deploying opens a Transaction request: it is simulated on the chain and reviewed before your wallet is asked to sign.
                                </p>
                            </section>
                        )}
                        {compile.status === 'done' && errors.length > 0 && <p className="text-xs text-rose-400">Fix the errors above, then compile again.</p>}
                    </div>
                </div>
            </main>

            {/* Inspector */}
            <aside className="w-80 border-l border-white/5 bg-[#18181b] p-6 space-y-8">
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Properties</h3>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-600 uppercase">Contract Name</label>
                            <input
                                type="text"
                                value={contractName}
                                onChange={(e) => setContractName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold focus:border-electric-violet/40 transition-all outline-none text-white"
                                placeholder="Enter contract name"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-600 uppercase">{config.editionLabel}</label>
                            <select
                                value={edition}
                                onChange={(e) => setEdition(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                            >
                                {config.editions.map((option) => (
                                    <option key={option}>{option}</option>
                                ))}
                            </select>
                            {config.canCompile && <p className="text-[10px] text-slate-600">Compiles with the built-in solc {config.compilerVersion} (optimizer on). This setting is not applied yet.</p>}
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
};
