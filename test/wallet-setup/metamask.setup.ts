import { defineWalletSetup } from '@synthetixio/synpress';
import { MetaMask } from '@synthetixio/synpress-metamask/playwright';

// Well-known public test mnemonic (the standard Hardhat/Anvil default account
// seed used throughout the Ethereum dev tooling ecosystem). No real funds are
// ever associated with it — this only exercises the connect/approve UI flow.
const SEED_PHRASE =
    'test test test test test test test test test test test junk';
const PASSWORD = 'Tester@1234';

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
    // synpress-metamask bundles its own playwright-core, whose BrowserContext
    // type doesn't structurally match the top-level playwright-core type that
    // `context` is inferred as here — same runtime shape, mismatched types.
    const metamask = new MetaMask(context as never, walletPage as never, PASSWORD);
    await metamask.importWallet(SEED_PHRASE);
});
