import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { getChainRpcHealth } from '@/services/suiService';
import { RPC_CHAINS } from '@/lib/constants';
import { ChainId, RPCHealthMetric } from '@/types';
import { Badge, Button, Card, CardHeader } from './ui/primitives';
import { ChainIcon } from './ui/ChainIcon';

// Every chain this build can query has a health check (services/suiService.ts
// getChainRpcHealth), so the widget monitors all of them on the current network.
const MONITORED_CHAINS = RPC_CHAINS;

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
        <Card className="overflow-hidden">
            <CardHeader
                title="RPC health"
                description={<span className="capitalize">{network} endpoints, checked every 20 seconds</span>}
                actions={
                    <Button variant="ghost" size="sm" trailing={<ArrowRight size={12} />} onClick={() => appStore.openTab('infrastructure')}>
                        Networks
                    </Button>
                }
            />
            <div className="divide-y divide-line">
                {MONITORED_CHAINS.map((chain) => {
                    const entry = health[chain.id];
                    const metric = entry && entry !== 'loading' && entry !== 'error' ? entry : null;
                    const latency = metric?.latency?.[metric.latency.length - 1];
                    const status = !entry || entry === 'loading' ? 'loading' : entry === 'error' || !metric ? 'down' : metric.status;
                    return (
                        <div key={chain.id} className="flex items-center gap-3 px-4 h-11">
                            <ChainIcon chain={chain.id as ChainId} size={22} />
                            <span className="text-[14px] text-fg flex-1 min-w-0 truncate">{chain.label}</span>
                            <LatencyBar ms={latency} />
                            <span className="w-14 text-right font-mono text-[12px] text-fg-muted tabular">
                                {latency !== undefined ? `${Math.round(latency)}ms` : '—'}
                            </span>
                            <span className="w-[84px] flex justify-end">
                                {status === 'loading' ? (
                                    <span className="text-[12px] text-fg-subtle">Checking…</span>
                                ) : status === 'healthy' ? (
                                    <Badge tone="success" dot>Healthy</Badge>
                                ) : status === 'degraded' ? (
                                    <Badge tone="warning" dot>Slow</Badge>
                                ) : (
                                    <Badge tone="danger" dot>Down</Badge>
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

/** Five-segment latency meter: more lit segments = faster. */
const LatencyBar: React.FC<{ ms?: number }> = ({ ms }) => {
    const lit = ms === undefined ? 0 : ms < 150 ? 5 : ms < 300 ? 4 : ms < 600 ? 3 : ms < 1200 ? 2 : 1;
    return (
        <span className="hidden sm:flex items-end gap-[2px] h-3" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
                <span
                    key={i}
                    className={`w-[3px] rounded-[1px] ${i < lit ? (lit >= 4 ? 'bg-emerald-400' : lit >= 3 ? 'bg-amber-400' : 'bg-red-400') : 'bg-line-strong'}`}
                    style={{ height: `${40 + i * 15}%` }}
                />
            ))}
        </span>
    );
};
