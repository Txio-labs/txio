import { useWallet } from './useWallet';

export const useConnectWallet =
    () => {
        const wallet = useWallet();

        return {
            connect: wallet.connect,
            disconnect:
                wallet.disconnect,
            openModal:
                wallet.openModal,
            closeModal:
                wallet.closeModal,
            pendingWalletId:
                wallet.pendingWalletId,
            status: wallet.status,
            error: wallet.error
        };
    };
