import { test, expect } from '@playwright/test';

const apiBase = process.env.TEST_API_URL || 'http://localhost:8000/api/v1';
const testEmail = `terminal-test-${Date.now()}@example.com`;
const testPassword = 'correct-horse-battery-staple';

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    await request.post(`${apiBase}/auth/register`, {
        data: { email: testEmail, password: testPassword },
    });
    await request.dispose();
});

test('runs a real txio CLI command through the terminal panel', async ({ page }) => {
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

    const terminalInput = page.getByPlaceholder(/Type 'help' for available commands/i);
    await expect(terminalInput).toBeVisible({ timeout: 10000 });
    await terminalInput.fill('txio chains');
    await terminalInput.press('Enter');

    // A real CLI invocation prints the list of supported chains.
    await expect(page.getByText(/sui/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/ethereum/i).first()).toBeVisible({ timeout: 15000 });
});

test('rejects a non-txio command as unsupported', async ({ page }) => {
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

    const terminalInput = page.getByPlaceholder(/Type 'help' for available commands/i);
    await expect(terminalInput).toBeVisible({ timeout: 10000 });
    await terminalInput.fill('rm -rf /');
    await terminalInput.press('Enter');

    await expect(page.getByText(/unsupported command|not authorized/i)).toBeVisible({ timeout: 10000 });
});
