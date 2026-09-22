import { test, expect } from '@playwright/test';

const apiBase = process.env.TEST_API_URL || 'http://localhost:8000/api/v1';
const testEmail = `builders-test-${Date.now()}@example.com`;
const testPassword = 'correct-horse-battery-staple';

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    await request.post(`${apiBase}/auth/register`, {
        data: { email: testEmail, password: testPassword },
    });
    await request.dispose();
});

test.describe('workspace builder surfaces', () => {
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
        const startBuildingButton = page.getByRole('button', { name: 'Start Building' });
        await expect(createWorkspaceButton.or(startBuildingButton)).toBeVisible({ timeout: 15000 });
        if (await createWorkspaceButton.isVisible().catch(() => false)) {
            await createWorkspaceButton.click();
            await expect(createWorkspaceButton).not.toBeVisible({ timeout: 15000 });
        }
    });

    test('TX Composer (PTB Builder) loads without console errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.getByText('TX Composer', { exact: true }).click();
        await expect(page.getByText('New PTB', { exact: true })).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('button', { name: 'Dry Run' })).toBeVisible({ timeout: 10000 });

        expect(errors).toEqual([]);
    });

    test('Move Builder loads without console errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.getByText('Move Builder', { exact: true }).click();
        await expect(page.getByPlaceholder(/Write your Move contract here/i)).toBeVisible({ timeout: 10000 });

        expect(errors).toEqual([]);
    });

    test('Request History loads and reflects a request just made', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        // Generate one history entry via a real RPC send against testnet
        // (mainnet is CORS-blocked — documented separately).
        await page.evaluate(() => {
            window.localStorage.setItem('txio_network', 'testnet');
        });
        await page.reload();

        await page.getByRole('button', { name: 'Start Building' }).click();
        await page.getByText('JSON-RPC', { exact: true }).click();
        const methodInput = page.locator('input[list="rpc-methods-builder"]');
        await expect(methodInput).toBeVisible({ timeout: 10000 });
        await methodInput.fill('sui_getLatestCheckpointSequenceNumber');
        await page.getByRole('button', { name: 'Send', exact: true }).click();
        await expect(page.getByText(/\d+ms/)).toBeVisible({ timeout: 15000 });

        // Return to the Dashboard (clicking the logo clears the active
        // tab) to reach the "Full History" shortcut.
        await page.locator('.w-14 button').first().click();
        await page.getByRole('button', { name: 'Full History' }).click();
        await expect(page.getByRole('heading', { name: 'Request History' })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('sui_getLatestCheckpointSequenceNumber').first()).toBeVisible({ timeout: 10000 });

        expect(errors).toEqual([]);
    });
});
