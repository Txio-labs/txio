'use client';

import React, { useState } from 'react';
import { FolderDown } from 'lucide-react';
import { appStore } from '@/lib/store';
import { useWallet } from '@/wallet/hooks/useWallet';
import { STARTER_COLLECTIONS, starterCollectionName, type StarterCollection } from '@/services/starterCollections';
import type { Network } from '@/types';
import { Badge, Button, Card, SectionTitle, Segmented } from './ui/primitives';

const StarterCard: React.FC<{ starter: StarterCollection; onInstalled?: () => void }> = ({ starter, onInstalled }) => {
    const { address, family } = useWallet();
    const [network, setNetwork] = useState<Network>(starter.networks[0]);
    const [busy, setBusy] = useState(false);

    const install = async () => {
        setBusy(true);
        try {
            const { requests, notes } = await starter.build({
                network,
                walletAddress: family === starter.chain ? address : null
            });
            const description = [starter.summary, ...notes].join('\n\n');
            const created = await appStore.installCollection(starterCollectionName(starter, network), description, requests);
            if (created) onInstalled?.();
        } catch (error) {
            appStore.showToast(error instanceof Error ? error.message : 'Could not build the collection.', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-[14px] font-semibold text-fg tracking-tight">{starter.title}</h3>
                        <Badge>{starter.chainLabel}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-fg-subtle leading-relaxed">{starter.summary}</p>
                </div>
                <span className="text-xs text-fg-subtle tabular shrink-0">{starter.requestCount} requests</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Segmented<Network>
                    size="sm"
                    value={network}
                    onChange={setNetwork}
                    options={starter.networks.map((n) => ({ value: n, label: starter.networkName(n) }))}
                />
                <Button size="sm" variant="primary" loading={busy} icon={<FolderDown size={14} />} onClick={install}>
                    Add collection
                </Button>
            </div>
        </Card>
    );
};

/** Ready-made collections, grouped as one list. Shown on the New Collection page. */
export const StarterCollections: React.FC<{ onInstalled?: () => void }> = ({ onInstalled }) => (
    <section>
        <SectionTitle>Start from a ready-made collection</SectionTitle>
        <p className="-mt-1.5 mb-3 text-xs text-fg-subtle">
            Each one is saved with the network you pick, with that network&apos;s contract IDs and a test account filled in.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
            {STARTER_COLLECTIONS.map((s) => (
                <StarterCard key={s.id} starter={s} onInstalled={onInstalled} />
            ))}
        </div>
    </section>
);
