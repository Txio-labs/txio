import type { Network } from '@/types';
import { starknetChainIdFor, starknetNetworkForChainId } from '@/services/starknet';
import type { ConnectedWallet, WalletChainInfo, WalletId } from './types';

/**
 * Starknet wallets through get-starknet's wallet-standard store. The store
 * discovers injected extensions (window.starknet_*) and exposes each one's
 * Starknet wallet API (`wallet_requestAccounts`, `wallet_addInvokeTransaction`,
 * ...) behind one `request` function, so Ready (formerly Argent X) and
 * Braavos go through the same code.
 */

type StarknetRequest = (call: { type: string; params?: unknown }) => Promise<unknown>;

interface StarknetStandardWallet {
    name: string;
    features: Record<string, unknown>;
}

const CONNECT_TIMEOUT_MS = 30_000;
const SIGN_TIMEOUT_MS = 120_000;

/** Wallet-API ids each extension reports, plus older injected names. */
const WALLET_MATCH: Record<'ready-wallet' | 'braavos', { ids: string[]; names: RegExp; label: string }> = {
    'ready-wallet': { ids: ['argentX', 'ready'], names: /argent|ready/i, label: 'Ready' },
    braavos: { ids: ['braavos'], names: /braavos/i, label: 'Braavos' }
};

type StarknetWalletId = keyof typeof WALLET_MATCH;

const isStarknetWalletId = (id: WalletId): id is StarknetWalletId => id in WALLET_MATCH;

type Store = { getWallets: () => StarknetStandardWallet[] };
let storePromise: Promise<Store> | null = null;

const getStore = (): Promise<Store> | null => {
    if (typeof window === 'undefined') return null;
    if (!storePromise) {
        storePromise = import('@starknet-io/get-starknet-core').then(({ createStore }) => createStore() as unknown as Store);
        storePromise.catch(() => {
            storePromise = null;
        });
    }
    return storePromise;
};

const walletApi = (wallet: StarknetStandardWallet) =>
    wallet.features['starknet:walletApi'] as { id?: string; request: StarknetRequest } | undefined;

const findWallet = async (walletId: WalletId): Promise<StarknetStandardWallet | undefined> => {
    if (!isStarknetWalletId(walletId)) return undefined;
    const store = await getStore();
    if (!store) return undefined;
    const match = WALLET_MATCH[walletId];
    return store.getWallets().find((w) => {
        const id = walletApi(w)?.id ?? '';
        return match.ids.includes(id) || match.names.test(w.name);
    });
};

