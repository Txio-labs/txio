import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/marketing/MarketingShell', () => ({
    MarketingShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PageHero: ({ title, actions, children }: { title: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode }) => (
        <section>
            <h1>{title}</h1>
            {actions}
            {children}
        </section>
    ),
    SectionHeading: ({ title }: { title: React.ReactNode }) => <h2>{title}</h2>
}));

vi.mock('@/services/desktopRelease', async (importOriginal) => {
    const real = await importOriginal<typeof import('@/services/desktopRelease')>();
    const asset = (name: string) => ({ name, size: 20 * 1048576, browser_download_url: `https://dl/${name}` });
    return {
        ...real,
        detectDesktopOs: () => 'linux',
        fetchLatestDesktopRelease: async () => ({
            version: '1.0.0',
            publishedAt: '2026-11-16T20:00:00Z',
            url: 'https://github.com/Txio-labs/txio-desktop/releases/tag/v1.0.0',
            downloads: real.desktopDownloads({
                tag_name: 'v1.0.0',
                published_at: '',
                html_url: '',
                assets: ['Txio_1.0.0_aarch64.dmg', 'Txio_1.0.0_x64.dmg', 'Txio_1.0.0_x64-setup.exe', 'Txio_1.0.0_amd64.deb', 'Txio_1.0.0_amd64.AppImage'].map(asset)
            })
        })
    };
});

import { DownloadPage } from './DownloadPage';

describe('DownloadPage', () => {
    it('offers the visitor’s system first and lists every build', async () => {
        render(<DownloadPage />);
        const primary = await screen.findAllByRole('link', { name: /download for linux/i });
        expect(primary.map((a) => a.getAttribute('href'))).toEqual(['https://dl/Txio_1.0.0_amd64.deb', 'https://dl/Txio_1.0.0_amd64.AppImage']);
        expect(screen.getByText(/Version 1\.0\.0, released/)).toBeTruthy();

        const mac = screen.getByLabelText('macOS downloads');
        expect(within(mac).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['https://dl/Txio_1.0.0_aarch64.dmg', 'https://dl/Txio_1.0.0_x64.dmg']);
        expect(within(screen.getByLabelText('Linux downloads')).getByText('Your system')).toBeTruthy();
        expect(screen.getByText(/brew install --cask txio/)).toBeTruthy();
    });
});
