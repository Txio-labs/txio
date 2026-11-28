import React, { useRef, useState } from 'react';
import { Check, ChevronsUpDown, LayoutGrid, Plus } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { PromptModal } from '../PromptModal';
import { cx, Kbd } from '../ui/primitives';
import { TxioMark } from '../ui/TxioMark';
import { useClickOutside } from './useClickOutside';

interface WorkspaceMenuProps {
    onCreateWorkspace?: (name: string) => void;
    /** Shows only the mark, for a narrow rail. */
    iconOnly?: boolean;
    /** Hides the text at the md breakpoint and up, for a collapsible sidebar. */
    collapsed?: boolean;
    align?: 'left' | 'right';
    className?: string;
}

/** The workspace switcher: current workspace and account, a list of workspaces, and "Create workspace". */
export function WorkspaceMenu({ onCreateWorkspace, iconOnly = false, collapsed = false, align = 'left', className }: WorkspaceMenuProps) {
    const { workspaces, currentWorkspaceId, user } = useAppStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, () => setIsOpen(false));
    const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];

    return (
        <div className={cx('relative', className)} ref={ref}>
            <PromptModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create workspace"
                description="Workspaces hold collections, environments and history. Invite your team later."
                label="Workspace name"
                placeholder="e.g. Protocol team"
                confirmLabel="Create workspace"
                icon={LayoutGrid}
                onSubmit={(name) => {
                    setIsCreateOpen(false);
                    onCreateWorkspace?.(name);
                }}
            />
            <button
                onClick={() => setIsOpen((o) => !o)}
                className={cx(
                    'flex items-center gap-2.5 h-10 rounded-[9px] px-1.5 hover:bg-hover transition-colors text-left',
                    iconOnly ? 'justify-center w-10 px-0' : 'w-full min-w-0',
                    collapsed && 'md:justify-center md:px-0'
                )}
                aria-label={`Workspace: ${currentWorkspace?.name ?? 'Txio'}`}
                aria-expanded={isOpen}
                title="Switch workspace"
            >
                <span className="h-7 w-7 rounded-[8px] bg-surface border border-line shadow-card flex items-center justify-center shrink-0">
                    <TxioMark size={18} />
                </span>
                {!iconOnly && (
                    <>
                        <span className={cx('min-w-0 flex-1', collapsed && 'md:hidden')}>
                            <span className="block text-[14px] font-semibold text-fg truncate leading-tight">{currentWorkspace?.name ?? 'Txio'}</span>
                            <span className="block text-[12px] text-fg-subtle truncate leading-tight mt-0.5">
                                {user ? user.email ?? user.name : 'Local workspace'}
                            </span>
                        </span>
                        <ChevronsUpDown size={13} className={cx('text-fg-subtle shrink-0', collapsed && 'md:hidden')} />
                    </>
                )}
            </button>

            {isOpen && (
                <div
                    className={cx(
                        'absolute top-full mt-1.5 w-[264px] bg-elevated border border-line rounded-[10px] shadow-pop overflow-hidden z-50 animate-in fade-in zoom-in-95',
                        align === 'left' ? 'left-0' : 'right-0'
                    )}
                >
                    <div className="flex items-center justify-between px-3 pt-3 pb-2">
                        <span className="text-[12px] font-semibold uppercase tracking-wide text-fg-subtle">Workspaces</span>
                        <span className="font-mono text-[12px] tabular text-fg-subtle">{workspaces.length}</span>
                    </div>
                    <div className="px-1.5 pb-1.5 max-h-72 overflow-y-auto custom-scrollbar space-y-0.5">
                        {workspaces.map((ws, i) => {
                            const isActive = ws.id === currentWorkspace?.id;
                            const subtitle = [ws.type, ws.role && ws.role !== 'owner' ? ws.role : null].filter(Boolean).join(' · ');
                            return (
                                <button
                                    key={ws.id}
                                    onClick={() => {
                                        appStore.setWorkspace(ws);
                                        setIsOpen(false);
                                    }}
                                    className={cx(
                                        'group w-full flex items-center gap-2.5 rounded-[8px] px-2 py-2 text-left transition-colors',
                                        isActive ? 'bg-active' : 'hover:bg-hover'
                                    )}
                                    aria-current={isActive ? 'true' : undefined}
                                >
                                    <span
                                        className={cx(
                                            'h-7 w-7 shrink-0 rounded-[7px] border flex items-center justify-center text-[13px] font-semibold',
                                            isActive ? 'bg-inverse text-on-inverse border-transparent' : 'bg-surface border-line text-fg-muted'
                                        )}
                                        aria-hidden="true"
                                    >
                                        {ws.name.slice(0, 1).toUpperCase()}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[14px] font-medium text-fg leading-tight">{ws.name}</span>
                                        {subtitle && <span className="block truncate text-[12px] text-fg-subtle leading-tight mt-0.5">{subtitle}</span>}
                                    </span>
                                    {isActive ? (
                                        <Check size={14} className="text-fg shrink-0" aria-label="Current workspace" />
                                    ) : (
                                        i < 9 && <Kbd className="opacity-60 group-hover:opacity-100">{i + 1}</Kbd>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {onCreateWorkspace && (
                        <div className="p-1.5 border-t border-line">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setIsCreateOpen(true);
                                }}
                                className="w-full flex items-center gap-2.5 rounded-[8px] px-2 py-2 text-left text-[14px] font-medium text-fg-muted hover:bg-hover hover:text-fg transition-colors"
                            >
                                <span className="h-7 w-7 shrink-0 rounded-[7px] border border-dashed border-line-strong flex items-center justify-center">
                                    <Plus size={13} className="shrink-0" />
                                </span>
                                <span>Create workspace</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
