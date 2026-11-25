// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { STARTER_COLLECTIONS, starterCollectionName } from './starterCollections';
import { RequestType } from '@/types';

const WALLET = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const byId = (id: string) => STARTER_COLLECTIONS.find((s) => s.id === id)!;

describe('starter collections', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('builds as many requests as each starter advertises, all on the chosen network', async () => {
        vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('{}', { status: 200 })));
        for (const starter of STARTER_COLLECTIONS) {
            for (const network of starter.networks) {
                const { requests } = await starter.build({ network, walletAddress: WALLET });
                expect(requests).toHaveLength(starter.requestCount);
                for (const r of requests) {
                    expect(r.network).toBe(network);
                    expect(r.rpcParams.chain).toBe(starter.chain);
                }
            }
        }
    });

    it('fills in the per-network native XLM contract ID', async () => {
        const soroban = byId('stellar-soroban-rpc');
        const testnet = await soroban.build({ network: 'testnet', walletAddress: WALLET });
        const futurenet = await soroban.build({ network: 'devnet', walletAddress: WALLET });
        const contractOf = (b: typeof testnet) => b.requests.find((r) => r.type === RequestType.TRANSACTION)!.stellarTxParams!.contractId;
        expect(contractOf(testnet)).toBe('CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC');
        expect(contractOf(futurenet)).toBe('CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2HV2KN7OHT');
        const events = testnet.requests.find((r) => r.rpcParams.method === 'getEvents')!;
        expect(events.rpcParams.params[0].startLedger).toBe('latest-1000');
    });

    it('uses a connected wallet without calling Friendbot', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const { requests } = await byId('stellar-horizon').build({ network: 'testnet', walletAddress: WALLET });
        expect(requests.find((r) => r.rpcParams.method === 'stellar_getAccount')!.rpcParams.params).toEqual([WALLET]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('funds a fresh account through the network Friendbot when no wallet is connected', async () => {
        const fetchMock = vi.fn().mockImplementation(async () => new Response('{}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const { requests, notes } = await byId('stellar-horizon').build({ network: 'devnet' });
        const account = requests.find((r) => r.rpcParams.method === 'stellar_getAccount')!.rpcParams.params[0];
        expect(account).toMatch(/^G[A-Z2-7]{55}$/);
        expect(fetchMock.mock.calls[0][0]).toBe(`https://friendbot-futurenet.stellar.org?addr=${account}`);
        expect(notes.join(' ')).toMatch(/funded by Friendbot/);
    });

    it('names an installed starter after its network', () => {
        expect(starterCollectionName(byId('stellar-soroban-rpc'), 'devnet')).toBe('Soroban RPC (Futurenet)');
    });
});
