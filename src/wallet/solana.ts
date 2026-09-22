import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction
} from '@solana/web3.js';
import type {
    ConnectedWallet,
    WalletChainInfo,
    WalletId
} from './types';
import type { SolanaAccountMeta } from '../types';

export type SolanaNetworkName =
    | 'mainnet-beta'
    | 'testnet'
    | 'devnet';

const CONNECT_TIMEOUT_MS = 30_000;

const SOLANA_WALLET_META: Partial<
    Record<
        WalletId,
        { name: string; connectorName: string }
    >
> = {
    'phantom-solana': {
        name: 'Phantom',
        connectorName: 'Phantom'
    },
    solflare: {
        name: 'Solflare',
        connectorName: 'Solflare'
    },
    backpack: {
        name: 'Backpack',
        connectorName: 'Backpack'
    },
    glow: {
        name: 'Glow',
        connectorName: 'Glow'
    },
    'nightly-solana': {
        name: 'Nightly',
        connectorName: 'Nightly'
    }
};

const solanaNetwork =
    process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet'
        ? 'devnet'
        : process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'testnet'
          ? 'testnet'
          : 'mainnet-beta';

// api.mainnet-beta.solana.com / api.testnet.solana.com return HTTP 403 for
// any request carrying a browser Origin header — see the matching note in
// lib/constants.ts SOLANA_NETWORKS. Devnet's official endpoint has no such
// restriction and PublicNode doesn't host a devnet mirror, so it's kept.
const SOLANA_NETWORKS: Record<
    SolanaNetworkName,
    {
        chain: WalletChainInfo;
        rpcUrl: string;
    }
> = {
    'mainnet-beta': {
        chain: {
            id: 'solana:mainnet-beta',
            family: 'solana',
            name: 'Solana',
            network: 'mainnet-beta',
            isSupported: true
        },
        rpcUrl: 'https://solana-rpc.publicnode.com'
    },
    testnet: {
        chain: {
            id: 'solana:testnet',
            family: 'solana',
            name: 'Solana Testnet',
            network: 'testnet',
            isSupported: true
        },
        rpcUrl: 'https://solana-testnet-rpc.publicnode.com'
    },
    devnet: {
        chain: {
            id: 'solana:devnet',
            family: 'solana',
            name: 'Solana Devnet',
            network: 'devnet',
            isSupported: true
        },
        rpcUrl: 'https://api.devnet.solana.com'
    }
};

const getChainConfig = () => SOLANA_NETWORKS[solanaNetwork];

const buildWallet = (
    walletId: WalletId,
    address: string
): ConnectedWallet => {
    const meta = SOLANA_WALLET_META[walletId] ?? {
        name: String(walletId),
        connectorName: String(walletId)
    };

    return {
        id: walletId,
        name: meta.name,
        address,
        family: 'solana',
        chain: getChainConfig().chain,
        connectorName: meta.connectorName,
        connectedAt: Date.now()
    };
};

const getBrowserWindow = () =>
    typeof window !== 'undefined' ? window : undefined;

type SolanaProviderApi = {
    publicKey?: { toString: () => string } | null;
    connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
    disconnect: () => Promise<void>;
    isConnected?: boolean;
    // Standard Solana wallet-adapter signing methods. Phantom, Solflare, and
    // Backpack all implement at least signTransaction; signAndSendTransaction
    // is a common but not universal convenience method some wallets add on
    // top, letting the wallet itself submit to the RPC it trusts.
    signTransaction?: (transaction: unknown) => Promise<unknown>;
    signAndSendTransaction?: (transaction: unknown) => Promise<{ signature: string }>;
};

const withTimeout = async <T>(
    promise: Promise<T>,
    label: string,
    ms = CONNECT_TIMEOUT_MS
): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timer = setTimeout(() => {
                    reject(
                        new Error(
                            `${label} timed out after ${Math.round(ms / 1000)}s. Check the extension popup or try again.`
                        )
                    );
                }, ms);
            })
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
};

