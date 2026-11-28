import React, { useRef, useState } from 'react';
import { Bell, BellOff, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { cx, IconButton } from '../ui/primitives';
import { useClickOutside } from './useClickOutside';

const NOTIF_META = {
    success: { icon: CheckCircle2, className: 'text-emerald-500' },
    error: { icon: XCircle, className: 'text-red-500' },
    info: { icon: Info, className: 'text-sky-500' },
} as const;

function notifTimeAgo(ts: number): string {
    const secs = Math.floor((Date.now() - ts) / 1000);
    if (secs < 5) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
}

/** Bell button with the in-app notification list. Opens below the button, aligned to `align`. */
export function NotificationsMenu({ align = 'right' }: { align?: 'left' | 'right' }) {
    const { notifications } = useAppStore();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, () => setIsOpen(false));

    return (
        <div className="relative" ref={ref}>
            <IconButton label="Notifications" active={isOpen} onClick={() => setIsOpen((o) => !o)} className="relative">
                <Bell size={15} />
                {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-fg ring-2 ring-surface" />}
            </IconButton>
            {isOpen && (
                <div
                    className={cx(
                        'absolute top-full mt-1.5 w-80 bg-elevated border border-line rounded-card shadow-pop overflow-hidden z-50 animate-in fade-in zoom-in-95',
                        align === 'right' ? 'right-0' : 'left-0'
                    )}
                >
                    <div className="flex items-center justify-between px-3.5 h-10 border-b border-line">
                        <h3 className="text-[14px] font-semibold">Notifications</h3>
                        {notifications.length > 0 && (
                            <button onClick={() => appStore.clearNotifications()} className="text-xs text-fg-subtle hover:text-fg transition-colors">
                                Clear all
                            </button>
                        )}
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-10 px-4">
                                <BellOff size={18} className="text-fg-subtle" />
                                <p className="text-xs text-fg-subtle">You&apos;re all caught up</p>
                            </div>
                        ) : (
                            <div className="p-1">
                                {notifications
                                    .slice()
                                    .reverse()
                                    .map((n) => {
                                        const meta = NOTIF_META[n.type];
                                        return (
                                            <div key={n.id} className="group flex items-start gap-2.5 px-2.5 py-2 rounded-[7px] hover:bg-hover transition-colors">
                                                <meta.icon size={14} className={cx('mt-0.5 shrink-0', meta.className)} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[14px] text-fg leading-snug">{n.message}</p>
                                                    <p className="text-[12px] text-fg-subtle mt-0.5">{notifTimeAgo(n.timestamp)}</p>
                                                </div>
                                                <button
                                                    onClick={() => appStore.dismissNotification(n.id)}
                                                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-fg-subtle hover:text-fg transition-opacity shrink-0 mt-0.5"
                                                    aria-label="Dismiss"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
