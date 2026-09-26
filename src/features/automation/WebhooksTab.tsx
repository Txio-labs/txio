import React, { useEffect, useState } from 'react';
import { AlertTriangle, Bell, Check, Copy, Loader2, Plus, X } from 'lucide-react';
import { apiService, ApiError, BackendWebhookSubscription } from '@/services/api';
import { appStore } from '@/lib/store';

const AVAILABLE_EVENTS = ['tx.confirmed', 'tx.failed', 'swap.resumable', 'session_key.expiring', 'spend_limit.reached'];

export const WebhooksTab: React.FC = () => {
    const [subs, setSubs] = useState<BackendWebhookSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const [url, setUrl] = useState('');
    const [events, setEvents] = useState<string[]>(['tx.confirmed']);
    const [creating, setCreating] = useState(false);
    const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const load = () => {
        queueMicrotask(() => {
            setLoading(true);
            setError(null);
        });
        apiService
            .listWebhooks()
            .then(setSubs)
            .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load webhooks.'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const toggleEvent = (event: string) => {
        setEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]));
    };

    const handleCreate = async () => {
        if (!url.trim() || events.length === 0) return;
        setCreating(true);
        setError(null);
        try {
            const result = await apiService.createWebhook(url.trim(), events);
            setRevealedSecret(result.secret);
            setUrl('');
            setEvents(['tx.confirmed']);
            setShowCreate(false);
            load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to create webhook.');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id?: string) => {
        if (!id) return;
        try {
            await apiService.deleteWebhook(id);
            load();
        } catch (err) {
            appStore.showToast(err instanceof ApiError ? err.message : 'Failed to delete webhook.', 'error');
        }
    };

    return (
        <div className="p-6 w-full space-y-5">
            <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 max-w-md">
                    Get a signed HTTP POST when a transaction confirms/fails, a swap needs resuming, a session key is about
                    to expire, or a spend limit is hit.
                </p>
                <button
                    onClick={() => setShowCreate((s) => !s)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black hover:opacity-90 shrink-0"
                >
                    <Plus size={13} /> New webhook
                </button>
            </div>

            {revealedSecret && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10 p-3 space-y-2">
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                        Signing secret — shown once, save it now:
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 text-[11px] font-mono bg-white dark:bg-near-black rounded px-2 py-1.5 truncate">{revealedSecret}</code>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(revealedSecret);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1500);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        >
                            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        </button>
                        <button onClick={() => setRevealedSecret(null)} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                            <X size={13} />
                        </button>
                    </div>
                </div>
            )}

            {showCreate && (
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-4 space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Endpoint URL</label>
                        <input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://your-server.example.com/webhooks/txio"
                            className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Events</label>
                        <div className="flex flex-wrap gap-1.5">
                            {AVAILABLE_EVENTS.map((event) => (
                                <button
                                    key={event}
                                    onClick={() => toggleEvent(event)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${
                                        events.includes(event)
                                            ? 'bg-electric-violet/10 text-electric-violet border border-electric-violet/30'
                                            : 'border border-slate-200 dark:border-white/10 text-slate-500'
                                    }`}
                                >
                                    {event}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={creating || !url.trim() || events.length === 0}
                        className="w-full h-10 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black text-xs font-bold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {creating ? <Loader2 size={13} className="animate-spin" /> : null} Create
                    </button>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-[11px] text-red-600 dark:text-red-400">
                    <AlertTriangle size={13} /> {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-10 text-slate-500 text-xs gap-2">
                    <Loader2 size={16} className="animate-spin" /> Loading webhooks…
                </div>
            ) : subs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Bell size={28} className="text-slate-400 mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No webhooks yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {subs.map((sub) => (
                        <div key={sub.id?.toString()} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-indigo-glow p-3">
                            <div className="min-w-0">
                                <div className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate">{sub.url}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                    {sub.events.join(', ')}
                                    {sub.last_delivery_error ? ` · last error: ${sub.last_delivery_error}` : ''}
                                </div>
                            </div>
                            <button onClick={() => handleDelete(sub.id?.toString())} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg shrink-0" title="Delete">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
