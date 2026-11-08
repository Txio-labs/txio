/**
 * Automation & Safety — Phase 5's four features live here as tabs on one
 * screen (per the roadmap's explicit allowance to combine W2's "Automations
 * / Session Keys" screen with A1's scheduling UI; S4 Limits and A2 Webhooks
 * join them rather than getting four separate near-empty pages).
 */
import React, { useEffect, useState } from 'react';
import { Select } from '@/components/Select';
import { AlertTriangle, Bell, Clock, KeyRound, ShieldCheck } from 'lucide-react';
import { useWallet } from '@/wallet';
import { LimitsTab } from './automation/LimitsTab';
import { SessionKeysTab } from './automation/SessionKeysTab';
import { ScheduledTasksTab } from './automation/ScheduledTasksTab';
import { WebhooksTab } from './automation/WebhooksTab';

type AutomationTab = 'limits' | 'session_keys' | 'scheduled' | 'webhooks';

const TABS: { id: AutomationTab; label: string; icon: React.ElementType }[] = [
    { id: 'limits', label: 'Limits', icon: ShieldCheck },
    { id: 'session_keys', label: 'Session Keys', icon: KeyRound },
    { id: 'scheduled', label: 'Scheduled', icon: Clock },
    { id: 'webhooks', label: 'Webhooks', icon: Bell }
];

export const AutomationPage: React.FC = () => {
    const [tab, setTab] = useState<AutomationTab>('limits');
    const { linkedWallets } = useWallet();
    const [selectedWalletKey, setSelectedWalletKey] = useState<string | null>(null);

    const wallets = Object.values(linkedWallets).filter((w): w is NonNullable<typeof w> => Boolean(w));

    useEffect(() => {
        if (!selectedWalletKey && wallets.length > 0) {
            queueMicrotask(() => setSelectedWalletKey(`${wallets[0].family}:${wallets[0].address}`));
        }
    }, [wallets, selectedWalletKey]);

    const selectedWallet = wallets.find((w) => `${w.family}:${w.address}` === selectedWalletKey) ?? null;

    return (
        <div className="flex flex-col h-full bg-surface font-sans">
            <div className="px-6 md:px-8 pt-7 pb-5 border-b border-line shrink-0">
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-fg flex items-center gap-3">
<span className="h-9 w-9 rounded-[9px] border border-line bg-surface shadow-card flex items-center justify-center text-fg-muted shrink-0"><ShieldCheck size={16} /></span>
Automation &amp; Safety
                </h1>
                <p className="text-[14px] text-fg-muted mt-1.5">
                    Spend limits, delegated signing for automations, scheduled/conditional execution, and webhook alerts.
                </p>

                <div className="flex gap-3 items-center mt-4 flex-wrap">
                    <div className="inline-flex bg-hover p-0.5 rounded-[9px] border border-line gap-0.5">
                        {TABS.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setTab(id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                                    tab === id
                                        ? 'bg-hover text-fg'
                                        : 'text-fg-subtle hover:text-fg'
                                }`}
                            >
                                <Icon size={13} />
                                {label}
                            </button>
                        ))}
                    </div>

                    {wallets.length > 0 && tab === 'limits' && (
                        <div className="w-52">
                            <Select
                                value={selectedWalletKey ?? ''}
                                options={wallets.map((w) => ({
                                    label: `${w.family.toUpperCase()} · ${w.address.slice(0, 6)}...${w.address.slice(-4)}`,
                                    value: `${w.family}:${w.address}`
                                }))}
                                onChange={setSelectedWalletKey}
                                fullWidth
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                {tab === 'limits' && (
                    selectedWallet ? (
                        <LimitsTab wallet={selectedWallet} />
                    ) : (
                        <EmptyWalletState />
                    )
                )}
                {tab === 'session_keys' && <SessionKeysTab wallets={wallets} />}
                {tab === 'scheduled' && <ScheduledTasksTab />}
                {tab === 'webhooks' && <WebhooksTab />}
            </div>
        </div>
    );
};

const EmptyWalletState: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <AlertTriangle size={28} className="text-fg-subtle mb-3" />
        <p className="text-sm font-semibold text-fg">No wallet linked</p>
        <p className="text-xs text-fg-subtle mt-1 max-w-xs">
            Connect a wallet to set spend limits for it.
        </p>
    </div>
);
