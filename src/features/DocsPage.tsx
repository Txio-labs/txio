import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Search, ExternalLink, Copy, Check, Menu, X, Shield, LifeBuoy,
} from 'lucide-react';
import { Github } from '@/components/icons/BrandIcons';
import { appStore, useAppStore } from '@/lib/store';
import logo from '../assets/txio2.png';

interface DocsPageProps {
    embedded?: boolean;
}

// The docs describe the deployed API contract, not whichever backend the
// reader's local .env happens to point at — so this is a fixed constant,
// not the env-dependent API_BASE from services/api.
const DOCS_API_BASE = 'https://txio-oyac.onrender.com/api/v1';

type Method = 'GET' | 'POST';

// Method badge colors are semantic/brand accents, not themed light/dark.
const METHOD_STYLE: Record<Method, string> = {
    GET: 'text-[#5b9dff] bg-[#5b9dff]/10',
    POST: 'text-[#3ecf8e] bg-[#3ecf8e]/10',
};

interface NavItem {
    id: string;
    label: string;
    method?: Method;
}
interface NavGroup {
    title: string;
    items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
    {
        title: 'Get started',
        items: [
            { id: 'overview', label: 'Overview' },
            { id: 'quickstart', label: 'Quickstart' },
            { id: 'architecture', label: 'Architecture' },
            { id: 'auth', label: 'Authentication' },
        ],
    },
    {
        title: 'CLI reference',
        items: [
            { id: 'cli-reference', label: 'Command grammar' },
            { id: 'cli-chains', label: 'Per-chain commands' },
            { id: 'cli-flags', label: 'Global flags' },
            { id: 'cli-new', label: 'New in v0.9' },
        ],
    },
    {
        title: 'API reference',
        items: [
            { id: 'api-reference', label: 'Base URL & envelope' },
            { id: 'ep-login', label: '/auth/login', method: 'POST' },
            { id: 'ep-rpc', label: '/rpc/:chain/call', method: 'POST' },
            { id: 'ep-resolve', label: '/resolve', method: 'GET' },
            { id: 'ep-collections', label: '/collections', method: 'GET' },
            { id: 'ep-portfolio', label: '/portfolio', method: 'GET' },
            { id: 'errors', label: 'Error codes' },
        ],
    },
    {
        title: 'Guides',
        items: [
            { id: 'guide-resolution', label: 'Name resolution' },
            { id: 'guide-ai', label: 'AI console' },
            { id: 'guide-ptb', label: 'PTB builder' },
            { id: 'guide-collections', label: 'Collections & contexts' },
        ],
    },
    {
        title: 'Project status',
        items: [
            { id: 'security-status', label: 'Security & hardening' },
            { id: 'deprecations', label: 'Deprecated / removed' },
            { id: 'changelog', label: 'Changelog' },
        ],
    },
];

const HERO_LINES: Array<[string, string]> = [
    ['txio sui balance aliphatic.sui', '→ 128.4402 SUI'],
    ['txio --network testnet eth balance 0x1a2...9f', '→ 2.0031 ETH'],
    ['txio portfolio', '→ sui 128.44 · eth 2.00 · sol 44.12 · apt 9.80 · xlm 500.0'],
];

function CodeBlock({ label, code }: { label: string; code: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(code);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="my-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#12151b]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-3.5 py-2 font-mono text-[11px] text-slate-400 dark:border-white/10 dark:bg-[#171b22] dark:text-[#5c6472]">
                <span>{label}</span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-slate-400 transition-colors hover:text-electric-violet dark:text-[#5c6472]"
                >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'copied' : 'copy'}
                </button>
            </div>
            <pre className="m-0 overflow-x-auto p-4 font-mono text-[13px] leading-[1.7] text-slate-700 dark:text-[#d6dae0]">{code}</pre>
        </div>
    );
}

function DocsTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
    return (
        <div className="my-4 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-[13.5px]">
                <thead>
                    <tr>
                        {head.map((h) => (
                            <th
                                key={h}
                                className="border-b border-slate-200 px-3 py-2 text-left font-mono text-[10.5px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:text-[#5c6472]"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i}>
                            {row.map((cell, j) => (
                                <td key={j} className="border-b border-slate-200 px-3 py-2.5 align-top text-slate-600 last:border-b-0 dark:border-white/10 dark:text-[#c4c9d1]">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Callout({ tone, children }: { tone: 'warn' | 'info' | 'note'; children: React.ReactNode }) {
    // Callout tones are semantic accent colors — left as-is across themes.
    const styles: Record<typeof tone, string> = {
        warn: 'bg-[#f0654d]/[0.06] border-[#f0654d] text-[#b8402a] dark:text-[#f3a99b]',
        info: 'bg-[#5b9dff]/[0.06] border-[#5b9dff] text-[#2f6fd1] dark:text-[#a9c6ff]',
        note: 'bg-electric-violet/[0.06] border-electric-violet text-[#52525b] dark:text-[#d4d4d8]',
    };
    return <div className={`my-4 rounded-lg border-l-[3px] px-4 py-3.5 text-[13.5px] leading-relaxed ${styles[tone]}`}>{children}</div>;
}

function Endpoint({ method, path, id, children }: { method: Method; path: string; id: string; children: React.ReactNode }) {
    return (
        <div id={id} className="mt-9 scroll-mt-20">
            <div className="mb-2 flex items-center gap-2.5">
                <span className={`rounded px-2.5 py-1 font-mono text-[11px] font-bold ${METHOD_STYLE[method]}`}>{method}</span>
                <span className="font-mono text-sm text-slate-900 dark:text-[#e6e8eb]">{path}</span>
            </div>
            {children}
        </div>
    );
}

function H2({ id, children }: { id?: string; children: React.ReactNode }) {
    return <h2 id={id} className="mb-3.5 mt-10 scroll-mt-20 text-[22px] font-bold tracking-tight text-slate-900 first:mt-0 dark:text-[#e6e8eb]">{children}</h2>;
}

function H3({ id, children }: { id?: string; children: React.ReactNode }) {
    return <h3 id={id} className="mb-2.5 mt-7 scroll-mt-20 text-base font-bold text-slate-900 dark:text-[#e6e8eb]">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
    return <p className="mb-4 leading-relaxed text-slate-600 dark:text-[#c4c9d1]">{children}</p>;
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
    return (
        <section id={id} className="scroll-mt-20 border-b border-slate-200 pb-14 last:border-b-0 dark:border-white/10">
            {children}
        </section>
    );
}

export const DocsPage: React.FC<DocsPageProps> = ({ embedded = false }) => {
    const { theme } = useAppStore();
    const [activeSection, setActiveSection] = useState('overview');
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const scrollRef = useRef<HTMLElement>(null);
    const router = useRouter();

    const navigateTo = (target: 'landing' | 'signup') => {
        if (embedded) {
            if (target === 'landing') {
                appStore.setActiveTab(null);
                return;
            }
            appStore.openTab('new_request');
            return;
        }
        router.push(target === 'landing' ? '/' : '/signup');
    };

    const scrollToSection = (id: string) => {
        setMobileNavOpen(false);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Placeholder — not wired to a real support destination yet.
    const contactSupport = () => {
        console.log('Contact support clicked — no destination wired up yet.');
    };

    useEffect(() => {
        const root = scrollRef.current;
        if (!root) return;
        const ids = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));
        const targets = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((entry) => entry.isIntersecting);
                if (visible.length === 0) return;
                const topmost = visible.reduce((a, b) =>
                    a.boundingClientRect.top < b.boundingClientRect.top ? a : b
                );
                setActiveSection(topmost.target.id);
            },
            { root, rootMargin: '-15% 0px -70% 0px' }
        );
        targets.forEach((t) => observer.observe(t));
        return () => observer.disconnect();
    }, []);

    const [lineIndex, setLineIndex] = useState(0);
    const [typedChars, setTypedChars] = useState(0);
    const [showOutput, setShowOutput] = useState(false);

    useEffect(() => {
        const [cmd] = HERO_LINES[lineIndex % HERO_LINES.length];
        if (typedChars < cmd.length) {
            const t = setTimeout(() => setTypedChars((c) => c + 1), 28);
            return () => clearTimeout(t);
        }
        if (!showOutput) {
            const t = setTimeout(() => setShowOutput(true), 200);
            return () => clearTimeout(t);
        }
        const t = setTimeout(() => {
            setShowOutput(false);
            setTypedChars(0);
            setLineIndex((i) => i + 1);
        }, 1600);
        return () => clearTimeout(t);
    }, [typedChars, showOutput, lineIndex]);

    const [cmd, out] = HERO_LINES[lineIndex % HERO_LINES.length];

    const renderNav = () => (
        <div className="space-y-7">
            {NAV_GROUPS.map((group) => (
                <div key={group.title}>
                    <div className="mb-2 px-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-400 dark:text-[#5c6472]">{group.title}</div>
                    <div className="space-y-0.5">
                        {group.items.map((item) => {
                            const active = activeSection === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => scrollToSection(item.id)}
                                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13.5px] transition-colors ${
                                        active
                                            ? 'bg-slate-100 font-semibold text-electric-violet shadow-[inset_2px_0_0_0_#a3a3a3] dark:bg-white/[0.04]'
                                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-[#8b93a1] dark:hover:bg-white/[0.03] dark:hover:text-[#e6e8eb]'
                                    }`}
                                >
                                    <span className="truncate">{item.label}</span>
                                    {item.method && (
                                        <span className={`ml-auto shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] tracking-wide ${METHOD_STYLE[item.method]}`}>
                                            {item.method}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );

    // "On this page" — flat list of top-level nav group titles, reusing the
    // existing NAV_GROUPS data rather than inventing new content.
    const renderToc = () => (
        <div className="space-y-6">
            <div>
                <div className="mb-3 px-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-400 dark:text-[#5c6472]">On this page</div>
                <div className="space-y-0.5">
                    {NAV_GROUPS.map((group) => {
                        const active = group.items.some((item) => item.id === activeSection);
                        return (
                            <button
                                key={group.title}
                                type="button"
                                onClick={() => scrollToSection(group.items[0].id)}
                                className={`block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                                    active
                                        ? 'font-semibold text-electric-violet'
                                        : 'text-slate-500 hover:text-slate-900 dark:text-[#8b93a1] dark:hover:text-[#e6e8eb]'
                                }`}
                            >
                                {group.title}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#12151b]">
                <div className="mb-2 flex items-center gap-2 text-slate-700 dark:text-[#e6e8eb]">
                    <LifeBuoy size={16} className="text-electric-violet" />
                    <span className="text-[13px] font-bold">Need Help?</span>
                </div>
                <p className="mb-3.5 text-[12.5px] leading-relaxed text-slate-500 dark:text-[#8b93a1]">
                    Check our quick start guide or reach out to our support team.
                </p>
                <div className="space-y-2">
                    <button
                        type="button"
                        onClick={() => scrollToSection('quickstart')}
                        className="w-full rounded-md bg-slate-900 dark:bg-white px-3 py-1.5 text-[12px] font-bold text-white dark:text-near-black transition-opacity hover:opacity-90 active:scale-95"
                    >
                        View Quick Start
                    </button>
                    <button
                        type="button"
                        onClick={contactSupport}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-[12px] font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-[#8b93a1] dark:hover:bg-white/[0.03]"
                    >
                        Contact Support
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`${embedded ? 'h-full' : 'h-screen'} overflow-hidden bg-white font-sans text-slate-900 selection:bg-electric-violet/25 dark:bg-[#0a0c10] dark:text-[#e6e8eb]`}>
            <div className={`${embedded ? 'sticky top-0' : 'fixed left-0 right-0 top-0'} z-50 flex h-14 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md dark:border-white/10 dark:bg-[#0a0c10]/90 md:px-6`}>
                <button
                    type="button"
                    onClick={() => navigateTo('landing')}
                    className="flex shrink-0 items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-900 dark:text-[#8b93a1] dark:hover:text-white"
                >
                    <ArrowLeft size={16} />
                    <span className="hidden sm:inline">Home</span>
                </button>
                <div className="h-5 w-px bg-slate-200 dark:bg-white/10" />
                <div className="flex shrink-0 items-center gap-2 font-mono text-[15px] font-semibold">
                    <span className="h-2 w-2 rounded-full bg-electric-violet shadow-[0_0_8px_#a3a3a3]" />
                    <img src={logo.src} alt="txio" className="h-5 w-auto" />
                    <span className="text-slate-400 dark:text-[#5c6472]">/ docs</span>
                </div>

                <div className="hidden max-w-[420px] flex-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[12.5px] text-slate-400 dark:border-white/10 dark:bg-[#12151b] dark:text-[#5c6472] md:flex">
                    <Search size={13} />
                    <span>Search chains, commands, endpoints…</span>
                </div>

                <nav className="ml-auto hidden items-center gap-5 text-[13px] text-slate-500 dark:text-[#8b93a1] lg:flex">
                    <button type="button" onClick={() => scrollToSection('overview')} className="hover:text-electric-violet">Guide</button>
                    <button type="button" onClick={() => scrollToSection('cli-reference')} className="hover:text-electric-violet">CLI</button>
                    <button type="button" onClick={() => scrollToSection('api-reference')} className="hover:text-electric-violet">API</button>
                    <a href="https://github.com/Txio-labs/txio" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-electric-violet">
                        <Github size={14} /> Repo <ExternalLink size={11} />
                    </a>
                </nav>

                <button
                    type="button"
                    onClick={() => setMobileNavOpen((v) => !v)}
                    className="ml-auto text-slate-500 hover:text-slate-900 dark:text-[#8b93a1] dark:hover:text-white lg:hidden"
                >
                    {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                <button
                    type="button"
                    onClick={() => navigateTo('signup')}
                    className="hidden shrink-0 rounded-md bg-slate-900 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-electric-violet active:scale-95 dark:bg-white dark:text-near-black dark:hover:text-white sm:block"
                >
                    {embedded ? 'New request' : 'Launch'}
                </button>
            </div>

            {mobileNavOpen && (
                <div className="fixed inset-0 z-40 bg-white/95 pt-14 dark:bg-[#0a0c10]/95 lg:hidden">
                    <div className="h-full overflow-y-auto px-6 py-8">{renderNav()}</div>
                </div>
            )}

            <div className={`flex w-full ${embedded ? 'h-[calc(100%-3.5rem)]' : 'h-screen pt-14'}`}>
                <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-slate-200 px-3.5 py-6 dark:border-white/10 lg:block">
                    {renderNav()}
                </aside>

                <main ref={scrollRef} className="flex-1 overflow-y-auto">
                    <div className="w-full px-6 py-10 md:px-12 xl:px-16">
                        <Section id="overview">
                            <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-electric-violet">Introduction</div>
                            <h1 className="mb-3.5 text-[32px] font-bold tracking-tight text-slate-900 dark:text-white">One terminal, every chain</h1>
                            <p className="mb-6 text-[17px] leading-relaxed text-slate-500 dark:text-[#8b93a1]">
                                txio is a multi-chain developer toolkit: a single CLI, a single backend, and a single command grammar
                                for Sui, Ethereum, Solana, Aptos, and Soroban. This is the reference documentation for the CLI, the
                                REST API behind it, and the dashboard.
                            </p>

                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="my-6 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#12151b]"
                            >
                                <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3.5 py-2.5 dark:border-white/10 dark:bg-[#171b22]">
                                    <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-white/15" />
                                    <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-white/15" />
                                    <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-white/15" />
                                    <span className="ml-3 font-mono text-[11px] text-slate-400 dark:text-[#5c6472]">~/txio</span>
                                </div>
                                <pre className="m-0 min-h-[110px] p-5 font-mono text-[13.5px] leading-[1.9]">
                                    <span className="text-emerald-600 dark:text-[#3ecf8e]">$ </span>
                                    <span className="text-slate-900 dark:text-[#e6e8eb]">{cmd.slice(0, typedChars)}</span>
                                    {typedChars < cmd.length && <span className="ml-0.5 inline-block h-[14px] w-[7px] animate-pulse bg-electric-violet align-[-2px]" />}
                                    {showOutput && <div className="mt-1 text-slate-500 dark:text-[#8b93a1]">{out}</div>}
                                </pre>
                            </motion.div>

                            <div className="mb-2 flex flex-wrap gap-2">
                                {[
                                    { name: 'Sui', dot: 'bg-[#6fbcf0]' },
                                    { name: 'Ethereum', dot: 'bg-[#a5a8f7]' },
                                    { name: 'Solana', dot: 'bg-[#14f195]' },
                                    { name: 'Aptos', dot: 'bg-[#2ed3b7]' },
                                    { name: 'Soroban', dot: 'bg-[#f5d060]' },
                                ].map((chain) => (
                                    <span key={chain.name} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 font-mono text-[11.5px] text-slate-500 dark:border-white/10 dark:text-[#8b93a1]">
                                        <span className={`h-1.5 w-1.5 rounded-full ${chain.dot}`} />
                                        {chain.name}
                                    </span>
                                ))}
                            </div>

                            <Callout tone="warn">
                                <strong className="text-[#7a2e1c] dark:text-[#e6e8eb]">Before you deploy this anywhere but localhost:</strong> the backend
                                has two open critical vulnerabilities — unauthenticated user-management endpoints and an
                                unauthenticated remote-execution path. See{' '}
                                <button type="button" onClick={() => scrollToSection('security-status')} className="text-electric-violet underline">
                                    Security &amp; hardening
                                </button>
                                . Do not expose a production deployment to an untrusted network until these are closed.
                            </Callout>
                        </Section>

                        <Section id="quickstart">
                            <H2>Quickstart</H2>
                            <P>Bring up the full stack locally with Docker, then point the CLI at it.</P>
                            <CodeBlock
                                label="bash"
                                code={`# 1. configure the backend
cp .env.example backend/api/.env
# set MONGO_INITDB_ROOT_USERNAME/PASSWORD, JWT_SECRET (32+ chars),
# BREVO_API_KEY, and your chosen AI provider key

# 2. start backend + dashboard + MongoDB
docker-compose up -d

# 3. authenticate the CLI
cd cli && cargo run -- login

# 4. make a call
cargo run -- sui balance aliphatic.sui`}
                            />
                            <DocsTable
                                head={['Requirement', 'Version']}
                                rows={[
                                    ['Rust toolchain', 'pinned via rust-toolchain.toml'],
                                    ['Node.js', '20+'],
                                    ['Docker / Compose', 'any recent release'],
                                ]}
                            />
                        </Section>

                        <Section id="architecture">
                            <H2>Architecture</H2>
                            <P>
                                Five components share one backend. The CLI and dashboard are both clients of the same API; the ops
                                bot is internal-only and never touches user data.
                            </P>
                            <DocsTable
                                head={['Component', 'Path', 'Stack']}
                                rows={[
                                    ['CLI', 'cli/', 'Rust, Clap'],
                                    ['Backend', 'backend/api/', 'Rust, Axum, MongoDB'],
                                    ['Dashboard', 'frontend/', 'Next.js, React, Tailwind'],
                                    ['Desktop (paused)', 'desktop/', 'Electron'],
                                    ['Ops bot (internal)', 'Txio-telegram-bot/', 'Node/TypeScript'],
                                ]}
                            />
                            <P>
                                Adding a chain means implementing <code className="rounded bg-slate-100 px-1.5 py-0.5 text-electric-violet dark:bg-[#12151b]">ChainAdapter</code>{' '}
                                (call_rpc, get_balance) in one new file under cli/src/chains/ and registering it in factory.rs — no
                                changes to the parser or the other adapters.
                            </P>
                        </Section>

                        <Section id="auth">
                            <H2>Authentication</H2>
                            <P>
                                txio login runs an interactive flow and stores a JWT at ~/.txio/token. Every RPC call made while
                                logged in is attributed to your account automatically — no extra flags needed.
                            </P>
                            <Callout tone="note">
                                <strong className="text-slate-800 dark:text-[#e6e8eb]">Scoped API keys:</strong> for CI/CD and headless scripts, generate a
                                scoped key instead of reusing a personal login token — see{' '}
                                <code className="rounded bg-black/10 px-1.5 py-0.5 dark:bg-black/20">txio keys create --scope read</code>. Read-only keys
                                can call balance and call for view methods; execute-scoped keys can also submit transactions.
                            </Callout>
                            <CodeBlock
                                label="bash — interactive login"
                                code={`$ txio login
? Email: you@example.com
? Password: ••••••••••
✓ Logged in. Token stored at ~/.txio/token`}
                            />
                        </Section>

                        <Section id="cli-reference">
                            <H2>CLI reference</H2>
                            <P>Every command follows the same grammar:</P>
                            <CodeBlock label="grammar" code="txio [--network <net>] [--rpc-url <url>] <chain> <action> [args] [--pretty]" />

                            <H3 id="cli-chains">Per-chain commands</H3>
                            <DocsTable
                                head={['Command', 'Description']}
                                rows={[
                                    [<code key="1">txio sui balance &lt;address|.sui&gt;</code>, 'Balance lookup, resolves SuiNS names automatically'],
                                    [<code key="2">txio eth balance 0x...</code>, <>Ethereum balance. ENS resolution is <span className="text-slate-400 dark:text-[#5c6472]">not yet implemented</span></>],
                                    [<code key="3">txio solana balance &lt;address&gt;</code>, 'Balance in lamports/SOL'],
                                    [<code key="4">txio aptos balance &lt;address&gt;</code>, 'Balance lookup'],
                                    [<code key="5">txio soroban balance &lt;address&gt;</code>, 'Balance lookup'],
                                    [<code key="6">txio &lt;chain&gt; call --method &lt;m&gt; [--params &apos;[...]&apos;]</code>, 'Raw JSON-RPC passthrough for any chain'],
                                    [<code key="7">txio &lt;chain&gt; estimate [--method &lt;m&gt;]</code>, 'New — unified gas/fee estimate across all five chains'],
                                    [<code key="8">txio watch &lt;address&gt; --chain &lt;c&gt;</code>, 'New — stream live balance and transaction updates'],
                                    [<code key="9">txio portfolio</code>, 'New — aggregate balances for a set of addresses across all chains'],
                                    [<code key="10">txio run &lt;script.yaml&gt;</code>, "New — batch-execute a sequence of calls, CLI equivalent of the dashboard's Collection Runner"],
                                ]}
                            />

                            <H3 id="cli-flags">Global flags</H3>
                            <DocsTable
                                head={['Flag', 'Default', 'Notes']}
                                rows={[
                                    [<code key="1">--network, -n</code>, 'mainnet', "Also accepts testnet, devnet, localnet. Enum names aren't fully consistent across chains yet (tracked in #23)"],
                                    [<code key="2">--rpc-url</code>, 'public node', 'Point at your own infra or a local validator'],
                                    [<code key="3">--pretty</code>, 'off', 'Syntax-highlighted raw JSON instead of a table'],
                                ]}
                            />

                            <H3 id="cli-new">New in v0.9</H3>
                            <DocsTable
                                head={['Command', 'Purpose']}
                                rows={[
                                    [<code key="1">txio context use &lt;name&gt;</code>, 'Switch between named environments (network + keys + RPC URL) in one command, replaces the earlier ambiguous profile stub'],
                                    [<code key="2">txio keys create --scope &lt;read|execute&gt;</code>, 'Issue scoped API keys for CI/CD, separate from personal login tokens'],
                                    [<code key="3">txio adapters install &lt;crate&gt;</code>, 'Install a community ChainAdapter without rebuilding core — chains are now a plugin, not a PR'],
                                ]}
                            />

                            <Callout tone="warn">
                                <strong className="text-[#7a2e1c] dark:text-[#e6e8eb]">Removed:</strong> txio db list-users and any other command that talks
                                to MongoDB directly with database credentials. Admin actions now go through authenticated, RBAC&apos;d
                                backend endpoints — the CLI never holds DB creds. See{' '}
                                <button type="button" onClick={() => scrollToSection('deprecations')} className="text-electric-violet underline">
                                    Deprecated / removed
                                </button>
                                .
                            </Callout>
                        </Section>

                        <Section id="api-reference">
                            <H2>API reference</H2>
                            <P>
                                All endpoints below are used by both the CLI and the dashboard. Requests and responses are JSON;
                                authenticated routes expect <code className="rounded bg-slate-100 px-1.5 py-0.5 text-electric-violet dark:bg-[#12151b]">Authorization: Bearer &lt;jwt|api-key&gt;</code>.
                            </P>

                            <H3>Response envelope</H3>
                            <P>
                                Errors are always normalized to JSON-RPC 2.0-style error objects, regardless of whether the failure
                                came from txio itself or from an upstream node:
                            </P>
                            <CodeBlock
                                label="json"
                                code={`{
  "jsonrpc": "2.0",
  "error": { "code": -32000, "message": "upstream node unreachable" },
  "id": 1
}`}
                            />

                            <Endpoint id="ep-login" method="POST" path="/auth/login">
                                <P>Exchanges email/password for a JWT.</P>
                                <CodeBlock
                                    label="request"
                                    code={`curl -X POST ${DOCS_API_BASE}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"••••••••••"}'`}
                                />
                                <CodeBlock label="200 response" code={'{ "token": "eyJhbGciOi...", "expires_in": 3600 }'} />
                            </Endpoint>

                            <Endpoint id="ep-rpc" method="POST" path="/rpc/:chain/call">
                                <P>
                                    Chain-agnostic RPC passthrough. :chain is one of sui, ethereum, solana, aptos, soroban. Any .sui
                                    name found anywhere in params — including nested inside Move type tags — is resolved before the
                                    call is forwarded.
                                </P>
                                <DocsTable
                                    head={['Body field', 'Type', 'Notes']}
                                    rows={[
                                        [<code key="1">method</code>, 'string', 'Chain-native RPC method name'],
                                        [<code key="2">params</code>, 'array', 'Passed through as-is after name resolution'],
                                        [<code key="3">network</code>, 'string', 'mainnet / testnet / devnet / localnet'],
                                    ]}
                                />
                            </Endpoint>

                            <Endpoint id="ep-resolve" method="GET" path="/resolve?name=aliphatic.sui">
                                <P>Standalone name resolution, useful for pre-checking an address before building a request client-side.</P>
                                <DocsTable
                                    head={['Chain', 'Namespace', 'Status']}
                                    rows={[
                                        ['Sui', 'SuiNS (.sui)', <span key="1" className="text-[#1f9e6b] dark:text-[#3ecf8e]">Live</span>],
                                        ['Ethereum', 'ENS (.eth)', <span key="2" className="text-slate-400 dark:text-[#5c6472]">not implemented</span>],
                                        ['Aptos / Soroban', '—', <span key="3" className="text-slate-400 dark:text-[#5c6472]">roadmap</span>],
                                    ]}
                                />
                            </Endpoint>

                            <Endpoint id="ep-collections" method="GET" path="/collections">
                                <P>
                                    Lists saved request collections for the authenticated user&apos;s active workspace. Backs both the
                                    dashboard&apos;s Collections sidebar and txio run.
                                </P>
                            </Endpoint>

                            <Endpoint id="ep-portfolio" method="GET" path="/portfolio?addresses[]=...&chains[]=sui,eth">
                                <P>
                                    New endpoint backing txio portfolio — aggregates balances for one or more addresses across the
                                    requested chains in a single call, so the dashboard and CLI don&apos;t have to fan out five
                                    separate requests client-side.
                                </P>
                            </Endpoint>

                            <H3 id="errors">Error codes</H3>
                            <DocsTable
                                head={['Code', 'Meaning']}
                                rows={[
                                    [<code key="1">-32000</code>, 'Upstream node unreachable or timed out'],
                                    [<code key="2">-32001</code>, 'Name resolution failed'],
                                    [<code key="3">-32002</code>, 'Internal txio error'],
                                ]}
                            />
                        </Section>

                        <Section id="guides">
                            <H2 id="guide-resolution">Guide: Name resolution</H2>
                            <P>
                                Instead of exact-matching a name string, the resolver runs a recursive scan (
                                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-electric-violet dark:bg-[#12151b]">([a-zA-Z0-9-]+\.sui)</code>) across
                                the entire request body. This matters because developers often embed names inside Move type tags, e.g.{' '}
                                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-electric-violet dark:bg-[#12151b]">0x...::Coin&lt;names.sui&gt;</code> —
                                a flat match would miss it. Every occurrence, at any nesting depth, is resolved before the call goes out.
                            </P>

                            <H2 id="guide-ai">Guide: AI console</H2>
                            <P>
                                The AI console can manipulate your workspace via function calling — create_rpc_request opens a
                                pre-filled RPC tab, create_ptb opens a Transaction Builder — rather than just answering in a side panel.
                            </P>
                            <Callout tone="info">
                                The console runs on a single model provider. Requests to the AI proxy require an authenticated session
                                and are rate-limited per user, to prevent unthrottled cost exposure against the configured provider key.
                            </Callout>

                            <H2 id="guide-ptb">Guide: PTB builder</H2>
                            <P>
                                A node-based, infinite-canvas editor for Programmable Transaction Blocks. Current node types: Object
                                (input coins/objects), SplitCoins, and Transfer. Every builder run supports <strong className="text-slate-800 dark:text-[#e6e8eb]">Simulate</strong>,
                                which dry-runs the transaction before you commit on-chain.
                            </P>

                            <H2 id="guide-collections">Guide: Collections &amp; contexts</H2>
                            <P>
                                Collections group saved requests into folders and can be run end-to-end with the Collection Runner
                                (pass/fail per request, live progress, timing). txio context mirrors this on the CLI side: named
                                bundles of network, RPC URL, and key material you can switch between with one command, e.g.{' '}
                                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-electric-violet dark:bg-[#12151b]">txio context use staging</code>.
                            </P>
                        </Section>

                        <Section id="security-status">
                            <H2>Security &amp; hardening status</H2>
                            <P>Feature work is intentionally paused behind closing these out.</P>
                            <DocsTable
                                head={['Issue', 'Severity']}
                                rows={[
                                    ['Unauthenticated user-management endpoints (account takeover)', <span key="1" className="rounded border border-[#f0654d]/30 bg-[#f0654d]/10 px-2 py-0.5 font-mono text-[10.5px] text-[#f0654d]">critical</span>],
                                    ['Unauthenticated remote command execution (removed, see below)', <span key="2" className="rounded border border-[#f0654d]/30 bg-[#f0654d]/10 px-2 py-0.5 font-mono text-[10.5px] text-[#f0654d]">critical</span>],
                                    ['Duplicate email registration not rejected', 'high'],
                                    ['OTP flow has no rate limiting', 'high'],
                                    ['SSRF via user-controlled rpc_url on saved requests', 'high'],
                                    ['JWT stored in localStorage', 'high'],
                                    ['Backend container runs as root', 'medium'],
                                    ['OTP records have no TTL index', 'medium'],
                                ]}
                            />
                        </Section>

                        <Section id="deprecations">
                            <H2>Deprecated / removed</H2>
                            <DocsTable
                                head={['Item', 'Why']}
                                rows={[
                                    [<code key="1">/terminal/execute</code>, 'No legitimate host-exec use case in this product; removed rather than hardened'],
                                    [<code key="2">txio db list-users</code>, 'CLI holding DB credentials is itself the vulnerability; replaced by an authenticated admin API'],
                                    ['Standalone sui_cli debug binary', <>Folded into <code key="3">txio sui call --raw</code></>],
                                    ['Gemini AI console path', 'Consolidated to a single provider to remove doc/config drift'],
                                    ['Duplicate Sui SDKs in frontend', 'Consolidated to one dependency'],
                                ]}
                            />
                        </Section>

                        <Section id="changelog">
                            <H2>Changelog</H2>
                            <DocsTable
                                head={['Version', 'Notes']}
                                rows={[
                                    [<code key="1">v0.9</code>, 'Added portfolio, watch, run, context, scoped API keys, plugin adapters. Removed /terminal/execute and db list-users.'],
                                    [<code key="2">v0.8</code>, 'SuiNS recursive resolution, standardized JSON-RPC error envelope'],
                                    [<code key="3">v0.7</code>, 'Initial five-chain CLI, Collection Runner, PTB builder (Sui)'],
                                ]}
                            />
                        </Section>

                        <footer className="mt-16 flex flex-col gap-3 border-t border-slate-200 pt-8 text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:border-white/10 dark:text-[#5c6472] sm:flex-row sm:items-center sm:justify-between">
                            <span className="flex items-center gap-2 normal-case tracking-normal">
                                <Shield size={12} /> pre-1.0, actively developed
                            </span>
                            <div className="flex gap-6">
                                <a href="https://github.com/Txio-labs/txio" target="_blank" rel="noreferrer" className="hover:text-electric-violet">GitHub</a>
                                <span>© 2026 txio</span>
                            </div>
                        </footer>
                    </div>
                </main>

                <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-slate-200 px-4 py-6 dark:border-white/10 xl:block">
                    {renderToc()}
                </aside>
            </div>
        </div>
    );
};
