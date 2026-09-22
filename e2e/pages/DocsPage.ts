import { Page, Locator, expect } from '@playwright/test';

export class DocsPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
  }

  async goto() {
    await this.page.goto('/docs');
  }

  async waitForLoad() {
    await expect(this.heading).toBeVisible();
  }

}
