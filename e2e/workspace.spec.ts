import { test, expect } from '@playwright/test';

test.describe('/workspace', () => {

  test('redirects unauthenticated users to landing', async ({ page }) => {
    await page.goto('/workspace');
    await expect(page).toHaveURL('/');
  });

  // TODO: authenticated coverage (dashboard render, tab switching, sidebar,
  // modal open/close) once a login fixture is wired up — see fixtures/auth.ts.
});
