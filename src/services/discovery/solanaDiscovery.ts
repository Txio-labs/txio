import { PublicKey } from '@solana/web3.js';
import type { Network } from '../../types';
import { resolveChainRpcUrl } from '../suiService';
import {
    DiscoveryError,
    type ChainDiscoveryAdapter,
    type DiscoveredAccount,
    type DiscoveredFunction,
    type DiscoveredPackage,
    type DiscoveredParameter,
    type ParameterKind
} from './types';

/**
 * Solana program discovery via the Anchor IDL the program's authority
 * published on-chain (`anchor idl init`). Native programs and Anchor
 * programs without an on-chain IDL have nothing to read, so those return
 * NOT_FOUND rather than a guessed interface.
 */

const PROGRAM_ID_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const isSolanaProgramId = (value: string): boolean => PROGRAM_ID_RE.test(value.trim());

/** Well-known accounts a pre-0.30 IDL names but never gives an address for. */
const KNOWN_ACCOUNTS: Record<string, string> = {
    systemProgram: '11111111111111111111111111111111',
    tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    associatedTokenProgram: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    rent: 'SysvarRent111111111111111111111111111111111'
};

// Both IDL generations: pre-0.30 (isMut/isSigner, camelCase names, no
// discriminator) and 0.30+ (writable/signer/address, explicit discriminator).
type IdlType = string | { vec?: IdlType; option?: IdlType; array?: [IdlType, number]; defined?: string | { name: string } };

interface IdlAccountItem {
    name: string;
    isMut?: boolean;
    isSigner?: boolean;
    isOptional?: boolean;
    writable?: boolean;
    signer?: boolean;
    optional?: boolean;
    address?: string;
    accounts?: IdlAccountItem[];
}

interface IdlInstruction {
    name: string;
    discriminator?: number[];
    accounts: IdlAccountItem[];
    args: { name: string; type: IdlType }[];
    returns?: IdlType;
}

export interface AnchorIdl {
    name?: string;
    version?: string;
    metadata?: { name?: string; version?: string };
    instructions: IdlInstruction[];
}

export const renderIdlType = (t: IdlType): string => {
    if (typeof t === 'string') return t === 'publicKey' ? 'pubkey' : t;
    if (t.vec !== undefined) return `vec<${renderIdlType(t.vec)}>`;
    if (t.option !== undefined) return `option<${renderIdlType(t.option)}>`;
    if (t.array) return `[${renderIdlType(t.array[0])}; ${t.array[1]}]`;
    if (t.defined !== undefined) return typeof t.defined === 'string' ? t.defined : t.defined.name;
    return JSON.stringify(t);
};

const INT_BITS: Record<string, number> = { u8: 8, i8: 8, u16: 16, i16: 16, u32: 32, i32: 32, u64: 64, i64: 64, u128: 128, i128: 128 };

/** Types `encodeAnchorInstruction` can serialize from a single text field. */
export const isEncodableIdlType = (type: string): boolean =>
    type in INT_BITS || ['bool', 'string', 'pubkey', 'bytes'].includes(type);

const kindFor = (type: string): ParameterKind => {
    if (type === 'pubkey') return 'address';
    if (type.startsWith('vec<') || type === 'bytes') return 'vector';
    return isEncodableIdlType(type) ? 'primitive' : 'unknown';
};

const flattenAccounts = (items: IdlAccountItem[], prefix = ''): DiscoveredAccount[] =>
    items.flatMap((a): DiscoveredAccount[] =>
        a.accounts
            ? flattenAccounts(a.accounts, `${prefix}${a.name}.`)
            : [
                  {
                      name: `${prefix}${a.name}`,
                      isSigner: Boolean(a.signer ?? a.isSigner),
                      isWritable: Boolean(a.writable ?? a.isMut),
                      address: a.address ?? KNOWN_ACCOUNTS[a.name],
                      optional: Boolean(a.optional ?? a.isOptional) || undefined
                  }
              ]
    );

const snakeCase = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

/** Anchor's instruction discriminator: first 8 bytes of sha256("global:<snake_name>"). */
export const anchorDiscriminator = async (name: string): Promise<number[]> => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`global:${snakeCase(name)}`));
    return Array.from(new Uint8Array(digest).slice(0, 8));
};

/** Turns an Anchor IDL into normalized discovery functions. No network I/O. */
export const parseAnchorIdl = async (idl: AnchorIdl): Promise<DiscoveredFunction[]> => {
    const moduleName = idl.metadata?.name ?? idl.name ?? 'program';
    return Promise.all(
        idl.instructions.map(async (ix): Promise<DiscoveredFunction> => ({
            name: ix.name,
            module: moduleName,
            visibility: 'Public',
            isEntry: true,
            typeParameters: [],
            parameters: ix.args.map((arg): DiscoveredParameter => {
                const type = renderIdlType(arg.type);
                return {
                    name: arg.name,
                    type,
                    kind: kindFor(type),
                    required: true,
                    resolution: isEncodableIdlType(type) ? 'user_input' : 'unsupported'
                };
            }),
            returnTypes: ix.returns ? [renderIdlType(ix.returns)] : [],
            accounts: flattenAccounts(ix.accounts),
            discriminator: ix.discriminator ?? (await anchorDiscriminator(ix.name))
        }))
    );
};

