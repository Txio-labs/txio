import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, FileText, FolderOpen, LogOut, Mail, Terminal, User as UserIcon } from 'lucide-react';
import { Github, Google } from '@/components/icons/BrandIcons';

import { appStore, useAppStore } from '@/lib/store';
import { API_BASE, apiService } from '@/services/api';
import { connectProvider } from '@/lib/connectProvider';
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
    icon: React.ElementType;
    label: string;
    value: number;
}

const Stat: React.FC<StatProps> = ({ icon: Icon, label, value }) => (
    <div className="flex flex-1 min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-hover text-fg-subtle">
            <Icon size={14} />
        </div>
        <div className="min-w-0">
            <div className="text-xs text-fg-subtle">{label}</div>
            <div className="text-xl font-semibold text-fg tracking-tight mt-0.5">{value}</div>
        </div>
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
        <label htmlFor={htmlFor} className="block text-xs font-medium text-fg-subtle">{label}</label>
        {children}
        {error ? (
            <p className="flex items-center gap-1.5 text-[12px] text-rose-600 dark:text-rose-400">
                <AlertCircle size={11} /> {error}
            </p>
        ) : (
            hint && <p className="text-[12px] text-fg-subtle">{hint}</p>
        )}
    </div>
);

const inputBase =
    'w-full bg-surface border rounded-lg px-3 py-2 text-sm outline-none transition-colors';
const editableInput = `${inputBase} border-line text-fg placeholder:text-fg-subtle focus:border-line-strong focus:bg-slate-50 dark:focus:bg-sunken`;
const errorInput = `${inputBase} border-rose-500/40 text-fg focus:border-rose-500/60`;
const readonlyInput = `${inputBase} border-line text-fg-subtle cursor-not-allowed`;

export const GeneralTab: React.FC<TabProps & { onLogout: () => void }> = ({ user, onLogout }) => {
    const { history, collections } = useAppStore();

    const [editName, setEditName] = useState(user?.name || '');
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [prevUserName, setPrevUserName] = useState(user?.name);

    if (user?.name !== prevUserName) {
        setPrevUserName(user?.name);
        setEditName(user?.name || '');
        setSaved(false);
        setError(null);
    }

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
            {/* Profile details, with workspace stats grouped in as its header */}
            <section className="rounded-[10px] border border-line bg-elevated overflow-hidden">
                <div className="flex items-center divide-x divide-slate-200 dark:divide-white/[0.06] px-5 py-4 border-b border-line">
                    <Stat icon={Terminal} label="Calls" value={history.length} />
                    <div className="px-5"><Stat icon={FolderOpen} label="Collections" value={collections.length} /></div>
                    <Stat icon={FileText} label="Requests" value={savedRequestCount} />
                </div>

                <div className="px-5 py-4 border-b border-line">
                    <h3 className="text-sm font-semibold text-fg tracking-tight">Profile details</h3>
                    <p className="text-xs text-fg-subtle mt-0.5">Update how you appear across txio.</p>
                </div>

                <form className="p-5 space-y-4" onSubmit={handleSave}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Display name" htmlFor="general-name" error={error ?? undefined}>
                            <div className="relative">
                                <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
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
                                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
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
                                <Github size={14} className={user.githubAccount ? "text-fg shrink-0" : "text-fg-subtle shrink-0"} />
                                <span className={user.githubAccount ? "truncate text-fg" : "truncate text-fg-subtle"}>
                                    {user.githubAccount ? `@${user.githubAccount.login}` : "Not connected"}
                                </span>
                                {!user.githubAccount && (
                                    <button
                                        type="button"
                                        onClick={() => void connectProvider('github')}
                                        aria-label="Connect GitHub"
                                        className="ml-auto text-[12px] text-fg hover:opacity-80 font-medium transition-colors"
                                    >
                                        Connect →
                                    </button>
                                )}
                            </div>
                        </Field>

                        <Field label="Google" hint="Sign in without a password.">
                            <div className={`${readonlyInput} flex items-center gap-2`}>
                                <Google size={14} className="shrink-0" />
                                <span className={user.googleLinked ? "truncate text-fg" : "truncate text-fg-subtle"}>
                                    {user.googleLinked ? "Connected" : "Not connected"}
                                </span>
                                {!user.googleLinked && (
                                    <button
                                        type="button"
                                        onClick={() => void connectProvider('google')}
                                        aria-label="Connect Google"
                                        className="ml-auto text-[12px] text-fg hover:opacity-80 font-medium transition-colors"
                                    >
                                        Connect →
                                    </button>
                                )}
                            </div>
                        </Field>

                        <Field label="Account ID">
                            <div className={`${readonlyInput} font-mono`}>
                                <span className="truncate">{shortUserId}</span>
                            </div>
                        </Field>
                    </div>
                </form>

                <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-line bg-sunken">
                    <p className="text-[12px] text-fg-subtle">
                        {error
                            ? <span className="text-rose-600 dark:text-rose-400 inline-flex items-center gap-1.5"><AlertCircle size={11} /> {error}</span>
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
                                ? 'bg-emerald-500/[0.15] text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                                : 'bg-inverse hover:opacity-90 text-on-inverse'
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
                className="md:hidden flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.08] px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-500/[0.12] transition-colors"
            >
                <LogOut size={14} />
                Sign Out
            </button>
        </div>
    );
};