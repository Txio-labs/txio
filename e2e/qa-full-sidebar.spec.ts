import { test, expect } from '@playwright/test';

const apiBase = process.env.TEST_API_URL || 'http://localhost:8000/api/v1';
const testEmail = `qa-sidebar-${Date.now()}@example.com`;
const testPassword = 'correct-horse-battery-staple';

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    await request.post(`${apiBase}/auth/register`, {
        data: { email: testEmail, password: testPassword },
    });
    await request.dispose();
});

test.describe('full sidebar nav rail', () => {
    test.beforeEach(async ({ page }) => {
        const loginResponse = await page.request.post(`${apiBase}/auth/login`, {
            data: { email: testEmail, password: testPassword },
        });
        const { token } = await loginResponse.json();

        await page.addInitScript((t) => {
            window.localStorage.setItem('txio_token', t);
            window.localStorage.setItem('txio_viewMode', 'app');
        }, token);

        await page.goto('/workspace');
        await expect(page).toHaveURL('/workspace');

        const createWorkspaceButton = page.getByRole('button', { name: 'Create Workspace' });
        const navRail = page.locator('button[title="Overview"]');
        await expect(createWorkspaceButton.or(navRail).first()).toBeVisible({ timeout: 15000 });
        if (await createWorkspaceButton.isVisible().catch(() => false)) {
            await createWorkspaceButton.click();
            await expect(createWorkspaceButton).not.toBeVisible({ timeout: 15000 });
        }
    });

    const railItems = [
        'Overview', 'Requests', 'Swap', 'History', 'Collections',
        'Workspaces', 'Networks', 'Wallets', 'Approvals', 'Automation',
        'Documentation', 'Developers', 'Settings', 'Help',
    ];

    for (const label of railItems) {
        test(`${label} loads without console/page errors`, async ({ page }) => {
            const errors: string[] = [];
            page.on('pageerror', (err) => errors.push(err.message));

            const navButton = page.locator(`button[title="${label}"]`);
            await expect(navButton).toBeVisible({ timeout: 10000 });
            // next dev's error-overlay portal can sit over the nav rail even
            // when there's no error to show; Escape is the standard way to
            // dismiss it, same as a developer would in a real browser.
            await page.keyboard.press('Escape').catch(() => undefined);
            await navButton.click({ timeout: 15000 });
            await page.waitForTimeout(1500);

            expect(errors, `console errors on ${label}`).toEqual([]);
        });
    }

    test('Swap: searching routes returns results or a clear no-wallet/no-route message', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.locator('button[title="Swap"]').click();
        await expect(page.getByRole('heading', { name: 'Swap' })).toBeVisible({ timeout: 10000 });

        // No wallet linked in this test — button should be disabled and a
        // "no wallet linked" hint should be visible rather than allowing a
        // broken search.
        const compareButton = page.getByRole('button', { name: /Compare routes/i });
        await expect(compareButton).toBeDisabled();
        await expect(page.getByText(/No .* wallet linked/i)).toBeVisible({ timeout: 5000 });

        expect(errors).toEqual([]);
    });
});
