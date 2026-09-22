import { test, expect } from '@playwright/test';

const apiBase = process.env.TEST_API_URL || 'http://localhost:8000/api/v1';
const testEmail = `rpc-test-${Date.now()}@example.com`;
const testPassword = 'correct-horse-battery-staple';

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    await request.post(`${apiBase}/auth/register`, {
        data: { email: testEmail, password: testPassword },
    });
    await request.dispose();
});

test('executing a Sui RPC request against mainnet does not fail on CORS', async ({ page }) => {
    const loginResponse = await page.request.post(`${apiBase}/auth/login`, {
        data: { email: testEmail, password: testPassword },
    });
    const { token } = await loginResponse.json();

    const corsErrors: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error' && /CORS|blocked/i.test(msg.text())) {
            corsErrors.push(msg.text());
        }
    });

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

    // Give the Dashboard's network-health poll (suix_getReferenceGasPrice /
    // sui_getLatestCheckpointSequenceNumber against the public mainnet
    // fullnode) a cycle to run and surface any CORS failures.
    await page.waitForTimeout(4000);

    expect(corsErrors, `CORS errors observed:\n${corsErrors.join('\n')}`).toEqual([]);
});
