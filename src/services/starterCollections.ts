/**
 * Ready-made collections a user can add to a workspace in one click. Each
 * starter belongs to one chain and offers network presets: installing it on
 * a network fills in the values that differ per network (contract IDs,
 * ledger keys, a funded test account) and saves every request with that
 * network.
 */
import { DEFAULT_MOVE_CALL, STELLAR_FRIENDBOT_URLS, STELLAR_NETWORK_NAMES, STELLAR_PASSPHRASES } from '@/lib/constants';
import { RequestType, type ChainId, type Network, type RequestItem, type StellarTxParams } from '@/types';

export interface StarterContext {
    network: Network;
    /** Address of a connected wallet on the starter's chain, if any. */
    walletAddress?: string | null;
}

export interface StarterBuild {
    requests: RequestItem[];
    /** Extra lines for the collection description (e.g. which account was used). */
    notes: string[];
}

export interface StarterCollection {
    id: string;
    chain: ChainId;
    chainLabel: string;
    title: string;
    summary: string;
    networks: Network[];
    requestCount: number;
    networkName: (network: Network) => string;
    build: (ctx: StarterContext) => Promise<StarterBuild>;
}

let seq = 0;
const rpc = (chain: ChainId, network: Network, name: string, method: string, params: unknown[]): RequestItem => ({
    id: `starter-${++seq}`,
    type: RequestType.RPC,
    name,
    network,
    rpcParams: { method, params, chain },
    moveParams: { ...DEFAULT_MOVE_CALL }
});

/* -------------------------------------------------------------------- Stellar */

const STELLAR_PRESETS: Network[] = ['testnet', 'devnet'];

const loadStellar = () => import('@stellar/stellar-sdk');

/** Native XLM's Stellar Asset Contract ID and the ledger key of its instance entry. */
const nativeAssetContract = async (network: Network) => {
    const { Address, Asset, xdr } = await loadStellar();
    const contractId = Asset.native().contractId(STELLAR_PASSPHRASES[network]);
    const instanceKey = xdr.LedgerKey.contractData(
        new xdr.LedgerKeyContractData({
            contract: new Address(contractId).toScAddress(),
            key: xdr.ScVal.scvLedgerKeyContractInstance(),
            durability: xdr.ContractDataDurability.persistent()
        })
    ).toXDR('base64');
    return { contractId, instanceKey };
};

/**
 * The account the account-level requests read. A connected Stellar wallet
 * wins; otherwise a fresh account funded by Friendbot, so every request
 * returns data the first time it runs.
 */
const stellarAccount = async (ctx: StarterContext): Promise<{ address: string; note: string }> => {
    if (ctx.walletAddress && /^G[A-Z2-7]{55}$/.test(ctx.walletAddress)) {
        return { address: ctx.walletAddress, note: `Account requests read your connected wallet, ${ctx.walletAddress}.` };
    }
    const { Keypair } = await loadStellar();
    const address = Keypair.random().publicKey();
    const friendbot = STELLAR_FRIENDBOT_URLS[ctx.network];
    let funded = false;
    if (friendbot) {
        try {
            const res = await fetch(`${friendbot}?addr=${encodeURIComponent(address)}`);
            funded = res.ok;
        } catch {
            // Friendbot down: keep the address, the account requests return 404 until it is funded.
        }
    }
    return {
        address,
        note: funded
            ? `Account requests read ${address}, a new account funded by Friendbot.`
            : `Account requests read ${address}. Friendbot could not fund it, so they return "not found" until it is funded.`
    };
};

const stellarTx = (network: Network, name: string, params: StellarTxParams): RequestItem => ({
    ...rpc('stellar', network, name, '', []),
    type: RequestType.TRANSACTION,
    stellarTxParams: params
});

const sorobanRpcStarter: StarterCollection = {
    id: 'stellar-soroban-rpc',
    chain: 'stellar',
    chainLabel: 'Stellar',
    title: 'Soroban RPC',
    summary: 'Node health, ledgers, fees, contract state and events, plus read-only calls to the native XLM contract.',
    networks: STELLAR_PRESETS,
    requestCount: 11,
    networkName: (n) => STELLAR_NETWORK_NAMES[n],
    build: async (ctx) => {
        const { network } = ctx;
        const [{ contractId, instanceKey }, account] = await Promise.all([nativeAssetContract(network), stellarAccount(ctx)]);
        const r = (name: string, method: string, params: Record<string, unknown> = {}) => rpc('stellar', network, name, method, [params]);
        return {
            notes: [
                `Native XLM contract: ${contractId}.`,
                account.note,
                'getEvents and getTransactions start at "latest-N", which resolves to the node\'s latest ledger minus N when the request runs.'
            ],
            requests: [
                r('Node health', 'getHealth'),
                r('Network passphrase and protocol', 'getNetwork'),
                r('Latest ledger', 'getLatestLedger'),
                r('RPC and Core versions', 'getVersionInfo'),
                r('Inclusion fee stats', 'getFeeStats'),
                r('XLM contract instance entry', 'getLedgerEntries', { keys: [instanceKey] }),
                r('Recent XLM contract events', 'getEvents', {
                    startLedger: 'latest-1000',
                    filters: [{ type: 'contract', contractIds: [contractId] }],
                    pagination: { limit: 10 }
                }),
                r('Recent transactions', 'getTransactions', { startLedger: 'latest-20', pagination: { limit: 5 } }),
                stellarTx(network, 'Simulate: XLM balance of the account', {
                    contractId,
                    function: 'balance',
                    args: [{ id: 'a1', type: 'address', value: account.address }]
                }),
                stellarTx(network, 'Simulate: XLM decimals', { contractId, function: 'decimals', args: [] }),
                stellarTx(network, 'Simulate: XLM symbol', { contractId, function: 'symbol', args: [] })
            ]
        };
    }
};

export const STARTER_COLLECTIONS: StarterCollection[] = [sorobanRpcStarter];

/** Name a starter gets once installed on a network, e.g. "Soroban RPC (Futurenet)". */
export const starterCollectionName = (starter: StarterCollection, network: Network): string =>
    `${starter.title} (${starter.networkName(network)})`;
