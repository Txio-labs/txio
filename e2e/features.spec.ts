import { test, expect } from '@playwright/test';
import { FeaturesPage } from './pages/FeaturesPage';

test.describe('/features', () => {

  test('loads successfully', async ({ page }) => {
    await page.goto('/features');
    await expect(page).toHaveURL('/features');
    // TODO: Add specific content assertions
  });

  test('has correct title', async ({ page }) => {
    await page.goto('/features');
    // TODO: Update expected title
    await expect(page).toHaveTitle(/.*/);
  });
});
