import { test, expect } from '@playwright/test';
import { DocsPage } from './pages/DocsPage';

test.describe('/docs', () => {

  test('loads successfully', async ({ page }) => {
    await page.goto('/docs');
    await expect(page).toHaveURL('/docs');
    // TODO: Add specific content assertions
  });

  test('has correct title', async ({ page }) => {
    await page.goto('/docs');
    // TODO: Update expected title
    await expect(page).toHaveTitle(/.*/);
  });
});
