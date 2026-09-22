import { test, expect } from '@playwright/test';
import { SignupPage } from './pages/SignupPage';

test.describe('/signup', () => {

  test('loads successfully', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveURL('/signup');
    // TODO: Add specific content assertions
  });

  test('has correct title', async ({ page }) => {
    await page.goto('/signup');
    // TODO: Update expected title
    await expect(page).toHaveTitle(/.*/);
  });

  test('redirects unauthenticated users', async ({ page }) => {
    await page.goto('/signup');
    // TODO: Verify redirect to login
    // await expect(page).toHaveURL('/login');
  });

  test('allows authenticated access', async ({ page }) => {
    // TODO: Set up authentication
    // await page.context().addCookies([{ name: 'session', value: '...' }]);
    await page.goto('/signup');
    await expect(page).toHaveURL('/signup');
  });
});
