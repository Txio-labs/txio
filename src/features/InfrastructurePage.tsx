import React from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    Boxes,
    Command,
    KeyRound,
    History,
    Globe,
    Server,
    Monitor,
    Terminal,
    Package,
    RefreshCcw,
    HeartPulse,
    Lock,
    MailCheck,
    ShieldCheck,
    Fingerprint,
} from 'lucide-react';
import { appStore } from '@/lib/store';
import { MarketingShell, PageHero, SectionHeading, CtaBand } from '@/components/marketing/MarketingShell';

interface InfrastructurePageProps {
    embedded?: boolean;
}

const LAYERS = [
    { icon: Globe, name: 'Web app', tech: 'Next.js · static export', body: 'The console. Talks to chain RPC endpoints directly and to the Txio API for your account data.' },
    { icon: Monitor, name: 'Desktop', tech: 'Rust · Tauri', body: 'The same console in a native window, with a Rust proxy that keeps your session out of page script.' },
    { icon: Terminal, name: 'CLI', tech: 'Rust', body: 'Shares its core with the API through a common Rust crate, so calls behave the same in your shell.' },
    { icon: Server, name: 'API', tech: 'Rust · Axum · MongoDB', body: 'Accounts, workspaces, collections, history and automation. Cookie sessions with CSRF checks.' },
    { icon: Package, name: 'SDK', tech: 'TypeScript', body: 'A typed client for the public execution API: simulate, execute and read history.' },
];

const RPC = [
    { icon: RefreshCcw, title: 'Failover', body: 'A 429 or 5xx from an endpoint moves the call to the next backup endpoint for that chain.' },
    { icon: HeartPulse, title: 'Health checks', body: 'Per-chain latency and status, checked from your browser and shown next to every request.' },
    { icon: Globe, title: 'Your own endpoints', body: 'Add private RPC URLs per network. Public endpoints remain as fallbacks.' },
];

const SECURITY = [
    { icon: Lock, title: 'HttpOnly sessions', body: 'The session cookie is never readable by page script. Unsafe requests must carry a CSRF header.' },
    { icon: MailCheck, title: 'Email verification', body: 'New accounts confirm their address with a one-time code.' },
    { icon: Fingerprint, title: 'Keys stay in your wallet', body: 'Txio builds and simulates transactions. Signing happens in your wallet or Ledger.' },
    { icon: ShieldCheck, title: 'Mainnet guard', body: 'Transactions that move real funds need an explicit confirmation first.' },
];

const CAPABILITIES = [
    { icon: Boxes, name: 'One client, five chain families', body: 'Sui, Ethereum and EVM, Solana, Aptos and Stellar behind one interface.' },
    { icon: Command, name: 'Native chain semantics', body: 'Real per-chain methods and transaction formats, including PTB construction for Sui.' },
    { icon: KeyRound, name: 'Wallet signing built in', body: 'Build, sign, run and inspect without exporting to a separate signer.' },
    { icon: History, name: 'Collections, environments, history', body: 'Organized calls, per-network environments and a full execution log.' },
];

export const InfrastructurePage: React.FC<InfrastructurePageProps> = ({ embedded = false }) => {
    return (
        <MarketingShell embedded={embedded}>
            <PageHero
                eyebrow="Infrastructure"
                title="How Txio is put together."
                body="A static web app, a native desktop shell, a CLI and a Rust API. Your chain calls go straight to RPC endpoints; your keys stay in your wallet."
                actions={
                    embedded ? (
                        <button
                            onClick={() => appStore.openTab('infrastructure')}
                            className="h-10 px-4 inline-flex items-center gap-2 rounded-[10px] bg-inverse text-on-inverse text-sm font-medium hover:opacity-90"
                        >
                            Manage networks <ArrowRight size={14} />
                        </button>
                    ) : (
                        <Link href="/docs" className="h-10 px-4 inline-flex items-center gap-2 rounded-[10px] bg-inverse text-on-inverse text-sm font-medium hover:opacity-90">
                            Read the docs <ArrowRight size={14} />
                        </Link>
                    )
                }
            />

            <section className="w-full px-5 md:px-10 2xl:px-16">
                <div data-reveal-group className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-line border border-line rounded-[16px] overflow-hidden">
                    {LAYERS.map((l) => (
                        <div key={l.name} className="bg-surface p-6">
                            <span className="h-9 w-9 rounded-[9px] border border-line bg-sunken flex items-center justify-center text-fg-muted">
                                <l.icon size={16} />
                            </span>
                            <h3 className="mt-5 text-[16px] font-semibold">{l.name}</h3>
                            <div className="mt-1 font-mono text-[12px] text-fg-subtle">{l.tech}</div>
                            <p className="mt-3 text-[14px] text-fg-muted leading-relaxed">{l.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="w-full px-5 md:px-10 2xl:px-16 mt-24 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-10 lg:gap-16">
                <SectionHeading eyebrow="RPC layer" title="Calls go where you point them." body="Each chain has a list of public endpoints. You can put your own in front." />
                <div data-reveal-group className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {RPC.map((r) => (
                        <div key={r.title} className="rounded-[14px] border border-line bg-surface p-5">
                            <r.icon size={18} className="text-fg-muted" />
                            <h3 className="mt-4 text-[15px] font-semibold">{r.title}</h3>
                            <p className="mt-1.5 text-[14px] text-fg-muted leading-relaxed">{r.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="w-full px-5 md:px-10 2xl:px-16 mt-24 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-10 lg:gap-16">
                <SectionHeading eyebrow="Security" title="Less to trust." body="Txio never asks for a private key. The API holds your workspace data, not your funds." />
                <div data-reveal-group className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SECURITY.map((r) => (
                        <div key={r.title} className="rounded-[14px] border border-line bg-surface p-5 flex gap-4">
                            <span className="h-9 w-9 shrink-0 rounded-[9px] border border-line bg-sunken flex items-center justify-center text-fg-muted">
                                <r.icon size={16} />
                            </span>
                            <div>
                                <h3 className="text-[15px] font-semibold">{r.title}</h3>
                                <p className="mt-1 text-[14px] text-fg-muted leading-relaxed">{r.body}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="w-full px-5 md:px-10 2xl:px-16 mt-24">
                <SectionHeading eyebrow="What it adds up to" title="One workspace for the whole job." />
                <div data-reveal-group className="mt-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {CAPABILITIES.map((c) => (
                        <div key={c.name} className="rounded-[14px] border border-line bg-surface p-5">
                            <c.icon size={18} className="text-fg-muted" />
                            <h3 className="mt-4 text-[15px] font-semibold">{c.name}</h3>
                            <p className="mt-1.5 text-[14px] text-fg-muted leading-relaxed">{c.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <CtaBand embedded={embedded} />
        </MarketingShell>
    );
};
