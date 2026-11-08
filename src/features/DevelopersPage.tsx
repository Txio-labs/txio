/**
 * Developers — public API key management (Phase 6's only frontend surface;
 * everything else the public API exposes is backend + a separate SDK
 * package, per the roadmap's screen mapping).
 */
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Code2, Copy, Loader2, Plus, X } from 'lucide-react';
import { apiService, ApiError, BackendApiKey } from '@/services/api';
import { appStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/Skeleton';

const AVAILABLE_SCOPES = ['history:read', 'routes:read', 'transactions:simulate', 'transactions:execute'];

export const DevelopersPage: React.FC = () => {
    const [keys, setKeys] = useState<BackendApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const [label, setLabel] = useState('');
    const [scopes, setScopes] = useState<string[]>(['history:read']);
    const [creating, setCreating] = useState(false);
    const [revealedKey, setRevealedKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const load = () => {
        queueMicrotask(() => {
            setLoading(true);
            setError(null);
        });
        apiService
            .listApiKeys()
            .then(setKeys)
            .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load API keys.'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const toggleScope = (scope: string) => {
        setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
    };

    const handleCreate = async () => {
        if (!label.trim() || scopes.length === 0) return;
        setCreating(true);
        setError(null);
        try {
            const result = await apiService.createApiKey(label.trim(), scopes);
            setRevealedKey(result.key);
            setLabel('');
            setScopes(['history:read']);
            setShowCreate(false);
            load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to create API key.');
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (id?: string) => {
        if (!id) return;
        try {
            await apiService.revokeApiKey(id);
            load();
        } catch (err) {
            appStore.showToast(err instanceof ApiError ? err.message : 'Failed to revoke.', 'error');
        }
    };

    return (
        <div className="flex flex-col h-full bg-surface font-sans">
            <div className="px-6 md:px-8 pt-7 pb-5 border-b border-line shrink-0">
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-fg flex items-center gap-3">
<span className="h-9 w-9 rounded-[9px] border border-line bg-surface shadow-card flex items-center justify-center text-fg-muted shrink-0"><Code2 size={16} /></span>
Developers
                </h1>
                <p className="text-xs text-fg-subtle mt-1 max-w-lg">
                    API keys for Txio&apos;s public execution API (<code className="font-mono">/api/public/v1</code>) — the
                    same simulate/execute/history engine this app uses, exposed for external callers. Transaction execution
                    via the public API requires a session key (see Automation), since there&apos;s no human to prompt for a
                    signature.
                </p>
                <button
                    onClick={() => setShowCreate((s) => !s)}
                    className="mt-4 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-inverse text-on-inverse hover:opacity-90"
                >
                    <Plus size={13} /> New API key
                </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-6 md:p-8 w-full space-y-5">
                {revealedKey && (
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10 p-3 space-y-2">
                        <p className="text-[12px] text-emerald-700 dark:text-emerald-400 font-semibold">
                            API key — shown once, save it now:
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-[12px] font-mono bg-surface rounded px-2 py-1.5 truncate">{revealedKey}</code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(revealedKey);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1500);
                                }}
                                className="p-1.5 text-fg-subtle hover:text-fg"
                            >
                                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                            </button>
                            <button onClick={() => setRevealedKey(null)} className="p-1.5 text-fg-subtle hover:text-fg">
                                <X size={13} />
                            </button>
                        </div>
                    </div>
                )}

                {showCreate && (
                    <div className="rounded-[10px] border border-line bg-sunken p-4 space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-semibold text-fg-subtle">Label</label>
                            <input
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="e.g. Accounting export script"
                                className="w-full h-9 rounded-lg border border-line bg-surface px-3 text-xs text-fg outline-none focus:border-line-strong"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-semibold text-fg-subtle">Scopes</label>
                            <div className="flex flex-wrap gap-1.5">
                                {AVAILABLE_SCOPES.map((scope) => (
                                    <button
                                        key={scope}
                                        onClick={() => toggleScope(scope)}
                                        className={`px-2.5 py-1 rounded-full text-[12px] font-semibold transition-colors ${
                                            scopes.includes(scope)
                                                ? 'bg-hover text-fg border border-line-strong'
                                                : 'border border-line text-fg-subtle'
                                        }`}
                                    >
                                        {scope}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={handleCreate}
                            disabled={creating || !label.trim() || scopes.length === 0}
                            className="w-full h-10 rounded-lg bg-inverse text-on-inverse text-xs font-semibold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {creating ? <Loader2 size={13} className="animate-spin" /> : null} Create
                        </button>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-[12px] text-red-600 dark:text-red-400">
                        <AlertTriangle size={13} /> {error}
                    </div>
                )}

                {loading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between rounded-lg border border-line bg-elevated p-3">
                                <div className="min-w-0 space-y-1.5 flex-1">
                                    <Skeleton className="h-3 w-32" />
                                    <Skeleton className="h-2.5 w-24" />
                                    <Skeleton className="h-2.5 w-40" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : keys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Code2 size={28} className="text-fg-subtle mb-3" />
                        <p className="text-sm font-semibold text-fg">No API keys yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {keys.map((key) => {
                            const active = !key.revoked_at;
                            return (
                                <div key={key.id?.toString()} className="flex items-center justify-between rounded-lg border border-line bg-elevated p-3">
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold text-fg">{key.label}</div>
                                        <div className="text-[12px] text-fg-subtle font-mono">{key.key_prefix}…</div>
                                        <div className="text-[12px] text-fg-subtle mt-0.5">
                                            {key.scopes.join(', ')} {!active && '· revoked'}
                                        </div>
                                    </div>
                                    {active && (
                                        <button
                                            onClick={() => handleRevoke(key.id?.toString())}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg shrink-0"
                                            title="Revoke"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
