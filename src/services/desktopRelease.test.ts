import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { desktopDownloads, detectDesktopOs, fetchLatestDesktopRelease } from './desktopRelease';

const asset = (name: string, size = 10 * 1048576) => ({ name, size, browser_download_url: `https://github.com/x/releases/download/v1.0.0/${name}` });
const RELEASE = {
    tag_name: 'v1.0.0',
    published_at: '2026-11-16T20:00:00Z',
    html_url: 'https://github.com/Txio-labs/txio-desktop/releases/tag/v1.0.0',
    assets: [
        asset('Txio_1.0.0_amd64.deb'),
        asset('Txio_1.0.0_amd64.AppImage'),
        asset('Txio_1.0.0_amd64.AppImage.tar.gz'),
        asset('Txio_1.0.0_amd64.AppImage.tar.gz.sig'),
        asset('Txio-1.0.0-1.x86_64.rpm'),
        asset('Txio_1.0.0_aarch64.dmg'),
        asset('Txio_1.0.0_x64.dmg'),
        asset('Txio_aarch64.app.tar.gz'),
        asset('Txio_1.0.0_x64-setup.exe'),
        asset('Txio_1.0.0_x64_en-US.msi'),
        asset('latest.json')
    ]
};

describe('desktopDownloads', () => {
    it('lists installers per system and leaves out updater files', () => {
        const list = desktopDownloads(RELEASE);
        expect(list.map((d) => [d.os, d.label, d.name])).toEqual([
            ['macos', 'Apple silicon (M1 and later)', 'Txio_1.0.0_aarch64.dmg'],
            ['macos', 'Intel', 'Txio_1.0.0_x64.dmg'],
            ['windows', 'Windows 10 and 11', 'Txio_1.0.0_x64-setup.exe'],
            ['windows', 'IT-managed PCs', 'Txio_1.0.0_x64_en-US.msi'],
            ['linux', 'Debian, Ubuntu, Kali', 'Txio_1.0.0_amd64.deb'],
            ['linux', 'Any distribution', 'Txio_1.0.0_amd64.AppImage'],
            ['linux', 'Fedora, openSUSE', 'Txio-1.0.0-1.x86_64.rpm']
        ]);
        expect(list.find((d) => d.os === 'linux' && d.name.endsWith('.deb'))!.install).toBe('sudo apt install ./Txio_1.0.0_amd64.deb');
    });
});

describe('detectDesktopOs', () => {
    it('reads the platform from the user agent', () => {
        expect(detectDesktopOs({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' })).toBe('macos');
        expect(detectDesktopOs({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })).toBe('windows');
        expect(detectDesktopOs({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' })).toBe('linux');
        expect(detectDesktopOs({ userAgent: 'x', userAgentData: { platform: 'macOS' } })).toBe('macos');
        expect(detectDesktopOs({ userAgent: 'Mozilla/5.0 (Linux; Android 14)' })).toBeNull();
        expect(detectDesktopOs({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })).toBeNull();
    });
});

describe('fetchLatestDesktopRelease', () => {
    beforeEach(() => sessionStorage.clear());
    afterEach(() => vi.unstubAllGlobals());

    it('returns the release and caches it in this tab', async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify(RELEASE), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const first = await fetchLatestDesktopRelease();
        const second = await fetchLatestDesktopRelease();
        expect(first).toMatchObject({ version: '1.0.0', url: RELEASE.html_url });
        expect(first!.downloads).toHaveLength(7);
        expect(second).toEqual(first);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('returns null when nothing is published yet, and explains a rate limit', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
        expect(await fetchLatestDesktopRelease()).toBeNull();
        sessionStorage.clear();
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403 })));
        await expect(fetchLatestDesktopRelease()).rejects.toThrow(/rate-limiting/);
    });
});
