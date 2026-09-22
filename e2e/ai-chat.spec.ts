import { test, expect } from '@playwright/test';

const apiBase = process.env.TEST_API_URL || 'http://localhost:8000/api/v1';
const testEmail = `ai-chat-test-${Date.now()}@example.com`;
const testPassword = 'correct-horse-battery-staple';

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    await request.post(`${apiBase}/auth/register`, {
        data: { email: testEmail, password: testPassword },
    });
    await request.dispose();
});

test('sends a message in AI chat and receives a real model response', async ({ page }) => {
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

    await page.getByText('AI Debugger').click();

    const input = page.getByPlaceholder('Enter prompt...');
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill('Say the single word "pong" and nothing else.');
    await input.press('Enter');

    // Real model round trip through the backend's Groq integration; allow
    // generous time for the network hop + inference.
    await expect(page.getByText(/pong/i)).toBeVisible({ timeout: 20000 });
});
