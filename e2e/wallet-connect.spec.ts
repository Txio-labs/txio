import { metaMaskFixtures } from '@synthetixio/synpress-metamask/playwright';
import walletSetup from '../test/wallet-setup/metamask.setup';

const test = metaMaskFixtures(walletSetup);
const { expect } = test;

// This app stores its session as a bearer token in localStorage
// (txio_token), not a cookie — see src/services/api.ts / src/lib/store.ts.
const apiBase = process.env.TEST_API_URL || 'http://localhost:8000/api/v1';
const testEmail = `wallet-test-${Date.now()}@example.com`;
const testPassword = 'correct-horse-battery-staple';

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    await request.post(`${apiBase}/auth/register`, {
        data: { email: testEmail, password: testPassword },
    });
    await request.dispose();
});

test('connects a real MetaMask wallet from the workspace wallet tab', async ({
    context,
    metamask,
    extensionId,
}) => {
    void extensionId;

    const loginResponse = await context.request.post(`${apiBase}/auth/login`, {
        data: { email: testEmail, password: testPassword },
    });
    const { token } = await loginResponse.json();

    await context.addInitScript((t) => {
        window.localStorage.setItem('txio_token', t);
        window.localStorage.setItem('txio_viewMode', 'app');
    }, token);

    const page = await context.newPage();
    await page.goto('/workspace');
    await expect(page).toHaveURL('/workspace');

    // Brand-new accounts land on workspace onboarding first.
    const createWorkspaceButton = page.getByRole('button', { name: 'Create Workspace' });
    await createWorkspaceButton.waitFor({ state: 'visible', timeout: 15000 });
    await createWorkspaceButton.click();
    await expect(createWorkspaceButton).not.toBeVisible({ timeout: 15000 });

    // Open the wallet connect surface via the sidebar/right panel wallet tab.
    const connectTrigger = page.getByRole('button', { name: /connect wallet/i }).first();
    await connectTrigger.click();

    const metamaskName = page.getByText('MetaMask', { exact: true });
    await expect(metamaskName).toBeVisible({ timeout: 10000 });
    // WalletCard has no test id; walk up from the wallet's name text to the
    // nearest ancestor that also has a "Connect" button, i.e. its own card.
    const metamaskCard = metamaskName
        .locator('xpath=ancestor::*[.//button[normalize-space(text())="Connect"]][1]')
        .first();
    await metamaskCard.getByRole('button', { name: 'Connect', exact: true }).click();

    // MetaMask's own approval popup opens in a separate extension window;
    // give it a moment to spawn before Synpress looks for it.
    await page.waitForTimeout(2000);

    // Synpress drives the popup directly (and unlocks it if needed).
    // NOTE: as of @synthetixio/synpress-metamask 0.0.14, connectToDapp()'s
    // internal confirmConnection() clicks "Next" then "Connect" back-to-back
    // with no wait between them; MetaMask's popup can navigate/close after
    // the first click, so the second click intermittently races a closing
    // page ("Target page, context or browser has been closed"). This is a
    // known upstream timing issue, not an app bug — retry covers it.
    await metamask.connectToDapp();

    await expect(page.getByText(/0x[a-fA-F0-9]{4}/)).toBeVisible({ timeout: 15000 });
});