const getPhantomProvider = (): SolanaProviderApi | undefined => {
    const w = getBrowserWindow() as any;
    if (w?.phantom?.solana?.isPhantom) {
        return w.phantom.solana;
    }
    return undefined;
};

const getSolflareProvider = (): SolanaProviderApi | undefined => {
    const w = getBrowserWindow() as any;
    if (w?.solflare?.isSolflare) {
        return w.solflare;
    }
    return undefined;
};

const getBackpackProvider = (): SolanaProviderApi | undefined => {
    const w = getBrowserWindow() as any;
    if (w?.backpack) {
        return w.backpack;
    }
    return undefined;
};

const getGlowProvider = (): SolanaProviderApi | undefined => {
    const w = getBrowserWindow() as any;
    if (w?.glow) {
        return w.glow;
    }
    return undefined;
};

const getNightlySolanaProvider = (): SolanaProviderApi | undefined => {
    const w = getBrowserWindow() as any;
    if (w?.nightly?.solana) {
        return w.nightly.solana;
    }
    return undefined;
};

const connectProvider = async (
    provider: SolanaProviderApi | undefined,
    walletId: WalletId,
    name: string
): Promise<ConnectedWallet> => {
    if (!provider) {
        throw new Error(`${name} is not installed.`);
    }

    try {
        const response = await withTimeout(
            provider.connect(),
            name
        );
        const address = response.publicKey.toString();
        if (!address) {
            throw new Error(`${name} did not return a public key.`);
        }
        return buildWallet(walletId, address);
    } catch (err: any) {
        throw new Error(err?.message || `${name} connection failed.`);
    }
};

const restoreProvider = async (
    provider: SolanaProviderApi | undefined,
    walletId: WalletId,
    name: string
): Promise<ConnectedWallet | null> => {
    if (!provider) return null;

    try {
        const response = await withTimeout(
            provider.connect({ onlyIfTrusted: true }),
            `${name} restore`,
            5000
        );
        const address = response.publicKey.toString();
        return address ? buildWallet(walletId, address) : null;
    } catch {
        return null;
    }
};

const getSolanaProviderById = (
    walletId: WalletId
): SolanaProviderApi | undefined => {
    switch (walletId) {
        case 'phantom-solana':
            return getPhantomProvider();
        case 'solflare':
            return getSolflareProvider();
        case 'backpack':
            return getBackpackProvider();
        case 'glow':
            return getGlowProvider();
        case 'nightly-solana':
            return getNightlySolanaProvider();
        default:
            return undefined;
    }
};

function decodeInstructionData(
    data: string,
    encoding: 'hex' | 'base64' | 'utf8'
): Buffer {
    const trimmed = data.trim();
    if (!trimmed) return Buffer.alloc(0);

    switch (encoding) {
        case 'hex':
            return Buffer.from(trimmed.replace(/^0x/i, ''), 'hex');
        case 'base64':
            return Buffer.from(trimmed, 'base64');
        case 'utf8':
        default:
            return Buffer.from(trimmed, 'utf8');
    }
}

/**
 * Builds a single-instruction Solana transaction, signs it via the
 * connected wallet's injected provider, and submits it to the given RPC
 * endpoint. This is the real execution path behind the RPC Builder's
 * Solana "Transaction" mode — it does not simulate or mock anything.
 */
