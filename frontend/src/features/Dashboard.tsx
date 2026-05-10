
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
    Activity, Terminal, Layers
} from 'lucide-react';
import { fetchRPCHealth, MOCK_RPC_METRICS } from '../services/mockService';
import { RPCHealthMetric } from '../types';
import { useAppStore, appStore } from '@/lib/store';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const Dashboard: React.FC = () => {
    const { network, isSyncing, history, currentWorkspaceId } = useAppStore();
    // We keep fetching metrics for the top overview stats (TPS/Gas)
    const [tps, setTps] = useState<number>(245);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(async () => {
            if (isSyncing) return;
            // Simulate TPS fluctuation based on network
            setTps(Math.floor((network === 'mainnet' ? 400 : 150) + Math.random() * 100));
        }, 3000);
        return () => clearInterval(interval);
    }, [network, isSyncing]);

    useEffect(() => {
        if (!containerRef.current) return;

        // Respect prefers-reduced-motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;

        const ctx = gsap.context(() => {
            // Animate headers and sections
            const animateIn = (targets: string | Element | null) => {
                if (!targets) return;
                gsap.from(targets, {
                    y: 20,
                    opacity: 0,
                    duration: 0.8,
                    ease: "power2.out",
                    stagger: 0.1,
                    scrollTrigger: {
                        trigger: targets,
                        start: "top 90%",
                        once: true,
                        toggleActions: "play none none none"
                    }
                });
            };

            animateIn('.animate-section-header');
            animateIn('.animate-grid-item');
        }, containerRef);

        return () => ctx.revert();
    }, []);

    const workspaceHistory = useMemo(() => {
        return history
            .filter(item => !item.workspaceId || item.workspaceId === currentWorkspaceId)
            .slice(0, 8);
    }, [history, currentWorkspaceId]);

    return (
        <div ref={containerRef} className="h-full overflow-y-auto bg-slate-950 p-6 custom-scrollbar">
            <h1 className="text-xl font-bold text-white mb-6 flex items-center gap-2 animate-section-header">
                <Activity size={20} className="text-slate-400"/> Network Overview
            </h1>

            {/* Metrics Row - Stack on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg animate-grid-item">
                    <div className="text-slate-500 text-xs uppercase font-mono mb-1">Network</div>
                    <div className="text-slate-200 font-bold capitalize">{network}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg animate-grid-item">
                    <div className="text-slate-500 text-xs uppercase font-mono mb-1">TPS</div>
                    <div className="text-slate-200 font-bold font-mono">{tps}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg animate-grid-item">
                    <div className="text-slate-500 text-xs uppercase font-mono mb-1">Reference Gas</div>
                    <div className="text-slate-200 font-bold font-mono">1,000 MIST</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg animate-grid-item">
                    <div className="text-slate-500 text-xs uppercase font-mono mb-1">Epoch</div>
                    <div className="text-slate-200 font-bold font-mono">420</div>
                </div>
            </div>

            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 animate-section-header">Tools</h2>
            
            {/* Tools Grid - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <button 
                    onClick={() => appStore.openTab('new_request')}
                    className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-600 hover:bg-slate-800 transition-all text-left group animate-grid-item"
                >
                    <div className="mb-3 text-slate-400 group-hover:text-white"><Terminal size={24} /></div>
                    <div className="text-sm font-bold text-slate-200">New Request</div>
                    <div className="text-xs text-slate-500 mt-1">JSON-RPC & Move Calls</div>
                </button>

                <button 
                    onClick={() => appStore.openTab('ptb')}
                    className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-600 hover:bg-slate-800 transition-all text-left group animate-grid-item"
                >
                    <div className="mb-3 text-slate-400 group-hover:text-white"><Layers size={24} /></div>
                    <div className="text-sm font-bold text-slate-200">New PTB</div>
                    <div className="text-xs text-slate-500 mt-1">Programmable Transaction</div>
                </button>
            </div>

            {/* Recent Activity - Full Width */}
            <div className="min-w-0">
                 <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 animate-section-header">Recent Activity</h2>
                 <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900 animate-grid-item">
                    {workspaceHistory.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-600 italic">
                            No recent requests in this workspace. Start building to see your history here.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {workspaceHistory.map((item, idx) => (
                                <div key={idx} className="px-4 py-3 flex justify-between items-center hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => appStore.openTab(item.type === 'RPC' ? 'rpc' : 'ptb', item)}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${item.status && item.status < 400 ? 'text-emerald-400 bg-emerald-900/20' : 'text-red-400 bg-red-900/20'}`}>
                                            {item.status}
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-200 font-bold truncate max-w-[200px] sm:max-w-[400px]">{item.name}</span>
                                            <span className="text-[10px] text-slate-500 font-mono truncate">{item.type === 'RPC' ? item.rpcParams.method : item.txType}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline-block">{item.duration}ms</span>
                                        <span className="text-[10px] text-slate-500">{new Date(item.timestamp || 0).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
};