const withTimeout = async <T>(promise: Promise<T>, label: string, ms: number): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timer = setTimeout(
                    () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s. Check the extension popup or try again.`)),
                    ms
                );
            })
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
};

const requestFor = async (walletId: WalletId): Promise<StarknetRequest> => {
    const wallet = await findWallet(walletId);
    const api = wallet && walletApi(wallet);
    if (!api) throw new Error(`${isStarknetWalletId(walletId) ? WALLET_MATCH[walletId].label : walletId} is not installed.`);
    return api.request.bind(api);
};

const chainInfo = (chainId: string): WalletChainInfo => {
    const network = starknetNetworkForChainId(chainId);
    return {
        id: `starknet:${chainId}`,
        family: 'starknet',
        name: network === 'mainnet' ? 'Starknet' : network === 'testnet' ? 'Starknet Sepolia' : 'Starknet (custom)',
        network: network ?? 'custom',
        isSupported: network !== null
    };
};

const buildWallet = (walletId: StarknetWalletId, address: string, chainId: string): ConnectedWallet => ({
    id: walletId,
    name: WALLET_MATCH[walletId].label,
    address,
    family: 'starknet',
    chain: chainInfo(chainId),
    connectorName: WALLET_MATCH[walletId].label,
    connectedAt: Date.now()
});

const readAccount = async (walletId: StarknetWalletId, silent: boolean): Promise<ConnectedWallet | null> => {
    const request = await requestFor(walletId);
    const label = WALLET_MATCH[walletId].label;
    const accounts = (await withTimeout(
        request({ type: 'wallet_requestAccounts', params: { silent_mode: silent } }),
        label,
        silent ? 5_000 : CONNECT_TIMEOUT_MS
    )) as string[] | undefined;
    const address = accounts?.[0];
    if (!address) {
        if (silent) return null;
        throw new Error(`${label} did not return an account.`);
    }
    const chainId = String(await request({ type: 'wallet_requestChainId' }));
    return buildWallet(walletId, address, chainId);
};

export const detectStarknetWallets = async (): Promise<Record<StarknetWalletId, boolean>> => {
    const [ready, braavos] = await Promise.all([findWallet('ready-wallet'), findWallet('braavos')]);
    return { 'ready-wallet': Boolean(ready), braavos: Boolean(braavos) };
};

export const connectStarknetWallet = async (walletId: WalletId): Promise<ConnectedWallet> => {
    if (!isStarknetWalletId(walletId)) throw new Error(`Starknet wallet "${walletId}" is not supported.`);
    try {
        return (await readAccount(walletId, false)) as ConnectedWallet;
    } catch (err) {
        throw new Error(err instanceof Error && err.message ? err.message : `${WALLET_MATCH[walletId].label} connection failed.`);
    }
};

/** Silent restore: never opens an approval popup. */
export const restoreStarknetWallet = async (walletId: WalletId): Promise<ConnectedWallet | null> => {
    if (!isStarknetWalletId(walletId)) return null;
    try {
        return await readAccount(walletId, true);
    } catch {
        return null;
    }
};

export const disconnectStarknetWallet = async (walletId: WalletId): Promise<void> => {
    const wallet = await findWallet(walletId);
    const disconnect = wallet?.features['standard:disconnect'] as { disconnect?: () => Promise<void> } | undefined;
    try {
        await disconnect?.disconnect?.();
    } catch {
        // The wallet keeps its own permission; dropping our session is enough.
    }
};

/**
 * The wallet's request function, after asking the wallet to switch to the
 * app's network when it is on another one. Requests that wait on the user
 * (signing) get a long timeout.
 */
export async function requestStarknetWallet(walletId: WalletId, network: Network): Promise<StarknetRequest> {
    const request = await requestFor(walletId);
    const wanted = starknetChainIdFor(network);
    const current = String(await request({ type: 'wallet_requestChainId' })).toLowerCase();
    if (current !== wanted) {
        await withTimeout(request({ type: 'wallet_switchStarknetChain', params: { chainId: wanted } }), 'Switch network', CONNECT_TIMEOUT_MS);
    }
    return (call) => withTimeout(request(call), call.type, SIGN_TIMEOUT_MS);
}

/**
 * Asks the wallet to switch to the app's network when it is on another one,
 * then submits the calls. The wallet estimates the fee, signs and broadcasts.
 */
export async function signAndSubmitStarknetCalls(
    walletId: WalletId,
    network: Network,
    calls: { contractAddress: string; entrypoint: string; calldata: string[] }[]
): Promise<{ hash: string }> {
    if (network === 'localnet') {
        throw new Error('Browser wallets cannot sign for a local Starknet node. Switch to testnet or mainnet.');
    }
    const request = await requestStarknetWallet(walletId, network);
    const result = (await withTimeout(
        request({
            type: 'wallet_addInvokeTransaction',
            params: {
                calls: calls.map((c) => ({ contract_address: c.contractAddress, entry_point: c.entrypoint, calldata: c.calldata }))
            }
        }),
        'Sign and submit transaction',
        SIGN_TIMEOUT_MS
    )) as { transaction_hash?: string } | undefined;
    const hash = result?.transaction_hash;
    if (!hash) throw new Error('Wallet did not return a transaction hash.');
    return { hash };
}
