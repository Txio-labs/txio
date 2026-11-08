import React, { useRef, useState, useEffect } from 'react';
import {
    User,
    Wallet as WalletIcon,
    RefreshCcw,
    Moon,
    Sun,
    Settings,
    HelpCircle,
    LogOut,
    ChevronRight,
    Check
} from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { useWallet } from '@/wallet';
import { shortenAddress } from '@/wallet/utils';
import { Avatar } from './ui/Avatar';
import { cx } from './ui/primitives';

export const ProfileMenu: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    const { user, settings, workspaces, currentWorkspaceId } = useAppStore();
    const { currentWallet, isConnected } = useWallet();
    const [isOpen, setIsOpen] = useState(false);
    const [showWorkspaces, setShowWorkspaces] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];
    const isDark = settings.theme === 'dark';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setShowWorkspaces(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const item = 'w-full flex items-center gap-2.5 px-2 h-8 rounded-[7px] text-[14px] text-fg hover:bg-hover transition-colors';

    if (!user) {
        return (
            <button
                onClick={() => appStore.setAuthModal(true)}
                className={cx('flex items-center gap-2 h-9 rounded-[8px] hover:bg-hover transition-colors shrink-0 px-1', !compact && 'pr-2.5')}
                title="Sign in"
            >
                <Avatar size="sm" />
                <span className={cx('text-[14px] font-medium text-fg', compact && 'md:hidden')}>Sign in</span>
            </button>
        );
    }

    return (
        <div className="relative min-w-0" ref={containerRef}>
            <button
                onClick={() => setIsOpen((o) => !o)}
                className={cx('flex items-center gap-2 h-9 rounded-[8px] hover:bg-hover transition-colors min-w-0 px-1', !compact && 'pr-2', isOpen && 'bg-hover')}
                title="Account"
            >
                <Avatar size="sm" src={user.avatarUrl} />
                <span className={cx('min-w-0 text-left', compact && 'md:hidden')}>
                    <span className="block text-[14px] font-medium text-fg truncate max-w-[120px] leading-tight">{user.name}</span>
                </span>
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-elevated border border-line rounded-card shadow-pop overflow-hidden z-50 animate-in fade-in slide-in-from-bottom">
                    <div className="flex items-center gap-3 px-3 py-3 border-b border-line">
                        <Avatar size="sm" src={user.avatarUrl} />
                        <div className="min-w-0">
                            <div className="text-[14px] font-semibold text-fg truncate">{user.name}</div>
                            <div className="text-[12px] text-fg-subtle truncate">{user.email}</div>
                        </div>
                    </div>

                    <div className="p-1">
                        <button onClick={() => { setIsOpen(false); appStore.openTab('account'); }} className={item}>
                            <User size={14} className="text-fg-subtle" /> Profile
                        </button>

                        <button onClick={() => { setIsOpen(false); appStore.openTab('profile'); }} className={cx(item, 'h-auto py-1.5')}>
                            <WalletIcon size={14} className="text-fg-subtle shrink-0" />
                            <div className="min-w-0 flex-1 text-left">
                                <div>Connected Wallet</div>
                                {isConnected && currentWallet ? (
                                    <div className="font-mono text-fg-subtle text-[12px]">{shortenAddress(currentWallet.address, 6, 4)}</div>
                                ) : (
                                    <div className="text-fg-subtle text-[12px]">Not connected</div>
                                )}
                            </div>
                            {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Connected" />}
                        </button>

                        <div>
                            <button onClick={() => setShowWorkspaces((v) => !v)} className={cx(item, 'h-auto py-1.5')}>
                                <RefreshCcw size={14} className="text-fg-subtle shrink-0" />
                                <div className="min-w-0 flex-1 text-left">
                                    <div>Switch Workspace</div>
                                    <div className="text-[12px] text-fg-subtle truncate">{currentWorkspace?.name ?? 'No workspace'}</div>
                                </div>
                                <ChevronRight size={13} className={`text-fg-subtle transition-transform shrink-0 ${showWorkspaces ? 'rotate-90' : ''}`} />
                            </button>
                            {showWorkspaces && (
                                <div className="ml-5 pl-2 border-l border-line mb-1 space-y-px">
                                    {workspaces.map((ws) => (
                                        <button
                                            key={ws.id}
                                            onClick={() => { appStore.setWorkspace(ws); setShowWorkspaces(false); setIsOpen(false); }}
                                            className="w-full flex items-center justify-between gap-2 px-2 h-7 rounded-md text-xs text-fg-muted hover:bg-hover hover:text-fg transition-colors"
                                        >
                                            <span className="truncate">{ws.name}</span>
                                            {ws.id === currentWorkspace?.id && <Check size={12} className="text-fg shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button onClick={() => appStore.updateSettings({ theme: isDark ? 'light' : 'dark' })} className={cx(item, 'h-auto py-1.5')}>
                            {isDark ? <Moon size={14} className="text-fg-subtle" /> : <Sun size={14} className="text-fg-subtle" />}
                            <div className="flex-1 text-left">
                                <div>Appearance</div>
                                <div className="text-[12px] text-fg-subtle capitalize">{settings.theme}</div>
                            </div>
                        </button>

                        <button onClick={() => { setIsOpen(false); appStore.openTab('settings'); }} className={item}>
                            <Settings size={14} className="text-fg-subtle" /> Settings
                        </button>

                        <button onClick={() => { setIsOpen(false); appStore.openTab('docs'); }} className={item}>
                            <HelpCircle size={14} className="text-fg-subtle" /> Help & Support
                        </button>
                    </div>

                    <div className="border-t border-line p-1">
                        <button
                            onClick={() => { setIsOpen(false); appStore.logout(); }}
                            className="w-full flex items-center gap-2.5 px-2 h-8 rounded-[7px] text-[14px] text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut size={14} /> Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
