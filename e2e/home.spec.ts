import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';

test.describe('Home', () => {

  test('loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    // TODO: Add specific content assertions
  });

  test('has correct title', async ({ page }) => {
    await page.goto('/');
    // TODO: Update expected title
    await expect(page).toHaveTitle(/.*/);
  });
});
