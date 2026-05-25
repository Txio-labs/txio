
import { RPCHealthMetric, ObjectSnapshot, DashboardTransaction } from '../types';
import { executeSuiRpc, getSuiRpcHealth } from './suiService';
import { appStore } from '../lib/store';
import { NETWORKS } from '../lib/constants';

export const fetchRPCHealth = async (): Promise<RPCHealthMetric[]> => {
    const { network, settings } = appStore.getSnapshot();
    const networksToCheck = Object.keys(NETWORKS) as (keyof typeof NETWORKS)[];

    const results = await Promise.all(
        networksToCheck.map((net) => getSuiRpcHealth(net))
    );

    return results;
};

export const fetchRecentTransactions = async (): Promise<DashboardTransaction[]> => {
    const { network } = appStore.getSnapshot();

    try {
        const { result } = await executeSuiRpc(
            network,
            'suix_queryTransactionBlocks',
            [
                { filter: null, options: { showInput: true, showEffects: false } },
                null,
                10,
                true
            ]
        );

        const blocks: any[] = result?.data ?? [];

        return blocks.map((block: any, idx: number) => ({
            id: String(idx),
            digest: block.digest ?? '',
            sender: block.transaction?.data?.sender ?? '',
            type: block.transaction?.data?.transaction?.kind ?? 'Unknown',
            gas: String(block.effects?.gasUsed?.computationCost ?? 0),
            timestamp: block.timestampMs
                ? Number(block.timestampMs)
                : Date.now()
        }));
    } catch {
        return [];
    }
};

export const fetchOwnedObjects = async (address: string): Promise<ObjectSnapshot[]> => {
    if (!address) return [];

    const { network } = appStore.getSnapshot();

    try {
        const { result } = await executeSuiRpc(
            network,
            'suix_getOwnedObjects',
            [
                address,
                {
                    options: {
                        showType: true,
                        showContent: false,
                        showDisplay: false
                    }
                }
            ]
        );

        const items: any[] = result?.data ?? [];

        return items.map((item: any) => ({
            id: item.data?.objectId ?? '',
            type: item.data?.type ?? '',
            version: String(item.data?.version ?? ''),
            owner: address
        }));
    } catch {
        return [];
    }
};

export const executeMockTransaction = async (ptbData: any) => {
    const { network } = appStore.getSnapshot();

    try {
        const { result } = await executeSuiRpc(
            network,
            'sui_dryRunTransactionBlock',
            [ptbData]
        );
        return {
            status: 'success',
            digest: result?.digest ?? '',
            gasUsed: result?.effects?.gasUsed?.computationCost ?? 0,
            events: result?.events ?? [],
            timestamp: Date.now()
        };
    } catch (error: any) {
        return {
            status: 'error',
            message: error?.message ?? 'Dry run failed',
            timestamp: Date.now()
        };
    }
};

export const fetchMovePackage = async (id: string) => {
    const { network } = appStore.getSnapshot();

    try {
        const { result } = await executeSuiRpc(
            network,
            'sui_getNormalizedMoveModule',
            [id, 'init']
        );
        return {
            id,
            modules: result ? Object.keys(result) : [],
            publishedAt: result?.fileFormatVersion ?? ''
        };
    } catch {
        return { id, modules: [], publishedAt: '' };
    }
};