const encodeInt = (raw: string, type: string): number[] => {
    const bits = INT_BITS[type];
    const v = raw.trim();
    if (!/^-?\d+$/.test(v)) throw new Error(`"${raw}" is not a whole number for ${type}.`);
    const n = BigInt(v);
    const signed = type.startsWith('i');
    const min = signed ? -(1n << BigInt(bits - 1)) : 0n;
    const max = signed ? (1n << BigInt(bits - 1)) - 1n : (1n << BigInt(bits)) - 1n;
    if (n < min || n > max) throw new Error(`${v} is out of range for ${type}.`);
    let x = n < 0n ? (1n << BigInt(bits)) + n : n;
    const out: number[] = [];
    for (let i = 0; i < bits / 8; i++) {
        out.push(Number(x & 0xffn));
        x >>= 8n;
    }
    return out;
};

const u32le = (n: number): number[] => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];

const encodeArg = (raw: string, type: string, name: string): number[] => {
    if (type in INT_BITS) return encodeInt(raw, type);
    const v = raw.trim();
    switch (type) {
        case 'bool':
            if (v !== 'true' && v !== 'false') throw new Error(`${name}: enter true or false.`);
            return [v === 'true' ? 1 : 0];
        case 'string': {
            const bytes = Array.from(new TextEncoder().encode(raw));
            return [...u32le(bytes.length), ...bytes];
        }
        case 'pubkey':
            try {
                return Array.from(new PublicKey(v).toBytes());
            } catch {
                throw new Error(`${name}: "${raw}" is not a valid public key.`);
            }
        case 'bytes': {
            const hex = v.replace(/^0x/, '');
            if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2) throw new Error(`${name}: "${raw}" is not valid hex bytes.`);
            const bytes = hex.match(/../g)?.map((b) => parseInt(b, 16)) ?? [];
            return [...u32le(bytes.length), ...bytes];
        }
        default:
            throw new Error(`${name}: ${type} arguments can't be built by this form.`);
    }
};

/** Borsh-encodes an Anchor instruction (discriminator + args) as a hex string. */
export const encodeAnchorInstruction = (fn: DiscoveredFunction, values: string[]): string => {
    const bytes = [...(fn.discriminator ?? [])];
    fn.parameters.forEach((p, i) => bytes.push(...encodeArg(values[i] ?? '', p.type, p.name)));
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
};

/** The on-chain IDL account: createWithSeed(PDA([], program), "anchor:idl", program). */
export const anchorIdlAddress = async (programId: PublicKey): Promise<PublicKey> => {
    const [base] = PublicKey.findProgramAddressSync([], programId);
    return PublicKey.createWithSeed(base, 'anchor:idl', programId);
};

/** IDL account layout: 8-byte discriminator, 32-byte authority, u32 length, zlib-compressed JSON. */
export const decodeIdlAccount = async (data: Uint8Array): Promise<AnchorIdl> => {
    const len = new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(40, true);
    const compressed = data.slice(44, 44 + len);
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate'));
    return JSON.parse(await new Response(stream).text()) as AnchorIdl;
};

const fetchAccountData = async (rpcUrl: string, address: string): Promise<Uint8Array | null> => {
    let body: { result?: { value: { data: [string, string] } | null }; error?: { message: string } };
    try {
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAccountInfo', params: [address, { encoding: 'base64' }] })
        });
        body = await response.json();
    } catch (cause) {
        throw new DiscoveryError('Solana RPC unreachable.', { code: 'RPC_FAILURE', chain: 'solana', cause });
    }
    if (body.error) throw new DiscoveryError(body.error.message, { code: 'RPC_FAILURE', chain: 'solana' });
    const value = body.result?.value;
    return value ? Uint8Array.from(atob(value.data[0]), (c) => c.charCodeAt(0)) : null;
};

export const solanaDiscoveryAdapter: ChainDiscoveryAdapter = {
    chain: 'solana',
    isSupported: true,

    async discoverPackage(identifier: string, network: Network): Promise<DiscoveredPackage> {
        const programId = identifier.trim();
        if (!isSolanaProgramId(programId)) {
            throw new DiscoveryError('Enter a base58 program address.', { code: 'INVALID_IDENTIFIER', chain: 'solana' });
        }

        const idlAddress = await anchorIdlAddress(new PublicKey(programId));
        const data = await fetchAccountData(resolveChainRpcUrl('solana', network), idlAddress.toBase58());
        if (!data) {
            throw new DiscoveryError(
                `No on-chain Anchor IDL for this program on ${network}. Native programs and Anchor programs without a published IDL need Manual mode.`,
                { code: 'NOT_FOUND', chain: 'solana' }
            );
        }

        let idl: AnchorIdl;
        try {
            idl = await decodeIdlAccount(data);
        } catch (cause) {
            throw new DiscoveryError('The program’s IDL account could not be decoded.', {
                code: 'METADATA_UNAVAILABLE',
                chain: 'solana',
                cause
            });
        }

        const functions = await parseAnchorIdl(idl);
        return {
            chain: 'solana',
            network,
            identifier: programId,
            modules: [{ name: functions[0]?.module ?? idl.metadata?.name ?? idl.name ?? 'program', functions }],
            metadata: { name: idl.metadata?.name ?? idl.name, version: idl.metadata?.version ?? idl.version, source: 'anchor:idl' }
        };
    }
};
