import React from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    Terminal,
    Layers,
    FileCode2,
    Import,
    Variable,
    Activity,
    ShieldAlert,
    BadgeCheck,
    PenLine,
    FolderTree,
    PlayCircle,
    BookMarked,
    History,
    Repeat,
    Banknote,
    KeyRound,
    Users,
    MessageSquare,
    Webhook,
    Clock,
    Fingerprint,
    Network,
} from 'lucide-react';
import { appStore } from '@/lib/store';
import { MarketingShell, PageHero, CtaBand, Eyebrow } from '@/components/marketing/MarketingShell';

interface FeaturesPageProps {
    embedded?: boolean;
}

type Item = { icon: React.ComponentType<{ size?: number }>; title: string; body: string };

const GROUPS: Array<{ id: string; label: string; title: string; body: string; items: Item[] }> = [
    {
        id: 'build',
        label: 'Build',
        title: 'Requests that understand the chain.',
        body: 'Not a generic HTTP client. Txio knows each chain’s methods, transaction formats and address shapes.',
        items: [
            { icon: Terminal, title: 'RPC builder', body: 'JSON-RPC on every supported chain with method autocomplete, parameter templates and per-chain RPC health.' },
            { icon: Layers, title: 'Transaction builders', body: 'EVM contract calls, Solana instructions, Soroban calls, Aptos entry functions, Sui Move calls and PTBs.' },
            { icon: FileCode2, title: 'Contract builder', body: 'Write and compile Solidity in the browser, with Move flows for Sui and Aptos.' },
            { icon: Import, title: 'cURL import', body: 'Paste a cURL command and get a request you can edit, save and run.' },
            { icon: Variable, title: 'Variables & environments', body: 'Swap endpoints, addresses and keys per environment without editing requests.' },
            { icon: Network, title: 'RPC failover', body: 'When an endpoint returns 429 or 5xx, the next backup endpoint takes the call.' },
        ],
    },
    {
        id: 'simulate',
        label: 'Simulate & sign',
        title: 'See the outcome before the signature.',
        body: 'Each chain’s native dry run feeds one review screen. Fields a chain doesn’t report are hidden, not invented.',
        items: [
            { icon: Activity, title: 'Pre-sign simulation', body: 'dryRunTransactionBlock, eth_call and estimateGas, simulateTransaction and Aptos simulate.' },
            { icon: ShieldAlert, title: 'Approval warnings', body: 'Unlimited approve and setApprovalForAll on EVM get flagged before you sign.' },
            { icon: BadgeCheck, title: 'Verification badge', body: 'See whether the contract you are calling is verified.' },
            { icon: PenLine, title: 'Wallet signing', body: 'Sign with the wallet for each chain family, including Ledger hardware wallets.' },
            { icon: Fingerprint, title: 'Mainnet guard', body: 'An explicit warning before any transaction that moves real funds.' },
        ],
    },
    {
        id: 'organize',
        label: 'Organize',
        title: 'Keep the calls you need.',
        body: 'Collections, history and recipes turn one-off requests into a reusable toolkit.',
        items: [
            { icon: FolderTree, title: 'Collections', body: 'Nested folders of requests, shared with your workspace.' },
            { icon: PlayCircle, title: 'Collection runner', body: 'Run a collection’s requests in order with assertions and hooks.' },
            { icon: BookMarked, title: 'Recipes', body: 'Reusable transaction templates, with starters that work offline.' },
            { icon: History, title: 'History & export', body: 'Every call with status and timing, exportable as CSV or JSON.' },
        ],
    },
    {
        id: 'money',
        label: 'Move value',
        title: 'Swap, bridge and cash out.',
        body: 'Money movement sits next to the requests that need it.',
        items: [
            { icon: Repeat, title: 'Swap & bridge', body: 'Quotes and orders through LI.FI, falling back to SideShift, with resumable swaps.' },
            { icon: Banknote, title: 'Off-ramp', body: 'Off-ramp quotes and orders through Transak.' },
            { icon: KeyRound, title: 'Approvals manager', body: 'Review and revoke EVM token approvals.' },
        ],
    },
    {
        id: 'team',
        label: 'Team & automation',
        title: 'Built for teams that ship.',
        body: 'Workspaces, roles and automation for the work that repeats.',
        items: [
            { icon: Users, title: 'Workspaces & roles', body: 'Owners, editors and viewers across shared collections and environments.' },
            { icon: MessageSquare, title: 'Comments', body: 'Discuss a request next to the request.' },
            { icon: Clock, title: 'Scheduled tasks', body: 'Run requests on a schedule.' },
            { icon: Webhook, title: 'Webhooks & limits', body: 'Get notified on results and cap what automation may spend.' },
        ],
    },
];

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ embedded = false }) => {
    const primaryCta = embedded ? (
        <button
            onClick={() => appStore.openTab('new_request')}
            className="h-10 px-4 inline-flex items-center gap-2 rounded-[10px] bg-inverse text-on-inverse text-sm font-medium hover:opacity-90"
        >
            New request <ArrowRight size={14} />
        </button>
    ) : (
        <Link href="/signup" className="h-10 px-4 inline-flex items-center gap-2 rounded-[10px] bg-inverse text-on-inverse text-sm font-medium hover:opacity-90">
            Get started free <ArrowRight size={14} />
        </Link>
    );

    return (
        <MarketingShell embedded={embedded}>
            <PageHero
                eyebrow="Features"
                title="Tools that stay out of the way."
                body="Everything you need to build, test and run on-chain calls, organized by the job you are doing."
                actions={
                    <>
                        {primaryCta}
                        <Link
                            href="/docs"
                            className="h-10 px-4 inline-flex items-center rounded-[10px] border border-line-strong bg-surface text-sm font-medium text-fg hover:bg-hover"
                        >
                            Documentation
                        </Link>
                    </>
                }
            >
                <nav className="mt-12 flex flex-wrap gap-2" aria-label="Feature groups">
                    {GROUPS.map((g, i) => (
                        <a
                            key={g.id}
                            href={`#${g.id}`}
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(g.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="h-9 px-3 inline-flex items-center gap-2 rounded-[9px] border border-line bg-surface text-[14px] text-fg hover:border-line-strong transition-colors"
                        >
                            <span className="font-mono text-[12px] text-fg-subtle">0{i + 1}</span>
                            {g.label}
                        </a>
                    ))}
                </nav>
            </PageHero>

            <div className="w-full px-5 md:px-10 2xl:px-16 space-y-20 md:space-y-28">
                {GROUPS.map((g, i) => (
                    <section key={g.id} id={g.id} className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] gap-8 lg:gap-16 border-t border-line pt-10">
                        <div data-reveal className="lg:sticky lg:top-24 self-start">
                            <Eyebrow>
                                <span className="font-mono">0{i + 1}</span> {g.label}
                            </Eyebrow>
                            <h2 className="mt-4 text-[28px] md:text-[36px] font-semibold tracking-[-0.04em] leading-[1.05] text-balance">{g.title}</h2>
                            <p className="mt-3 text-[16px] text-fg-muted leading-relaxed max-w-md">{g.body}</p>
                        </div>
                        <div data-reveal-group className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-px bg-line border border-line rounded-[16px] overflow-hidden">
                            {g.items.map((it) => (
                                <div key={it.title} className="bg-surface p-6 hover:bg-sunken transition-colors">
                                    <span className="h-9 w-9 rounded-[9px] border border-line bg-sunken flex items-center justify-center text-fg-muted">
                                        <it.icon size={16} />
                                    </span>
                                    <h3 className="mt-5 text-[16px] font-semibold tracking-[-0.01em]">{it.title}</h3>
                                    <p className="mt-1.5 text-[14px] text-fg-muted leading-relaxed">{it.body}</p>
                                </div>
                            ))}
                            {g.items.length % 3 !== 0 && <div className="bg-surface hidden xl:block" />}
                            {g.items.length % 3 === 1 && <div className="bg-surface hidden xl:block" />}
                        </div>
                    </section>
                ))}
            </div>

            <CtaBand embedded={embedded} />
        </MarketingShell>
    );
};
