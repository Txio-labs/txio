// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { deflateSync } from 'node:zlib';
import {
    anchorDiscriminator,
    decodeIdlAccount,
    encodeAnchorInstruction,
    isSolanaProgramId,
    parseAnchorIdl,
    solanaDiscoveryAdapter,
    type AnchorIdl
} from './solanaDiscovery';

const legacyIdl: AnchorIdl = {
    name: 'vault',
    version: '0.1.0',
    instructions: [
        {
            name: 'initializeVault',
            accounts: [
                { name: 'vault', isMut: true, isSigner: false },
                { name: 'authority', isMut: true, isSigner: true },
                { name: 'systemProgram', isMut: false, isSigner: false }
            ],
            args: [
                { name: 'amount', type: 'u64' },
                { name: 'owner', type: 'publicKey' },
                { name: 'tags', type: { vec: 'string' } }
            ]
        }
    ]
};

const modernIdl: AnchorIdl = {
    metadata: { name: 'counter', version: '0.2.0' },
    instructions: [
        {
            name: 'increment',
            discriminator: [11, 18, 104, 9, 104, 174, 59, 33],
            accounts: [
                { name: 'counter', writable: true },
                { name: 'nested', accounts: [{ name: 'payer', writable: true, signer: true }] },
                { name: 'system_program', address: '11111111111111111111111111111111' }
            ],
            args: [{ name: 'by', type: 'i16' }]
        }
    ]
};

describe('parseAnchorIdl', () => {
    it('reads pre-0.30 IDLs, deriving the discriminator and known program addresses', async () => {
        const [fn] = await parseAnchorIdl(legacyIdl);
        expect(fn.module).toBe('vault');
        expect(fn.discriminator).toEqual(await anchorDiscriminator('initializeVault'));
        expect(fn.accounts).toEqual([
            { name: 'vault', isSigner: false, isWritable: true, address: undefined, optional: undefined },
            { name: 'authority', isSigner: true, isWritable: true, address: undefined, optional: undefined },
            { name: 'systemProgram', isSigner: false, isWritable: false, address: '11111111111111111111111111111111', optional: undefined }
        ]);
        expect(fn.parameters.map((p) => [p.type, p.kind, p.resolution])).toEqual([
            ['u64', 'primitive', 'user_input'],
            ['pubkey', 'address', 'user_input'],
            ['vec<string>', 'vector', 'unsupported']
        ]);
    });

    it('reads 0.30+ IDLs, keeping the explicit discriminator and flattening nested accounts', async () => {
        const [fn] = await parseAnchorIdl(modernIdl);
        expect(fn.module).toBe('counter');
        expect(fn.discriminator).toEqual([11, 18, 104, 9, 104, 174, 59, 33]);
        expect(fn.accounts?.map((a) => [a.name, a.isSigner, a.isWritable, a.address])).toEqual([
            ['counter', false, true, undefined],
            ['nested.payer', true, true, undefined],
            ['system_program', false, false, '11111111111111111111111111111111']
        ]);
    });
});

describe('anchorDiscriminator', () => {
    it('matches Anchor for "initialize"', async () => {
        expect(await anchorDiscriminator('initialize')).toEqual([175, 175, 109, 31, 13, 152, 155, 237]);
    });
});

describe('encodeAnchorInstruction', () => {
    it('borsh-encodes integers, strings, bools and pubkeys after the discriminator', async () => {
        const [fn] = await parseAnchorIdl({
            instructions: [
                {
                    name: 'x',
                    discriminator: [1, 2],
                    accounts: [],
                    args: [
                        { name: 'a', type: 'u64' },
                        { name: 'b', type: 'i16' },
                        { name: 'c', type: 'string' },
                        { name: 'd', type: 'bool' },
                        { name: 'e', type: 'pubkey' }
                    ]
                }
            ]
        });
        const hex = encodeAnchorInstruction(fn, ['1000', '-2', 'hi', 'true', '11111111111111111111111111111111']);
        expect(hex).toBe('0102' + 'e803000000000000' + 'feff' + '020000006869' + '01' + '00'.repeat(32));
    });

    it('rejects out-of-range and malformed values', async () => {
        const [fn] = await parseAnchorIdl({ instructions: [{ name: 'x', discriminator: [], accounts: [], args: [{ name: 'a', type: 'u8' }] }] });
        expect(() => encodeAnchorInstruction(fn, ['256'])).toThrow(/out of range/);
        expect(() => encodeAnchorInstruction(fn, ['1.5'])).toThrow(/whole number/);
    });
});

describe('decodeIdlAccount', () => {
    it('inflates the zlib JSON after the 44-byte header', async () => {
        const json = deflateSync(Buffer.from(JSON.stringify(modernIdl)));
        const data = new Uint8Array(44 + json.length);
        new DataView(data.buffer).setUint32(40, json.length, true);
        data.set(json, 44);
        expect(await decodeIdlAccount(data)).toEqual(modernIdl);
    });
});

describe('solanaDiscoveryAdapter', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('validates the program ID before any network call', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        expect(isSolanaProgramId('0xabc')).toBe(false);
        await expect(solanaDiscoveryAdapter.discoverPackage('0xabc', 'devnet' as never)).rejects.toMatchObject({ code: 'INVALID_IDENTIFIER' });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reports NOT_FOUND when the program has no IDL account', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: { value: null } }))));
        await expect(
            solanaDiscoveryAdapter.discoverPackage('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'mainnet')
        ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
});
