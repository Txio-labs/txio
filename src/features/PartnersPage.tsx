import React from 'react';
import { ArrowUpRight, Mail } from 'lucide-react';
import { MarketingShell, PageHero, SectionHeading, CtaBand } from '@/components/marketing/MarketingShell';

interface PartnersPageProps {
    embedded?: boolean;
}

// Services and tools Txio integrates with in code today. Listing them describes an
// integration, not a business partnership.
const GROUPS: Array<{ title: string; body: string; items: Array<{ name: string; what: string; url: string }> }> = [
    {
        title: 'Swaps, bridges and off-ramp',
        body: 'Quotes and orders come from these providers. Txio shows them; you sign them.',
        items: [
            { name: 'LI.FI', what: 'Swap and bridge routing across DEXs and bridges', url: 'https://li.fi' },
            { name: 'SideShift', what: 'Fallback for cross-chain swaps', url: 'https://sideshift.ai' },
            { name: 'Transak', what: 'Off-ramp quotes and orders', url: 'https://transak.com' },
        ],
    },
    {
        title: 'Wallets',
        body: 'One linked wallet per chain family, including hardware.',
        items: [
            { name: 'MetaMask', what: 'Ethereum and EVM', url: 'https://metamask.io' },
            { name: 'Ledger', what: 'Hardware signing for EVM', url: 'https://www.ledger.com' },
            { name: 'Phantom · Solflare · Backpack', what: 'Solana', url: 'https://phantom.com' },
            { name: 'Slush · Suiet', what: 'Sui', url: 'https://slush.app' },
            { name: 'Petra · Martian · Pontem', what: 'Aptos', url: 'https://petra.app' },
            { name: 'Freighter · Lobstr · xBull · Albedo', what: 'Stellar', url: 'https://freighter.app' },
        ],
    },
    {
        title: 'Data and verification',
        body: 'Used to fill in history and contract details.',
        items: [
            { name: 'Etherscan', what: 'Full EVM transaction history (with your API key)', url: 'https://etherscan.io' },
            { name: 'Sourcify', what: 'Contract verification status', url: 'https://sourcify.dev' },
            { name: 'Public RPC providers', what: 'Default endpoints with failover, replaceable by your own', url: 'https://ethereum-rpc.publicnode.com' },
        ],
    },
];

export const PartnersPage: React.FC<PartnersPageProps> = ({ embedded = false }) => {
    return (
        <MarketingShell embedded={embedded}>
            <PageHero
                eyebrow="Works with"
                title="Built on tools you already trust."
                body="The providers, wallets and data sources Txio integrates with today. Building something Txio should support? Get in touch."
                actions={
                    <a
                        href="https://github.com/Txio-labs/txio/issues/new" target="_blank" rel="noreferrer"
                        className="h-10 px-4 inline-flex items-center gap-2 rounded-[10px] bg-inverse text-on-inverse text-sm font-medium hover:opacity-90"
                    >
                        <Mail size={14} /> Propose an integration
                    </a>
                }
            />

            <div className="w-full px-5 md:px-10 2xl:px-16 space-y-20">
                {GROUPS.map((g) => (
                    <section key={g.title} className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] gap-8 lg:gap-16 border-t border-line pt-10">
                        <SectionHeading title={<span className="text-[26px] md:text-[32px]">{g.title}</span>} body={g.body} />
                        <div data-reveal-group className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {g.items.map((it) => (
                                <a
                                    key={it.name}
                                    href={it.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group rounded-[14px] border border-line bg-surface p-5 hover:border-line-strong transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="text-[16px] font-semibold">{it.name}</h3>
                                        <ArrowUpRight size={14} className="text-fg-subtle group-hover:text-fg transition-colors shrink-0 mt-0.5" />
                                    </div>
                                    <p className="mt-1.5 text-[14px] text-fg-muted leading-relaxed">{it.what}</p>
                                </a>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <CtaBand embedded={embedded} />
        </MarketingShell>
    );
};
