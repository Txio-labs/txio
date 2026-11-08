import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    ArrowUpRight,
    Check,
    FolderKanban,
    Layers,
    Play,
    Repeat,
    Search,
    ShieldCheck,
    Terminal,
    Users,
    Zap,
    Monitor,
    Activity,
    Minus,
} from 'lucide-react';
import { NetworkAptos, NetworkEthereum, NetworkSolana, NetworkStellar, NetworkSui } from '@web3icons/react';
import { MarketingShell, SectionHeading, CtaBand, DESKTOP_DOWNLOAD_URL } from '@/components/marketing/MarketingShell';
import { cx } from '@/components/ui/primitives';
import { splitWords } from '@/lib/motion';

type DemoChain = {
    id: string;
    label: string;
    Icon: React.ComponentType<{ size?: number; variant?: 'mono' | 'branded' | 'background' }>;
    method: string;
    endpoint: string;
    params: string;
    result: string[];
    ms: number;
};

// Example calls for the product mock. These are illustrative requests, not live data.
const DEMO: DemoChain[] = [
    {
        id: 'sui',
        label: 'Sui',
        Icon: NetworkSui,
        method: 'suix_getBalance',
        endpoint: 'fullnode.mainnet.sui.io',
        params: '["0x7d…a91c", "0x2::sui::SUI"]',
        result: ['"coinType": "0x2::sui::SUI"', '"coinObjectCount": 3', '"totalBalance": "128440200000"'],
        ms: 61,
    },
    {
        id: 'evm',
        label: 'Ethereum',
        Icon: NetworkEthereum,
        method: 'eth_getBalance',
        endpoint: 'ethereum-rpc.publicnode.com',
        params: '["0x1a2…09f", "latest"]',
        result: ['"jsonrpc": "2.0"', '"id": 1', '"result": "0x1bc16d674ec80000"'],
        ms: 84,
    },
    {
        id: 'solana',
        label: 'Solana',
        Icon: NetworkSolana,
        method: 'getBalance',
        endpoint: 'api.mainnet-beta.solana.com',
        params: '["8kdP…a1Qz"]',
        result: ['"context": { "slot": 312094117 }', '"value": 44120000000'],
        ms: 47,
    },
    {
        id: 'aptos',
        label: 'Aptos',
        Icon: NetworkAptos,
        method: 'GET /accounts/{addr}/balance',
        endpoint: 'api.mainnet.aptoslabs.com',
        params: '["0x9f3…02c", "0x1::aptos_coin::AptosCoin"]',
        result: ['"value": "980000000"', '"decimals": 8'],
        ms: 92,
    },
    {
        id: 'stellar',
        label: 'Stellar',
        Icon: NetworkStellar,
        method: 'getLatestLedger',
        endpoint: 'soroban-rpc.mainnet.stellar.gateway.fm',
        params: '[]',
        result: ['"id": "c6a4…77e1"', '"protocolVersion": 22', '"sequence": 55102384'],
        ms: 73,
    },
];

const CAPABILITIES: Array<{ chain: string; Icon: DemoChain['Icon']; tx: string; sim: string; native?: string }> = [
    { chain: 'Sui', Icon: NetworkSui, tx: 'Move call, PTB', sim: 'dryRunTransactionBlock', native: 'SuiNS names' },
    { chain: 'Ethereum & EVM', Icon: NetworkEthereum, tx: 'ABI call, raw calldata', sim: 'eth_call · estimateGas', native: 'Approval warnings' },
    { chain: 'Solana', Icon: NetworkSolana, tx: 'Instruction builder', sim: 'simulateTransaction' },
    { chain: 'Aptos', Icon: NetworkAptos, tx: 'Entry function', sim: 'simulate', native: 'ANS names' },
    { chain: 'Stellar', Icon: NetworkStellar, tx: 'Soroban contract call', sim: 'simulateTransaction' },
];

