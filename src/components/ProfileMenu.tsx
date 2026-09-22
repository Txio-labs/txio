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

export const ProfileMenu: React.FC = () => {
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

    if (!user) {
        return (
            <button
                onClick={() => appStore.setAuthModal(true)}
                className="w-7 h-7 cursor-pointer hover:ring-2 ring-electric-violet/50 rounded-lg transition-all shrink-0"
                title="Sign in"
            >
                <Avatar size="sm" />
            </button>
        );
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen((o) => !o)}
                className="w-7 h-7 cursor-pointer hover:ring-2 ring-electric-violet/50 rounded-lg transition-all shrink-0"
                title="Account"
            >
                <Avatar size="sm" src={user.avatarUrl} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-white/10">
                        <Avatar size="sm" src={user.avatarUrl} />
                        <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                        </div>
                    </div>

                    <div className="p-1.5">
                        <button
                            onClick={() => { setIsOpen(false); appStore.openTab('account'); }}
                            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                            <User size={14} className="text-slate-400" /> Profile
                        </button>

                        <button
                            onClick={() => { setIsOpen(false); appStore.openTab('profile'); }}
                            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                            <WalletIcon size={14} className="text-slate-400 shrink-0" />
                            <div className="min-w-0 flex-1 text-left">
                                <div className="font-medium text-slate-600 dark:text-slate-300">Connected Wallet</div>
                                {isConnected && currentWallet ? (
                                    <div className="font-mono text-slate-500 text-[11px]">{shortenAddress(currentWallet.address, 6, 4)}</div>
                                ) : (
                                    <div className="text-slate-500 text-[11px]">Not connected</div>
                                )}
                            </div>
                            {isConnected && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Connected" />
                            )}
                        </button>

                        <div>
                            <button
                                onClick={() => setShowWorkspaces((s) => !s)}
                                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                                <RefreshCcw size={14} className="text-slate-400 shrink-0" />
                                <div className="min-w-0 flex-1 text-left">
                                    <div>Switch Workspace</div>
                                    <div className="text-[11px] text-slate-500 truncate">{currentWorkspace?.name ?? 'No workspace'}</div>
                                </div>
                                <ChevronRight size={13} className={`text-slate-400 transition-transform shrink-0 ${showWorkspaces ? 'rotate-90' : ''}`} />
                            </button>
                            {showWorkspaces && (
                                <div className="ml-6 pl-2 border-l border-slate-200 dark:border-white/10 mb-1 space-y-0.5">
                                    {workspaces.map((ws) => (
                                        <button
                                            key={ws.id}
                                            onClick={() => { appStore.setWorkspace(ws); setShowWorkspaces(false); setIsOpen(false); }}
                                            className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <span className="truncate">{ws.name}</span>
                                            {ws.id === currentWorkspace?.id && <Check size={11} className="text-electric-violet shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => appStore.updateSettings({ theme: isDark ? 'light' : 'dark' })}
                            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                            {isDark ? <Moon size={14} className="text-slate-400" /> : <Sun size={14} className="text-slate-400" />}
                            <div className="flex-1 text-left">
                                <div>Appearance</div>
                                <div className="text-[11px] text-slate-500 capitalize">{settings.theme}</div>
                            </div>
                        </button>

                        <button
                            onClick={() => { setIsOpen(false); appStore.openTab('settings'); }}
                            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                            <Settings size={14} className="text-slate-400" /> Settings
                        </button>

                        <button
                            onClick={() => { setIsOpen(false); appStore.openTab('docs'); }}
                            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                            <HelpCircle size={14} className="text-slate-400" /> Help & Support
                        </button>
                    </div>

                    <div className="border-t border-slate-200 dark:border-white/10 p-1.5">
                        <button
                            onClick={() => { setIsOpen(false); appStore.logout(); }}
                            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut size={14} /> Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
