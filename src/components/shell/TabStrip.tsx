import React, { useRef, useState } from 'react';
import { Command, Layers, MoreHorizontal, Plus } from 'lucide-react';
import { appStore } from '@/lib/store';
import { RequestType, type TabItem } from '@/types';
import { Tab } from '../ui/Tabs';
import { cx, IconButton } from '../ui/primitives';
import { useClickOutside } from './useClickOutside';

export interface TabStripProps {
    tabs: TabItem[];
    activeTabId?: string;
    onSelectTab?: (id: string | null) => void;
    onCloseTab?: (id: string) => void;
    onRenameTab?: (id: string, title: string) => void;
    onNewTab?: () => void;
    className?: string;
}

/** The open-tab row with "new tab" and close-all actions. Renders nothing when no tab is open. */
export function TabStrip({ tabs, activeTabId, onSelectTab, onCloseTab, onRenameTab, onNewTab, className }: TabStripProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useClickOutside(menuRef, () => setIsMenuOpen(false));

    if (tabs.length === 0) return null;

    return (
        <div className={cx('h-10 flex items-end gap-1 px-2 border-b border-line bg-sunken/50 shrink-0', className)}>
            <div role="tablist" className="flex items-end gap-0.5 overflow-x-auto no-scrollbar min-w-0 flex-1 h-full pt-1.5">
                {tabs.map((tab) => (
                    <Tab
                        key={tab.id}
                        id={tab.id}
                        title={tab.title}
                        isActive={tab.id === activeTabId}
                        onSelect={() => onSelectTab?.(tab.id)}
                        onClose={() => onCloseTab?.(tab.id)}
                        onRename={(newTitle) => onRenameTab?.(tab.id, newTitle)}
                        icon={
                            tab.type === 'ptb' || (tab.type === 'rpc' && tab.data?.type === RequestType.TRANSACTION) ? (
                                <Layers size={12} />
                            ) : tab.type === 'rpc' ? (
                                <Command size={12} />
                            ) : undefined
                        }
                    />
                ))}
            </div>
            <div className="flex items-center gap-0.5 self-center shrink-0">
                <IconButton label="New tab" size="sm" onClick={onNewTab}>
                    <Plus size={14} />
                </IconButton>
                <div className="relative" ref={menuRef}>
                    <IconButton label="Tab options" size="sm" active={isMenuOpen} onClick={() => setIsMenuOpen((v) => !v)}>
                        <MoreHorizontal size={14} />
                    </IconButton>
                    {isMenuOpen && (
                        <div className="absolute top-full right-0 mt-1 w-52 bg-elevated border border-line rounded-card shadow-pop overflow-hidden z-50 p-1 animate-in fade-in zoom-in-95">
                            <button
                                onClick={() => {
                                    appStore.closeAllTabs();
                                    setIsMenuOpen(false);
                                }}
                                className="w-full flex items-center justify-between gap-3 px-2.5 h-8 rounded-[7px] text-left text-[14px] text-fg hover:bg-hover transition-colors"
                            >
                                <span>Close all</span>
                                <span className="text-[12px] text-fg-subtle">Ctrl+K W</span>
                            </button>
                            <button
                                onClick={() => {
                                    appStore.closeSavedTabs();
                                    setIsMenuOpen(false);
                                }}
                                className="w-full flex items-center justify-between gap-3 px-2.5 h-8 rounded-[7px] text-left text-[14px] text-fg hover:bg-hover transition-colors"
                            >
                                <span>Close saved</span>
                                <span className="text-[12px] text-fg-subtle">Ctrl+K U</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
