import React, { useEffect, useState } from 'react';
import { Terminal } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { cx, Kbd, StatusDot } from '../ui/primitives';

/** Bottom status bar: connectivity, recent errors, terminal toggle, command palette, version. */
export function StatusFooter({ isRequestView, children, className }: { isRequestView: boolean; children?: React.ReactNode; className?: string }) {
    const { activityLogs, isTerminalOpen } = useAppStore();
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const update = () => setIsOnline(navigator.onLine);
        update();
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);

    const recentErrorCount = (activityLogs ?? []).filter((log) => log.type === 'error').length;

    return (
        <footer className={cx('h-7 flex items-center gap-4 px-3 border-t border-line text-[12px] text-fg-subtle shrink-0 select-none', className)}>
            {!isOnline ? (
                <span className="flex items-center gap-1.5 text-red-500">
                    <StatusDot tone="danger" /> Offline
                </span>
            ) : recentErrorCount > 0 ? (
                <button
                    onClick={() => appStore.openTab('workspace_overview')}
                    className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 hover:underline"
                    title="See workspace activity"
                >
                    <StatusDot tone="warning" />
                    {recentErrorCount} recent error{recentErrorCount === 1 ? '' : 's'}
                </button>
            ) : (
                <span className="flex items-center gap-1.5">
                    <StatusDot tone="success" /> Online
                </span>
            )}
            {isRequestView && (
                <button
                    onClick={() => appStore.toggleTerminal()}
                    className={cx('flex items-center gap-1 transition-colors', isTerminalOpen ? 'text-fg' : 'hover:text-fg')}
                >
                    <Terminal size={11} /> Terminal
                </button>
            )}
            {children}
            <div className="flex-1" />
            <button onClick={() => appStore.setCommandPalette(true)} className="hidden sm:flex items-center gap-1.5 hover:text-fg transition-colors">
                Commands <Kbd>⌘K</Kbd>
            </button>
            <button onClick={() => appStore.openTab('settings')} className="hover:text-fg transition-colors font-mono">
                v2.6.0
            </button>
        </footer>
    );
}
