import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Github, LogOut, Mail, User as UserIcon } from 'lucide-react';

import { appStore, useAppStore } from '@/lib/store';
import { CollectionNode } from '@/types';
import { TabProps } from './types';

const SAVED_FLASH_MS = 1800;
const NAME_MAX_LENGTH = 60;

const countRequests = (nodes: CollectionNode[]): number =>
    nodes.reduce((total, node) => {
        if (node.type === 'request') return total + 1;
        if (node.children) return total + countRequests(node.children);
        return total;
    }, 0);

interface StatProps {
    label: string;
    value: number;
}

const Stat: React.FC<StatProps> = ({ label, value }) => (
    <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-xl font-semibold text-white tracking-tight mt-0.5">{value}</div>
    </div>
);

interface FieldProps {
    label: string;
    htmlFor?: string;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, htmlFor, error, hint, children }) => (
    <div className="space-y-1.5">
        <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-400">{label}</label>
        {children}
        {error ? (
            <p className="flex items-center gap-1.5 text-[11px] text-rose-400">
                <AlertCircle size={11} /> {error}
            </p>
        ) : (
            hint && <p className="text-[11px] text-slate-500">{hint}</p>
        )}
    </div>
);

const inputBase =
    'w-full bg-near-black border rounded-lg px-3 py-2 text-sm outline-none transition-colors';
const editableInput = `${inputBase} border-white/[0.08] text-slate-200 placeholder:text-slate-600 focus:border-electric-violet/60 focus:bg-white/[0.02]`;
const errorInput = `${inputBase} border-rose-500/40 text-slate-200 focus:border-rose-500/60`;
const readonlyInput = `${inputBase} border-white/[0.08] text-slate-500 cursor-not-allowed`;

export const GeneralTab: React.FC<TabProps & { onLogout: () => void }> = ({ user, onLogout }) => {
    const { history, collections } = useAppStore();

    const [editName, setEditName] = useState(user?.name || '');
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setEditName(user?.name || '');
        setSaved(false);
        setError(null);
    }, [user?.name]);

    useEffect(() => {
        if (!saved) return;
        const t = window.setTimeout(() => setSaved(false), SAVED_FLASH_MS);
        return () => window.clearTimeout(t);
    }, [saved]);

    const savedRequestCount = useMemo(() => countRequests(collections), [collections]);

    if (!user) return null;

    const trimmed = editName.trim();
    const isDirty = trimmed.length > 0 && trimmed !== user.name;
    const shortUserId = user.id.length > 16 ? `${user.id.slice(0, 8)}…${user.id.slice(-4)}` : user.id;

    const handleSave = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!trimmed) {
            setError('Display name is required.');
            return;
        }
        setError(null);
        appStore.updateUser({ name: trimmed });
        setEditName(trimmed);
        setSaved(true);
        appStore.showToast('Profile updated', 'success');
    };

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
            {/* Workspace stats — single compact row */}
            <section className="rounded-xl border border-white/[0.08] bg-dark-indigo-glow px-5 py-4">
                <div className="flex items-center divide-x divide-white/[0.06]">
                    <Stat label="Calls" value={history.length} />
                    <div className="px-5"><Stat label="Collections" value={collections.length} /></div>
                    <Stat label="Requests" value={savedRequestCount} />
                </div>
            </section>

            {/* Profile details form */}
            <section className="rounded-xl border border-white/[0.08] bg-dark-indigo-glow overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-slate-100 tracking-tight">Profile details</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Update how you appear across txio.</p>
                </div>

                <form className="p-5 space-y-4" onSubmit={handleSave}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Display name" htmlFor="general-name" error={error ?? undefined}>
                            <div className="relative">
                                <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                <input
                                    id="general-name"
                                    className={`${error ? errorInput : editableInput} pl-9`}
                                    value={editName}
                                    onChange={(e) => {
                                        setEditName(e.target.value);
                                        if (error) setError(null);
                                        if (saved) setSaved(false);
                                    }}
                                    placeholder="Your name"
                                    maxLength={NAME_MAX_LENGTH + 10}
                                    autoComplete="name"
                                />
                            </div>
                        </Field>

                        <Field label="Email" htmlFor="general-email" hint="Used for sign-in.">
                            <div className="relative">
                                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                <input
                                    id="general-email"
                                    className={`${readonlyInput} pl-9`}
                                    value={user.email}
                                    readOnly
                                    aria-readonly
                                />
                            </div>
                        </Field>

                        <Field label="GitHub" hint="Publish recipes and sync gists.">
                            <div className={`${readonlyInput} flex items-center gap-2`}>
                                <Github size={14} className="text-slate-500 shrink-0" />
                                <span className="truncate">Not connected</span>
                                <button
                                    type="button"
                                    onClick={() => appStore.showToast('GitHub OAuth not implemented', 'info')}
                                    className="ml-auto text-[11px] text-electric-violet hover:text-soft-purple font-medium transition-colors"
                                >
                                    Connect →
                                </button>
                            </div>
                        </Field>

                        <Field label="Account ID">
                            <div className={`${readonlyInput} font-mono`}>
                                <span className="truncate">{shortUserId}</span>
                            </div>
                        </Field>
                    </div>
                </form>

                <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-white/[0.06] bg-white/[0.015]">
                    <p className="text-[11px] text-slate-500">
                        {error
                            ? <span className="text-rose-400 inline-flex items-center gap-1.5"><AlertCircle size={11} /> {error}</span>
                            : isDirty
                                ? 'You have unsaved changes.'
                                : saved
                                    ? 'All changes saved.'
                                    : 'No changes yet.'}
                    </p>
                    <button
                        onClick={() => handleSave()}
                        disabled={!isDirty && !saved}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                            saved
                                ? 'bg-emerald-500/[0.15] text-emerald-300 border border-emerald-500/30'
                                : 'bg-electric-violet hover:bg-electric-violet/90 text-white'
                        }`}
                    >
                        {saved && <Check size={13} />}
                        {saved ? 'Saved' : 'Save changes'}
                    </button>
                </div>
            </section>

            {/* Mobile-only sign out (sidebar holds it on desktop) */}
            <button
                onClick={onLogout}
                className="md:hidden flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.08] px-4 py-2.5 text-sm font-medium text-rose-300 hover:bg-rose-500/[0.12] transition-colors"
            >
                <LogOut size={14} />
                Sign Out
            </button>
        </div>
    );
};
