import { test, expect } from '@playwright/test';

const apiBase = process.env.TEST_API_URL || 'http://localhost:8000/api/v1';
const testEmail = `curl-import-test-${Date.now()}@example.com`;
const testPassword = 'correct-horse-battery-staple';

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    await request.post(`${apiBase}/auth/register`, {
        data: { email: testEmail, password: testPassword },
    });
    await request.dispose();
});

test('imports a cURL command into a pre-filled RPC request', async ({ page }) => {
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

    await page.getByRole('button', { name: 'Start Building' }).click();
    await page.getByText('Import cURL', { exact: true }).click();

    const curlCommand = `curl -X POST https://fullnode.testnet.sui.io:443 \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"suix_getAllBalances","params":["0xabc"]}'`;

    await page.locator('textarea').fill(curlCommand);
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    // A successful import closes the modal and lands on the RPC builder
    // with the method pre-filled from the cURL body.
    const methodInput = page.locator('input[list="rpc-methods-builder"]');
    await expect(methodInput).toHaveValue('suix_getAllBalances', { timeout: 10000 });
});
