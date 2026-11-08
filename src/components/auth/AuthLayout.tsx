'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { NetworkAptos, NetworkEthereum, NetworkSolana, NetworkStellar, NetworkSui } from '@web3icons/react';
import { TxioLogo } from '@/components/ui/TxioMark';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useMarketingMotion } from '@/lib/motion';

const CHAINS = [
    { label: 'Sui', Icon: NetworkSui, call: 'suix_getBalance', ms: 61 },
    { label: 'Ethereum', Icon: NetworkEthereum, call: 'eth_call', ms: 84 },
    { label: 'Solana', Icon: NetworkSolana, call: 'simulateTransaction', ms: 47 },
    { label: 'Aptos', Icon: NetworkAptos, call: 'view', ms: 92 },
    { label: 'Stellar', Icon: NetworkStellar, call: 'getLatestLedger', ms: 73 },
];

/**
 * Split auth screen: the form on the left, a product panel on the right (hidden on
 * small screens). Text uses theme tokens, so both halves read in light and dark.
 */
export function AuthLayout({
    children,
    onBack,
    panelTitle,
    panelBody,
    points,
}: {
    children: React.ReactNode;
    onBack?: () => void;
    panelTitle: React.ReactNode;
    panelBody: React.ReactNode;
    points?: string[];
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    useMarketingMotion(panelRef);

    useEffect(() => {
        // Auth pages scroll the document on small screens.
        document.body.style.overflow = 'auto';
        return () => {
            document.body.style.overflow = 'hidden';
        };
    }, []);

    return (
        <div className="min-h-screen w-full bg-canvas text-fg flex">
            {/* Form column */}
            <div className="flex-1 lg:flex-none lg:w-[46%] xl:w-[42%] min-h-screen flex flex-col bg-surface lg:border-r border-line">
                <header className="h-16 shrink-0 px-5 sm:px-8 flex items-center justify-between">
                    <Link href="/" aria-label="Txio home">
                        <TxioLogo size={24} />
                    </Link>
                    <div className="flex items-center gap-2">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-[7px] text-[14px] text-fg-muted hover:text-fg hover:bg-hover transition-colors"
                            >
                                <ArrowLeft size={14} /> Back
                            </button>
                        )}
                        <ThemeToggle className="!p-0 h-8 w-8 inline-flex items-center justify-center" />
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8">
                    <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom">{children}</div>
                </main>

                <footer className="h-14 shrink-0 px-5 sm:px-8 flex items-center justify-between text-xs text-fg-subtle">
                    <span>© {new Date().getFullYear()} Txio Labs</span>
                    <Link href="/docs" className="hover:text-fg transition-colors">
                        Documentation
                    </Link>
                </footer>
            </div>

            {/* Product panel */}
            <aside ref={panelRef} className="hidden lg:flex flex-1 relative overflow-hidden flex-col justify-center px-12 xl:px-20 py-16">
                <div className="absolute inset-0 grid-lines mask-radial opacity-80 pointer-events-none" aria-hidden />
                <div className="relative max-w-xl">
                    <h2 data-hero="1" className="text-[40px] xl:text-[52px] font-semibold tracking-[-0.045em] leading-[1.02] text-fg text-balance">
                        {panelTitle}
                    </h2>
                    <p data-hero="2" className="mt-5 text-base text-fg-muted leading-relaxed max-w-md">
                        {panelBody}
                    </p>
                    {points && (
                        <ul data-hero="3" className="mt-8 space-y-2.5">
                            {points.map((p) => (
                                <li key={p} className="flex items-center gap-2.5 text-[15px] text-fg-muted">
                                    <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                        <Check size={12} />
                                    </span>
                                    {p}
                                </li>
                            ))}
                        </ul>
                    )}

                    <div data-hero="4" data-hero-kind="stage" className="mt-12 rounded-[16px] border border-line bg-surface shadow-pop overflow-hidden">
                        <div className="h-10 px-4 flex items-center justify-between border-b border-line text-xs">
                            <span className="font-medium text-fg">Health checks</span>
                            <span className="flex items-center gap-1.5 text-fg-subtle">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Mainnet
                            </span>
                        </div>
                        <ul className="divide-y divide-line">
                            {CHAINS.map((c) => (
                                <li key={c.label} className="h-11 px-4 flex items-center gap-3 text-[14px]">
                                    <span className={`inline-flex ${c.Icon === NetworkAptos || c.Icon === NetworkStellar ? "dark:invert" : ""}`}><c.Icon size={18} variant="branded" /></span>
                                    <span className="w-20 text-fg">{c.label}</span>
                                    <span className="flex-1 font-mono text-xs text-fg-subtle truncate">{c.call}</span>
                                    <span className="font-mono text-xs text-fg-muted tabular">{c.ms}ms</span>
                                    <span className="h-5 px-1.5 rounded-[5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[12px] font-mono flex items-center">200</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </aside>
        </div>
    );
}
