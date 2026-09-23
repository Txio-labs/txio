import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock,
    FolderKanban,
    Loader2,
    RefreshCw,
    Search,
    ShieldCheck,
    Trash2,
    Users,
    XCircle,
    Zap
} from 'lucide-react';
import { apiService, ApiError } from '@/services/api';
import { appStore, useAppStore } from '@/lib/store';
import type {
    AdminCollection,
    AdminOverview,
    AdminRequest,
    AdminRpcLog,
    AdminUser
} from '@/types';

type AdminView = 'users' | 'requests' | 'collections' | 'rpc';

interface AdminData {
    overview: AdminOverview;
    users: AdminUser[];
    requests: AdminRequest[];
    collections: AdminCollection[];
    rpcLogs: AdminRpcLog[];
}

const VIEWS: { id: AdminView; label: string; icon: React.ElementType }[] = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'requests', label: 'Requests', icon: Zap },
    { id: 'collections', label: 'Collections', icon: FolderKanban },
    { id: 'rpc', label: 'RPC logs', icon: Activity }
];

export const formatRelative = (iso: string | null | undefined, now = Date.now()): string => {
    if (!iso) return '—';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '—';
    const seconds = Math.max(0, Math.round((now - then) / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(then));
};

const matches = (query: string, ...fields: (string | null | undefined)[]) =>
    !query || fields.some((f) => f?.toLowerCase().includes(query));

const fetchAdminData = async (): Promise<AdminData> => {
    const [overview, users, requests, collections, rpcLogs] = await Promise.all([
        apiService.getAdminOverview(),
        apiService.getAdminUsers(),
        apiService.getAdminRequests(),
        apiService.getAdminCollections(),
        apiService.getAdminRpcLogs()
    ]);
    return { overview, users, requests, collections, rpcLogs };
};

const StatCard: React.FC<{ label: string; value: number; hint?: string }> = ({ label, value, hint }) => (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-dark-indigo-glow px-4 py-3 min-w-0">
        <div className="text-[11px] font-medium text-slate-500 truncate">{label}</div>
        <div className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mt-0.5 tabular-nums">
            {value.toLocaleString()}
        </div>
        {hint && <div className="text-[11px] text-slate-500 mt-0.5 truncate">{hint}</div>}
    </div>
);

const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <th className={`px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 ${className}`}>
        {children}
    </th>
);

const Td: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
    <td className={`px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 ${className}`} title={title}>
        {children}
    </td>
);

