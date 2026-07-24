import { describe, it, expect } from 'vitest';
import { getWalletExplorerUrl } from './utils';
import type { ConnectedWallet } from './types';

const suiWallet = {
    family: 'sui',
    address: '0xabc',
    chain: { network: 'mainnet' }
} as unknown as ConnectedWallet;

const evmWallet = {
    family: 'evm',
    address: '0xdead',
    chain: { id: 'eip155:1' }
} as unknown as ConnectedWallet;

const stellarWallet = {
    family: 'stellar',
    address: 'GABC',
    chain: { network: 'public' }
} as unknown as ConnectedWallet;

describe('getWalletExplorerUrl', () => {
    it('uses preferred Sui explorer', () => {
        const url = getWalletExplorerUrl(suiWallet, {
            explorer: 'suivision',
            evmExplorer: 'family',
            stellarExplorer: 'stellarexpert'
        });
        expect(url).toContain('suivision');
        expect(url).toContain('0xabc');
    });

    it('uses chain-native EVM explorer by default', () => {
        const url = getWalletExplorerUrl(evmWallet, {
            explorer: 'suiscan',
            evmExplorer: 'family',
            stellarExplorer: 'stellarexpert'
        });
        expect(url).toBe('https://etherscan.io/address/0xdead');
    });

    it('honors EVM Blockscout preference when available', () => {
        const url = getWalletExplorerUrl(evmWallet, {
            explorer: 'suiscan',
            evmExplorer: 'blockscout',
            stellarExplorer: 'stellarexpert'
        });
        expect(url).toBe('https://eth.blockscout.com/address/0xdead');
    });

    it('falls back to family EVM explorer when Blockscout has no entry', () => {
        const zora = {
            family: 'evm',
            address: '0xzz',
            chain: { id: 'eip155:7777777' }
        } as unknown as ConnectedWallet;
        const url = getWalletExplorerUrl(zora, {
            explorer: 'suiscan',
            evmExplorer: 'blockscout',
            stellarExplorer: 'stellarexpert'
        });
        expect(url).toBe('https://explorer.zora.energy/address/0xzz');
    });

    it('uses StellarExpert by default', () => {
        const url = getWalletExplorerUrl(stellarWallet, {
            explorer: 'suiscan',
            evmExplorer: 'family',
            stellarExplorer: 'stellarexpert'
        });
        expect(url).toBe(
            'https://stellar.expert/explorer/public/account/GABC'
        );
    });

    it('honors StellarChain preference', () => {
        const url = getWalletExplorerUrl(stellarWallet, {
            explorer: 'suiscan',
            evmExplorer: 'family',
            stellarExplorer: 'stellarchain'
        });
        expect(url).toBe('https://stellarchain.io/accounts/GABC');
    });

    it('accepts legacy Sui-only explorer string arg', () => {
        const url = getWalletExplorerUrl(suiWallet, 'suiexplorer');
        expect(url).toContain('suiexplorer');
    });
});
