'use client';

import React from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useAppStore } from '@/lib/store';

// Rendered once, globally, in Providers so appStore.showToast() works on
// every route — not just inside the authenticated workspace Layout.
export function ToastContainer() {
    const { notifications } = useAppStore();

    return (
        <div className="fixed top-16 right-6 z-[120] flex flex-col gap-3 pointer-events-none">
            {notifications.map(n => (
                <div key={n.id} className="animate-in slide-in-from-right-10 fade-in duration-300 pointer-events-auto">
                    <div className="bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px]">
                        {n.type === 'success' && <CheckCircle size={16} className="text-emerald-400" />}
                        {n.type === 'error' && <AlertCircle size={16} className="text-red-400" />}
                        {n.type === 'info' && <Info size={16} className="text-blue-400" />}
                        <span className="text-xs font-bold">{n.message}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
