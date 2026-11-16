import { useEffect, useState } from 'react';
import type { RequestOutcome } from './types';

/**
 * Decodes the XDR inside a Stellar RPC result (envelopes, results, meta,
 * events, ledger entries) for the response panel's "Decoded" view. Pass null
 * for any other chain. Resolves to null when the result holds no XDR.
 */
export const useStellarDecodedResult = (outcome: RequestOutcome | null): unknown => {
    const [decoded, setDecoded] = useState<{ for: RequestOutcome; value: unknown } | null>(null);

    useEffect(() => {
        if (!outcome || outcome.error || outcome.result === undefined) return;
        let cancelled = false;
        // The SDK is large, so it loads only once a Stellar result needs decoding.
        void Promise.all([import('@stellar/stellar-sdk'), import('@/services/stellar/xdr')])
            .then(([sdk, { decodeStellarRpcResult }]) => {
                if (!cancelled) setDecoded({ for: outcome, value: decodeStellarRpcResult(sdk, outcome.result) });
            })
            .catch(() => {
                /* decoding is a convenience; the raw body is still shown */
            });
        return () => {
            cancelled = true;
        };
    }, [outcome]);

    // Never show a decode that belongs to an earlier response.
    return decoded && decoded.for === outcome ? decoded.value : null;
};
