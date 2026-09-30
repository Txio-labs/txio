import { APTOS_NETWORKS } from '@/lib/constants';
import type { NameResolver } from './index';

// Aptos Names router modules. Override per deployment with NEXT_PUBLIC_ANS_ROUTER.
const ROUTERS: Record<string, string> = {
    mainnet: '0x867ed1f6bf916171b1de3ee92849b8978b7d1b9e0a8cc982a3d19d535dfd9c0c',
    testnet: '0x5f8fd2347449685cf41d4db97926ec3a096eaf381332be4f1318ad4d16a8497c'
};

/** `alice.apt` → domain `alice`; `pay.alice.apt` → domain `alice`, subdomain `pay`. */
export const splitAptosName = (name: string): { domain: string; subdomain?: string } | null => {
    if (!name.endsWith('.apt')) return null;
    const parts = name.slice(0, -4).toLowerCase().split('.');
    const domain = parts.pop();
    if (!domain) return null;
    if (parts.length === 0) return { domain };
    if (parts.length === 1) return { domain, subdomain: parts[0] };
    return null;
};

export const aptosNamesResolver: NameResolver = {
    chain: 'aptos',
    pattern: /[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.apt/,
    async resolve(name, ctx) {
        const router = process.env.NEXT_PUBLIC_ANS_ROUTER || ROUTERS[ctx.network];
        if (!router) throw new Error(`Aptos Names is not available on ${ctx.network}`);
        const parsed = splitAptosName(name);
        if (!parsed) throw new Error('expected <domain>.apt or <sub>.<domain>.apt');

        let response: Response;
        try {
            response = await fetch(`${APTOS_NETWORKS[ctx.network]}/view`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    function: `${router}::router::get_target_addr`,
                    type_arguments: [],
                    arguments: [parsed.domain, { vec: parsed.subdomain ? [parsed.subdomain] : [] }]
                })
            });
        } catch {
            throw new Error('Aptos fullnode unreachable');
        }
        if (!response.ok) throw new Error(`Aptos fullnode returned HTTP ${response.status}`);

        // Option<address> arrives as [{ "vec": ["0x…"] }]; an empty vec means not registered.
        const body = (await response.json()) as { vec?: string[] }[];
        const address = body?.[0]?.vec?.[0];
        if (!address) throw new Error('name is not registered or has no target address');
        return address;
    }
};
