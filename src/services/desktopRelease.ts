/**
 * The latest Txio Desktop release, read from GitHub's public API
 * (github.com/Txio-labs/txio-desktop/releases). Installers are grouped with
 * the same rules as the desktop repo's scripts/release_notes.py, so the
 * download page and the release notes always agree.
 */

export const DESKTOP_REPO = 'Txio-labs/txio-desktop';
export const DESKTOP_RELEASES_URL = `https://github.com/${DESKTOP_REPO}/releases`;
const LATEST_API = `https://api.github.com/repos/${DESKTOP_REPO}/releases/latest`;

export type DesktopOs = 'macos' | 'windows' | 'linux';

export interface DesktopDownload {
    os: DesktopOs;
    /** Who the file is for, e.g. "Apple silicon (M1 and later)". */
    label: string;
    name: string;
    url: string;
    bytes: number;
    /** How to install it, in one line. */
    install: string;
}

export interface DesktopRelease {
    version: string;
    publishedAt: string;
    url: string;
    downloads: DesktopDownload[];
}

const RULES: { os: DesktopOs; match: (name: string) => boolean; label: string; install: (name: string) => string }[] = [
    { os: 'macos', match: (n) => n.endsWith('.dmg') && n.includes('aarch64'), label: 'Apple silicon (M1 and later)', install: () => 'Open it, drag Txio to Applications. First launch: right-click the app, then Open.' },
    { os: 'macos', match: (n) => n.endsWith('.dmg') && !n.includes('aarch64'), label: 'Intel', install: () => 'Open it, drag Txio to Applications. First launch: right-click the app, then Open.' },
    { os: 'windows', match: (n) => n.endsWith('-setup.exe'), label: 'Windows 10 and 11', install: () => 'Run it. If SmartScreen warns, choose More info, then Run anyway.' },
    { os: 'windows', match: (n) => n.endsWith('.msi'), label: 'IT-managed PCs', install: () => 'Deploy it with your usual tools.' },
    { os: 'linux', match: (n) => n.endsWith('.deb'), label: 'Debian, Ubuntu, Kali', install: (n) => `sudo apt install ./${n}` },
    { os: 'linux', match: (n) => n.endsWith('.AppImage'), label: 'Any distribution', install: (n) => `chmod +x ${n}, then run it` },
    { os: 'linux', match: (n) => n.endsWith('.rpm'), label: 'Fedora, openSUSE', install: (n) => `sudo dnf install ./${n}` }
];

interface GithubRelease {
    tag_name: string;
    published_at: string;
    html_url: string;
    assets: { name: string; size: number; browser_download_url: string }[];
}

/** Installers in a release, in display order. Update files (.sig, .tar.gz, latest.json) are left out. */
export const desktopDownloads = (release: GithubRelease): DesktopDownload[] =>
    RULES.flatMap((rule) =>
        release.assets
            .filter((a) => rule.match(a.name))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((a) => ({ os: rule.os, label: rule.label, name: a.name, url: a.browser_download_url, bytes: a.size, install: rule.install(a.name) }))
    );

const CACHE_KEY = 'txio_desktop_release';
const CACHE_MS = 10 * 60 * 1000;

/**
 * The latest release, or null when none is published yet. Cached in this
 * tab for 10 minutes: the API allows 60 unauthenticated requests per hour.
 */
export async function fetchLatestDesktopRelease(signal?: AbortSignal): Promise<DesktopRelease | null> {
    try {
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null') as { at: number; release: DesktopRelease | null } | null;
        if (cached && Date.now() - cached.at < CACHE_MS) return cached.release;
    } catch {
        // Storage blocked or unreadable: fetch instead.
    }
    const res = await fetch(LATEST_API, { headers: { Accept: 'application/vnd.github+json' }, signal });
    let release: DesktopRelease | null = null;
    if (res.ok) {
        const data = (await res.json()) as GithubRelease;
        release = {
            version: data.tag_name.replace(/^v/, ''),
            publishedAt: data.published_at,
            url: data.html_url,
            downloads: desktopDownloads(data)
        };
    } else if (res.status !== 404) {
        throw new Error(res.status === 403 ? 'GitHub is rate-limiting requests from your network.' : `GitHub answered ${res.status}.`);
    }
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), release }));
    } catch {
        // Not cached; harmless.
    }
    return release;
}

/** The visitor's OS, or null when it can't be told (phones, unknown agents). */
export function detectDesktopOs(nav: Pick<Navigator, 'userAgent'> & { userAgentData?: { platform?: string } } = navigator): DesktopOs | null {
    const platform = (nav.userAgentData?.platform ?? '').toLowerCase();
    const ua = nav.userAgent.toLowerCase();
    if (/android|iphone|ipad|ipod/.test(ua)) return null;
    if (platform.includes('mac') || ua.includes('mac os x') || ua.includes('macintosh')) return 'macos';
    if (platform.includes('win') || ua.includes('windows')) return 'windows';
    if (platform.includes('linux') || ua.includes('linux') || ua.includes('x11')) return 'linux';
    return null;
}

export const formatMegabytes = (bytes: number) => `${Math.max(1, Math.round(bytes / 1048576))} MB`;
