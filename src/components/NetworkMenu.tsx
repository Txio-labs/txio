'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Settings2 } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { ALL_NETWORKS, Network } from '@/types';
import { cx, Kbd, StatusDot, networkTone } from './ui/primitives';

export const NETWORK_INFO: Record<Network, { label: string; hint: string }> = {
    mainnet: { label: 'Mainnet', hint: 'Live network. Transactions move real funds.' },
    testnet: { label: 'Testnet', hint: 'Public test network with free test tokens.' },
    devnet: { label: 'Devnet', hint: 'Developer network. State can be reset. On Stellar this is Futurenet.' },
    localnet: { label: 'Localnet', hint: 'A node running on your own machine.' },
};

/** Header control: shows the active network and switches it from a dropdown. */
export function NetworkMenu({ className }: { className?: string }) {
    const { network } = useAppStore();
    const [open, setOpen] = useState(false);
    const [cursor, setCursor] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        queueMicrotask(() => listRef.current?.focus());
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const choose = (n: Network) => {
        setOpen(false);
        // Same network: nothing to do. Otherwise the store asks for confirmation first.
        appStore.requestNetworkSwitch(n);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setOpen(false);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setCursor((c) => (c + 1) % ALL_NETWORKS.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setCursor((c) => (c - 1 + ALL_NETWORKS.length) % ALL_NETWORKS.length);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            choose(ALL_NETWORKS[cursor]);
        } else if (/^[1-4]$/.test(e.key)) {
            choose(ALL_NETWORKS[Number(e.key) - 1]);
        }
    };

    return (
        <div ref={rootRef} className={cx('relative', className)}>
            <button
                onClick={() => {
                    setCursor(Math.max(0, ALL_NETWORKS.indexOf(network)));
                    setOpen((v) => !v);
                }}
                aria-haspopup="listbox"
                aria-expanded={open}
                title="Switch network"
                className={cx(
                    'inline-flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-control border text-[13px] font-medium transition-colors',
                    open ? 'border-line-strong bg-hover text-fg' : 'border-line text-fg hover:border-line-strong hover:bg-hover'
                )}
            >
                <StatusDot tone={networkTone(network)} pulse={network === 'mainnet'} />
                <span className="hidden sm:inline">{NETWORK_INFO[network].label}</span>
                <ChevronDown size={14} className={cx('text-fg-subtle transition-transform', open && 'rotate-180')} />
            </button>

            {open && (
                <div className="max-sm:fixed max-sm:inset-x-3 max-sm:top-14 sm:absolute sm:right-0 sm:top-full sm:mt-1.5 sm:w-[300px] rounded-card border border-line bg-elevated shadow-pop z-50 overflow-hidden animate-in fade-in zoom-in-95">
                    <div className="px-3 pt-3 pb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-subtle">Network</span>
                        <span className="text-xs text-fg-subtle">Applies to every chain</span>
                    </div>
                    <div
                        ref={listRef}
                        role="listbox"
                        aria-label="Network"
                        aria-activedescendant={`net-${ALL_NETWORKS[cursor]}`}
                        tabIndex={-1}
                        onKeyDown={onKeyDown}
                        className="px-1.5 pb-1.5 outline-none"
                    >
                        {ALL_NETWORKS.map((n, i) => {
                            const active = n === network;
                            return (
                                <button
                                    key={n}
                                    id={`net-${n}`}
                                    role="option"
                                    aria-selected={active}
                                    onMouseEnter={() => setCursor(i)}
                                    onClick={() => choose(n)}
                                    className={cx(
                                        'w-full flex items-start gap-3 rounded-[8px] px-2.5 py-2.5 text-left transition-colors',
                                        i === cursor ? 'bg-hover' : ''
                                    )}
                                >
                                    <StatusDot tone={networkTone(n)} className="mt-1.5" />
                                    <span className="flex-1 min-w-0">
                                        <span className="flex items-center gap-2">
                                            <span className="text-[14px] font-medium text-fg">{NETWORK_INFO[n].label}</span>
                                            {n === 'mainnet' && (
                                                <span className="h-[18px] px-1.5 rounded-[5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium inline-flex items-center">
                                                    Real funds
                                                </span>
                                            )}
                                        </span>
                                        <span className="block text-xs text-fg-subtle mt-0.5 leading-snug">{NETWORK_INFO[n].hint}</span>
                                    </span>
                                    {active ? <Check size={15} className="text-fg mt-1 shrink-0" /> : <Kbd className="mt-0.5">{i + 1}</Kbd>}
                                </button>
                            );
                        })}
                    </div>
                    <div className="border-t border-line p-1.5">
                        <button
                            onClick={() => {
                                setOpen(false);
                                appStore.openTab('infrastructure');
                            }}
                            className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[8px] text-[13px] text-fg-muted hover:text-fg hover:bg-hover transition-colors"
                        >
                            <Settings2 size={14} />
                            Manage endpoints
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
