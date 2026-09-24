/**
 * Developers — public API key management (Phase 6's only frontend surface;
 * everything else the public API exposes is backend + a separate SDK
 * package, per the roadmap's screen mapping).
 */
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Code2, Copy, Loader2, Plus, X } from 'lucide-react';
import { apiService, ApiError, BackendApiKey } from '@/services/api';
import { appStore } from '@/lib/store';

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
        <div className="flex flex-col h-full bg-white dark:bg-near-black font-sans">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-dark-indigo-glow/50 shrink-0">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                    <Code2 size={22} className="text-electric-violet" />
                    Developers
                </h1>
                <p className="text-xs text-slate-500 mt-1 max-w-lg">
                    API keys for Txio&apos;s public execution API (<code className="font-mono">/api/public/v1</code>) — the
                    same simulate/execute/history engine this app uses, exposed for external callers. Transaction execution
                    via the public API requires a session key (see Automation), since there&apos;s no human to prompt for a
                    signature.
                </p>
                <button
                    onClick={() => setShowCreate((s) => !s)}
                    className="mt-4 flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black hover:opacity-90"
                >
                    <Plus size={13} /> New API key
                </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-6 max-w-2xl mx-auto w-full space-y-5">
                {revealedKey && (
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10 p-3 space-y-2">
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                            API key — shown once, save it now:
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-[11px] font-mono bg-white dark:bg-near-black rounded px-2 py-1.5 truncate">{revealedKey}</code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(revealedKey);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1500);
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            >
                                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                            </button>
                            <button onClick={() => setRevealedKey(null)} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                                <X size={13} />
                            </button>
                        </div>
                    </div>
                )}

                {showCreate && (
                    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-4 space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Label</label>
                            <input
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="e.g. Accounting export script"
                                className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-electric-violet"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Scopes</label>
                            <div className="flex flex-wrap gap-1.5">
                                {AVAILABLE_SCOPES.map((scope) => (
                                    <button
                                        key={scope}
                                        onClick={() => toggleScope(scope)}
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                                            scopes.includes(scope)
                                                ? 'bg-electric-violet/10 text-electric-violet border border-electric-violet/30'
                                                : 'border border-slate-200 dark:border-white/10 text-slate-500'
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
                        <Loader2 size={16} className="animate-spin" /> Loading API keys…
                    </div>
                ) : keys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Code2 size={28} className="text-slate-400 mb-3" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No API keys yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {keys.map((key) => {
                            const active = !key.revoked_at;
                            return (
                                <div key={key.id?.toString()} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-indigo-glow p-3">
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{key.label}</div>
                                        <div className="text-[11px] text-slate-500 font-mono">{key.key_prefix}…</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">
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
