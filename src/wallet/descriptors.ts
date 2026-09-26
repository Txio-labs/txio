import { WalletDescriptor } from './types';

export const WALLET_DESCRIPTORS: WalletDescriptor[] =
    [
        {
            id: 'metamask',
            name: 'MetaMask',
            shortName: 'MM',
            chainFamily: 'evm',
            methods: ['injected', 'deeplink'],
            tags: [
                'ethereum',
                'evm',
                'popular',
                'browser'
            ],
            description:
                'Browser-first Ethereum wallet with injected provider support.',
            installUrl:
                'https://metamask.io/download/',
            mobileUrl:
                'https://metamask.app.link/dapp/',
            badge: 'Popular',
            iconSeed: 'metamask',
            isFeatured: true
        },
        {
            id: 'walletconnect',
            name: 'WalletConnect',
            shortName: 'WC',
            chainFamily: 'evm',
            methods: ['walletconnect', 'deeplink'],
            tags: [
                'evm',
                'qr',
                'mobile',
                'universal'
            ],
            description:
                'QR and deep-link sessions for mobile and desktop wallets.',
            installUrl:
                'https://walletconnect.network/',
            badge: 'QR',
            iconSeed: 'walletconnect',
            isFeatured: true
        },
        {
            id: 'coinbase-wallet',
            name: 'Coinbase Wallet',
            shortName: 'CB',
            chainFamily: 'evm',
            methods: ['sdk', 'deeplink'],
            tags: [
                'evm',
                'coinbase',
                'mobile'
            ],
            description:
                'Coinbase wallet connector for EVM networks.',
            installUrl:
                'https://www.coinbase.com/wallet',
            mobileUrl:
                'https://go.cb-w.com/dapp',
            iconSeed: 'coinbase'
        },
        {
            id: 'phantom',
            name: 'Phantom',
            shortName: 'PH',
            chainFamily: 'evm',
            methods: ['injected', 'deeplink'],
            tags: [
                'evm',
                'multichain',
                'solana',
                'browser'
            ],
            description:
                'Multi-chain wallet supporting EVM networks with injected provider.',
            installUrl:
                'https://phantom.com/download',
            mobileUrl:
                'https://phantom.app/ul/browse/',
            badge: 'Multi-chain',
            iconSeed: 'phantom',
            isFeatured: true
        },
        {
            id: 'trust-wallet',
            name: 'Trust Wallet',
            shortName: 'TW',
            chainFamily: 'evm',
            methods: ['injected', 'deeplink'],
            tags: [
                'evm',
                'mobile',
                'multichain',
                'browser'
            ],
            description:
                'Non-custodial multi-chain wallet supporting EVM and 100+ networks.',
            installUrl:
                'https://trustwallet.com/download',
            mobileUrl:
                'https://link.trustwallet.com/open_url?coin_id=60&url=',
            iconSeed: 'trust-wallet'
        },
        {
            id: 'rainbow',
            name: 'Rainbow',
            shortName: 'RB',
            chainFamily: 'evm',
            methods: ['injected', 'deeplink'],
            tags: [
                'evm',
                'mobile',
                'browser',
                'nft'
            ],
            description:
                'Fun, simple Ethereum wallet with NFT and DeFi support.',
            installUrl:
                'https://rainbow.me/download',
            mobileUrl:
                'https://rnbwapp.com/wc?uri=',
            iconSeed: 'rainbow'
        },
        {
            id: 'okx-wallet',
            name: 'OKX Wallet',
            shortName: 'OKX',
            chainFamily: 'evm',
            methods: ['injected', 'deeplink'],
            tags: [
                'evm',
                'multichain',
                'exchange',
                'browser'
            ],
            description:
                'Multi-chain Web3 wallet from OKX with cross-chain swap capabilities.',
            installUrl:
                'https://www.okx.com/web3',
            iconSeed: 'okx-wallet'
        },
        {
            id: 'brave-wallet',
            name: 'Brave Wallet',
            shortName: 'BW',
            chainFamily: 'evm',
            methods: ['injected'],
            tags: [
                'evm',
                'browser',
                'native',
                'hardware'
            ],
            description:
                'Native browser wallet built into Brave with hardware wallet support.',
            installUrl:
                'https://brave.com/download',
            iconSeed: 'brave-wallet'
        },
        {
            id: 'rabby',
            name: 'Rabby Wallet',
            shortName: 'RW',
            chainFamily: 'evm',
            methods: ['injected'],
            tags: [
                'evm',
                'multichain',
                'security',
                'browser'
            ],
            description:
                'Multi-chain EVM wallet with pre-transaction security checks.',
            installUrl:
                'https://rabby.io/',
            iconSeed: 'rabby'
        },
        {
            id: 'zerion',
            name: 'Zerion Wallet',
            shortName: 'ZR',
            chainFamily: 'evm',
            methods: ['injected', 'deeplink'],
            tags: [
                'evm',
                'portfolio',
                'multichain',
                'browser'
            ],
            description:
                'Portfolio-tracking EVM wallet with injected provider support.',
            installUrl:
                'https://zerion.io/wallet',
            iconSeed: 'zerion'
        },
        {
            id: 'oneinch',
            name: '1inch Wallet',
            shortName: '1IN',
            chainFamily: 'evm',
            methods: ['injected', 'deeplink'],
            tags: [
                'evm',
                'dex',
                'mobile'
            ],
            description:
                "1inch's mobile-first EVM wallet with DEX aggregation.",
            installUrl:
                'https://1inch.io/wallet/',
            iconSeed: 'oneinch'
        },
        {
            id: 'frame',
            name: 'Frame',
            shortName: 'FR',
            chainFamily: 'evm',
            methods: ['injected'],
            tags: [
                'evm',
                'desktop',
                'privacy'
            ],
            description:
                'Desktop-native Ethereum wallet running as a system-level provider.',
            installUrl:
                'https://frame.sh/',
            iconSeed: 'frame'
        },
        {
            id: 'ledger',
            name: 'Ledger',
            shortName: 'LG',
            chainFamily: 'evm',
            methods: ['hardware'],
            tags: [
                'evm',
                'hardware'
            ],
            description:
                'Sign with a Ledger hardware wallet over WebHID — your private key never leaves the device.',
            installUrl:
                'https://www.ledger.com/',
            iconSeed: 'ledger'
        },
        {
            id: 'sui-wallet',
            name: 'Sui Wallet',
            shortName: 'SW',
            chainFamily: 'sui',
            methods: ['wallet-standard'],
            tags: [
                'sui',
                'wallet-standard',
                'browser'
            ],
            description:
                'Official-style Sui wallet standard integration via dApp Kit.',
            installUrl:
                'https://chromewebstore.google.com/search/sui%20wallet',
            badge: 'Sui',
            iconSeed: 'sui-wallet',
            isFeatured: true
        },
        {
            id: 'suiet',
            name: 'Suiet',
            shortName: 'ST',
            chainFamily: 'sui',
            methods: ['wallet-standard'],
            tags: [
                'sui',
                'wallet-standard',
                'browser'
            ],
            description:
                'Sui wallet standard connector for Suiet users.',
            installUrl:
                'https://suiet.app/',
            iconSeed: 'suiet'
        },
        {
            id: 'ethos',
            name: 'Ethos',
            shortName: 'ET',
            chainFamily: 'sui',
            methods: ['wallet-standard'],
            tags: [
                'sui',
                'wallet-standard',
                'browser'
            ],
            description:
                'Ethos wallet support carried through the Sui wallet standard.',
            installUrl:
                'https://ethoswallet.xyz/',
            iconSeed: 'ethos'
        },
        {
            id: 'nightly-sui',
            name: 'Nightly',
            shortName: 'NT',
            chainFamily: 'sui',
            methods: ['wallet-standard'],
            tags: [
                'sui',
                'wallet-standard',
                'multichain',
                'browser'
            ],
            description:
                'Multi-chain wallet with Sui support via the wallet standard.',
            installUrl:
                'https://nightly.app/download',
            iconSeed: 'nightly'
        },
        {
            id: 'okx-wallet-sui',
            name: 'OKX Wallet',
            shortName: 'OKX',
            chainFamily: 'sui',
            methods: ['wallet-standard'],
            tags: [
                'sui',
                'wallet-standard',
                'exchange',
                'browser'
            ],
            description:
                "OKX's Sui-chain wallet, connected via the wallet standard.",
            installUrl:
                'https://www.okx.com/web3',
            iconSeed: 'okx-wallet'
        },
        {
            id: 'slush',
            name: 'Slush',
            shortName: 'SL',
            chainFamily: 'sui',
            methods: ['wallet-standard'],
            tags: [
                'sui',
                'wallet-standard',
                'browser'
            ],
            description:
                "Mysten Labs' Slush wallet for Sui, connected via the wallet standard.",
            installUrl:
                'https://slush.app/',
            iconSeed: 'slush',
            isFeatured: true
        },
        {
            id: 'lobstr',
            name: 'LOBSTR',
            shortName: 'LB',
            chainFamily: 'stellar',
            methods: [
                'sdk',
                'walletconnect',
                'deeplink'
            ],
            tags: [
                'stellar',
                'lobstr',
                'mobile',
                'qr'
            ],
            description:
                'LOBSTR signer and mobile wallet support for Stellar ecosystem flows.',
            installUrl:
                'https://lobstr.co/signer-extension/',
            mobileUrl:
                'https://lobstr.co/',
            badge: 'Stellar',
            iconSeed: 'lobstr',
            isFeatured: true
        },
        {
            id: 'freighter',
            name: 'Freighter',
            shortName: 'FR',
            chainFamily: 'stellar',
            methods: ['sdk', 'injected'],
            tags: [
                'stellar',
                'freighter',
                'extension'
            ],
            description:
                'Freighter-compatible Stellar wallet access with extension detection.',
            installUrl:
                'https://www.freighter.app/',
            iconSeed: 'freighter',
            isFeatured: true
        },
        {
            id: 'albedo',
            name: 'Albedo',
            shortName: 'AL',
            chainFamily: 'stellar',
            methods: ['sdk', 'deeplink'],
            tags: [
                'stellar',
                'albedo',
                'web'
            ],
            description:
                'Albedo web-based Stellar signer with passwordless flows.',
            installUrl:
                'https://albedo.link/',
            iconSeed: 'albedo'
        },
        {
            id: 'xbull',
            name: 'xBull',
            shortName: 'XB',
            chainFamily: 'stellar',
            methods: ['sdk', 'injected'],
            tags: [
                'stellar',
                'xbull',
                'extension'
            ],
            description:
                'xBull browser extension for Stellar account management.',
            installUrl:
                'https://xbull.app/',
            iconSeed: 'xbull'
        },
        {
            id: 'stellar-walletconnect',
            name: 'WalletConnect',
            shortName: 'WC',
            chainFamily: 'stellar',
            methods: ['walletconnect', 'deeplink'],
            tags: [
                'stellar',
                'qr',
                'mobile',
                'universal'
            ],
            description:
                'QR and pairing-URI sessions for WalletConnect-compatible Stellar wallets.',
            installUrl:
                'https://walletconnect.network/',
            badge: 'QR',
            iconSeed: 'walletconnect'
        },
        {
            id: 'rabet',
            name: 'Rabet',
            shortName: 'RB',
            chainFamily: 'stellar',
            methods: ['sdk', 'injected'],
            tags: [
                'stellar',
                'rabet',
                'extension'
            ],
            description:
                'Rabet browser extension Stellar wallet.',
            installUrl:
                'https://rabet.io/',
            iconSeed: 'rabet'
        },
        {
            id: 'hana-wallet',
            name: 'Hana Wallet',
            shortName: 'HN',
            chainFamily: 'stellar',
            methods: ['sdk', 'injected'],
            tags: [
                'stellar',
                'hana',
                'multichain'
            ],
            description:
                'Hana multi-chain wallet with Stellar support.',
            installUrl:
                'https://hanawallet.io/',
            iconSeed: 'hana-wallet'
        },
        {
            id: 'phantom-solana',
            name: 'Phantom',
            shortName: 'PH',
            chainFamily: 'solana',
            methods: ['injected'],
            tags: [
                'solana',
                'phantom',
                'browser'
            ],
            description:
                'Phantom wallet support for Solana.',
            installUrl:
                'https://phantom.com/download',
            mobileUrl:
                'https://phantom.app/ul/browse/',
            badge: 'Solana',
            iconSeed: 'phantom'
        },
        {
            id: 'solflare',
            name: 'Solflare',
            shortName: 'SF',
            chainFamily: 'solana',
            methods: ['injected'],
            tags: [
                'solana',
                'solflare',
                'browser'
            ],
            description:
                'Solflare wallet support for Solana.',
            installUrl:
                'https://solflare.com/',
            iconSeed: 'solflare'
        },
        {
            id: 'backpack',
            name: 'Backpack',
            shortName: 'BP',
            chainFamily: 'solana',
            methods: ['injected'],
            tags: [
                'solana',
                'backpack',
                'browser'
            ],
            description:
                'Backpack wallet support for Solana.',
            installUrl:
                'https://backpack.app/',
            iconSeed: 'backpack'
        },
        {
            id: 'glow',
            name: 'Glow',
            shortName: 'GL',
            chainFamily: 'solana',
            methods: ['injected'],
            tags: [
                'solana',
                'glow',
                'browser'
            ],
            description:
                'Glow wallet support for Solana.',
            installUrl:
                'https://glow.app/',
            iconSeed: 'glow'
        },
        {
            id: 'nightly-solana',
            name: 'Nightly',
            shortName: 'NT',
            chainFamily: 'solana',
            methods: ['injected'],
            tags: [
                'solana',
                'nightly',
                'multichain',
                'browser'
            ],
            description:
                'Multi-chain wallet with Solana support via injected provider.',
            installUrl:
                'https://nightly.app/download',
            iconSeed: 'nightly'
        },
        {
            id: 'petra',
            name: 'Petra',
            shortName: 'PT',
            chainFamily: 'aptos',
            methods: ['injected'],
            tags: [
                'aptos',
                'petra',
                'browser'
            ],
            description:
                'Petra wallet support for Aptos.',
            installUrl:
                'https://petra.app/',
            iconSeed: 'petra'
        },
        {
            id: 'martian',
            name: 'Martian',
            shortName: 'MT',
            chainFamily: 'aptos',
            methods: ['injected'],
            tags: [
                'aptos',
                'martian',
                'browser'
            ],
            description:
                'Martian wallet support for Aptos.',
            installUrl:
                'https://martianwallet.xyz/',
            iconSeed: 'martian'
        },
        {
            id: 'pontem',
            name: 'Pontem Wallet',
            shortName: 'PM',
            chainFamily: 'aptos',
            methods: ['injected'],
            tags: [
                'aptos',
                'pontem',
                'browser'
            ],
            description:
                'Pontem wallet support for Aptos.',
            installUrl:
                'https://pontem.network/pontem-wallet',
            iconSeed: 'pontem'
        },
        {
            id: 'rise-wallet',
            name: 'Rise Wallet',
            shortName: 'RS',
            chainFamily: 'aptos',
            methods: ['injected'],
            tags: [
                'aptos',
                'rise',
                'browser'
            ],
            description:
                'Rise wallet support for Aptos.',
            installUrl:
                'https://risewallet.io/',
            iconSeed: 'rise-wallet'
        },
        {
            id: 'nightly-aptos',
            name: 'Nightly',
            shortName: 'NT',
            chainFamily: 'aptos',
            methods: ['injected'],
            tags: [
                'aptos',
                'nightly',
                'multichain',
                'browser'
            ],
            description:
                'Multi-chain wallet with Aptos support via injected provider.',
            installUrl:
                'https://nightly.app/download',
            iconSeed: 'nightly'
        }
    ];

export const FEATURED_WALLET_IDS =
    new Set(
        WALLET_DESCRIPTORS.filter(
            (wallet) =>
                wallet.isFeatured
        ).map((wallet) => wallet.id)
    );

export const getWalletDescriptor = (
    walletId: WalletDescriptor['id']
) => {
    return WALLET_DESCRIPTORS.find(
        (wallet) =>
            wallet.id === walletId
    );
};

