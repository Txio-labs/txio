import React, { useState, useRef, useEffect } from 'react';
import { Box, ArrowRight, Play, Coins, Layers, Plus, X, Search, RefreshCw } from 'lucide-react';
import { PTBNode } from '../types';
import { useAppStore, appStore } from '@/lib/store';
import { useWallet } from '@/wallet';
import { getOwnedObjects } from '../services/suiService';
import { TransactionBuilder } from '../components/RequestPanel/builders/TransactionBuilder';

interface NodeProps {
    node: PTBNode;
    onMouseDown: (id: string, e: React.MouseEvent) => void;
}

const Node: React.FC<NodeProps> = ({ node, onMouseDown }) => {
    let color = 'border-slate-600 bg-slate-800';
    let icon = <Box size={14} />;
    
    if (node.type === 'object') { color = 'border-blue-600 bg-blue-900/20'; icon = <Coins size={14} className="text-blue-400"/>; }
    if (node.type === 'transfer') { color = 'border-emerald-600 bg-emerald-900/20'; icon = <ArrowRight size={14} className="text-emerald-400"/>; }
    if (node.type === 'splitCoins') { color = 'border-amber-600 bg-amber-900/20'; icon = <Layers size={14} className="text-amber-400"/>; }
    if (node.type === 'moveCall') { color = 'border-purple-600 bg-purple-900/20'; icon = <Layers size={14} className="text-purple-400"/>; }

    return (
        <div 
            className={`absolute w-48 rounded-lg border shadow-xl backdrop-blur-sm cursor-grab active:cursor-grabbing ${color}`}
            style={{ left: node.position.x, top: node.position.y }}
            onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(node.id, e);
            }}
        >
            <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wide select-none">
                {icon} {node.type}
            </div>
            <div className="p-3 text-xs text-slate-300 space-y-2">
                {Object.entries(node.data).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                        <span className="opacity-50 capitalize">{k}:</span>
                        <span className="font-mono text-white truncate max-w-[100px]">{Array.isArray(v) ? `[${v.join(', ')}]` : v}</span>
                    </div>
                ))}
            </div>
            
            {/* Handles */}
            {node.inputs && node.inputs.length > 0 && <div className="absolute left-0 top-1/2 -translate-x-1/2 w-3 h-3 bg-slate-200 rounded-full border-2 border-white/5 hover:scale-125 transition-transform" />}
            {node.outputs && node.outputs.length > 0 && <div className="absolute right-0 top-1/2 translate-x-1/2 w-3 h-3 bg-slate-200 rounded-full border-2 border-white/5 hover:scale-125 transition-transform" />}
        </div>
    );
};