export async function sendSolanaTransaction(params: {
    walletId: WalletId;
    rpcUrl: string;
    programId: string;
    accounts: SolanaAccountMeta[];
    data: string;
    dataEncoding: 'hex' | 'base64' | 'utf8';
}): Promise<{ signature: string }> {
    const provider = getSolanaProviderById(params.walletId);
    if (!provider) {
        throw new Error('Wallet is not connected or does not support Solana.');
    }
    if (!provider.publicKey) {
        throw new Error('Wallet has no active Solana public key.');
    }
    if (!provider.signTransaction && !provider.signAndSendTransaction) {
        throw new Error('This wallet does not support signing transactions.');
    }

    let programIdKey: PublicKey;
    try {
        programIdKey = new PublicKey(params.programId.trim());
    } catch {
        throw new Error(`Invalid program ID: "${params.programId}"`);
    }

    const keys = params.accounts.map((account, index) => {
        try {
            return {
                pubkey: new PublicKey(account.pubkey.trim()),
                isSigner: account.isSigner,
                isWritable: account.isWritable
            };
        } catch {
            throw new Error(`Invalid account pubkey at row ${index + 1}: "${account.pubkey}"`);
        }
    });

    const instructionData = decodeInstructionData(params.data, params.dataEncoding);

    const instruction = new TransactionInstruction({
        keys,
        programId: programIdKey,
        data: instructionData
    });

    const connection = new Connection(params.rpcUrl, 'confirmed');
    const { blockhash, lastValidBlockHeight } = await withTimeout(
        connection.getLatestBlockhash('confirmed'),
        'Fetch recent blockhash'
    );

    const transaction = new Transaction({
        feePayer: new PublicKey(provider.publicKey.toString()),
        blockhash,
        lastValidBlockHeight
    }).add(instruction);

    // Prefer the wallet's own signAndSendTransaction when available — it
    // lets the wallet submit via the RPC it trusts (and, for hardware
    // wallets, avoids a second round-trip). Fall back to sign-then-send
    // ourselves against the app's configured RPC endpoint.
    if (provider.signAndSendTransaction) {
        const result = await withTimeout(
            provider.signAndSendTransaction(transaction),
            'Sign and send transaction',
            60_000
        );
        return { signature: result.signature };
    }

    const signed = await withTimeout(
        provider.signTransaction!(transaction),
        'Sign transaction',
        60_000
    );

    const rawTransaction = (signed as Transaction).serialize();
    const signature = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false
    });

    await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
    );

    return { signature };
}

export const detectSolanaWallets = async () => {
    return {
        'phantom-solana': Boolean(getPhantomProvider()),
        solflare: Boolean(getSolflareProvider()),
        backpack: Boolean(getBackpackProvider()),
        glow: Boolean(getGlowProvider()),
        'nightly-solana': Boolean(getNightlySolanaProvider())
    };
};

export const connectSolanaWallet = async (
    walletId: WalletId
): Promise<ConnectedWallet> => {
    switch (walletId) {
        case 'phantom-solana':
            return connectProvider(getPhantomProvider(), walletId, 'Phantom');
        case 'solflare':
            return connectProvider(getSolflareProvider(), walletId, 'Solflare');
        case 'backpack':
            return connectProvider(getBackpackProvider(), walletId, 'Backpack');
        case 'glow':
            return connectProvider(getGlowProvider(), walletId, 'Glow');
        case 'nightly-solana':
            return connectProvider(getNightlySolanaProvider(), walletId, 'Nightly');
        default:
            throw new Error(`Solana wallet "${walletId}" is not supported.`);
    }
};

export const restoreSolanaWallet = async (
    walletId: WalletId
): Promise<ConnectedWallet | null> => {
    switch (walletId) {
        case 'phantom-solana':
            return restoreProvider(getPhantomProvider(), walletId, 'Phantom');
        case 'solflare':
            return restoreProvider(getSolflareProvider(), walletId, 'Solflare');
        case 'backpack':
            return restoreProvider(getBackpackProvider(), walletId, 'Backpack');
        case 'glow':
            return restoreProvider(getGlowProvider(), walletId, 'Glow');
        case 'nightly-solana':
            return restoreProvider(getNightlySolanaProvider(), walletId, 'Nightly');
        default:
            return null;
    }
};

export const disconnectSolanaWallet = async (
    walletId: WalletId
): Promise<void> => {
    let provider: SolanaProviderApi | undefined;
    switch (walletId) {
        case 'phantom-solana':
            provider = getPhantomProvider();
            break;
        case 'solflare':
            provider = getSolflareProvider();
            break;
        case 'backpack':
            provider = getBackpackProvider();
            break;
        case 'glow':
            provider = getGlowProvider();
            break;
        case 'nightly-solana':
            provider = getNightlySolanaProvider();
            break;
    }
    
    if (provider && provider.disconnect) {
        try {
            await provider.disconnect();
        } catch {
            // ignore
        }
    }
};
