import type { NameResolver } from './index';
import { resolveChainRpcUrl } from '../suiService';

// Solana Name Service (Bonfida) on-chain registry.
const NAME_PROGRAM = 'namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX';
const SOL_TLD = '58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx';
const HASH_PREFIX = 'SPL Name Service';

const sha256 = async (text: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

/** The registry account of `label` under `parent`, as the SNS program derives it. */
const nameAccount = async (label: string, parent: string) => {
    const { PublicKey } = await import('@solana/web3.js');
    const hashed = await sha256(HASH_PREFIX + label);
    const [key] = PublicKey.findProgramAddressSync(
        [Buffer.from(hashed), Buffer.alloc(32), new PublicKey(parent).toBuffer()],
        new PublicKey(NAME_PROGRAM)
    );
    return key;
};

/**
 * Resolves `alice.sol` (and `pay.alice.sol`) to the domain owner, read from
 * the registry header (parent 32 bytes, owner 32 bytes, class 32 bytes).
 */
export const solanaNamesResolver: NameResolver = {
    chain: 'solana',
    pattern: /[a-z0-9-]+(?:\.[a-z0-9-]+)?\.sol/,
    async resolve(name, ctx) {
        const { Connection, PublicKey } = await import('@solana/web3.js');
        const labels = name.toLowerCase().replace(/\.sol$/, '').split('.');
        if (labels.length > 2) throw new Error('expected <domain>.sol or <sub>.<domain>.sol');
        const domainKey = await nameAccount(labels[labels.length - 1], SOL_TLD);
        // Subdomains hash with a leading NUL byte, per the SNS SDK.
        const key = labels.length === 2 ? await nameAccount(`\0${labels[0]}`, domainKey.toBase58()) : domainKey;
        const connection = new Connection(resolveChainRpcUrl('solana', ctx.network), 'confirmed');
        let data: Uint8Array | undefined;
        try {
            data = (await connection.getAccountInfo(key))?.data;
        } catch {
            throw new Error('Solana RPC unreachable');
        }
        if (!data || data.length < 96) throw new Error('name is not registered');
        return new PublicKey(data.subarray(32, 64)).toBase58();
    }
};
