/**
 * Automation & Safety — Phase 5's four features live here as tabs on one
 * screen (per the roadmap's explicit allowance to combine W2's "Automations
 * / Session Keys" screen with A1's scheduling UI; S4 Limits and A2 Webhooks
 * join them rather than getting four separate near-empty pages).
 */
import React, { useEffect, useState } from 'react';
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
        <div className="flex flex-col h-full bg-white dark:bg-near-black font-sans">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-dark-indigo-glow/50 shrink-0">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                    <ShieldCheck size={22} className="text-electric-violet" />
                    Automation &amp; Safety
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                    Spend limits, delegated signing for automations, scheduled/conditional execution, and webhook alerts.
                </p>

                <div className="flex gap-3 items-center mt-4 flex-wrap">
                    <div className="flex bg-white dark:bg-near-black p-1 rounded-lg border border-slate-200 dark:border-white/5">
                        {TABS.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setTab(id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                                    tab === id
                                        ? 'bg-electric-violet/10 text-electric-violet'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <Icon size={13} />
                                {label}
                            </button>
                        ))}
                    </div>

                    {wallets.length > 0 && tab === 'limits' && (
                        <select
                            value={selectedWalletKey ?? ''}
                            onChange={(e) => setSelectedWalletKey(e.target.value)}
                            className="h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-electric-violet"
                        >
                            {wallets.map((w) => (
                                <option key={`${w.family}:${w.address}`} value={`${w.family}:${w.address}`}>
                                    {w.family.toUpperCase()} · {w.address.slice(0, 6)}...{w.address.slice(-4)}
                                </option>
                            ))}
                        </select>
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
        <AlertTriangle size={28} className="text-slate-400 mb-3" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No wallet linked</p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Connect a wallet to set spend limits for it.
        </p>
    </div>
);
