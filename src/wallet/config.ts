import {
    coinbaseWallet,
    metaMask
} from 'wagmi/connectors';
import { ledgerConnector } from './hardware/ledgerConnector';
import {
    createConfig,
    fallback,
    http,
    type Transport
} from 'wagmi';
import {
    arbitrum,
    arbitrumSepolia,
    avalanche,
    avalancheFuji,
    base,
    baseSepolia,
    blast,
    boba,
    bsc,
    bscTestnet,
    celo,
    cronos,
    fantom,
    gnosis,
    linea,
    mainnet,
    mantle,
    monad,
    monadTestnet,
    moonbeam,
    optimism,
    optimismSepolia,
    polygon,
    polygonAmoy,
    polygonZkEvm,
    scroll,
    sepolia,
    zksync,
    zora
} from 'wagmi/chains';
import { EVM_CHAINS as RPC_EVM_CHAINS } from '@/lib/constants';

// Every EVM chain the RPC picker offers (lib/constants EVM_CHAINS) must be
// here too, or wallets can't switch to it and transactions on it fail with
// "Unsupported EVM chain". A test keeps the two lists in sync.
export const EVM_CHAINS = [
    mainnet,
    base,
    polygon,
    arbitrum,
    optimism,
    avalanche,
    bsc,
    zora,
    monad,
    linea,
    scroll,
    blast,
    zksync,
    polygonZkEvm,
    mantle,
    celo,
    gnosis,
    cronos,
    fantom,
    moonbeam,
    boba,
    sepolia,
    baseSepolia,
    polygonAmoy,
    arbitrumSepolia,
    optimismSepolia,
    avalancheFuji,
    bscTestnet,
    monadTestnet
] as const;

/** The verified keyless RPC from lib/constants, else the chain's own default. */
const rpcFor = (chainId: number) => http(RPC_EVM_CHAINS.find((c) => c.id === chainId)?.rpcUrl);

export const EVM_CONNECTOR_IDS = {
    metamask: 'metaMaskSDK',
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
    ledgerConnector()
] as const;

export const wagmiConfig = createConfig({
    chains: EVM_CHAINS,
    connectors,
    ssr: true,
    multiInjectedProviderDiscovery: true,
    syncConnectedChain: true,
    transports: {
        // rank: true has viem periodically benchmark both endpoints and route
        // to whichever is healthy, so one public RPC going down doesn't fail
        // (or CORS-spam) every call before falling through.
        [mainnet.id]: fallback(
            [
                http('https://ethereum-rpc.publicnode.com'),
                http('https://cloudflare-eth.com')
            ],
            { rank: true }
        ),
        ...(Object.fromEntries(
            EVM_CHAINS.filter((c) => c.id !== mainnet.id).map((c) => [c.id, rpcFor(c.id)])
        ) as Record<(typeof EVM_CHAINS)[number]['id'], Transport>)
    }
});

export const DEFAULT_EVM_CHAIN_ID =
    mainnet.id;
