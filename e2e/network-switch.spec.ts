import { test, expect } from '@playwright/test';

const apiBase = process.env.TEST_API_URL || 'http://localhost:8000/api/v1';
const testEmail = `network-switch-test-${Date.now()}@example.com`;
const testPassword = 'correct-horse-battery-staple';

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    await request.post(`${apiBase}/auth/register`, {
        data: { email: testEmail, password: testPassword },
    });
    await request.dispose();
});

test('switches network from mainnet to testnet via the confirmation modal', async ({ page }) => {
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
    await createWorkspaceButton.waitFor({ state: 'visible', timeout: 15000 });
    await createWorkspaceButton.click();
    await expect(createWorkspaceButton).not.toBeVisible({ timeout: 15000 });

    const networkTrigger = page.locator('button[title="Network"]');
    await expect(networkTrigger).toContainText('mainnet', { timeout: 10000 });
    await networkTrigger.click();

    await page.getByRole('button', { name: 'testnet', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Switch Network Environment' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Confirm Switch' }).click();

    await expect(networkTrigger).toContainText('testnet', { timeout: 10000 });
});
