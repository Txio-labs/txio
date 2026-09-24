import { getOwnedObjects } from '../suiService';
import type { Network } from '../../types';
import type { DiscoveredParameter } from './types';

export interface OwnedObjectOption {
    objectId: string;
    type: string;
}

/**
 * The connected wallet's owned objects/coins matching a parameter's
 * `objectType` (when it's known statically — a generic type slot like
 * `Coin<T0>` can't be narrowed here since T0 isn't chosen yet, so those
 * return every owned object of the parameter's base kind instead).
 *
 * "Automatically select when only one match exists" is a UI-layer
 * decision (TransactionBuilder), not this function's — it just returns
 * the real candidate set so the caller can apply that rule.
 */
export const resolveWalletObjectCandidates = async (
    network: Network,
    walletAddress: string,
    param: DiscoveredParameter
): Promise<OwnedObjectOption[]> => {
    const { result } = await getOwnedObjects(network, walletAddress);
    const owned = (result?.data ?? []) as { data?: { objectId: string; type?: string } }[];

    const objects: OwnedObjectOption[] = owned
        .map((o) => o.data)
        .filter((o): o is { objectId: string; type?: string } => Boolean(o?.objectId && o.type))
        .map((o) => ({ objectId: o.objectId, type: o.type! }));

    if (param.objectType) {
        return objects.filter((o) => o.type === param.objectType);
    }

    // Generic slot (e.g. Coin<T0>) — narrow by base kind only.
    if (param.kind === 'coin') {
        return objects.filter((o) => o.type.startsWith('0x2::coin::Coin<'));
    }

    // No statically-known type at all — nothing safe to filter by; return
    // everything and let the user pick (still selected from real wallet
    // data, never a free-text ID field).
    return objects;
};
