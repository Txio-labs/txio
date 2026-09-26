import {
    coinbaseWallet,
    metaMask,
    walletConnect
} from 'wagmi/connectors';
import { ledgerConnector } from './hardware/ledgerConnector';
import {
    createConfig,
    http
} from 'wagmi';
import {
    arbitrum,
    arbitrumSepolia,
    avalanche,
    avalancheFuji,
    base,
    baseSepolia,
    bsc,
    bscTestnet,
    mainnet,
    optimism,
    optimismSepolia,
    polygon,
    polygonAmoy,
    sepolia,
    zora
} from 'wagmi/chains';

export const EVM_CHAINS = [
    mainnet,
    base,
    polygon,
    arbitrum,
    optimism,
    avalanche,
    bsc,
    zora,
    sepolia,
    baseSepolia,
    polygonAmoy,
    arbitrumSepolia,
    optimismSepolia,
    avalancheFuji,
    bscTestnet
] as const;

const walletConnectProjectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const isWalletConnectConfigured =
    Boolean(walletConnectProjectId);

// WalletConnect checks metadata.url against the page's actual origin and
// warns (some wallets refuse the pairing) on a mismatch, so this must track
// wherever the app is actually served from rather than a single hardcoded
// domain.
const appUrl =
    typeof window !== 'undefined'
        ? window.location.origin
        : 'https://txio.xyz';

export const EVM_CONNECTOR_IDS = {
    metamask: 'metaMaskSDK',
    walletconnect: 'walletConnect',
    'coinbase-wallet': 'coinbaseWalletSDK',
    phantom: 'app.phantom',
    'trust-wallet': 'com.trustwallet.app',
    rainbow: 'me.rainbow',
    'okx-wallet': 'com.okex.wallet',
    'brave-wallet': 'com.brave.wallet',
    ledger: 'ledger'
} as const;

const connectors = [
    metaMask(),
    coinbaseWallet({
        appName: 'txio'
    }),
    ledgerConnector(),
    ...(walletConnectProjectId
        ? [
              walletConnect({
                  projectId:
                      walletConnectProjectId,
                  showQrModal: true,
                  metadata: {
                      name: 'txio',
                      description:
                          'Multi-chain wallet session for txio workspace.',
                      url: appUrl,
                      icons: []
                  }
              })
          ]
        : [])
] as const;

export const wagmiConfig = createConfig({
    chains: EVM_CHAINS,
    connectors,
    ssr: true,
    multiInjectedProviderDiscovery: true,
    syncConnectedChain: true,
    transports: {
        [mainnet.id]: http(),
        [base.id]: http(),
        [polygon.id]: http(),
        [arbitrum.id]: http(),
        [optimism.id]: http(),
        [avalanche.id]: http(),
        [bsc.id]: http(),
        [zora.id]: http(),
        [sepolia.id]: http(),
        [baseSepolia.id]: http(),
        [polygonAmoy.id]: http(),
        [arbitrumSepolia.id]: http(),
        [optimismSepolia.id]: http(),
        [avalancheFuji.id]: http(),
        [bscTestnet.id]: http()
    }
});

export const DEFAULT_EVM_CHAIN_ID =
    mainnet.id;
