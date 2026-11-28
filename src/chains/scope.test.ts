import { describe, expect, it } from 'vitest';
import type { ChainId, CollectionNode, EnvironmentVariable } from '@/types';
import { collectionsForChain, envVarsForChain, historyForChain, requestChain, tabBelongsTo, tabChain } from './scope';
import { CHAIN_ORDER, CHAIN_WORKSPACES, chainFeatures } from './registry';
import { RPC_CHAINS } from '@/lib/constants';

const req = (id: string, chain?: ChainId): CollectionNode => ({
    id,
    type: 'request',
    name: id,
    requestData: { rpcParams: { method: 'm', params: [], ...(chain ? { chain } : {}) } } as never,
});

const collection = (id: string, children: CollectionNode[]): CollectionNode => ({ id, type: 'collection', name: id, children });
const folder = (id: string, children: CollectionNode[]): CollectionNode => ({ id, type: 'folder', name: id, children });

describe('requestChain', () => {
    it('treats a request with no chain as Sui', () => {
        expect(requestChain({ rpcParams: { method: '', params: [] } })).toBe('sui');
        expect(requestChain(undefined)).toBe('sui');
        expect(requestChain({ rpcParams: { method: '', params: [], chain: 'starknet' } })).toBe('starknet');
    });
});

describe('tabChain', () => {
    it('assigns request and explorer tabs to their chain and leaves shared tabs unowned', () => {
        expect(tabChain({ type: 'rpc', data: { rpcParams: { chain: 'evm' } } })).toBe('evm');
        expect(tabChain({ type: 'rpc', data: undefined })).toBe('sui');
        expect(tabChain({ type: 'starknet_explorer' })).toBe('starknet');
        expect(tabChain({ type: 'explorer' })).toBe('sui');
        expect(tabChain({ type: 'settings' })).toBeNull();
        expect(tabChain({ type: 'new_request' })).toBeNull();
        expect(tabChain({ type: 'new_request', data: { rpcParams: { chain: 'aptos' } } })).toBe('aptos');
    });

    it('shows shared tabs in every workspace and chain tabs only in their own', () => {
        expect(tabBelongsTo({ type: 'history' }, 'solana')).toBe(true);
        expect(tabBelongsTo({ type: 'evm_explorer' }, 'solana')).toBe(false);
        expect(tabBelongsTo({ type: 'evm_explorer' }, 'evm')).toBe(true);
    });
});

describe('collectionsForChain', () => {
    const mixed = collection('mixed', [req('a', 'starknet'), req('b', 'evm'), folder('f', [req('c', 'evm')]), folder('empty', [])]);
    const suiOnly = collection('sui', [req('legacy')]);
    const blank = collection('blank', []);

    it('keeps collections with a request on the chain, cut down to those requests', () => {
        const [only, ...rest] = collectionsForChain([mixed, suiOnly, blank], 'starknet');
        expect(only.id).toBe('mixed');
        expect(only.children?.map((c) => c.id)).toEqual(['a', 'empty']);
        expect(rest.map((c) => c.id)).toEqual(['blank']);
    });

    it('keeps folders that still hold a matching request', () => {
        const [evm] = collectionsForChain([mixed], 'evm');
        expect(evm.children?.map((c) => c.id)).toEqual(['b', 'f', 'empty']);
        expect(evm.children?.[1].children?.map((c) => c.id)).toEqual(['c']);
    });

    it('treats legacy requests as Sui and shows empty collections everywhere', () => {
        expect(collectionsForChain([suiOnly, blank], 'sui').map((c) => c.id)).toEqual(['sui', 'blank']);
        expect(collectionsForChain([suiOnly, blank], 'aptos').map((c) => c.id)).toEqual(['blank']);
    });

    it('does not change the input', () => {
        const before = JSON.stringify(mixed);
        collectionsForChain([mixed], 'evm');
        expect(JSON.stringify(mixed)).toBe(before);
    });
});

describe('history and environment filters', () => {
    it('keeps history entries for the chain only', () => {
        const history = [{ rpcParams: { method: '', params: [], chain: 'evm' as const } }, { rpcParams: { method: '', params: [] } }];
        expect(historyForChain(history, 'evm')).toHaveLength(1);
        expect(historyForChain(history, 'sui')).toHaveLength(1);
        expect(historyForChain(history, 'stellar')).toHaveLength(0);
    });

    it('applies untagged and "all" variables everywhere and tagged ones to their chain', () => {
        const vars: EnvironmentVariable[] = [
            { key: 'A', value: '1', enabled: true },
            { key: 'B', value: '2', enabled: true, chain: 'all' },
            { key: 'C', value: '3', enabled: true, chain: 'starknet' },
        ];
        expect(envVarsForChain(vars, 'starknet').map((v) => v.key)).toEqual(['A', 'B', 'C']);
        expect(envVarsForChain(vars, 'sui').map((v) => v.key)).toEqual(['A', 'B']);
    });
});

describe('chain registry', () => {
    it('has a workspace for every chain the request editor supports', () => {
        expect([...CHAIN_ORDER].sort()).toEqual(RPC_CHAINS.map((c) => c.id).sort());
        for (const id of CHAIN_ORDER) expect(CHAIN_WORKSPACES[id].id).toBe(id);
    });

    it('gives every chain its own layout', () => {
        const layouts = CHAIN_ORDER.map((id) => CHAIN_WORKSPACES[id].layout);
        expect(new Set(layouts).size).toBe(CHAIN_ORDER.length);
    });

    it('shows EVM token approvals only in the EVM workspace', () => {
        for (const id of CHAIN_ORDER) expect(chainFeatures(id).has('approvals')).toBe(id === 'evm');
    });

    it('links each chain to its own explorer and never to another chain\'s', () => {
        for (const id of CHAIN_ORDER) {
            const explorer = CHAIN_WORKSPACES[id].explorer;
            if (explorer) expect(tabChain({ type: explorer })).toBe(id);
        }
    });
});
