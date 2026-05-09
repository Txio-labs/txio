
import React, { useState, useRef, useEffect } from 'react';
import { Box, ArrowRight, Play, Coins, Layers, Plus } from 'lucide-react';
import { PTBNode, PTBConnection } from '../types';
import { appStore } from '@/lib/store';

// Moved outside to fix React component re-creation and TypeScript key prop errors
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
            {node.inputs && <div className="absolute left-0 top-1/2 -translate-x-1/2 w-3 h-3 bg-slate-200 rounded-full border-2 border-slate-800 hover:scale-125 transition-transform" />}
            {node.outputs && <div className="absolute right-0 top-1/2 translate-x-1/2 w-3 h-3 bg-slate-200 rounded-full border-2 border-slate-800 hover:scale-125 transition-transform" />}
        </div>
    );
};

export const PTBBuilder: React.FC = () => {
    const [nodes, setNodes] = useState<PTBNode[]>([
        { id: '1', type: 'object', position: { x: 100, y: 100 }, data: { label: 'Input Coin', type: '0x2::sui::SUI' }, inputs: [], outputs: ['c1'] },
        { id: '2', type: 'splitCoins', position: { x: 400, y: 100 }, data: { amounts: [1000, 500] }, inputs: ['c1'], outputs: ['c2', 'c3'] },
        { id: '3', type: 'transfer', position: { x: 700, y: 50 }, data: { recipient: '0xAlice' }, inputs: ['c2'], outputs: [] },
        { id: '4', type: 'transfer', position: { x: 700, y: 200 }, data: { recipient: '0xBob' }, inputs: ['c3'], outputs: [] }
    ]);

    const [draggingId, setDraggingId] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

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
        return (
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                {/* Mock connections based on hardcoded IDs for demo visual fidelity */}
                <path d="M 292 150 C 342 150, 342 150, 400 150" stroke="#475569" strokeWidth="2" fill="none" className="animate-pulse" />
                <path d="M 592 150 C 650 150, 650 100, 700 100" stroke="#475569" strokeWidth="2" fill="none" />
                <path d="M 592 150 C 650 150, 650 250, 700 250" stroke="#475569" strokeWidth="2" fill="none" />
            </svg>
        );
    };

    return (
        <div className="flex h-full bg-slate-950">
            {/* Toolbar */}
            <div className="w-12 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 gap-4 z-10">
                <button onClick={() => appStore.showToast('Adding Object not implemented', 'info')} className="p-2 bg-blue-900/30 text-blue-400 rounded hover:bg-blue-900/50" title="Add Object"><Coins size={20}/></button>
                <button onClick={() => appStore.showToast('Adding Move Call not implemented', 'info')} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded" title="Move Call"><Layers size={20}/></button>
                <button onClick={() => appStore.showToast('Adding Split Coins not implemented', 'info')} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded" title="Split Coins"><Plus size={20}/></button>
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
                <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-700 p-2 rounded-lg flex gap-2">
                    <button onClick={() => appStore.showToast('Dry Run simulation started (Mock)', 'success')} className="bg-sui-600 hover:bg-sui-500 text-white px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2">
                        <Play size={14} fill="currentColor" /> Dry Run
                    </button>
                </div>
            </div>
        </div>
    );
};
