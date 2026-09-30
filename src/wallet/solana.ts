import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction
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

type SolanaInstructionParams = {
    programId: string;
    accounts: SolanaAccountMeta[];
    data: string;
    dataEncoding: 'hex' | 'base64' | 'utf8';
};

const buildSolanaInstruction = (params: SolanaInstructionParams): TransactionInstruction => {
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

    return instruction;
};

const TOKEN_PROGRAM_IDS = new Set([
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
]);
/** Size of a base SPL token account; the mint, owner and amount live in its first 72 bytes. */
const SPL_TOKEN_ACCOUNT_MIN_LEN = 165;
const SPL_MINT_DECIMALS_OFFSET = 44;

export interface SolanaAccountSnapshot {
    lamports: number;
    owner: string;
    data: Uint8Array;
}

export interface SolanaBalanceDiffEntry {
    /** Wallet that owns the balance (the token account's owner for SPL tokens). */
    account: string;
    /** 'SOL' for lamports, otherwise the SPL token mint. */
    asset: string;
    /** Signed change in base units (lamports or token base units). */
    delta: string;
    decimals: number | null;
}

/** Reads (mint, owner, amount) from a base SPL token account, or null when the account is not one. */
const readSplTokenAccount = (snapshot: SolanaAccountSnapshot | null): { mint: string; owner: string; amount: bigint } | null => {
    if (!snapshot || !TOKEN_PROGRAM_IDS.has(snapshot.owner) || snapshot.data.length < SPL_TOKEN_ACCOUNT_MIN_LEN) return null;
    const bytes = snapshot.data;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
        mint: new PublicKey(bytes.slice(0, 32)).toBase58(),
        owner: new PublicKey(bytes.slice(32, 64)).toBase58(),
        amount: view.getBigUint64(64, true)
    };
};

/**
 * Diffs account state before and after a simulation. Only accounts present in
 * both snapshots are compared; an account missing from either side (for
 * example one the simulation created) is skipped rather than guessed at.
 */
export const computeSolanaBalanceDiff = (
    addresses: string[],
    pre: (SolanaAccountSnapshot | null)[],
    post: (SolanaAccountSnapshot | null)[],
    mintDecimals: Record<string, number | null> = {}
): SolanaBalanceDiffEntry[] => {
    const entries: SolanaBalanceDiffEntry[] = [];
    addresses.forEach((address, i) => {
        const before = pre[i];
        const after = post[i];
        if (!before || !after) return;

        const lamportDelta = BigInt(after.lamports) - BigInt(before.lamports);
        if (lamportDelta !== BigInt(0)) {
            entries.push({ account: address, asset: 'SOL', delta: lamportDelta.toString(), decimals: 9 });
        }

        const tokenBefore = readSplTokenAccount(before);
        const tokenAfter = readSplTokenAccount(after);
        if (tokenBefore && tokenAfter && tokenBefore.mint === tokenAfter.mint) {
            const tokenDelta = tokenAfter.amount - tokenBefore.amount;
            if (tokenDelta !== BigInt(0)) {
                entries.push({
                    account: tokenAfter.owner,
                    asset: tokenAfter.mint,
                    delta: tokenDelta.toString(),
                    decimals: mintDecimals[tokenAfter.mint] ?? null
                });
            }
        }
    });
    return entries;
};

const snapshotFromInfo = (info: { lamports: number; owner: PublicKey; data: Uint8Array } | null): SolanaAccountSnapshot | null =>
    info ? { lamports: info.lamports, owner: info.owner.toBase58(), data: info.data } : null;

/**
 * Simulates a single-instruction transaction against the RPC without
 * signing it. The fee payer must be an existing, funded account — the
 * connected wallet when there is one.
 *
 * `balanceDiff` is present only when the RPC returned post-simulation states
 * for the requested accounts and their pre-states could be read; otherwise it
 * is left out and the review hides the balance section.
 */
