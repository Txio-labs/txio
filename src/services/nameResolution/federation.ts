import type { NameResolver } from './index';

/** Reads FEDERATION_SERVER from a stellar.toml body. */
export const federationServerFromToml = (toml: string): string | null => {
    for (const line of toml.split('\n')) {
        const [key, ...rest] = line.split('=');
        if (key?.trim() === 'FEDERATION_SERVER') return rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
    return null;
};

/** HTTPS, a real hostname, no IP literals or localhost. */
export const isPublicHttps = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname;
        return (
            parsed.protocol === 'https:' &&
            host.includes('.') &&
            host !== 'localhost' &&
            !/^\d{1,3}(\.\d{1,3}){3}$/.test(host) &&
            !host.startsWith('[')
        );
    } catch {
        return false;
    }
};

/**
 * Stellar federation (SEP-2): `name*domain.tld` resolves through the
 * FEDERATION_SERVER the domain publishes in its stellar.toml. Stellar has no
 * canonical on-chain name service, and Soroban contract IDs (C…) are not names.
 */
export const federationResolver: NameResolver = {
    chain: 'stellar',
    pattern: /[a-zA-Z0-9._-]+\*[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}/,
    async resolve(name) {
        const domain = name.split('*')[1];
        const tomlUrl = `https://${domain}/.well-known/stellar.toml`;
        if (!isPublicHttps(tomlUrl)) throw new Error('federation domain must be a public hostname');

        let toml: string;
        try {
            const res = await fetch(tomlUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            toml = await res.text();
        } catch {
            throw new Error('could not fetch the domain\'s stellar.toml');
        }
        const server = federationServerFromToml(toml);
        if (!server) throw new Error('domain does not publish a FEDERATION_SERVER');
        if (!isPublicHttps(server)) throw new Error('federation server must be a public HTTPS URL');

        const url = new URL(server);
        url.searchParams.set('q', name);
        url.searchParams.set('type', 'name');
        let body: { account_id?: string };
        try {
            const res = await fetch(url.toString());
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            body = (await res.json()) as { account_id?: string };
        } catch {
            throw new Error('federation lookup failed');
        }
        if (!body.account_id) throw new Error('federation server returned no account');
        return body.account_id;
    }
};