const Badge: React.FC<{ children: React.ReactNode; tone?: 'violet' | 'slate' | 'green' | 'red' }> = ({ children, tone = 'slate' }) => {
    const tones = {
        violet: 'bg-electric-violet/10 text-electric-violet',
        slate: 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400',
        green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        red: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
    };
    return <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${tones[tone]}`}>{children}</span>;
};

const DeleteUserDialog: React.FC<{
    user: AdminUser;
    onCancel: () => void;
    onDeleted: () => void;
}> = ({ user, onCancel, onDeleted }) => {
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const confirmed = confirmText.trim().toLowerCase() === user.email.toLowerCase();

    const handleDelete = async () => {
        if (!confirmed) return;
        setDeleting(true);
        setError(null);
        try {
            await apiService.adminDeleteUser(user.email);
            appStore.showToast(`Deleted ${user.email}`, 'success');
            onDeleted();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete user.');
            setDeleting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => !deleting && onCancel()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-delete-title"
                className="w-full max-w-md rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181b] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.key === 'Escape' && !deleting && onCancel()}
            >
                <div className="p-5 space-y-3">
                    <h2 id="admin-delete-title" className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                        <Trash2 size={16} className="text-rose-500" /> Delete account
                    </h2>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        This permanently deletes <span className="font-semibold text-slate-900 dark:text-slate-100">{user.email}</span> and
                        everything they own: {user.collection_count} collection{user.collection_count === 1 ? '' : 's'} with their saved
                        requests, {user.request_count} history entr{user.request_count === 1 ? 'y' : 'ies'}, workspaces and RPC logs.
                        They&apos;ll be signed out everywhere. This can&apos;t be undone.
                    </p>
                    <label className="block space-y-1.5">
                        <span className="text-[11px] font-medium text-slate-500">Type the email to confirm</span>
                        <input
                            autoFocus
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
                            placeholder={user.email}
                            disabled={deleting}
                            className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-rose-500/60"
                        />
                    </label>
                    {error && (
                        <p className="flex items-center gap-1.5 text-[11px] text-rose-500">
                            <AlertCircle size={11} /> {error}
                        </p>
                    )}
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-white/10 px-5 py-3">
                    <button
                        onClick={onCancel}
                        disabled={deleting}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={!confirmed || deleting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {deleting && <Loader2 size={12} className="animate-spin" />}
                        Delete account
                    </button>
                </div>
            </div>
        </div>
    );
};

const EmptyRow: React.FC<{ colSpan: number; label: string }> = ({ colSpan, label }) => (
    <tr>
        <td colSpan={colSpan} className="px-4 py-10 text-center text-xs text-slate-500">{label}</td>
    </tr>
);

export const AdminPage: React.FC = () => {
    const [data, setData] = useState<AdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<{ message: string; forbidden: boolean } | null>(null);
    const [view, setView] = useState<AdminView>('users');
    const [search, setSearch] = useState('');
    const [loadedAt, setLoadedAt] = useState<number>(0);
    const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);
    const { user: currentUser } = useAppStore();

    const applyResult = useCallback((result: Promise<AdminData>) => {
        result
            .then((next) => {
                setData(next);
                setError(null);
                setLoadedAt(Date.now());
            })
            .catch((err) => {
                const status = err instanceof ApiError ? err.status : 0;
                setError({
                    message: err instanceof Error ? err.message : 'Failed to load admin data.',
                    forbidden: status === 401 || status === 403
                });
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        applyResult(fetchAdminData());
    }, [applyResult]);

    const refresh = () => {
        setLoading(true);
        applyResult(fetchAdminData());
    };

    const q = search.trim().toLowerCase();

    const users = useMemo(
        () => (data?.users ?? []).filter((u) => matches(q, u.email, u.name, u.github_login)),
        [data, q]
    );
    const requests = useMemo(
        () => (data?.requests ?? []).filter((r) => matches(q, r.user_email, r.name, r.method, r.network, r.chain)),
        [data, q]
    );
    const collections = useMemo(
        () => (data?.collections ?? []).filter((c) => matches(q, c.owner_email, c.name, c.description)),
        [data, q]
    );
    const rpcLogs = useMemo(
        () => (data?.rpcLogs ?? []).filter((l) => matches(q, l.user_email, l.method, l.error)),
        [data, q]
    );

    const counts: Record<AdminView, number> = {
        users: users.length,
        requests: requests.length,
        collections: collections.length,
        rpc: rpcLogs.length
    };

    if (error?.forbidden) {
        return (
            <div className="flex h-full items-center justify-center bg-white dark:bg-near-black p-6">
                <div className="text-center max-w-sm">
                    <ShieldCheck size={28} className="mx-auto text-slate-400" />
                    <h1 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">Admin access required</h1>
                    <p className="mt-1 text-xs text-slate-500">This account doesn&apos;t have permission to view the admin dashboard.</p>
                </div>
            </div>
        );
    }

    const o = data?.overview;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-near-black font-sans">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-dark-indigo-glow/50 shrink-0 space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                            <ShieldCheck size={22} className="text-electric-violet" />
                            Admin
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Activity across every account on txio.
                            {loadedAt > 0 && <span className="ml-1">Updated {formatRelative(new Date(loadedAt).toISOString())}.</span>}
                        </p>
                    </div>
                    <button
                        onClick={refresh}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {o && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <StatCard label="Users" value={o.users} hint={`+${o.signups_last_7d} in 7 days`} />
                        <StatCard label="Requests run" value={o.history_entries} hint={`${o.requests_last_24h} in 24h`} />
                        <StatCard label="RPC calls" value={o.rpc_logs} hint={`${o.rpc_calls_last_24h} in 24h`} />
                        <StatCard label="Collections" value={o.collections} hint={`${o.saved_requests} saved requests`} />
                        <StatCard label="Workspaces" value={o.workspaces} />
                        <StatCard label="Sessions" value={o.active_sessions} hint={`${o.admins} admin${o.admins === 1 ? '' : 's'}`} />
                    </div>
                )}

                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex bg-white dark:bg-near-black p-1 rounded-lg border border-slate-200 dark:border-white/5" role="tablist">
                        {VIEWS.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                role="tab"
                                aria-selected={view === id}
                                onClick={() => setView(id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                                    view === id
                                        ? 'bg-electric-violet/10 text-electric-violet'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <Icon size={13} />
                                {label}
                                {data && <span className="tabular-nums opacity-70">{counts[id]}</span>}
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1 min-w-[180px] max-w-md group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-electric-violet transition-colors" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Search admin data"
                            className="w-full bg-white dark:bg-near-black border border-slate-200 dark:border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-electric-violet outline-none transition-all"
                            placeholder="Search by email, name, method..."
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                {error && (
                    <div className="m-6 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-xs text-rose-500">
                        <AlertCircle size={14} /> {error.message}
                    </div>
                )}

                {loading && !data && (
                    <div className="flex items-center justify-center gap-2 py-20 text-xs text-slate-500">
                        <Loader2 size={16} className="animate-spin" /> Loading admin data…
                    </div>
                )}

                {data && (
                    <table className="w-full min-w-[720px]">
                        {view === 'users' && (
                            <>
                                <thead className="sticky top-0 bg-white dark:bg-near-black border-b border-slate-200 dark:border-white/5">
                                    <tr><Th>User</Th><Th>Linked</Th><Th>Collections</Th><Th>Requests</Th><Th>Last active</Th><Th>Joined</Th><Th><span className="sr-only">Actions</span></Th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                                    {users.length === 0 && <EmptyRow colSpan={7} label="No users match." />}
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                            <Td>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">{u.name || u.email.split('@')[0]}</span>
                                                    {u.is_admin && <Badge tone="violet">Admin</Badge>}
                                                    {u.tier && u.tier !== 'Free' && <Badge>{u.tier}</Badge>}
                                                </div>
                                                <div className="text-[11px] text-slate-500">{u.email}</div>
                                            </Td>
                                            <Td>
                                                <div className="flex gap-1">
                                                    {u.google_linked && <Badge>Google</Badge>}
                                                    {u.github_login && <Badge>@{u.github_login}</Badge>}
                                                    {!u.google_linked && !u.github_login && <span className="text-slate-400">—</span>}
                                                </div>
                                            </Td>
                                            <Td className="tabular-nums">{u.collection_count}</Td>
                                            <Td className="tabular-nums">{u.request_count}</Td>
                                            <Td title={u.last_active_at ?? undefined}>{formatRelative(u.last_active_at)}</Td>
                                            <Td title={u.created_at ?? undefined}>{formatRelative(u.created_at)}</Td>
                                            <Td className="text-right">
                                                {/* Mirrors the server guard: no deleting yourself or other admins. */}
                                                {!u.is_admin && u.email !== currentUser?.email && (
                                                    <button
                                                        onClick={() => setPendingDelete(u)}
                                                        aria-label={`Delete ${u.email}`}
                                                        title="Delete account"
                                                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </>
                        )}

                        {view === 'requests' && (
                            <>
                                <thead className="sticky top-0 bg-white dark:bg-near-black border-b border-slate-200 dark:border-white/5">
                                    <tr><Th>Status</Th><Th>Request</Th><Th>User</Th><Th>Network</Th><Th>Duration</Th><Th>When</Th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                                    {requests.length === 0 && <EmptyRow colSpan={6} label="No requests match." />}
                                    {requests.map((r) => {
                                        const ok = r.status !== null && r.status < 400;
                                        return (
                                            <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                                <Td>
                                                    <Badge tone={ok ? 'green' : 'red'}>
                                                        {ok ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                                        {r.status ?? 'ERR'}
                                                    </Badge>
                                                </Td>
                                                <Td>
                                                    <div className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[260px]">{r.name}</div>
                                                    <div className="font-mono text-[11px] text-slate-500 truncate max-w-[260px]">
                                                        {r.request_type && <span className="mr-1.5">{r.request_type}</span>}
                                                        {r.method}
                                                    </div>
                                                </Td>
                                                <Td>{r.user_email ?? <span className="text-slate-400">deleted user</span>}</Td>
                                                <Td>{[r.chain, r.network].filter(Boolean).join(' · ') || '—'}</Td>
                                                <Td className="tabular-nums">{r.duration_ms !== null ? `${r.duration_ms} ms` : '—'}</Td>
                                                <Td title={r.executed_at ?? undefined}>
                                                    <span className="inline-flex items-center gap-1"><Clock size={11} className="text-slate-400" />{formatRelative(r.executed_at)}</span>
                                                </Td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </>
                        )}

                        {view === 'collections' && (
                            <>
                                <thead className="sticky top-0 bg-white dark:bg-near-black border-b border-slate-200 dark:border-white/5">
                                    <tr><Th>Collection</Th><Th>Owner</Th><Th>Requests</Th><Th>Updated</Th><Th>Created</Th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                                    {collections.length === 0 && <EmptyRow colSpan={5} label="No collections match." />}
                                    {collections.map((c) => (
                                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                            <Td>
                                                <div className="font-medium text-slate-900 dark:text-slate-100">{c.name}</div>
                                                {c.description && <div className="text-[11px] text-slate-500 truncate max-w-[320px]">{c.description}</div>}
                                            </Td>
                                            <Td>{c.owner_email ?? <span className="text-slate-400">deleted user</span>}</Td>
                                            <Td className="tabular-nums">{c.request_count}</Td>
                                            <Td title={c.updated_at ?? undefined}>{formatRelative(c.updated_at)}</Td>
                                            <Td title={c.created_at ?? undefined}>{formatRelative(c.created_at)}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </>
                        )}

                        {view === 'rpc' && (
                            <>
                                <thead className="sticky top-0 bg-white dark:bg-near-black border-b border-slate-200 dark:border-white/5">
                                    <tr><Th>Result</Th><Th>Method</Th><Th>User</Th><Th>Error</Th><Th>When</Th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                                    {rpcLogs.length === 0 && <EmptyRow colSpan={5} label="No RPC calls match." />}
                                    {rpcLogs.map((l, i) => (
                                        <tr key={`${l.timestamp}-${i}`} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                            <Td><Badge tone={l.success ? 'green' : 'red'}>{l.success ? 'OK' : 'Failed'}</Badge></Td>
                                            <Td className="font-mono">{l.method}</Td>
                                            <Td>{l.user_email ?? <span className="text-slate-400">—</span>}</Td>
                                            <Td className="max-w-[280px] truncate text-rose-500" title={l.error ?? undefined}>{l.error ?? ''}</Td>
                                            <Td title={l.timestamp}>{formatRelative(l.timestamp)}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </>
                        )}
                    </table>
                )}
            </div>

            {pendingDelete && (
                <DeleteUserDialog
                    user={pendingDelete}
                    onCancel={() => setPendingDelete(null)}
                    onDeleted={() => {
                        setPendingDelete(null);
                        refresh();
                    }}
                />
            )}
        </div>
    );
};