export const PTBBuilder: React.FC = () => {
    const { network, envVariables } = useAppStore();
    const { currentWallet } = useWallet();
    const connectedAddress = currentWallet?.family === 'sui' ? currentWallet.address : null;

    const [nodes, setNodes] = useState<PTBNode[]>([
        { id: '1', type: 'object', position: { x: 100, y: 100 }, data: { label: 'Input Coin', type: '0x2::sui::SUI' }, inputs: [], outputs: ['c1'] },
        { id: '2', type: 'splitCoins', position: { x: 400, y: 100 }, data: { amounts: [1000, 500] }, inputs: ['c1'], outputs: ['c2', 'c3'] },
        { id: '3', type: 'transfer', position: { x: 700, y: 50 }, data: { recipient: '0xAlice' }, inputs: ['c2'], outputs: [] },
        { id: '4', type: 'transfer', position: { x: 700, y: 200 }, data: { recipient: '0xBob' }, inputs: ['c3'], outputs: [] }
    ]);

    const [draggingId, setDraggingId] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Modal State
    const [activeModal, setActiveModal] = useState<'addObject' | 'moveCall' | 'splitCoins' | null>(null);

    // Add Object Modal State
    const [objIdInput, setObjIdInput] = useState('');
    const [objTypeInput, setObjTypeInput] = useState('0x2::sui::SUI');
    const [objLabelInput, setObjLabelInput] = useState('');
    const [ownedObjects, setOwnedObjects] = useState<any[]>([]);
    const [loadingOwned, setLoadingOwned] = useState(false);

    // Move Call Modal State
    const [tempRequest, setTempRequest] = useState<any>({
        id: 'temp-move-call',
        type: 'TRANSACTION',
        txType: 'MoveCall',
        moveParams: {
            packageId: '',
            module: '',
            function: '',
            typeArguments: [],
            arguments: [],
            gasBudget: '10000000'
        }
    });
    const [moveCallOutputs, setMoveCallOutputs] = useState('result_5');

    // Split Coins Modal State
    const [splitInputCoin, setSplitInputCoin] = useState('');
    const [splitAmounts, setSplitAmounts] = useState('1000, 500');
    const [splitOutputs, setSplitOutputs] = useState('split_1, split_2');

    useEffect(() => {
        let isSubscribed = true;
        if (activeModal === 'addObject' && connectedAddress) {
            queueMicrotask(() => {
                if (!isSubscribed) return;
                setLoadingOwned(true);
                getOwnedObjects(network, connectedAddress)
                    .then(res => {
                        if (isSubscribed && res?.result?.data) {
                            setOwnedObjects(res.result.data);
                        }
                    })
                    .catch(() => {})
                    .finally(() => {
                        if (isSubscribed) {
                            setLoadingOwned(false);
                        }
                    });
            });
        }
        return () => {
            isSubscribed = false;
        };
    }, [activeModal, connectedAddress, network]);

    // Simple Drag Logic
    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingId && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            setNodes(nds => nds.map(n => {
                if (n.id === draggingId) {
                    return {
                        ...n,
                        position: {
                            x: Math.max(0, e.clientX - rect.left - 96), // center cursor
                            y: Math.max(0, e.clientY - rect.top - 20)
                        }
                    };
                }
                return n;
            }));
        }
    };

    // Draw SVG Connections
    const renderConnections = () => {
        // Map of connection ID to source node position
        const outputsMap: Record<string, { x: number; y: number }> = {};
        nodes.forEach(n => {
            if (n.outputs) {
                n.outputs.forEach(outId => {
                    outputsMap[outId] = {
                        x: n.position.x + 192,
                        y: n.position.y + 50
                    };
                });
            }
        });

        const paths: JSX.Element[] = [];
        nodes.forEach(n => {
            if (n.inputs) {
                n.inputs.forEach(inId => {
                    const start = outputsMap[inId];
                    if (start) {
                        const end = {
                            x: n.position.x,
                            y: n.position.y + 50
                        };
                        const cp1x = start.x + Math.max(30, (end.x - start.x) / 2);
                        const cp1y = start.y;
                        const cp2x = end.x - Math.max(30, (end.x - start.x) / 2);
                        const cp2y = end.y;
                        paths.push(
                            <path 
                                key={`${inId}-${n.id}`}
                                d={`M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`} 
                                stroke="#475569" 
                                strokeWidth="2" 
                                fill="none" 
                            />
                        );
                    }
                });
            }
        });

        return (
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                {paths}
            </svg>
        );
    };

    const handleAddObject = () => {
        if (!objIdInput) {
            appStore.showToast('Object ID is required', 'error');
            return;
        }
        const newNodeId = Date.now().toString();
        const outId = `obj_out_${newNodeId}`;
        const newNode: PTBNode = {
            id: newNodeId,
            type: 'object',
            position: { x: 150 + (nodes.length % 5) * 40, y: 150 + (nodes.length % 5) * 40 },
            data: { label: objLabelInput || 'Object', type: objTypeInput || 'Unknown Type', objectId: objIdInput },
            inputs: [],
            outputs: [outId]
        };
        setNodes(nds => [...nds, newNode]);
        setActiveModal(null);
        setObjIdInput('');
        setObjTypeInput('0x2::sui::SUI');
        setObjLabelInput('');
    };

    const handleAddMoveCall = () => {
        if (!tempRequest.moveParams.packageId || !tempRequest.moveParams.module || !tempRequest.moveParams.function) {
            appStore.showToast('Package ID, Module, and Function are required', 'error');
            return;
        }
        const newNodeId = Date.now().toString();
        const outputList = moveCallOutputs.split(',')
            .map(s => s.trim())
            .filter(Boolean);
        
        const allActiveOutputs = nodes.flatMap(n => n.outputs || []);
        const inputs = tempRequest.moveParams.arguments
            .map((arg: any) => arg.value)
            .filter((val: string) => val && (allActiveOutputs.includes(val) || val.startsWith('obj_out_') || val.startsWith('split_out_') || val.startsWith('move_out_') || val.startsWith('c')));

        const newNode: PTBNode = {
            id: newNodeId,
            type: 'moveCall',
            position: { x: 150 + (nodes.length % 5) * 40, y: 150 + (nodes.length % 5) * 40 },
            data: {
                package: tempRequest.moveParams.packageId,
                module: tempRequest.moveParams.module,
                function: tempRequest.moveParams.function,
                arguments: tempRequest.moveParams.arguments.map((a: any) => `${a.type}: ${a.value}`).join(', '),
                typeArguments: tempRequest.moveParams.typeArguments.join(', ')
            },
            inputs: inputs,
            outputs: outputList
        };

        setNodes(nds => [...nds, newNode]);
        setActiveModal(null);
        setTempRequest({
            id: 'temp-move-call',
            type: 'TRANSACTION',
            txType: 'MoveCall',
            moveParams: {
                packageId: '',
                module: '',
                function: '',
                typeArguments: [],
                arguments: [],
                gasBudget: '10000000'
            }
        });
        setMoveCallOutputs(`result_${nodes.length + 2}`);
    };

    const handleAddSplitCoins = () => {
        if (!splitInputCoin) {
            appStore.showToast('Input Coin is required', 'error');
            return;
        }
        const newNodeId = Date.now().toString();
        const amounts = splitAmounts.split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n));
        const outputs = splitOutputs.split(',')
            .map(s => s.trim())
            .filter(Boolean);

        const newNode: PTBNode = {
            id: newNodeId,
            type: 'splitCoins',
            position: { x: 150 + (nodes.length % 5) * 40, y: 150 + (nodes.length % 5) * 40 },
            data: {
                input: splitInputCoin,
                amounts: amounts
            },
            inputs: [splitInputCoin],
            outputs: outputs
        };

        setNodes(nds => [...nds, newNode]);
        setActiveModal(null);
        setSplitInputCoin('');
        setSplitAmounts('1000, 500');
        setSplitOutputs('split_1, split_2');
    };

    return (
        <div className="flex h-full bg-near-black">
            {/* Toolbar */}
            <div className="w-12 bg-dark-indigo-glow border-r border-white/5 flex flex-col items-center py-4 gap-4 z-10">
                <button onClick={() => setActiveModal('addObject')} className="p-2 bg-blue-900/30 text-blue-400 rounded hover:bg-blue-900/50" title="Add Object"><Coins size={20}/></button>
                <button onClick={() => setActiveModal('moveCall')} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded" title="Move Call"><Layers size={20}/></button>
                <button onClick={() => setActiveModal('splitCoins')} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded" title="Split Coins"><Plus size={20}/></button>
            </div>

            {/* Canvas */}
            <div 
                className="flex-1 relative overflow-hidden dot-grid"
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseUp={() => setDraggingId(null)}
                onMouseLeave={() => setDraggingId(null)}
            >
                {renderConnections()}
                {nodes.map(node => (
                    // Added key and updated onMouseDown to fix TypeScript error in JSX mapping
                    <Node 
                        key={node.id} 
                        node={node} 
                        onMouseDown={(id) => setDraggingId(id)} 
                    />
                ))}

                {/* Floating Action */}
                <div className="absolute top-4 right-4 bg-dark-indigo-glow/80 backdrop-blur border border-white/10 p-2 rounded-lg flex gap-2">
                    <button onClick={() => appStore.showToast('Dry Run simulation started (Mock)', 'success')} className="bg-electric-violet hover:bg-electric-violet text-white px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2">
                        <Play size={14} fill="currentColor" /> Dry Run
                    </button>
                </div>
            </div>

            {/* Modals */}
            {activeModal === 'addObject' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-near-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
                        <div className="p-6 relative z-10">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-dark-indigo-glow rounded-xl border border-white/5 flex items-center justify-center shrink-0">
                                        <Coins size={18} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-white">Add Object Input</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Input an object ID or select from your wallet</p>
                                    </div>
                                </div>
                                <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Object ID *</label>
                                    <input 
                                        value={objIdInput} 
                                        onChange={e => setObjIdInput(e.target.value)} 
                                        placeholder="0x..." 
                                        className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Object Type</label>
                                    <input 
                                        value={objTypeInput} 
                                        onChange={e => setObjTypeInput(e.target.value)} 
                                        placeholder="e.g. 0x2::sui::SUI" 
                                        className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Label / Alias</label>
                                    <input 
                                        value={objLabelInput} 
                                        onChange={e => setObjLabelInput(e.target.value)} 
                                        placeholder="e.g. Input Coin" 
                                        className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50"
                                    />
                                </div>

                                {connectedAddress && (
                                    <div className="border-t border-white/5 pt-3">
                                        <label className="block text-[10px] uppercase font-bold text-slate-550 mb-2">Owned Objects ({ownedObjects.length})</label>
                                        {loadingOwned ? (
                                            <div className="flex justify-center p-4"><RefreshCw size={16} className="animate-spin text-slate-500" /></div>
                                        ) : (
                                            <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                                                {ownedObjects.map((obj, idx) => {
                                                    const id = obj.data?.objectId || '';
                                                    const type = obj.data?.type || '';
                                                    const shortType = type.split('::').pop()?.split('<')[0] || 'Object';
                                                    return (
                                                        <div 
                                                            key={idx} 
                                                            onClick={() => {
                                                                setObjIdInput(id);
                                                                setObjTypeInput(type);
                                                                setObjLabelInput(shortType);
                                                            }} 
                                                            className="p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer border border-transparent hover:border-white/15 transition-all text-left flex justify-between items-center"
                                                        >
                                                            <div>
                                                                <div className="text-xs font-bold text-slate-300">{shortType}</div>
                                                                <div className="text-[10px] font-mono text-slate-500 truncate max-w-xs">{id}</div>
                                                            </div>
                                                            <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">Select</span>
                                                        </div>
                                                    );
                                                })}
                                                {ownedObjects.length === 0 && (
                                                    <div className="text-center text-xs text-slate-600 py-2">No owned objects found.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <button onClick={() => setActiveModal(null)} className="px-4 py-2.5 bg-dark-indigo-glow border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-all">Cancel</button>
                                <button onClick={handleAddObject} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all">Add Node</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeModal === 'moveCall' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-near-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
                        <div className="p-6 relative z-10 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-dark-indigo-glow rounded-xl border border-white/5 flex items-center justify-center shrink-0">
                                        <Layers size={18} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-white">Add Move Call Step</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Configure and add a Move Smart Contract call node</p>
                                    </div>
                                </div>
                                <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
                            </div>

                            <div className="space-y-4">
                                <TransactionBuilder 
                                    request={tempRequest} 
                                    activeAddress={connectedAddress} 
                                    envVars={envVariables} 
                                    network={network} 
                                    onChange={setTempRequest} 
                                />
                                
                                <div className="bg-near-black/45 p-4 rounded-xl border border-white/5 space-y-3">
                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">PTB Integration Settings</h4>
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Exported Output Connections (comma separated)</label>
                                        <input 
                                            value={moveCallOutputs} 
                                            onChange={e => setMoveCallOutputs(e.target.value)} 
                                            placeholder="e.g. result_1, result_2" 
                                            className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500/50"
                                        />
                                        <p className="text-[10px] text-slate-500 mt-1">Specify names for the returned values of this function so you can reference them in subsequent steps.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <button onClick={() => setActiveModal(null)} className="px-4 py-2.5 bg-dark-indigo-glow border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-all">Cancel</button>
                                <button onClick={handleAddMoveCall} className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all">Add Node</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeModal === 'splitCoins' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-near-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
                        <div className="p-6 relative z-10">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-dark-indigo-glow rounded-xl border border-white/5 flex items-center justify-center shrink-0">
                                        <Plus size={18} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-white">Add Split Coins Step</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Split a coin object into multiple smaller coins</p>
                                    </div>
                                </div>
                                <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Input Coin Connection / Object ID *</label>
                                    <input 
                                        value={splitInputCoin} 
                                        onChange={e => setSplitInputCoin(e.target.value)} 
                                        placeholder="e.g. c1 or 0x..." 
                                        className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Select/type the name of the input coin connection (e.g. c1) or an Object ID.</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Split Amounts (comma separated) *</label>
                                    <input 
                                        value={splitAmounts} 
                                        onChange={e => setSplitAmounts(e.target.value)} 
                                        placeholder="e.g. 1000, 500" 
                                        className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Output Coin Connections (comma separated) *</label>
                                    <input 
                                        value={splitOutputs} 
                                        onChange={e => setSplitOutputs(e.target.value)} 
                                        placeholder="e.g. split_1, split_2" 
                                        className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Exported connection names for each split coin respectively.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <button onClick={() => setActiveModal(null)} className="px-4 py-2.5 bg-dark-indigo-glow border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-all">Cancel</button>
                                <button onClick={handleAddSplitCoins} className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all">Add Node</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
