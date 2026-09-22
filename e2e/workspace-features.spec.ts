import { test, expect } from '@playwright/test';

const apiBase = process.env.TEST_API_URL || 'http://localhost:8000/api/v1';
const testEmail = `features-test-${Date.now()}@example.com`;
const testPassword = 'correct-horse-battery-staple';

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    await request.post(`${apiBase}/auth/register`, {
        data: { email: testEmail, password: testPassword },
    });
    await request.dispose();
});

test.describe('authenticated workspace surfaces', () => {
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
        const sidebarSettingsButton = page.locator('button[title="Settings"]');
        await expect(createWorkspaceButton.or(sidebarSettingsButton)).toBeVisible({ timeout: 15000 });
        if (await createWorkspaceButton.isVisible().catch(() => false)) {
            await createWorkspaceButton.click();
            await expect(createWorkspaceButton).not.toBeVisible({ timeout: 15000 });
        }
    });

    test('Settings loads without console errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.locator('button[title="Settings"]').click();
        await expect(page.getByText(/settings/i).first()).toBeVisible({ timeout: 10000 });

        expect(errors).toEqual([]);
    });

    test('Playground loads without console errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.locator('button[title="Playground"]').click();
        await page.waitForTimeout(1500);

        expect(errors).toEqual([]);
    });

    test('Profile page is reachable via the command palette and shows the signed-in email', async ({ page }) => {
        await page.keyboard.press('ControlOrMeta+k');
        await page.getByPlaceholder(/search/i).waitFor({ state: 'visible', timeout: 10000 });
        await page.getByText('Profile', { exact: true }).click();

        await expect(page.getByText(testEmail)).toBeVisible({ timeout: 10000 });
    });
});
