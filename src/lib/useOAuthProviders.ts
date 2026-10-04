import { useEffect, useState } from 'react';
import { apiService } from '@/services/api';

export interface OAuthProviders {
    google: boolean;
    github: boolean;
    x: boolean;
}

/**
 * Which OAuth providers the backend has configured. Defaults to none until
 * the request returns, so a button is never active for a provider that would
 * only lead to a "not configured" error. X signs in accounts that already linked it; it cannot create one.
 */
export function useOAuthProviders(): OAuthProviders {
    const [providers, setProviders] = useState<OAuthProviders>({ google: false, github: false, x: false });

    useEffect(() => {
        let cancelled = false;
        void apiService.getOAuthProviders().then((p) => {
            if (!cancelled) setProviders(p);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return providers;
}
