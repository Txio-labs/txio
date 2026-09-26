import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Loader2, Pause, Play, Plus, X } from 'lucide-react';
import { apiService, ApiError, BackendScheduledTask, BackendSessionKey } from '@/services/api';
import { appStore } from '@/lib/store';

export const ScheduledTasksTab: React.FC = () => {
    const [tasks, setTasks] = useState<BackendScheduledTask[]>([]);
    const [keys, setKeys] = useState<BackendSessionKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const [name, setName] = useState('');
    const [sessionKeyId, setSessionKeyId] = useState('');
    const [intervalMinutes, setIntervalMinutes] = useState('60');
    const [to, setTo] = useState('');
    const [value, setValue] = useState('0');
    const [data, setData] = useState('0x');
    const [chainId, setChainId] = useState('1');
    const [creating, setCreating] = useState(false);

    const load = () => {
        queueMicrotask(() => {
            setLoading(true);
            setError(null);
        });
        Promise.all([apiService.listScheduledTasks(), apiService.listSessionKeys()])
            .then(([taskList, keyList]) => {
                setTasks(taskList);
                setKeys(keyList.filter((k) => !k.revoked_at && new Date(k.expires_at) > new Date()));
            })
            .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load scheduled tasks.'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const handleCreate = async () => {
        if (!sessionKeyId || !to.trim()) return;
        setCreating(true);
        setError(null);
        try {
            await apiService.createScheduledTask({
                name: name.trim() || 'Untitled task',
                sessionKeyId,
                trigger: { kind: 'recurring', interval_minutes: Number(intervalMinutes) || 60 },
                requestTemplate: { chain_id: Number(chainId) || 1, to: to.trim(), value: value.trim() || '0', data: data.trim() || '0x' }
            });
            appStore.showToast('Scheduled task created', 'success');
            setShowCreate(false);
            setName('');
            setTo('');
            setValue('0');
            setData('0x');
            load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to create task.');
        } finally {
            setCreating(false);
        }
    };

    const handlePauseResume = async (task: BackendScheduledTask) => {
        const id = task.id?.toString();
        if (!id) return;
        try {
            if (task.status === 'active') {
                await apiService.pauseScheduledTask(id);
            } else {
                await apiService.resumeScheduledTask(id);
            }
            load();
        } catch (err) {
            appStore.showToast(err instanceof ApiError ? err.message : 'Failed to update task.', 'error');
        }
    };

    const handleCancel = async (task: BackendScheduledTask) => {
        const id = task.id?.toString();
        if (!id) return;
        try {
            await apiService.cancelScheduledTask(id);
            load();
        } catch (err) {
            appStore.showToast(err instanceof ApiError ? err.message : 'Failed to cancel task.', 'error');
        }
    };

    return (
        <div className="p-6 w-full space-y-5">
            <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 max-w-md">
                    Recurring transactions, executed unattended via a session key. Every run goes through that key&apos;s
                    scope and the wallet&apos;s spend limits, same as an interactive transaction. EVM only today.
                </p>
                <button
                    onClick={() => setShowCreate((s) => !s)}
                    disabled={keys.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black hover:opacity-90 disabled:opacity-40 shrink-0"
                >
                    <Plus size={13} /> New task
                </button>
            </div>

            {keys.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 p-3 text-[11px] text-amber-700 dark:text-amber-400">
                    <AlertTriangle size={13} /> Create an active session key first — scheduled tasks always run through one.
                </div>
            )}

            {showCreate && keys.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow p-4 space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Name</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly transfer" className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-electric-violet" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Session key</label>
                        <select value={sessionKeyId} onChange={(e) => setSessionKeyId(e.target.value)} className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-electric-violet">
                            <option value="">Select a session key…</option>
                            {keys.map((k) => (
                                <option key={k.id?.toString()} value={k.id?.toString()}>{k.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Run every (minutes)</label>
                            <input value={intervalMinutes} onChange={(e) => setIntervalMinutes(e.target.value)} inputMode="numeric" className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Chain ID</label>
                            <input value={chainId} onChange={(e) => setChainId(e.target.value)} inputMode="numeric" className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">To</label>
                        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x…" className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Value (wei)</label>
                            <input value={value} onChange={(e) => setValue(e.target.value)} className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Calldata</label>
                            <input value={data} onChange={(e) => setData(e.target.value)} className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-electric-violet" />
                        </div>
                    </div>
                    <button onClick={handleCreate} disabled={creating || !sessionKeyId || !to.trim()} className="w-full h-10 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black text-xs font-bold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
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
                    <Loader2 size={16} className="animate-spin" /> Loading tasks…
                </div>
            ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Clock size={28} className="text-slate-400 mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No scheduled tasks yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {tasks.map((task) => (
                        <div key={task.id?.toString()} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-indigo-glow p-3">
                            <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{task.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                    {task.status} {task.next_run_at ? `· next ${new Date(task.next_run_at).toLocaleString()}` : ''}
                                    {task.last_error ? ` · last error: ${task.last_error}` : ''}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {task.status !== 'cancelled' && (
                                    <button onClick={() => handlePauseResume(task)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg" title={task.status === 'active' ? 'Pause' : 'Resume'}>
                                        {task.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                                    </button>
                                )}
                                {task.status !== 'cancelled' && (
                                    <button onClick={() => handleCancel(task)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg" title="Cancel">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
