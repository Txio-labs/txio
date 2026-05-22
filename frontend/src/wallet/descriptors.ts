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
                'optional'
            ],
            description:
                'Prepared for Phantom EVM support when the provider is available.',
            installUrl:
                'https://phantom.com/download',
            mobileUrl:
                'https://phantom.app/ul/browse/',
            badge: 'Prepared',
            iconSeed: 'phantom'
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
            iconSeed: 'freighter'
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

