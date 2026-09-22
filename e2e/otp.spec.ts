import { test, expect } from '@playwright/test';
import { OtpPage } from './pages/OtpPage';

test.describe('/otp', () => {

  test('loads successfully', async ({ page }) => {
    await page.goto('/otp');
    await expect(page).toHaveURL('/otp');
    // TODO: Add specific content assertions
  });

  test('has correct title', async ({ page }) => {
    await page.goto('/otp');
    // TODO: Update expected title
    await expect(page).toHaveTitle(/.*/);
  });
});
