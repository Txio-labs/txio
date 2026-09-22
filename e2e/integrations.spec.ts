import { test, expect } from '@playwright/test';
import { IntegrationsPage } from './pages/IntegrationsPage';

test.describe('/integrations', () => {

  test('loads successfully', async ({ page }) => {
    await page.goto('/integrations');
    await expect(page).toHaveURL('/integrations');
    // TODO: Add specific content assertions
  });

  test('has correct title', async ({ page }) => {
    await page.goto('/integrations');
    // TODO: Update expected title
    await expect(page).toHaveTitle(/.*/);
  });
});