export const LandingPage: React.FC = () => {
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const [phase, setPhase] = useState<'sending' | 'done'>('sending');
    const chain = DEMO[active];

    useEffect(() => {
        // Each chain shows a short "sending" beat, then the response.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPhase('sending');
        const t = setTimeout(() => setPhase('done'), 650);
        return () => clearTimeout(t);
    }, [active]);

    useEffect(() => {
        if (paused) return;
        const iv = setInterval(() => setActive((i) => (i + 1) % DEMO.length), 4200);
        return () => clearInterval(iv);
    }, [paused]);

    return (
        <MarketingShell>
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 grid-lines mask-radial opacity-70 pointer-events-none" aria-hidden />
                <div className="relative w-full px-5 md:px-10 2xl:px-16 pt-14 md:pt-24 text-center">
                    <a
                        data-hero="1"
                        href={DESKTOP_DOWNLOAD_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="group inline-flex items-center gap-2 h-8 pl-1 pr-3 rounded-full border border-line bg-surface shadow-card text-xs text-fg-muted hover:border-line-strong transition-colors"
                    >
                        <span className="h-6 px-2 inline-flex items-center rounded-full bg-inverse text-on-inverse text-[12px] font-medium">New</span>
                        Txio Desktop for Linux, macOS and Windows
                        <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </a>

                    <h1 data-hero="2" className="mt-7 mx-auto max-w-4xl text-[44px] sm:text-[60px] md:text-[80px] font-semibold tracking-[-0.055em] leading-[0.95] text-fg text-balance">
                        {splitWords('One console for every chain.').map(({ word, key }, i) => (
                            <React.Fragment key={key}>
                                {i > 0 && ' '}
                                <span className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
                                    <span data-word className="inline-block">
                                        {word}
                                    </span>
                                </span>
                            </React.Fragment>
                        ))}
                    </h1>
                    <p data-hero="3" className="mt-6 mx-auto max-w-2xl text-base md:text-lg text-fg-muted leading-relaxed text-balance">
                        Build, simulate, sign and run RPC calls and transactions on Sui, Ethereum, Solana, Aptos and Stellar. Same workflow on every network, without six tabs of docs open.
                    </p>
                    <div data-hero="4" className="mt-9 flex flex-wrap items-center justify-center gap-3">
                        <Link
                            href="/signup"
                            className="h-11 px-5 inline-flex items-center gap-2 rounded-[10px] bg-inverse text-on-inverse text-sm font-medium hover:opacity-90 transition-opacity shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                        >
                            Start building free <ArrowRight size={15} />
                        </Link>
                        <Link
                            href="/docs"
                            className="h-11 px-5 inline-flex items-center gap-2 rounded-[10px] border border-line-strong bg-surface text-sm font-medium text-fg hover:bg-hover transition-colors"
                        >
                            Read the docs
                        </Link>
                    </div>

                    <div data-hero="5" className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[14px] text-fg-muted">
                        {DEMO.map((c) => (
                            <span key={c.id} className="inline-flex items-center gap-2">
                                <span className={`inline-flex ${c.Icon === NetworkAptos || c.Icon === NetworkStellar ? "dark:invert" : ""}`}><c.Icon size={18} variant="branded" /></span>
                                {c.label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Product mock */}
                <div className="relative w-full px-3 md:px-10 2xl:px-16 mt-14 md:mt-16" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
                    <div data-hero="6" data-hero-kind="stage" className="relative rounded-[18px] border border-line bg-canvas p-1.5 md:p-2 shadow-pop">
                        <div className="rounded-[14px] border border-line bg-surface overflow-hidden">
                            <ProductMock chain={chain} phase={phase} active={active} onPick={(i) => setActive(i)} />
                        </div>
                    </div>
                    <div className="absolute inset-x-0 -bottom-px h-40 bg-gradient-to-t from-canvas to-transparent pointer-events-none" aria-hidden />
                </div>
            </section>

            {/* Workflow */}
            <section className="w-full px-5 md:px-10 2xl:px-16 mt-24 md:mt-32">
                <SectionHeading
                    eyebrow="The workflow"
                    title="Build it. See what happens. Then sign."
                    body="Every chain gets the same three steps, with each chain's own native tooling underneath."
                />
                <div data-reveal className="mt-12 grid grid-cols-1 md:grid-cols-3 border border-line rounded-[16px] overflow-hidden divide-y md:divide-y-0 md:divide-x divide-line bg-surface">
                    {[
                        {
                            n: '01',
                            icon: Zap,
                            title: 'Build',
                            body: 'Method autocomplete, parameter templates, ABI decoding and per-chain transaction builders. Import a cURL and keep going.',
                            visual: (
                                <div className="font-mono text-[13px] space-y-1.5">
                                    <div className="flex items-center gap-2 h-8 px-2.5 rounded-[7px] border border-line bg-sunken">
                                        <Search size={12} className="text-fg-subtle" />
                                        <span className="text-fg">eth_get</span>
                                        <span className="w-px h-3.5 bg-fg animate-pulse" />
                                    </div>
                                    {['eth_getBalance', 'eth_getBlockByNumber', 'eth_getLogs'].map((m, i) => (
                                        <div key={m} className={cx('h-7 px-2.5 flex items-center rounded-[6px]', i === 0 ? 'bg-active text-fg' : 'text-fg-subtle')}>
                                            {m}
                                        </div>
                                    ))}
                                </div>
                            ),
                        },
                        {
                            n: '02',
                            icon: Activity,
                            title: 'Simulate',
                            body: "A native dry run on each chain before anything is signed: fee, balance changes, touched objects and events in one review.",
                            visual: (
                                <div className="space-y-2 text-xs">
                                    {[
                                        ['Estimated fee', '0.00213 SUI'],
                                        ['Balance change', '−12.5000 SUI'],
                                        ['Objects touched', '4'],
                                    ].map(([k, v]) => (
                                        <div key={k} className="flex items-center justify-between h-7 px-2.5 rounded-[6px] bg-sunken border border-line">
                                            <span className="text-fg-subtle">{k}</span>
                                            <span className="font-mono text-fg">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            ),
                        },
                        {
                            n: '03',
                            icon: ShieldCheck,
                            title: 'Sign & run',
                            body: 'Sign with the wallet for that chain, including Ledger. Mainnet gets an explicit warning before real funds move.',
                            visual: (
                                <div className="rounded-[8px] border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs">
                                    <div className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Mainnet transaction
                                    </div>
                                    <p className="mt-1.5 text-fg-muted leading-relaxed">This moves real funds. Review the simulation, then sign.</p>
                                    <div className="mt-3 flex gap-2">
                                        <span className="h-7 px-2.5 inline-flex items-center rounded-[6px] border border-line text-fg-muted">Cancel</span>
                                        <span className="h-7 px-2.5 inline-flex items-center rounded-[6px] bg-inverse text-on-inverse">Sign</span>
                                    </div>
                                </div>
                            ),
                        },
                    ].map((s) => (
                        <div key={s.n} className="p-6 md:p-8 flex flex-col">
                            <div className="flex items-center justify-between">
                                <span className="h-9 w-9 rounded-[9px] border border-line bg-sunken flex items-center justify-center text-fg-muted">
                                    <s.icon size={16} />
                                </span>
                                <span className="font-mono text-xs text-fg-subtle">{s.n}</span>
                            </div>
                            <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em]">{s.title}</h3>
                            <p className="mt-2 text-[14px] text-fg-muted leading-relaxed">{s.body}</p>
                            <div className="mt-6 pt-6 border-t border-dashed border-line">{s.visual}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Bento */}
            <section className="w-full px-5 md:px-10 2xl:px-16 mt-24 md:mt-32">
                <SectionHeading eyebrow="Everything in one place" title="The whole job, not just the RPC call." />
                <div data-reveal-group className="mt-12 grid grid-cols-1 md:grid-cols-6 gap-3">
                    <Bento className="md:col-span-4" icon={Layers} title="Transaction builders for each chain" body="Sui Move calls and PTBs, EVM contract calls from an ABI or raw calldata, Solana instructions, Aptos entry functions and Soroban contract calls. Chain-native features only appear where the chain supports them.">
                        <div className="mt-6 flex flex-wrap gap-2">
                            {['Move call', 'PTB', 'ABI call', 'Calldata', 'Instruction', 'Entry function', 'Soroban invoke'].map((t) => (
                                <span key={t} className="h-7 px-2.5 inline-flex items-center rounded-[7px] border border-line bg-sunken text-xs font-mono text-fg-muted">
                                    {t}
                                </span>
                            ))}
                        </div>
                    </Bento>
                    <Bento className="md:col-span-2" icon={FolderKanban} title="Collections & runner" body="Group requests into folders, add assertions and hooks, and run a whole collection in order." />
                    <Bento className="md:col-span-2" icon={Repeat} title="Swap & bridge" body="Quotes and orders through LI.FI with SideShift as fallback, plus resumable swaps and off-ramp quotes." />
                    <Bento className="md:col-span-2" icon={Users} title="Team workspaces" body="Shared collections, environments and comments, with roles for owners, editors and viewers." />
                    <Bento className="md:col-span-2" icon={ShieldCheck} title="Approvals manager" body="See and revoke EVM token approvals. Unlimited approve and setApprovalForAll get flagged before you sign." />
                </div>
            </section>

            {/* Chain matrix */}
            <section className="w-full px-5 md:px-10 2xl:px-16 mt-24 md:mt-32">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-16 items-start">
                    <SectionHeading
                        eyebrow="Chain support"
                        title="Native semantics on every chain."
                        body="Txio speaks each chain's own transaction format and dry run. Where a chain's simulation doesn't report something, Txio hides it instead of guessing."
                    />
                    <div data-reveal className="rounded-[16px] border border-line bg-surface overflow-hidden">
                        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1.2fr)] text-xs text-fg-subtle border-b border-line bg-sunken">
                            <div className="px-4 h-10 flex items-center">Chain</div>
                            <div className="px-4 h-10 flex items-center">JSON-RPC</div>
                            <div className="px-4 h-10 flex items-center">Transactions</div>
                            <div className="px-4 h-10 hidden sm:flex items-center">Dry run</div>
                        </div>
                        {CAPABILITIES.map((c) => (
                            <div key={c.chain} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1.2fr)] border-b border-line last:border-0 text-[14px]">
                                <div className="px-4 py-3.5 flex items-center gap-2.5 font-medium">
                                    <span className={`inline-flex ${c.Icon === NetworkAptos || c.Icon === NetworkStellar ? "dark:invert" : ""}`}><c.Icon size={18} variant="branded" /></span>
                                    <span className="truncate">{c.chain}</span>
                                </div>
                                <div className="px-4 py-3.5 flex items-center">
                                    <Check size={15} className="text-emerald-500" />
                                </div>
                                <div className="px-4 py-3.5 text-fg-muted text-xs flex items-center">{c.tx}</div>
                                <div className="px-4 py-3.5 font-mono text-[12px] text-fg-muted hidden sm:flex items-center">{c.sim}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Surfaces */}
            <section className="w-full px-5 md:px-10 2xl:px-16 mt-24 md:mt-32">
                <SectionHeading eyebrow="Wherever you work" title="Web, desktop and terminal." body="One account and one set of collections across all three." />
                <div data-reveal-group className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Surface
                        icon={Search}
                        title="Web"
                        body="The full console in your browser, with extension wallets."
                        cta={{ label: 'Open the app', href: '/signup' }}
                    />
                    <Surface
                        icon={Monitor}
                        title="Desktop"
                        body="A native Rust app for Linux, macOS and Windows that updates itself."
                        cta={{ label: 'Download', href: DESKTOP_DOWNLOAD_URL, external: true }}
                    />
                    <Surface
                        icon={Terminal}
                        title="CLI"
                        body="Run the same calls from your shell and CI pipelines."
                        cta={{ label: 'View on GitHub', href: 'https://github.com/Txio-labs/txio-cli', external: true }}
                    >
                        <div className="mt-5 rounded-[8px] border border-line bg-sunken px-3 h-9 flex items-center font-mono text-xs text-fg-muted overflow-hidden whitespace-nowrap">
                            <span className="text-fg-subtle mr-2">$</span>txio --network testnet sui balance alice.sui
                        </div>
                    </Surface>
                </div>
            </section>

            <CtaBand />
        </MarketingShell>
    );
};

function Bento({
    icon: Icon,
    title,
    body,
    className,
    children,
}: {
    icon: React.ComponentType<{ size?: number }>;
    title: string;
    body: string;
    className?: string;
    children?: React.ReactNode;
}) {
    return (
        <div className={cx('rounded-[16px] border border-line bg-surface p-6 md:p-7', className)}>
            <span className="h-9 w-9 rounded-[9px] border border-line bg-sunken flex items-center justify-center text-fg-muted">
                <Icon size={16} />
            </span>
            <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">{title}</h3>
            <p className="mt-2 text-[14px] text-fg-muted leading-relaxed max-w-xl">{body}</p>
            {children}
        </div>
    );
}

function Surface({
    icon: Icon,
    title,
    body,
    cta,
    children,
}: {
    icon: React.ComponentType<{ size?: number }>;
    title: string;
    body: string;
    cta: { label: string; href: string; external?: boolean };
    children?: React.ReactNode;
}) {
    const cls = 'mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-fg hover:opacity-70 transition-opacity';
    return (
        <div className="rounded-[16px] border border-line bg-surface p-6 md:p-7 flex flex-col">
            <span className="h-9 w-9 rounded-[9px] border border-line bg-sunken flex items-center justify-center text-fg-muted">
                <Icon size={16} />
            </span>
            <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">{title}</h3>
            <p className="mt-2 text-[14px] text-fg-muted leading-relaxed">{body}</p>
            {children}
            <div className="flex-1" />
            {cta.external ? (
                <a href={cta.href} target="_blank" rel="noreferrer" className={cls}>
                    {cta.label} <ArrowUpRight size={13} />
                </a>
            ) : (
                <Link href={cta.href} className={cls}>
                    {cta.label} <ArrowRight size={13} />
                </Link>
            )}
        </div>
    );
}

/** A static, HTML-built picture of the console used in the hero. */
function ProductMock({ chain, phase, active, onPick }: { chain: DemoChain; phase: 'sending' | 'done'; active: number; onPick: (i: number) => void }) {
    return (
        <div className="flex h-[420px] md:h-[440px] text-left">
            {/* Sidebar */}
            <div className="hidden md:flex w-[200px] shrink-0 flex-col border-r border-line bg-canvas p-2.5 gap-0.5 text-[13px]">
                <div className="flex items-center gap-2 h-9 px-1.5 mb-1">
                    <span className="h-6 w-6 rounded-[6px] bg-active" />
                    <span className="font-semibold text-fg">Protocol team</span>
                </div>
                <div className="h-7 px-2 mb-2 rounded-[6px] border border-line bg-surface flex items-center gap-2 text-fg-subtle">
                    <Search size={11} /> Search…
                </div>
                <div className="px-2 h-6 flex items-center text-[12px] text-fg-subtle">Build</div>
                {[
                    ['Overview', Activity],
                    ['Requests', Zap],
                    ['Collections', FolderKanban],
                    ['History', Repeat],
                ].map(([label, I], i) => {
                    const Icon = I as React.ComponentType<{ size?: number }>;
                    return (
                        <div key={label as string} className={cx('h-7 px-2 rounded-[6px] flex items-center gap-2', i === 1 ? 'bg-active text-fg font-medium' : 'text-fg-muted')}>
                            <Icon size={12} />
                            {label as string}
                        </div>
                    );
                })}
                <div className="px-2 h-6 mt-2 flex items-center text-[12px] text-fg-subtle">Chains</div>
                {DEMO.map((c, i) => (
                    <button
                        key={c.id}
                        onClick={() => onPick(i)}
                        className={cx('h-7 px-2 rounded-[6px] flex items-center gap-2 transition-colors', i === active ? 'bg-hover text-fg' : 'text-fg-muted hover:text-fg')}
                    >
                        <span className={`inline-flex ${c.Icon === NetworkAptos || c.Icon === NetworkStellar ? "dark:invert" : ""}`}><c.Icon size={13} variant="branded" /></span>
                        {c.label}
                        {i === active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                    </button>
                ))}
            </div>

            {/* Editor */}
            <div className="flex-1 min-w-0 flex flex-col">
                <div className="h-10 flex items-center gap-1 px-2 border-b border-line bg-sunken/60">
                    {DEMO.map((c, i) => (
                        <button
                            key={c.id}
                            onClick={() => onPick(i)}
                            className={cx(
                                'h-7 px-2.5 rounded-[6px] flex items-center gap-1.5 text-[13px] transition-colors',
                                i === active ? 'bg-surface border border-line text-fg' : 'text-fg-subtle hover:text-fg border border-transparent'
                            )}
                        >
                            <span className={`inline-flex ${c.Icon === NetworkAptos || c.Icon === NetworkStellar ? "dark:invert" : ""}`}><c.Icon size={12} variant="branded" /></span>
                            <span className="hidden sm:inline">{c.label}</span>
                        </button>
                    ))}
                </div>

                <div className="p-3 md:p-4 flex flex-wrap md:flex-nowrap items-center gap-2 border-b border-line">
                    <span className="h-8 px-2.5 rounded-[7px] border border-line bg-hover text-[13px] flex items-center gap-1.5 text-fg">
                        <Terminal size={12} /> RPC
                    </span>
                    <div className="flex-1 min-w-0 h-8 rounded-[7px] border border-line bg-sunken flex items-center text-[13px] overflow-hidden">
                        <span className="h-full px-2.5 flex items-center gap-1.5 border-r border-line text-fg">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Mainnet
                        </span>
                        <span className="px-2.5 font-mono text-fg-muted truncate">https://{chain.endpoint}</span>
                    </div>
                    <span className="h-8 pl-3 pr-2.5 rounded-[7px] bg-inverse text-on-inverse text-[13px] font-medium flex items-center gap-1.5">
                        <Play size={11} fill="currentColor" /> Send
                    </span>
                </div>

                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
                    <div className="p-4 md:p-5 border-b lg:border-b-0 lg:border-r border-line">
                        <div className="text-[12px] text-fg-subtle">Method</div>
                        <div className="mt-1.5 h-9 px-3 rounded-[8px] border border-line bg-sunken flex items-center font-mono text-[13px] text-fg">{chain.method}</div>
                        <div className="mt-4 text-[12px] text-fg-subtle">Params</div>
                        <div className="mt-1.5 rounded-[8px] border border-line bg-sunken p-3 font-mono text-[13px] text-fg-muted leading-relaxed break-all">{chain.params}</div>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                            <span className="h-6 px-2 inline-flex items-center gap-1 rounded-[6px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[12px]">
                                <ShieldCheck size={11} /> Read-only
                            </span>
                            <span className="h-6 px-2 inline-flex items-center rounded-[6px] bg-hover text-fg-muted text-[12px]">No wallet required</span>
                        </div>
                    </div>
                    <div className="p-4 md:p-5 bg-sunken/50 hidden sm:block">
                        <div className="flex items-center justify-between">
                            <div className="text-[12px] text-fg-subtle">Response</div>
                            {phase === 'done' ? (
                                <div className="flex items-center gap-2 text-[12px] font-mono">
                                    <span className="h-5 px-1.5 inline-flex items-center gap-1 rounded-[5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-current" />200
                                    </span>
                                    <span className="text-fg-muted">{chain.ms}ms</span>
                                </div>
                            ) : (
                                <span className="text-[12px] text-fg-subtle flex items-center gap-1.5">
                                    <Minus size={11} className="animate-pulse" /> sending
                                </span>
                            )}
                        </div>
                        <div className="mt-2 rounded-[8px] border border-line bg-surface p-3 font-mono text-[13px] leading-[1.8] min-h-[150px]">
                            {phase === 'done' ? (
                                <div className="animate-in fade-in">
                                    <div className="text-fg-subtle">{'{'}</div>
                                    {chain.result.map((line) => (
                                        <div key={line} className="pl-4 text-fg">
                                            {line}
                                        </div>
                                    ))}
                                    <div className="text-fg-subtle">{'}'}</div>
                                </div>
                            ) : (
                                <div className="space-y-2.5 pt-1">
                                    {[70, 85, 55].map((w) => (
                                        <div key={w} className="h-3 rounded bg-hover animate-pulse" style={{ width: `${w}%` }} />
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="mt-4 rounded-[8px] border border-line bg-surface p-3 font-mono text-[12px] text-fg-muted space-y-1">
                            <div>
                                <span className="text-fg-subtle">$</span> POST {chain.method}
                            </div>
                            {phase === 'done' && <div className="text-emerald-600 dark:text-emerald-400 animate-in fade-in">✓ completed in {chain.ms}ms</div>}
                        </div>
                    </div>
                </div>
                <div className="h-7 border-t border-line px-3 flex items-center gap-3 text-[12px] text-fg-subtle">
                    <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
                    </span>
                    <span>Terminal</span>
                    <span className="ml-auto">Commands ⌘K</span>
                </div>
            </div>
        </div>
    );
}

