import React, { useEffect, useState } from 'react';
import { Settings2, ArrowRight, Circle } from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { getChainRpcHealth } from '@/services/suiService';
import { ChainId, RPCHealthMetric } from '@/types';

// Chains this build has real RPC config + a health-check method for (see
// services/suiService.ts getChainRpcHealth and lib/constants.ts). The
// reference widget also lists Solana/Bitcoin/BSC/Polygon, which the app
// doesn't have RPC endpoints for yet — those render as "Not configured"
// rather than fabricated latency numbers.
const MONITORED_CHAINS: { id: ChainId; label: string }[] = [
    { id: 'evm', label: 'Ethereum Mainnet' },
    { id: 'sui', label: 'Sui Mainnet' },
    { id: 'stellar', label: 'Stellar Mainnet' },
];

const PLANNED_CHAINS = ['Solana Mainnet', 'Bitcoin Mainnet', 'BSC Mainnet', 'Polygon Mainnet'];

type ChainHealthState = Record<string, RPCHealthMetric | 'loading' | 'error'>;

export const NetworkStatusWidget: React.FC = () => {
    const { network } = useAppStore();
    const [health, setHealth] = useState<ChainHealthState>({});

    useEffect(() => {
        let cancelled = false;

        const check = async () => {
            for (const chain of MONITORED_CHAINS) {
                setHealth((prev) => ({ ...prev, [chain.id]: prev[chain.id] ?? 'loading' }));
                try {
                    const metric = await getChainRpcHealth(chain.id, network);
                    if (!cancelled) {
                        setHealth((prev) => ({ ...prev, [chain.id]: metric }));
                    }
                } catch {
                    if (!cancelled) {
                        setHealth((prev) => ({ ...prev, [chain.id]: 'error' }));
                    }
                }
            }
        };

        void check();
        const interval = setInterval(() => void check(), 20000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [network]);

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                    <Settings2 size={14} className="text-slate-500" />
                    <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Network Status</h2>
                </div>
                <button
                    onClick={() => appStore.openTab('infrastructure')}
                    className="text-[11px] font-bold text-electric-violet hover:opacity-80 flex items-center gap-1"
                >
                    View all <ArrowRight size={11} />
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-white/5">
                            <th className="px-5 py-2 font-medium">Network</th>
                            <th className="px-2 py-2 font-medium">Status</th>
                            <th className="px-5 py-2 font-medium text-right">Latency</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {MONITORED_CHAINS.map((chain) => {
                            const entry = health[chain.id];
                            const metric = entry && entry !== 'loading' && entry !== 'error' ? entry : null;
                            const isOnline = metric?.status === 'healthy' || metric?.status === 'degraded';
                            const latency = metric?.latency?.[metric.latency.length - 1];

                            return (
                                <tr key={chain.id}>
                                    <td className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-200">{chain.label}</td>
                                    <td className="px-2 py-2.5">
                                        {!entry || entry === 'loading' ? (
                                            <span className="text-slate-400">Checking…</span>
                                        ) : entry === 'error' || !isOnline ? (
                                            <span className="inline-flex items-center gap-1.5 text-red-500">
                                                <Circle size={8} className="fill-current" /> Offline
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 text-emerald-500">
                                                <Circle size={8} className="fill-current" /> Online
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-2.5 text-right font-mono text-slate-500">
                                        {latency !== undefined ? `${Math.round(latency)}ms` : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                        {PLANNED_CHAINS.map((label) => (
                            <tr key={label} className="opacity-50">
                                <td className="px-5 py-2.5 font-medium text-slate-500">{label}</td>
                                <td className="px-2 py-2.5 text-slate-400">Not configured</td>
                                <td className="px-5 py-2.5 text-right text-slate-400">—</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
