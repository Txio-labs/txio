import {
    coinbaseWallet,
    metaMask,
    walletConnect
} from '@wagmi/connectors';
import {
    createConfig,
    http
} from 'wagmi';
import {
    base,
    baseSepolia,
    mainnet,
    sepolia
} from 'wagmi/chains';

export const EVM_CHAINS = [
    mainnet,
    base,
    sepolia,
    baseSepolia
] as const;

const walletConnectProjectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const isWalletConnectConfigured =
    Boolean(walletConnectProjectId);

export const EVM_CONNECTOR_IDS = {
    metamask: 'metaMaskSDK',
    walletconnect: 'walletConnect',
    'coinbase-wallet':
        'coinbaseWalletSDK'
} as const;

const connectors = [
    metaMask(),
    coinbaseWallet({
        appName: 'txio'
    }),
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
                      url:
                          'https://txio.dev',
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
    multiInjectedProviderDiscovery:
        true,
    syncConnectedChain: true,
    transports: {
        [mainnet.id]: http(),
        [base.id]: http(),
        [sepolia.id]: http(),
        [baseSepolia.id]: http()
    }
});

export const DEFAULT_EVM_CHAIN_ID =
    mainnet.id;
