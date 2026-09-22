import { test as base, Page } from '@playwright/test';

interface AuthFixtures {
  authenticatedPage: Page;
}

// This app stores its session as a bearer token in localStorage
// (`txio_token`), not a cookie — see src/services/api.ts and
// src/lib/store.ts. Login via the API and seed localStorage before any
// app script runs, then reload so the store picks it up on boot.
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page, baseURL }, use) => {
    const apiBase = process.env.TEST_API_URL || 'http://localhost:8000/api/v1';
    const email = process.env.TEST_EMAIL || 'test@example.com';
    const password = process.env.TEST_PASSWORD || 'password123';

    const response = await page.request.post(`${apiBase}/auth/login`, {
      data: { email, password },
    });
    const { token } = await response.json();

    await page.addInitScript((t) => {
      window.localStorage.setItem('txio_token', t);
      window.localStorage.setItem('txio_viewMode', 'app');
    }, token);

    await page.goto(baseURL || '/');
    await use(page);
  },
});

export { expect } from '@playwright/test';
