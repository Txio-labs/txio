import type { NameResolver } from './index';
import { getStarknetProvider } from '../starknet';

// Starknet ID naming contracts (from starknetid.js, MIT).
const NAMING_CONTRACTS: Partial<Record<string, string>> = {
    mainnet: '0x6ac597f8116f886fa1c97a23fa4e08299975ecaf6b598873ca6792b9bbfb678',
    testnet: '0x00000154bc2e1af9260b9e66af0e9c46fc757ff893b3ff6a85718a810baf1474',
    devnet: '0x00000154bc2e1af9260b9e66af0e9c46fc757ff893b3ff6a85718a810baf1474'
};

const BASIC = 'abcdefghijklmnopqrstuvwxyz0123456789-';
const BIG = '这来';
const BASIC_SIZE = BigInt(BASIC.length);
const BASIC_SIZE_PLUS_ONE = BigInt(BASIC.length + 1);
const BIG_SIZE = BigInt(BIG.length);

const extractStars = (str: string): [string, number] => {
    let k = 0;
    while (str.endsWith(BIG[BIG.length - 1])) {
        str = str.slice(0, -1);
        k += 1;
    }
    return [str, k];
};

/** One label to its felt, ported from starknetid.js `encode` (MIT). `ben` → 18925n. */
export const encodeStarknetIdLabel = (label: string): bigint => {
    let decoded = label;
    let encoded = BigInt(0);
    let multiplier = BigInt(1);
    if (!decoded) return encoded;
    if (decoded.endsWith(BIG[0] + BASIC[1])) {
        const [str, k] = extractStars(decoded.slice(0, -2));
        decoded = str + BIG[BIG.length - 1].repeat(2 * (k + 1));
    } else {
        const [str, k] = extractStars(decoded);
        if (k) decoded = str + BIG[BIG.length - 1].repeat(1 + 2 * (k - 1));
    }
    for (let i = 0; i < decoded.length; i += 1) {
        const ch = decoded[i];
        const index = BASIC.indexOf(ch);
        if (index !== -1) {
            if (i === decoded.length - 1 && ch === BASIC[0]) {
                encoded += multiplier * BASIC_SIZE;
                multiplier *= BASIC_SIZE_PLUS_ONE;
                multiplier *= BASIC_SIZE_PLUS_ONE;
            } else {
                encoded += multiplier * BigInt(index);
                multiplier *= BASIC_SIZE_PLUS_ONE;
            }
        } else if (BIG.indexOf(ch) !== -1) {
            encoded += multiplier * BASIC_SIZE;
            multiplier *= BASIC_SIZE_PLUS_ONE;
            encoded += multiplier * BigInt((i === decoded.length - 1 ? 1 : 0) + BIG.indexOf(ch));
            multiplier *= BIG_SIZE;
        } else {
            throw new Error(`"${ch}" is not allowed in a Starknet ID name`);
        }
    }
    return encoded;
};

/** `pay.alice.stark` → [encode("pay"), encode("alice")]. */
export const encodeStarknetIdDomain = (name: string): bigint[] =>
    name.toLowerCase().replace(/\.stark$/, '').split('.').map(encodeStarknetIdLabel);

export const starknetIdResolver: NameResolver = {
    chain: 'starknet',
    pattern: /[a-z0-9-]+(?:\.[a-z0-9-]+)*\.stark/,
    async resolve(name, ctx) {
        const contract = NAMING_CONTRACTS[ctx.network];
        if (!contract) throw new Error(`Starknet ID is not available on ${ctx.network}`);
        const domain = encodeStarknetIdDomain(name);
        const provider = await getStarknetProvider(ctx.network);
        let result: string[];
        try {
            result = await provider.callContract({
                contractAddress: contract,
                entrypoint: 'domain_to_address',
                // domain: Span<felt252>, hint: Span<felt252> (empty: no off-chain resolver)
                calldata: [String(domain.length), ...domain.map(String), '0']
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (/offchain_resolving/.test(message)) throw new Error('this name uses an off-chain resolver, which txio does not support yet');
            throw new Error('Starknet node call failed');
        }
        const address = result[0];
        if (!address || BigInt(address) === BigInt(0)) throw new Error('name is not registered or has no target address');
        return `0x${BigInt(address).toString(16).padStart(64, '0')}`;
    }
};
