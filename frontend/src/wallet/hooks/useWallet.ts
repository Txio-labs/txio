import { useWalletManagerContext } from '../provider/WalletManagerProvider';

export const useWallet = () => {
    const context =
        useWalletManagerContext();

    return {
        ...context,
        address:
            context.currentWallet
                ?.address || null,
        chain:
            context.currentWallet
                ?.chain || null,
        family:
            context.currentWallet
                ?.family || null,
        isConnected:
            context.status ===
                'connected' &&
            Boolean(
                context.currentWallet
            ),
        isConnecting:
            context.status ===
            'connecting'
    };
};
