import { test, expect } from '@playwright/test';

const apiBase = process.env.TEST_API_URL || 'http://localhost:8000/api/v1';
const testEmail = `rpc-send-test-${Date.now()}@example.com`;
const testPassword = 'correct-horse-battery-staple';

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    await request.post(`${apiBase}/auth/register`, {
        data: { email: testEmail, password: testPassword },
    });
    await request.dispose();
});

test('sends a JSON-RPC request against testnet and gets a real result', async ({ page }) => {
    const loginResponse = await page.request.post(`${apiBase}/auth/login`, {
        data: { email: testEmail, password: testPassword },
    });
    const { token } = await loginResponse.json();

    await page.addInitScript((t) => {
        window.localStorage.setItem('txio_token', t);
        window.localStorage.setItem('txio_viewMode', 'app');
        // Sidestep the known mainnet CORS issue (documented separately) to
        // verify the send pipeline itself works end to end.
        window.localStorage.setItem('txio_network', 'testnet');
    }, token);

    await page.goto('/workspace');
    await expect(page).toHaveURL('/workspace');

    const createWorkspaceButton = page.getByRole('button', { name: 'Create Workspace' });
    await createWorkspaceButton.waitFor({ state: 'visible', timeout: 15000 });
    await createWorkspaceButton.click();
    await expect(createWorkspaceButton).not.toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Start Building' }).click();
    await page.getByText('JSON-RPC', { exact: true }).click();

    const methodInput = page.locator('input[list="rpc-methods-builder"]');
    await expect(methodInput).toBeVisible({ timeout: 10000 });
    await methodInput.fill('sui_getLatestCheckpointSequenceNumber');

    await page.getByRole('button', { name: 'Send', exact: true }).click();

    // A successful round trip shows a latency reading next to the endpoint;
    // a failed/CORS-blocked request never reaches this state.
    await expect(page.getByText(/CORS|blocked by/i)).toHaveCount(0);
    await expect(page.getByText(/\d+ms/)).toBeVisible({ timeout: 15000 });
});
