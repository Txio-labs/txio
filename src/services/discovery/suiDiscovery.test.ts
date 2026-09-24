import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { suiDiscoveryAdapter, renderSuiType } from './suiDiscovery';
import { DiscoveryError } from './types';

const fetchMock = vi.fn<typeof fetch>();

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Real payload shape for sui_getNormalizedMoveFunction on 0x2::coin::join,
// captured live from a Sui testnet fullnode — join<T0>(&mut Coin<T0>, Coin<T0>).
const JOIN_FN = {
    visibility: 'Public',
    isEntry: true,
    typeParameters: [{ abilities: [] }],
    parameters: [
        { MutableReference: { Struct: { address: '0x2', module: 'coin', name: 'Coin', typeArguments: [{ TypeParameter: 0 }] } } },
        { Struct: { address: '0x2', module: 'coin', name: 'Coin', typeArguments: [{ TypeParameter: 0 }] } }
    ],
    return: []
};

// Real payload shape for 0x2::coin::mint_and_transfer — includes a &mut
// TxContext trailing parameter, captured live the same way.
const MINT_AND_TRANSFER_FN = {
    visibility: 'Public',
    isEntry: true,
    typeParameters: [{ abilities: [] }],
    parameters: [
        { MutableReference: { Struct: { address: '0x2', module: 'coin', name: 'TreasuryCap', typeArguments: [{ TypeParameter: 0 }] } } },
        'U64',
        'Address',
        { MutableReference: { Struct: { address: '0x2', module: 'tx_context', name: 'TxContext', typeArguments: [] } } }
    ],
    return: []
};

const MODULES_BY_PACKAGE_RESULT = {
    coin: {
        fileFormatVersion: 7,
        address: '0x2',
        name: 'coin',
        exposedFunctions: {
            join: JOIN_FN,
            mint_and_transfer: MINT_AND_TRANSFER_FN,
            // A private helper — should be filtered out (not callable in a PTB).
            some_private_helper: { visibility: 'Private', isEntry: false, typeParameters: [], parameters: [], return: [] }
        }
    }
};

const PACKAGE_ID = '0x0000000000000000000000000000000000000000000000000000000000000002';

describe('SuiDiscoveryAdapter.discoverPackage', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('rejects an identifier that is not a valid Sui address before calling RPC', async () => {
        await expect(suiDiscoveryAdapter.discoverPackage('not-an-address', 'testnet')).rejects.toMatchObject({
            code: 'INVALID_IDENTIFIER'
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a non-DiscoveryError the underlying RPC throws by wrapping it', async () => {
        fetchMock.mockRejectedValue(new TypeError('network down'));
        await expect(suiDiscoveryAdapter.discoverPackage(PACKAGE_ID, 'testnet')).rejects.toBeInstanceOf(DiscoveryError);
    });

    it('discovers modules and filters out non-callable functions', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ jsonrpc: '2.0', id: 1, result: MODULES_BY_PACKAGE_RESULT }));

        const pkg = await suiDiscoveryAdapter.discoverPackage(PACKAGE_ID, 'testnet');

        expect(pkg.chain).toBe('sui');
        expect(pkg.modules).toHaveLength(1);
        expect(pkg.modules[0].name).toBe('coin');
        const fnNames = pkg.modules[0].functions.map((f) => f.name);
        expect(fnNames).toContain('join');
        expect(fnNames).toContain('mint_and_transfer');
        expect(fnNames).not.toContain('some_private_helper');
    });

    it('classifies a generic Coin<T0> object parameter as a wallet-resolvable coin selector', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ jsonrpc: '2.0', id: 1, result: MODULES_BY_PACKAGE_RESULT }));
        const pkg = await suiDiscoveryAdapter.discoverPackage(PACKAGE_ID, 'testnet');
        const join = pkg.modules[0].functions.find((f) => f.name === 'join')!;

        expect(join.typeParameters).toEqual([{ name: 'T0', constraints: [] }]);
        expect(join.parameters).toHaveLength(2);

        const [mutCoin, coin] = join.parameters;
        expect(mutCoin.kind).toBe('coin');
        expect(mutCoin.resolution).toBe('wallet');
        expect(mutCoin.isMutable).toBe(true);
        expect(mutCoin.genericSlot).toBe(0); // generic type arg, not statically known
        expect(coin.kind).toBe('coin');
        expect(coin.isMutable).toBe(false);
    });

    it('marks &mut TxContext as automatic and never asks the user for it', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ jsonrpc: '2.0', id: 1, result: MODULES_BY_PACKAGE_RESULT }));
        const pkg = await suiDiscoveryAdapter.discoverPackage(PACKAGE_ID, 'testnet');
        const mint = pkg.modules[0].functions.find((f) => f.name === 'mint_and_transfer')!;

        expect(mint.parameters).toHaveLength(4);
        const [treasuryCap, amount, recipient, ctx] = mint.parameters;

        expect(treasuryCap.kind).toBe('object');
        expect(treasuryCap.resolution).toBe('selector');
        expect(treasuryCap.type).toBe('&mut 0x2::coin::TreasuryCap<T0>');
        // TreasuryCap<T0> is generic over the function's own type parameter —
        // which concrete coin type it holds can't be known statically, only
        // once T0 itself is chosen, so objectType is correctly left unset.
        expect(treasuryCap.objectType).toBeUndefined();

        expect(amount.kind).toBe('primitive');
        expect(amount.resolution).toBe('user_input');
        expect(amount.type).toBe('u64');

        expect(recipient.kind).toBe('address');
        expect(recipient.resolution).toBe('user_input');

        expect(ctx.kind).toBe('transaction_context');
        expect(ctx.resolution).toBe('automatic');
        expect(ctx.required).toBe(false);
    });

    it('throws NOT_FOUND when the RPC returns no result for the package', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ jsonrpc: '2.0', id: 1, result: null }));
        await expect(suiDiscoveryAdapter.discoverPackage(PACKAGE_ID, 'testnet')).rejects.toMatchObject({
            code: 'NOT_FOUND'
        });
    });
});

describe('renderSuiType', () => {
    it('renders primitives, vectors, references and structs with type args', () => {
        expect(renderSuiType('U64')).toBe('u64');
        expect(renderSuiType('Address')).toBe('address');
        expect(renderSuiType({ Vector: 'U8' })).toBe('vector<u8>');
        expect(renderSuiType({ Reference: 'Bool' })).toBe('&bool');
        expect(
            renderSuiType({
                Struct: { address: '0x2', module: 'coin', name: 'Coin', typeArguments: [{ Struct: { address: '0x2', module: 'sui', name: 'SUI', typeArguments: [] } }] }
            })
        ).toBe('0x2::coin::Coin<0x2::sui::SUI>');
    });
});
