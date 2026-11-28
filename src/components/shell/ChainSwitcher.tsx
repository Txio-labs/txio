import React, { useRef, useState } from 'react';
import { Check, ChevronDown, LayoutGrid } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { CHAIN_ORDER, CHAIN_WORKSPACES } from '@/chains/registry';
import { ChainIcon } from '../ui/ChainIcon';
import { cx } from '../ui/primitives';
import { useClickOutside } from './useClickOutside';

interface ChainSwitcherProps {
    /** Shows only the chain logo, for a narrow rail. */
    iconOnly?: boolean;
    align?: 'left' | 'right';
    /** Opens the menu upward, for a switcher at the bottom of a rail. */
    direction?: 'down' | 'up';
    className?: string;
}

/** Shows the current chain workspace. Opens a menu to jump to another chain or back to the chain picker. */
export function ChainSwitcher({ iconOnly = false, align = 'left', direction = 'down', className }: ChainSwitcherProps) {
    const { activeChain } = useAppStore();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, () => setIsOpen(false));
    if (!activeChain) return null;
    const current = CHAIN_WORKSPACES[activeChain];

    return (
        <div className={cx('relative', className)} ref={ref}>
            <button
                onClick={() => setIsOpen((o) => !o)}
                aria-label={`Chain: ${current.name}. Switch chain`}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                title="Switch chain"
                className={cx(
                    'inline-flex items-center gap-2 rounded-control transition-colors hover:bg-hover',
                    iconOnly ? 'h-10 w-10 justify-center' : 'h-8 pl-1 pr-2 border border-line bg-surface shadow-card hover:border-line-strong'
                )}
            >
                <ChainIcon chain={activeChain} size={iconOnly ? 28 : 22} />
                {!iconOnly && (
                    <>
                        <span className="text-[14px] font-medium text-fg whitespace-nowrap">{current.name}</span>
                        <ChevronDown size={13} className="text-fg-subtle" />
                    </>
                )}
            </button>
            {isOpen && (
                <div
                    role="menu"
                    className={cx(
                        'absolute w-60 bg-elevated border border-line rounded-card shadow-pop overflow-hidden z-50 p-1 animate-in fade-in zoom-in-95',
                        direction === 'down' ? 'top-full mt-1' : 'bottom-full mb-1',
                        align === 'left' ? 'left-0' : 'right-0'
                    )}
                >
                    <div className="px-2 pt-1.5 pb-1 text-[12px] font-medium text-fg-subtle">Chain workspace</div>
                    {CHAIN_ORDER.map((id) => (
                        <button
                            key={id}
                            role="menuitemradio"
                            aria-checked={id === activeChain}
                            onClick={() => {
                                appStore.setActiveChain(id);
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 rounded-[7px] px-2 h-9 text-left text-[14px] text-fg hover:bg-hover transition-colors"
                        >
                            <ChainIcon chain={id} size={22} />
                            <span className="flex-1 truncate">{CHAIN_WORKSPACES[id].name}</span>
                            {id === activeChain && <Check size={13} className="text-fg shrink-0" />}
                        </button>
                    ))}
                    <div className="my-1 h-px bg-line" />
                    <button
                        role="menuitem"
                        onClick={() => {
                            appStore.setActiveChain(null);
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 rounded-[7px] px-2 h-8 text-left text-[14px] text-fg-muted hover:bg-hover hover:text-fg transition-colors"
                    >
                        <LayoutGrid size={14} className="shrink-0" />
                        All chains
                    </button>
                </div>
            )}
        </div>
    );
}
