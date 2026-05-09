
import React from 'react';
import { FileCode, Play, Plus } from 'lucide-react';
import { appStore } from '@/lib/store';

const MOCK_RECIPES = [
    { id: 1, title: "Mint DevNet NFT", type: "MoveCall" },
    { id: 2, title: "Split & Transfer SUI", type: "PTB" },
    { id: 3, title: "Publish Package (Standard)", type: "Publish" },
    { id: 4, title: "Oracle Update (Pyth)", type: "MoveCall" },
    { id: 5, title: "Stake SUI to Validator", type: "MoveCall" },
    { id: 6, title: "Unstake SUI", type: "MoveCall" },
];

export const Recipes: React.FC = () => {
    return (
        <div className="flex flex-col h-full bg-slate-950 p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-lg font-bold text-slate-200">Transaction Recipes</h1>
                <button onClick={() => appStore.showToast('Template creation wizard not implemented', 'info')} className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded hover:text-white flex items-center gap-1">
                    <Plus size={12} /> New Template
                </button>
            </div>

            <div className="border border-slate-800 rounded bg-slate-900 overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-slate-800">
                    {MOCK_RECIPES.map((recipe) => (
                        <div key={recipe.id} className="p-3 flex items-center justify-between hover:bg-slate-800/50 group">
                            <div className="flex items-center gap-3">
                                <FileCode size={16} className="text-slate-500" />
                                <div>
                                    <div className="text-sm font-medium text-slate-300">{recipe.title}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">{recipe.type}</div>
                                </div>
                            </div>
                            <button onClick={() => appStore.showToast(`Loaded template: ${recipe.title}`, 'success')} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                <Play size={10} /> Load
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
