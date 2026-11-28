/**
 * Shown after sign-in until the user picks a chain, and again from "All
 * chains" in the chain switcher. Picking a chain opens that chain's
 * workspace; the choice is remembered on this device.
 */
import React, { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { ChainIcon } from '@/components/ui/ChainIcon';
import { TxioMark } from '@/components/ui/TxioMark';
import { ProfileMenu } from '@/components/ProfileMenu';
import { Badge } from '@/components/ui/primitives';
import type { ChainId } from '@/types';
import { CHAIN_ORDER, CHAIN_WORKSPACES } from './registry';
import { readLastPickedChain } from './activeChainStorage';

export function ChainPicker() {
    const { user, workspaces, currentWorkspaceId } = useAppStore();
    const workspace = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];
    const firstName = user?.name?.trim().split(/\s+/)[0];
    const previous = readLastPickedChain();
    const firstCard = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        firstCard.current?.focus();
    }, []);

    const pick = (chain: ChainId) => appStore.setActiveChain(chain);

    return (
        <div className="min-h-screen bg-canvas text-fg font-sans flex flex-col">
            <header className="h-14 flex items-center gap-3 px-4 md:px-6">
                <span className="h-8 w-8 rounded-[8px] bg-surface border border-line shadow-card flex items-center justify-center">
                    <TxioMark size={20} />
                </span>
                <span className="text-[14px] font-semibold text-fg">{workspace?.name ?? 'Txio'}</span>
                <div className="flex-1" />
                <ProfileMenu avatarOnly placement="down-right" />
            </header>

            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-4xl">
                    <h1 className="text-[26px] md:text-[32px] font-semibold tracking-[-0.03em] leading-tight text-fg">
                        {firstName ? `Which chain today, ${firstName}?` : 'Which chain are you building on?'}
                    </h1>
                    <p className="mt-2 text-sm text-fg-muted max-w-2xl">
                        Each chain has its own workspace with its own tools. Your collections and history stay in one place; each workspace shows the
                        part for its chain. Switch chains any time from the header.
                    </p>

                    <div role="list" className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {CHAIN_ORDER.map((id, i) => {
                            const def = CHAIN_WORKSPACES[id];
                            return (
                                <button
                                    key={id}
                                    ref={i === 0 ? firstCard : undefined}
                                    role="listitem"
                                    onClick={() => pick(id)}
                                    className="group text-left rounded-card border border-line bg-surface shadow-card p-4 flex flex-col gap-3 transition-colors hover:border-line-strong hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30"
                                >
                                    <div className="flex items-center gap-3">
                                        <ChainIcon chain={id} size={36} />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[15px] font-semibold text-fg">{def.name}</div>
                                            {previous === id && <div className="text-[12px] text-fg-subtle">Last used</div>}
                                        </div>
                                        <ArrowRight size={15} className="text-fg-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                    </div>
                                    <p className="text-xs text-fg-muted leading-relaxed">{def.summary}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {def.stack.map((s) => (
                                            <Badge key={s}>{s}</Badge>
                                        ))}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}
