import { test, expect } from '@playwright/test';
import { PartnersPage } from './pages/PartnersPage';

test.describe('/partners', () => {

  test('loads successfully', async ({ page }) => {
    await page.goto('/partners');
    await expect(page).toHaveURL('/partners');
    // TODO: Add specific content assertions
  });

  test('has correct title', async ({ page }) => {
    await page.goto('/partners');
    // TODO: Update expected title
    await expect(page).toHaveTitle(/.*/);
  });
});
