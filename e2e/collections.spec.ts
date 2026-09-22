import { test, expect } from '@playwright/test';

const apiBase = process.env.TEST_API_URL || 'http://localhost:8000/api/v1';
const testEmail = `collections-test-${Date.now()}@example.com`;
const testPassword = 'correct-horse-battery-staple';
const collectionName = `Test Collection ${Date.now()}`;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    await request.post(`${apiBase}/auth/register`, {
        data: { email: testEmail, password: testPassword },
    });
    await request.dispose();
});

test('creates a collection and sees it appear in the sidebar tree', async ({ page }) => {
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

    await page.getByText('New Collection', { exact: true }).click();

    const nameInput = page.getByPlaceholder(/Core API, User Authentication/i);
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill(collectionName);

    await page.getByRole('button', { name: /save collection/i }).click();

    // Successful save closes the new_collection tab and the sidebar tree
    // re-renders with the new collection node.
    await expect(page.getByText(collectionName)).toBeVisible({ timeout: 10000 });
});
