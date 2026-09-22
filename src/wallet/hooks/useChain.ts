import { useWallet } from './useWallet';

export const useChain = () => {
    const wallet = useWallet();

    return {
        chain:
            wallet.currentWallet
                ?.chain || null,
        family:
            wallet.currentWallet
                ?.family || null,
        evmChains:
            wallet.evmChains,
        switchChain:
            wallet.switchEvmChain,
        isSwitchable:
            wallet.currentWallet
                ?.family === 'evm'
    };
};
