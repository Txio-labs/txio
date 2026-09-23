import { test, expect } from '@playwright/test';
import { SigninPage } from './pages/SigninPage';

test.describe('/signin', () => {

  test('loads the sign-in form', async ({ page }) => {
    const signin = new SigninPage(page);
    await signin.goto();
    await signin.waitForLoad();
    await expect(signin.emailInput).toBeVisible();
    await expect(signin.passwordInput).toBeVisible();
  });

  test('shows an error toast on invalid credentials', async ({ page }) => {
    const signin = new SigninPage(page);
    await signin.goto();
    await signin.waitForLoad();
    await signin.login('nonexistent@example.com', 'wrong-password');
    await expect(page.getByText(/login failed|invalid/i)).toBeVisible();
  });

  for (const provider of ['GitHub', 'X']) {
    test(`${provider} button shows coming soon and stays on the page`, async ({ page }) => {
      await page.goto('/signin');
      await page.getByRole('button', { name: provider, exact: true }).click();
      await expect(page.getByText(`${provider} sign-in is coming soon`)).toBeVisible();
      await expect(page).toHaveURL('/signin');
    });
  }

  // TODO: valid-credential login (asserts redirect to /workspace) once a
  // seeded test account exists — see fixtures/auth.ts for the token-seeding
  // approach used elsewhere.
});
