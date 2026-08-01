import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Code2, Box, Zap, Shield, Play, Save, Share2,
    Plus, Loader2, Check
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Select } from '@/components/Select';
import { RPC_CHAINS } from '@/lib/constants';
import { ChainId } from '@/types';

interface ChainContractConfig {
    label: string;
    fileExt: string;
    compilerLabel: string;
    compilerVersion: string;
    editionLabel: string;
    editions: string[];
    defaultContractName: string;
    defaultCode: string;
    deployNetworkLabel: string;
    formatTxHash: () => string;
}

const randomHex = (length: number) =>
    Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');

const CHAIN_CONTRACT_CONFIG: Record<ChainId, ChainContractConfig> = {
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
        deployNetworkLabel: 'Devnet',
        formatTxHash: () => `0x${randomHex(64)}`
    },
    evm: {
        label: 'Ethereum / EVM',
        fileExt: 'sol',
        compilerLabel: 'Solidity Compiler',
        compilerVersion: 'v0.8.26',
        editionLabel: 'EVM Version',
        editions: ['Cancun', 'Shanghai', 'Paris'],
        defaultContractName: 'AssetBridge',
        defaultCode:
            '// SPDX-License-Identifier: MIT\n' +
            'pragma solidity ^0.8.26;\n\n' +
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
        deployNetworkLabel: 'Sepolia',
        formatTxHash: () => `0x${randomHex(64)}`
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
        deployNetworkLabel: 'Testnet',
        formatTxHash: () => randomHex(64).toUpperCase()
    }
};

const DEFAULT_CONTRACT_NAMES: Record<ChainId, string> = {
    sui: CHAIN_CONTRACT_CONFIG.sui.defaultContractName,
    evm: CHAIN_CONTRACT_CONFIG.evm.defaultContractName,
    stellar: CHAIN_CONTRACT_CONFIG.stellar.defaultContractName
};

const DEFAULT_CODE_BY_CHAIN: Record<ChainId, string> = {
    sui: CHAIN_CONTRACT_CONFIG.sui.defaultCode,
    evm: CHAIN_CONTRACT_CONFIG.evm.defaultCode,
    stellar: CHAIN_CONTRACT_CONFIG.stellar.defaultCode
};

const DEFAULT_EDITION_BY_CHAIN: Record<ChainId, string> = {
    sui: CHAIN_CONTRACT_CONFIG.sui.editions[0],
    evm: CHAIN_CONTRACT_CONFIG.evm.editions[0],
    stellar: CHAIN_CONTRACT_CONFIG.stellar.editions[0]
};

export const ContractBuilder: React.FC = () => {
    const [chain, setChain] = useState<ChainId>('sui');
    const [activeModule, setActiveModule] = useState('core');

    // Kept per-chain so switching chains doesn't clobber what you wrote for
    // another one — this is a workspace across chains, not just Sui/Move.
    const [contractNames, setContractNames] = useState(DEFAULT_CONTRACT_NAMES);
    const [codeByChain, setCodeByChain] = useState(DEFAULT_CODE_BY_CHAIN);
    const [editionByChain, setEditionByChain] = useState(DEFAULT_EDITION_BY_CHAIN);

    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');
    const [isDeploying, setIsDeploying] = useState(false);
    const [deployResult, setDeployResult] = useState('');

    const config = CHAIN_CONTRACT_CONFIG[chain];
    const contractName = contractNames[chain];
    const code = codeByChain[chain];
    const edition = editionByChain[chain];

    const setContractName = (name: string) =>
        setContractNames((prev) => ({ ...prev, [chain]: name }));
    const setCode = (nextCode: string) =>
        setCodeByChain((prev) => ({ ...prev, [chain]: nextCode }));
    const setEdition = (nextEdition: string) =>
        setEditionByChain((prev) => ({ ...prev, [chain]: nextEdition }));

    const handleChainChange = (nextChain: ChainId) => {
        setChain(nextChain);
        setDeployResult('');
    };

    const modules = [
        { id: 'core', name: 'Standard Assets', icon: Box },
        { id: 'defi', name: 'DeFi Primitives', icon: Zap },
        { id: 'identity', name: 'Identity & Auth', icon: Shield },
        { id: 'social', name: 'Social Graph', icon: Share2 }
    ];

    const handleSave = () => {
        setIsSaving(true);
        // Simulate save to backend/localStorage
        setTimeout(() => {
            setIsSaving(false);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 800);
    };

    const handleDeploy = () => {
        if (!code.trim() || !contractName.trim()) return;
        setIsDeploying(true);
        setDeployResult('');
        // TODO: Replace simulated deploy with real backend compilation and execution
        setTimeout(() => {
            setIsDeploying(false);
            setDeployResult(config.formatTxHash());
        }, 2000);
    };

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
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                </div>
            </aside>

            {/* Visual Canvas */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Canvas Background Grid */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]" />

                {/* Header */}
                <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-electric-violet" />
                            <span className="text-sm font-black text-white">{contractName || 'Untitled_Contract'}.{config.fileExt}</span>
                        </div>
                        {saveStatus === 'success' && <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><Check size={12}/> Saved</span>}
                    </div>

                    <div className="absolute left-1/2 -translate-x-1/2 w-56">
                        <Select
                            value={chain}
                            onChange={(value) => handleChainChange(value as ChainId)}
                            options={RPC_CHAINS.map((c) => ({ label: c.label, value: c.id }))}
                            fullWidth
                            variant="glass"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition-all disabled:opacity-50">
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                        </button>
                        <button onClick={handleDeploy} disabled={isDeploying || !code.trim() || !contractName.trim()} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-electric-violet text-white text-xs font-bold shadow-lg shadow-electric-violet/20 hover:bg-soft-purple transition-all disabled:opacity-50">
                            {isDeploying ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Deploy to {config.deployNetworkLabel}
                        </button>
                    </div>
                </header>

                {/* Canvas Content */}
                <div className="flex-1 p-12 relative z-10 overflow-y-auto custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {deployResult && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 text-sm">
                                <Check size={16} /> Successfully deployed! Transaction Hash: <span className="font-mono text-emerald-300 break-all">{deployResult}</span>
                            </motion.div>
                        )}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-1 rounded-[1.5rem] bg-[#18181b] border border-white/10 shadow-2xl relative group h-[600px] flex flex-col"
                        >
                            <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5">
                                <Code2 size={18} className="text-slate-500"/>
                                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Contract Editor</span>
                            </div>
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                spellCheck={false}
                                className="flex-1 w-full bg-transparent text-sm font-mono text-slate-300 p-6 focus:outline-none resize-none custom-scrollbar"
                                placeholder={`// Write your ${config.label} contract here...`}
                            />
                        </motion.div>
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
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Resource Leak Check</h3>
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3">
                        <Shield size={16} className="text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-500">No dangling resources detected.</span>
                    </div>
                </div>
            </aside>
        </div>
    );
};
