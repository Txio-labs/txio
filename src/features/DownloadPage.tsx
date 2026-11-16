import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Copy, Download, Laptop, Monitor, RefreshCw, Terminal } from 'lucide-react';
import { MarketingShell, PageHero, SectionHeading } from '@/components/marketing/MarketingShell';
import {
    DESKTOP_RELEASES_URL,
    detectDesktopOs,
    fetchLatestDesktopRelease,
    formatMegabytes,
    type DesktopDownload,
    type DesktopOs,
    type DesktopRelease
} from '@/services/desktopRelease';

type State = { status: 'loading' } | { status: 'none' } | { status: 'error'; message: string } | { status: 'ready'; release: DesktopRelease };

const OS_INFO: Record<DesktopOs, { name: string; icon: typeof Laptop }> = {
    macos: { name: 'macOS', icon: Laptop },
    windows: { name: 'Windows', icon: Monitor },
    linux: { name: 'Linux', icon: Terminal }
};
const OS_ORDER: DesktopOs[] = ['macos', 'windows', 'linux'];

const PACKAGE_MANAGERS: { os: DesktopOs; label: string; command: string }[] = [
    { os: 'macos', label: 'Homebrew', command: 'brew tap txio-labs/txio https://github.com/Txio-labs/txio-desktop && brew install --cask txio' },
    { os: 'windows', label: 'Scoop', command: 'scoop bucket add txio https://github.com/Txio-labs/txio-desktop; scoop install txio' },
    { os: 'linux', label: 'APT or DNF repository', command: 'curl -fsSL https://txio-labs.github.io/txio-desktop/install.sh | sudo sh' }
];

/** The files to offer first for an OS: both Mac chips, the Windows installer, the .deb plus the AppImage. */
const primaryFor = (os: DesktopOs, downloads: DesktopDownload[]) => {
    const mine = downloads.filter((d) => d.os === os);
    if (os === 'windows') return mine.filter((d) => d.name.endsWith('-setup.exe')).slice(0, 1);
    if (os === 'linux') return mine.filter((d) => d.name.endsWith('.deb') || d.name.endsWith('.AppImage'));
    return mine;
};

export const DownloadPage: React.FC = () => {
    const [state, setState] = useState<State>({ status: 'loading' });
    const [os, setOs] = useState<DesktopOs | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOs(detectDesktopOs());
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({ status: 'loading' });
        fetchLatestDesktopRelease(controller.signal)
            .then((release) => setState(release ? { status: 'ready', release } : { status: 'none' }))
            .catch((err: Error) => {
                if (err.name !== 'AbortError') setState({ status: 'error', message: err.message || 'Could not reach GitHub.' });
            });
        return () => controller.abort();
    }, [attempt]);

    const release = state.status === 'ready' ? state.release : null;
    const primary = release && os ? primaryFor(os, release.downloads) : [];

    return (
        <MarketingShell>
            <PageHero
                eyebrow="Desktop"
                title="Txio for your desktop."
                body="A native app for macOS, Windows and Linux, with the same console, collections and wallets as the web. It updates itself."
                actions={
                    <>
                        {primary.map((d) => (
                            <a
                                key={d.name}
                                href={d.url}
                                className="h-11 px-5 inline-flex items-center gap-2 rounded-[10px] bg-inverse text-on-inverse text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                                <Download size={15} />
                                {os && `Download for ${OS_INFO[os].name}`}
                                {primary.length > 1 && <span className="opacity-70">· {d.os === 'macos' ? d.label.replace(/ \(.*\)$/, '') : d.name.split('.').pop()}</span>}
                            </a>
                        ))}
                        <a
                            href={release?.url ?? DESKTOP_RELEASES_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="h-11 px-5 inline-flex items-center gap-2 rounded-[10px] border border-line-strong text-sm font-medium text-fg hover:bg-hover transition-colors"
                        >
                            All releases on GitHub <ArrowUpRight size={14} />
                        </a>
                    </>
                }
            >
                <p className="mt-5 text-sm text-fg-subtle" aria-live="polite">
                    {state.status === 'loading' && 'Checking the latest release…'}
                    {release &&
                        `Version ${release.version}, released ${new Date(release.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}.`}
                    {release && !os && ' Pick your system below.'}
                </p>
            </PageHero>

            <section className="w-full px-5 md:px-10 2xl:px-16">
                {state.status === 'none' && (
                    <Notice>
                        The first release is still being built. It appears here as soon as it is published, or{' '}
                        <a href={DESKTOP_RELEASES_URL} target="_blank" rel="noreferrer" className="underline">follow it on GitHub</a>.
                    </Notice>
                )}
                {state.status === 'error' && (
                    <Notice>
                        Could not load the release list: {state.message}{' '}
                        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="inline-flex items-center gap-1 underline">
                            <RefreshCw size={12} /> Try again
                        </button>{' '}
                        or open the{' '}
                        <a href={DESKTOP_RELEASES_URL} target="_blank" rel="noreferrer" className="underline">releases on GitHub</a>.
                    </Notice>
                )}
                {release && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {OS_ORDER.map((id) => (
                            <OsCard key={id} os={id} current={id === os} downloads={release.downloads.filter((d) => d.os === id)} />
                        ))}
                    </div>
                )}
            </section>

            <section className="w-full px-5 md:px-10 2xl:px-16 mt-24">
                <SectionHeading
                    eyebrow="Package managers"
                    title="Or install from the command line."
                    body="Updates then arrive with the rest of your system."
                />
                <div className="mt-10 grid grid-cols-1 gap-3">
                    {PACKAGE_MANAGERS.map((pm) => (
                        <CommandRow key={pm.label} label={`${OS_INFO[pm.os].name}: ${pm.label}`} command={pm.command} />
                    ))}
                </div>
                <p className="mt-6 max-w-2xl text-sm text-fg-subtle leading-relaxed">
                    The builds are not code-signed yet, so macOS and Windows warn the first time you open Txio. Already have it? Txio checks for
                    new versions and asks before it installs one.
                </p>
            </section>
        </MarketingShell>
    );
};

