import { test, expect } from '@playwright/test';
import { EcosystemPage } from './pages/EcosystemPage';

test.describe('/ecosystem', () => {

  test('loads successfully', async ({ page }) => {
    await page.goto('/ecosystem');
    await expect(page).toHaveURL('/ecosystem');
    // TODO: Add specific content assertions
  });

  test('has correct title', async ({ page }) => {
    await page.goto('/ecosystem');
    // TODO: Update expected title
    await expect(page).toHaveTitle(/.*/);
  });
});
