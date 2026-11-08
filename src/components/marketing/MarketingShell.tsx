'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Menu, X, ArrowUpRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Github } from '@/components/icons/BrandIcons';
import { cx } from '@/components/ui/primitives';
import { useMarketingMotion } from '@/lib/motion';
import { TxioLogo } from '@/components/ui/TxioMark';

export const DESKTOP_DOWNLOAD_URL = 'https://txio-labs.github.io/txio-desktop/';
export const GITHUB_URL = 'https://github.com/Txio-labs';

const NAV = [
    { href: '/features', label: 'Features' },
    { href: '/integrations', label: 'Integrations' },
    { href: '/infrastructure', label: 'Infrastructure' },
    { href: '/ecosystem', label: 'Ecosystem' },
    { href: '/partners', label: 'Partners' },
    { href: '/docs', label: 'Docs' },
];

export function Logo({ className }: { className?: string }) {
    return <TxioLogo size={24} className={className} />;
}

/**
 * Frame for the public site: sticky header, page content, footer. Inside the
 * workspace (`embedded`) the same content renders in a scroll area with no chrome.
 */
export function MarketingShell({ embedded = false, children }: { embedded?: boolean; children: React.ReactNode }) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const mainRef = useRef<HTMLElement | null>(null);
    const embeddedRef = useRef<HTMLDivElement | null>(null);
    useMarketingMotion(embedded ? embeddedRef : mainRef, { scroller: embedded ? embeddedRef : undefined, key: pathname });

    useEffect(() => {
        if (embedded) return;
        // The app shell locks body scroll; public pages scroll the document.
        document.body.style.overflow = 'auto';
        document.body.style.overflowX = 'hidden';
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            document.body.style.overflow = 'hidden';
            window.removeEventListener('scroll', onScroll);
        };
    }, [embedded]);

    if (embedded) {
        return (
            <div ref={embeddedRef} className="h-full overflow-y-auto custom-scrollbar bg-surface">
                {children}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-canvas text-fg font-sans">
            <header
                className={cx(
                    'sticky top-0 z-50 transition-[background-color,border-color] duration-200 border-b',
                    scrolled ? 'bg-canvas/80 backdrop-blur-xl border-line' : 'bg-transparent border-transparent'
                )}
            >
                <div className="w-full px-5 md:px-10 2xl:px-16 h-16 flex items-center gap-8">
                    <Link href="/" aria-label="Txio home">
                        <Logo />
                    </Link>
                    <nav className="hidden lg:flex items-center gap-1 text-[14px]">
                        {NAV.map((n) => (
                            <Link
                                key={n.href}
                                href={n.href}
                                className={cx(
                                    'px-3 h-8 inline-flex items-center rounded-[7px] transition-colors',
                                    pathname === n.href ? 'text-fg bg-hover' : 'text-fg-muted hover:text-fg'
                                )}
                            >
                                {n.label}
                            </Link>
                        ))}
                    </nav>
                    <div className="flex-1" />
                    <div className="hidden sm:flex items-center gap-2">
                        <ThemeToggle className="!p-0 h-8 w-8 inline-flex items-center justify-center" />
                        <Link
                            href="/signin"
                            className="h-8 px-3 inline-flex items-center rounded-control text-[14px] font-medium text-fg-muted hover:text-fg transition-colors"
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/signup"
                            className="h-8 pl-3.5 pr-3 inline-flex items-center gap-1.5 rounded-control bg-inverse text-on-inverse text-[14px] font-medium hover:opacity-90 transition-opacity"
                        >
                            Get started <ArrowRight size={13} />
                        </Link>
                    </div>
                    <button
                        className="lg:hidden h-8 w-8 inline-flex items-center justify-center rounded-[7px] text-fg-muted hover:bg-hover"
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        onClick={() => setMenuOpen((v) => !v)}
                    >
                        {menuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
                {menuOpen && (
                    <div className="lg:hidden border-t border-line bg-canvas px-5 py-4 space-y-1 animate-in fade-in slide-in-from-top">
                        {NAV.map((n) => (
                            <Link
                                key={n.href}
                                href={n.href}
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center justify-between h-10 px-3 rounded-[8px] text-sm text-fg hover:bg-hover"
                            >
                                {n.label}
                                <ArrowRight size={14} className="text-fg-subtle" />
                            </Link>
                        ))}
                        <div className="grid grid-cols-2 gap-2 pt-3">
                            <Link href="/signin" className="h-10 inline-flex items-center justify-center rounded-[9px] border border-line text-sm font-medium">
                                Sign in
                            </Link>
                            <Link href="/signup" className="h-10 inline-flex items-center justify-center rounded-[9px] bg-inverse text-on-inverse text-sm font-medium">
                                Get started
                            </Link>
                        </div>
                        <div className="pt-2 flex justify-end">
                            <ThemeToggle />
                        </div>
                    </div>
                )}
            </header>

            <main ref={mainRef}>{children}</main>

            <footer className="border-t border-line mt-24">
                <div className="w-full px-5 md:px-10 2xl:px-16 py-14 grid grid-cols-2 md:grid-cols-5 gap-10">
                    <div className="col-span-2">
                        <Logo />
                        <p className="mt-4 text-[14px] text-fg-muted max-w-xs leading-relaxed">
                            Build, simulate, sign and run calls on every major chain from one console. On the web, on your desktop and in your terminal.
                        </p>
                    </div>
                    <FooterCol
                        title="Product"
                        links={[
                            { label: 'Features', href: '/features' },
                            { label: 'Integrations', href: '/integrations' },
                            { label: 'Infrastructure', href: '/infrastructure' },
                            { label: 'Desktop app', href: DESKTOP_DOWNLOAD_URL, external: true },
                        ]}
                    />
                    <FooterCol
                        title="Developers"
                        links={[
                            { label: 'Documentation', href: '/docs' },
                            { label: 'CLI', href: 'https://github.com/Txio-labs/txio-cli', external: true },
                            { label: 'SDK', href: 'https://github.com/Txio-labs/txio-sdk', external: true },
                            { label: 'GitHub', href: GITHUB_URL, external: true },
                        ]}
                    />
                    <FooterCol
                        title="Company"
                        links={[
                            { label: 'Ecosystem', href: '/ecosystem' },
                            { label: 'Partners', href: '/partners' },
                            { label: 'Sign in', href: '/signin' },
                        ]}
                    />
                </div>
                <div className="border-t border-line">
                    <div className="w-full px-5 md:px-10 2xl:px-16 h-14 flex items-center justify-between text-xs text-fg-subtle">
                        <span>© {new Date().getFullYear()} Txio Labs. MIT licensed.</span>
                        <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-fg transition-colors">
                            <Github size={14} /> Txio-labs
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FooterCol({ title, links }: { title: string; links: Array<{ label: string; href: string; external?: boolean }> }) {
    return (
        <div>
            <div className="text-xs font-medium text-fg">{title}</div>
            <ul className="mt-4 space-y-2.5">
                {links.map((l) => (
                    <li key={l.label}>
                        {l.external ? (
                            <a href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[14px] text-fg-muted hover:text-fg transition-colors">
                                {l.label} <ArrowUpRight size={12} className="text-fg-subtle" />
                            </a>
                        ) : (
                            <Link href={l.href} className="text-[14px] text-fg-muted hover:text-fg transition-colors">
                                {l.label}
                            </Link>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* -------------------------------------------------------- Shared blocks */

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cx('inline-flex items-center gap-2 text-xs font-medium text-fg-muted', className)}>
            <span className="h-px w-5 bg-line-strong" />
            {children}
        </div>
    );
}

export function SectionHeading({
    eyebrow,
    title,
    body,
    align = 'left',
    className,
}: {
    eyebrow?: React.ReactNode;
    title: React.ReactNode;
    body?: React.ReactNode;
    align?: 'left' | 'center';
    className?: string;
}) {
    return (
        <div data-reveal className={cx(align === 'center' ? 'text-center mx-auto' : '', 'max-w-2xl', className)}>
            {eyebrow && <Eyebrow className={align === 'center' ? 'justify-center' : ''}>{eyebrow}</Eyebrow>}
            <h2 className="mt-4 text-[32px] md:text-[44px] font-semibold tracking-[-0.04em] leading-[1.05] text-fg text-balance">{title}</h2>
            {body && <p className="mt-4 text-[16px] md:text-base text-fg-muted leading-relaxed text-balance">{body}</p>}
        </div>
    );
}

/** Page hero used by the secondary public pages. */
export function PageHero({
    eyebrow,
    title,
    body,
    actions,
    children,
}: {
    eyebrow: React.ReactNode;
    title: React.ReactNode;
    body: React.ReactNode;
    actions?: React.ReactNode;
    children?: React.ReactNode;
}) {
    return (
        <section className="relative overflow-hidden">
            <div className="absolute inset-0 grid-lines mask-radial opacity-60 pointer-events-none" aria-hidden />
            <div className="relative w-full px-5 md:px-10 2xl:px-16 pt-16 md:pt-24 pb-16">
                <div data-hero="1"><Eyebrow>{eyebrow}</Eyebrow></div>
                <h1 data-hero="2" className="mt-5 max-w-3xl text-[40px] md:text-[64px] font-semibold tracking-[-0.045em] leading-[1] text-fg text-balance">{title}</h1>
                <p data-hero="3" className="mt-6 max-w-xl text-base md:text-lg text-fg-muted leading-relaxed text-balance">{body}</p>
                {actions && <div data-hero="4" className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>}
                {children && <div data-hero="5">{children}</div>}
            </div>
        </section>
    );
}

export function CtaBand({ embedded }: { embedded?: boolean }) {
    return (
        <section className="w-full px-5 md:px-10 2xl:px-16 mt-24">
            <div data-reveal className="relative overflow-hidden rounded-[20px] border border-line bg-surface px-6 md:px-14 py-14 md:py-20">
                <div className="absolute inset-0 dot-grid mask-radial opacity-70 pointer-events-none" aria-hidden />
                <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-8">
                    <div>
                        <h2 className="text-[32px] md:text-[44px] font-semibold tracking-[-0.04em] leading-[1.05] text-fg max-w-xl text-balance">
                            Your next call is one command away.
                        </h2>
                        <p className="mt-4 text-fg-muted max-w-md">Free to start. Bring your own RPC endpoints, wallets and keys.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {!embedded && (
                            <a
                                href={DESKTOP_DOWNLOAD_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="h-11 px-5 inline-flex items-center gap-2 rounded-[10px] border border-line-strong text-sm font-medium text-fg hover:bg-hover transition-colors"
                            >
                                Download desktop
                            </a>
                        )}
                        <Link
                            href={embedded ? '/workspace' : '/signup'}
                            className="h-11 px-5 inline-flex items-center gap-2 rounded-[10px] bg-inverse text-on-inverse text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                            {embedded ? 'Open workspace' : 'Start building'} <ArrowRight size={15} />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