function Notice({ children }: { children: React.ReactNode }) {
    return <div role="status" className="rounded-[14px] border border-line bg-surface px-5 py-4 text-sm text-fg-muted">{children}</div>;
}

function OsCard({ os, current, downloads }: { os: DesktopOs; current: boolean; downloads: DesktopDownload[] }) {
    const { name, icon: Icon } = OS_INFO[os];
    return (
        <div
            aria-label={`${name} downloads`}
            className={`rounded-[14px] border bg-surface p-5 flex flex-col gap-4 ${current ? 'border-line-strong shadow-card' : 'border-line'}`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <Icon size={18} className="text-fg-muted" />
                    <h3 className="text-[16px] font-semibold tracking-tight text-fg">{name}</h3>
                </div>
                {current && <span className="text-[12px] text-fg-subtle">Your system</span>}
            </div>
            {downloads.length === 0 ? (
                <p className="text-sm text-fg-subtle">No {name} build in this release.</p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {downloads.map((d) => (
                        <li key={d.name}>
                            <a
                                href={d.url}
                                className="group flex items-start justify-between gap-3 rounded-[10px] border border-line px-3 py-2.5 hover:border-line-strong hover:bg-hover transition-colors"
                            >
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium text-fg">{d.label}</span>
                                    <span className="block text-[12px] font-mono text-fg-subtle truncate">{d.name}</span>
                                </span>
                                <span className="shrink-0 flex items-center gap-1.5 text-[12px] text-fg-subtle tabular">
                                    {formatMegabytes(d.bytes)}
                                    <Download size={13} className="text-fg-muted group-hover:text-fg" />
                                </span>
                            </a>
                            <p className="mt-1 px-1 text-[12px] text-fg-subtle">{d.install}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function CommandRow({ label, command }: { label: string; command: string }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard blocked: the command is still selectable.
        }
    };
    return (
        <div className="rounded-[14px] border border-line bg-surface p-4">
            <div className="text-[12px] font-medium text-fg-muted">{label}</div>
            <div className="mt-2 flex items-center gap-2 rounded-[8px] border border-line bg-sunken px-3 h-10">
                <code className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap font-mono text-xs text-fg-muted">{command}</code>
                <button type="button" onClick={copy} aria-label={`Copy the ${label} command`} className="shrink-0 p-1 text-fg-subtle hover:text-fg">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
            </div>
        </div>
    );
}