export async function simulateSolanaTransaction(params: SolanaInstructionParams & {
    rpcUrl: string;
    feePayer: string;
}): Promise<{ err: unknown; logs: string[] | null; unitsConsumed: number | null; balanceDiff?: SolanaBalanceDiffEntry[] }> {
    const instruction = buildSolanaInstruction(params);
    let payerKey: PublicKey;
    try {
        payerKey = new PublicKey(params.feePayer.trim());
    } catch {
        throw new Error(`Invalid fee payer: "${params.feePayer}"`);
    }

    const connection = new Connection(params.rpcUrl, 'confirmed');
    const { blockhash } = await withTimeout(
        connection.getLatestBlockhash('confirmed'),
        'Fetch recent blockhash'
    );
    const message = new TransactionMessage({
        payerKey,
        recentBlockhash: blockhash,
        instructions: [instruction]
    }).compileToV0Message();

    // Accounts whose value could change: the payer and every writable account.
    const watched = [...new Set([payerKey.toBase58(), ...params.accounts.filter((a) => a.isWritable).map((a) => a.pubkey.trim())])]
        .filter((address) => {
            try {
                new PublicKey(address);
                return true;
            } catch {
                return false;
            }
        })
        .slice(0, 20);

    let preInfos: ({ lamports: number; owner: PublicKey; data: Uint8Array } | null)[] | null = null;
    try {
        preInfos = await withTimeout(
            connection.getMultipleAccountsInfo(watched.map((a) => new PublicKey(a)), 'confirmed'),
            'Read account states'
        );
    } catch {
        preInfos = null; // No pre-state, so no diff; the rest of the simulation still runs.
    }

    const { value } = await withTimeout(
        connection.simulateTransaction(new VersionedTransaction(message), {
            sigVerify: false,
            replaceRecentBlockhash: true,
            accounts: { encoding: 'base64', addresses: watched }
        }),
        'Simulate transaction'
    );

    let balanceDiff: SolanaBalanceDiffEntry[] | undefined;
    if (!value.err && preInfos && value.accounts && value.accounts.length === watched.length) {
        const post: (SolanaAccountSnapshot | null)[] = value.accounts.map((account) =>
            account && Array.isArray(account.data)
                ? { lamports: account.lamports, owner: account.owner, data: Uint8Array.from(Buffer.from(account.data[0], 'base64')) }
                : null
        );
        const pre = preInfos.map(snapshotFromInfo);
        const mints = new Set<string>();
        for (const snapshot of [...pre, ...post]) {
            const token = readSplTokenAccount(snapshot);
            if (token) mints.add(token.mint);
        }
        const mintDecimals: Record<string, number | null> = {};
        if (mints.size > 0) {
            try {
                const mintList = [...mints];
                const infos = await withTimeout(
                    connection.getMultipleAccountsInfo(mintList.map((m) => new PublicKey(m)), 'confirmed'),
                    'Read token decimals'
                );
                infos.forEach((info, i) => {
                    mintDecimals[mintList[i]] = info && info.data.length > SPL_MINT_DECIMALS_OFFSET ? info.data[SPL_MINT_DECIMALS_OFFSET] : null;
                });
            } catch {
                /* decimals stay unknown; amounts are shown in base units */
            }
        }
        balanceDiff = computeSolanaBalanceDiff(watched, pre, post, mintDecimals);
    }

    return {
        err: value.err ?? null,
        logs: value.logs ?? null,
        unitsConsumed: value.unitsConsumed ?? null,
        ...(balanceDiff ? { balanceDiff } : {})
    };
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

    const instruction = buildSolanaInstruction(params);

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

    // Prefer sign-then-send through the app's RPC: the transaction then lands
    // on the network selected in txio, even if the wallet's own UI is set to
    // a different cluster. Fall back to the wallet submitting it only when it
    // can't sign without sending.
    if (!provider.signTransaction) {
        const result = await withTimeout(
            provider.signAndSendTransaction!(transaction),
            'Sign and send transaction',
            60_000
        );
        return { signature: result.signature };
    }

    const signed = await withTimeout(
        provider.signTransaction(transaction),
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

/**
 * Signs and submits a pre-built raw Solana transaction (base64-encoded
 * `VersionedTransaction` bytes) — the shape LI.FI's `advanced/stepTransaction`
 * returns for a Solana-origin cross-chain send. Unlike `sendSolanaTransaction`,
 * this does not construct the transaction from instruction params; it only
 * deserializes, signs, and submits what the caller already has.
 */
export async function signAndSendRawSolanaTransaction(params: {
    walletId: WalletId;
    rpcUrl: string;
    transactionBase64: string;
}): Promise<{ signature: string }> {
    const provider = getSolanaProviderById(params.walletId);
    if (!provider) {
        throw new Error('Wallet is not connected or does not support Solana.');
    }
    if (!provider.signTransaction && !provider.signAndSendTransaction) {
        throw new Error('This wallet does not support signing transactions.');
    }

    const transaction = VersionedTransaction.deserialize(Buffer.from(params.transactionBase64, 'base64'));
    const connection = new Connection(params.rpcUrl, 'confirmed');

    if (!provider.signTransaction) {
        const result = await withTimeout(
            provider.signAndSendTransaction!(transaction),
            'Sign and send transaction',
            60_000
        );
        return { signature: result.signature };
    }

    const signed = (await withTimeout(
        provider.signTransaction(transaction),
        'Sign transaction',
        60_000
    )) as VersionedTransaction;

    const { blockhash, lastValidBlockHeight } = await withTimeout(
        connection.getLatestBlockhash('confirmed'),
        'Fetch recent blockhash'
    );
    const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

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
