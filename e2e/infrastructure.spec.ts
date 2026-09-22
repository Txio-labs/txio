import { test, expect } from '@playwright/test';
import { InfrastructurePage } from './pages/InfrastructurePage';

test.describe('/infrastructure', () => {

  test('loads successfully', async ({ page }) => {
    await page.goto('/infrastructure');
    await expect(page).toHaveURL('/infrastructure');
    // TODO: Add specific content assertions
  });

  test('has correct title', async ({ page }) => {
    await page.goto('/infrastructure');
    // TODO: Update expected title
    await expect(page).toHaveTitle(/.*/);
  });
});
