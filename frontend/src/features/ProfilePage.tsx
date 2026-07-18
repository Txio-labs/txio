
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Shield,
    Key,
    CreditCard,
    Bell,
    Award,
    Zap,
    Activity,
    Camera,
    Image as ImageIcon,
    Check,
    ChevronRight,
    Github,
    Sparkles,
    AlertCircle,
} from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { Avatar } from '../components/ui/Avatar';
import type { UserProfile } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 60;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_BANNER_BYTES = 5 * 1024 * 1024; // 5 MB
const SAVE_LATENCY_MS = 600;
const SAVED_FLASH_MS = 2000;
const ERROR_FLASH_MS = 3000;

const ACCOUNT_LINKS = [
    { id: 'billing', icon: CreditCard, label: 'Billing & invoices', toast: 'Billing page not implemented' },
    { id: 'tokens', icon: Key, label: 'API access tokens', toast: 'Token management not implemented' },
    { id: 'notifications', icon: Bell, label: 'Notifications', toast: 'Notification preferences not implemented' },
] as const;

interface DemoSession {
    id: string;
    device: string;
    location: string;
    last: string;
    current: boolean;
}

const DEMO_SESSIONS: readonly DemoSession[] = [
    { id: 'this', device: 'Chrome on macOS', location: 'San Francisco, US', last: 'Active now', current: true },
    { id: 'other', device: 'Firefox on Windows', location: 'New York, US', last: '2 days ago', current: false },
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getBrowserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
    } catch {
        return 'Unknown';
    }
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readImageAsDataUrl(file: File, maxBytes: number): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('Please choose an image file.'));
            return;
        }
        if (file.size > maxBytes) {
            reject(new Error(`Image must be smaller than ${formatBytes(maxBytes)}.`));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read the image.'));
        reader.readAsDataURL(file);
    });
}

function validateName(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return 'Name is required.';
    if (trimmed.length < NAME_MIN_LENGTH) return `Name must be at least ${NAME_MIN_LENGTH} characters.`;
    if (trimmed.length > NAME_MAX_LENGTH) return `Name must be ${NAME_MAX_LENGTH} characters or fewer.`;
    return null;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function useSaveStatus() {
    const [status, setStatus] = useState<SaveStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const clearFlash = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const scheduleReset = (ms: number) => {
        clearFlash();
        timeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
                setStatus('idle');
                setError(null);
            }
        }, ms);
    };

    return {
        status,
        error,
        isMounted: () => mountedRef.current,
        begin: () => {
            clearFlash();
            setError(null);
            setStatus('saving');
        },
        succeed: () => {
            if (!mountedRef.current) return;
            setStatus('saved');
            scheduleReset(SAVED_FLASH_MS);
        },
        fail: (message: string) => {
            if (!mountedRef.current) return;
            setError(message);
            setStatus('error');
            scheduleReset(ERROR_FLASH_MS);
        },
    };
}

interface ProfileFormValues {
    name: string;
}

function useProfileForm(user: UserProfile) {
    const initial = useMemo<ProfileFormValues>(() => ({ name: user.name }), [user.name]);
    const [values, setValues] = useState<ProfileFormValues>(initial);
    const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormValues, string>>>({});
    const [prevInitial, setPrevInitial] = useState(initial);

    // Resync when the source user changes externally (e.g. via /signin or another tab).
    if (initial !== prevInitial) {
        setPrevInitial(initial);
        setValues(initial);
        setErrors({});
    }

    const setField = useCallback(<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) => {
        setValues((v) => ({ ...v, [key]: value }));
        setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
    }, []);

    const isDirty = useMemo(
        () => values.name.trim() !== initial.name.trim(),
        [values, initial],
    );

    const validate = useCallback((): boolean => {
        const next: Partial<Record<keyof ProfileFormValues, string>> = {};
        const nameError = validateName(values.name);
        if (nameError) next.name = nameError;
        setErrors(next);
        return Object.keys(next).length === 0;
    }, [values]);

    const reset = useCallback(() => {
        setValues(initial);
        setErrors({});
    }, [initial]);

    return { values, errors, isDirty, setField, validate, reset };
}

function useImageUpload(field: 'avatarUrl' | 'bannerUrl', maxBytes: number) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const trigger = useCallback(() => inputRef.current?.click(), []);

    const onChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            // Reset the input so picking the same file twice still fires onChange.
            e.target.value = '';
            if (!file) return;

            setIsUploading(true);
            try {
                const dataUrl = await readImageAsDataUrl(file, maxBytes);
                appStore.updateUser({ [field]: dataUrl });
                appStore.showToast(field === 'avatarUrl' ? 'Avatar updated' : 'Banner updated', 'success');
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Upload failed.';
                appStore.showToast(message, 'error');
            } finally {
                setIsUploading(false);
            }
        },
        [field, maxBytes],
    );

    return { inputRef, trigger, onChange, isUploading };
}

// ─── Presentational ─────────────────────────────────────────────────────────

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
    accent?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, sub, accent = false }) => (
    <div
        className={`relative rounded-xl border p-4 transition-colors ${
            accent
                ? 'bg-electric-violet/[0.06] border-electric-violet/20 hover:border-electric-violet/30'
                : 'bg-dark-indigo-glow border-white/[0.08] hover:border-white/[0.12]'
        }`}
    >
        <div className="flex items-center justify-between mb-3">
            <div className={`p-1.5 rounded-lg ${accent ? 'bg-electric-violet/[0.12] text-electric-violet' : 'bg-white/[0.04] text-slate-400'}`}>
                {icon}
            </div>
            <span className="text-[11px] text-slate-500">{label}</span>
        </div>
        <div className="text-xl font-semibold text-white tracking-tight">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </div>
);

interface SectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, description, children }) => (
    <section>
        <div className="mb-3">
            <h2 className="text-sm font-semibold text-slate-200 tracking-tight">{title}</h2>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        {children}
    </section>
);

interface FieldProps {
    label: string;
    children: React.ReactNode;
    hint?: string;
    error?: string;
    htmlFor?: string;
}

const Field: React.FC<FieldProps> = ({ label, children, hint, error, htmlFor }) => (
    <div className="space-y-1.5">
        <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-400">
            {label}
        </label>
        {children}
        {error ? (
            <p className="flex items-center gap-1.5 text-[11px] text-rose-400">
                <AlertCircle size={11} />
                {error}
            </p>
        ) : (
            hint && <p className="text-[11px] text-slate-500">{hint}</p>
        )}
    </div>
);

const baseInputClass =
    'w-full bg-near-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors';
const editableInputClass = `${baseInputClass} focus:border-electric-violet/60 focus:bg-white/[0.02]`;
const readonlyInputClass = `${baseInputClass} text-slate-500 cursor-not-allowed select-text`;
const errorInputClass = `${baseInputClass} border-rose-500/40 focus:border-rose-500/60`;

// ─── Container ──────────────────────────────────────────────────────────────

export const ProfilePage: React.FC = () => {
    const { user, history } = useAppStore();

    if (!user) {
        return <div className="p-10 text-slate-500">Please log in.</div>;
    }

    return <ProfilePageContent user={user} historyCount={history.length} />;
};

interface ProfilePageContentProps {
    user: UserProfile;
    historyCount: number;
}

const ProfilePageContent: React.FC<ProfilePageContentProps> = ({ user, historyCount }) => {
    const { values, errors, isDirty, setField, validate } = useProfileForm(user);
    const save = useSaveStatus();
    const {
        inputRef: avatarInputRef,
        trigger: avatarTrigger,
        onChange: avatarOnChange,
        isUploading: avatarIsUploading,
    } = useImageUpload('avatarUrl', MAX_AVATAR_BYTES);
    const {
        inputRef: bannerInputRef,
        trigger: bannerTrigger,
        onChange: bannerOnChange,
        isUploading: bannerIsUploading,
    } = useImageUpload('bannerUrl', MAX_BANNER_BYTES);

    const timezone = useMemo(() => getBrowserTimezone(), []);

    const handleSave = useCallback(async () => {
        if (!isDirty || save.status === 'saving') return;
        if (!validate()) return;

        save.begin();
        try {
            await new Promise<void>((resolve) => setTimeout(resolve, SAVE_LATENCY_MS));
            if (!save.isMounted()) return;
            appStore.updateUser({ name: values.name.trim() });
            save.succeed();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Could not save changes.';
            save.fail(message);
        }
    }, [isDirty, save, validate, values.name]);

    const saveLabel = (() => {
        switch (save.status) {
            case 'saving': return 'Saving…';
            case 'saved': return 'Saved';
            case 'error': return 'Retry';
            default: return 'Save changes';
        }
    })();

    const saveButtonClass = (() => {
        if (save.status === 'saved') return 'bg-emerald-500/[0.15] text-emerald-300 border border-emerald-500/30';
        if (save.status === 'error') return 'bg-rose-500/[0.15] text-rose-300 border border-rose-500/30 hover:bg-rose-500/20';
        return 'bg-electric-violet hover:bg-electric-violet/90 text-white shadow-[0_0_20px_-8px_rgba(173,223,241,0.6)]';
    })();

    const isSaveDisabled = !isDirty || save.status === 'saving' || save.status === 'saved';

    return (
        <div className="h-full bg-near-black overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">

                {/* Top row: identity + stats */}
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
                    {/* Identity card */}
                    <div className="lg:col-span-2 relative overflow-hidden rounded-xl border border-white/[0.08] bg-dark-indigo-glow">
                        {user.bannerUrl ? (
                            <>
                                <div
                                    className="absolute inset-0 opacity-20"
                                    style={{ backgroundImage: `url(${user.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-near-black/40 via-near-black/60 to-near-black/85" />
                            </>
                        ) : (
                            <>
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(173,223,241,0.18),_transparent_60%)]" />
                                <div className="absolute inset-0 dot-grid opacity-20" style={{ backgroundSize: '18px 18px' }} />
                            </>
                        )}

                        <div className="relative p-5 flex items-center gap-4">
                            <div className="relative group/avatar shrink-0">
                                <div className="p-0.5 bg-near-black rounded-2xl ring-1 ring-white/[0.08]">
                                    <Avatar size="xl" type="user" className="rounded-xl" src={user.avatarUrl} seed={user.email} />
                                </div>
                                <input
                                    type="file"
                                    ref={avatarInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={avatarOnChange}
                                />
                                <button
                                    onClick={avatarTrigger}
                                    disabled={avatarIsUploading}
                                    className="absolute inset-0.5 flex items-center justify-center bg-near-black/70 backdrop-blur-sm text-white opacity-0 group-hover/avatar:opacity-100 focus-visible:opacity-100 disabled:opacity-60 rounded-xl transition-opacity"
                                    aria-label={avatarIsUploading ? 'Uploading avatar' : 'Change avatar'}
                                >
                                    <Camera size={18} />
                                </button>
                            </div>

                            <div className="min-w-0 flex-1">
                                <h1 className="text-base md:text-lg font-semibold text-white tracking-tight truncate">{user.name}</h1>
                                <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                                <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">ID {user.id}</p>
                            </div>
                        </div>

                        {/* Banner upload trigger — discreet corner action */}
                        <input
                            type="file"
                            ref={bannerInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={bannerOnChange}
                        />
                        <button
                            onClick={bannerTrigger}
                            disabled={bannerIsUploading}
                            className="absolute top-2 right-2 p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] disabled:opacity-40 transition-colors"
                            title={bannerIsUploading ? 'Uploading…' : 'Customize background'}
                            aria-label="Customize background"
                        >
                            <ImageIcon size={13} />
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard icon={<Zap className="w-4 h-4" />} label="Plan" value="Pro" sub="Unlimited" accent />
                        <StatCard icon={<Activity className="w-4 h-4" />} label="Activity" value={String(historyCount)} sub="Calls this session" />
                        <StatCard icon={<Award className="w-4 h-4" />} label="Reputation" value="Lvl 42" sub="Sui builder" />
                        <StatCard icon={<Shield className="w-4 h-4" />} label="Security" value="Strong" sub="2FA enabled" />
                    </div>
                </div>

                {/* Section grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main column */}
                    <div className="lg:col-span-2 space-y-6">
                        <Section title="Profile information" description="Update how you appear across txio.">
                            <form
                                className="bg-dark-indigo-glow border border-white/[0.08] rounded-xl overflow-hidden"
                                onSubmit={(e) => { e.preventDefault(); void handleSave(); }}
                            >
                                <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Field label="Display name" htmlFor="profile-name" error={errors.name}>
                                        <input
                                            id="profile-name"
                                            className={errors.name ? errorInputClass : editableInputClass}
                                            value={values.name}
                                            onChange={(e) => setField('name', e.target.value)}
                                            placeholder="Your name"
                                            maxLength={NAME_MAX_LENGTH + 10}
                                            autoComplete="name"
                                        />
                                    </Field>
                                    <Field label="Email" hint="Used for sign-in. Contact support to change." htmlFor="profile-email">
                                        <input
                                            id="profile-email"
                                            className={readonlyInputClass}
                                            value={user.email}
                                            readOnly
                                            aria-readonly
                                        />
                                    </Field>
                                    <Field label="GitHub" hint="Link your GitHub to publish recipes and sync gists.">
                                        <div className={`${readonlyInputClass} flex items-center gap-2`}>
                                            <Github size={14} className="text-slate-400 shrink-0" />
                                            <span className="truncate text-slate-500">Not connected</span>
                                            <button
                                                type="button"
                                                onClick={() => appStore.showToast('GitHub OAuth not implemented', 'info')}
                                                className="ml-auto text-[11px] text-electric-violet hover:text-soft-purple font-medium transition-colors"
                                            >
                                                Connect →
                                            </button>
                                        </div>
                                    </Field>
                                    <Field label="Timezone" hint="Detected from your browser." htmlFor="profile-tz">
                                        <input
                                            id="profile-tz"
                                            className={readonlyInputClass}
                                            value={timezone}
                                            readOnly
                                            aria-readonly
                                        />
                                    </Field>
                                </div>

                                {/* Form footer */}
                                <div className="flex items-center justify-between gap-4 px-5 md:px-6 py-3 border-t border-white/[0.06] bg-white/[0.015]">
                                    <p className="text-[11px] text-slate-500">
                                        {save.error
                                            ? <span className="text-rose-400 inline-flex items-center gap-1.5"><AlertCircle size={11} /> {save.error}</span>
                                            : isDirty
                                                ? 'You have unsaved changes.'
                                                : 'All changes saved.'}
                                    </p>
                                    <button
                                        type="submit"
                                        disabled={isSaveDisabled}
                                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${saveButtonClass}`}
                                    >
                                        {save.status === 'saved' && <Check size={13} />}
                                        {save.status === 'error' && <AlertCircle size={13} />}
                                        {saveLabel}
                                    </button>
                                </div>
                            </form>
                        </Section>

                        <Section title="Active sessions" description="Devices currently signed in to your account.">
                            <div className="bg-dark-indigo-glow border border-white/[0.08] rounded-xl overflow-hidden">
                                <div className="divide-y divide-white/[0.06]">
                                    {DEMO_SESSIONS.map((s) => (
                                        <div key={s.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                                            <span className={`h-2 w-2 rounded-full shrink-0 ${s.current ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-slate-600'}`} />
                                            <div className="min-w-0 flex-1">
                                                <div className="text-slate-200 truncate">
                                                    {s.device}
                                                    {s.current && (
                                                        <span className="ml-2 text-[10px] font-medium text-emerald-400 uppercase tracking-wide">
                                                            Current
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">{s.location}</div>
                                            </div>
                                            <div className="text-xs text-slate-500 shrink-0">{s.last}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="px-5 py-2 border-t border-white/[0.06] text-[11px] text-slate-600">
                                    Demo data — session tracking isn&apos;t wired up yet.
                                </div>
                            </div>
                        </Section>
                    </div>

                    {/* Side column */}
                    <div className="space-y-6">
                        <Section title="Account">
                            <div className="bg-dark-indigo-glow border border-white/[0.08] rounded-xl p-1.5 space-y-0.5">
                                {ACCOUNT_LINKS.map(({ id, icon: Icon, label, toast }) => (
                                    <button
                                        key={id}
                                        onClick={() => appStore.showToast(toast, 'info')}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/[0.04] hover:text-white group transition-colors"
                                    >
                                        <Icon size={15} className="text-slate-500 group-hover:text-electric-violet transition-colors" />
                                        <span className="flex-1 text-left">{label}</span>
                                        <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </Section>

                        <div className="relative rounded-xl border border-electric-violet/20 bg-gradient-to-br from-electric-violet/[0.08] via-near-black to-near-black p-5 overflow-hidden">
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-electric-violet/20 blur-3xl rounded-full pointer-events-none" />
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1 rounded-md bg-electric-violet/[0.15] text-electric-violet">
                                        <Sparkles size={13} />
                                    </div>
                                    <span className="text-[11px] font-semibold text-electric-violet uppercase tracking-wider">Team</span>
                                </div>
                                <h3 className="text-white font-semibold tracking-tight mb-1.5">Upgrade to Team</h3>
                                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                    Share collections, sync environments, and collaborate with your team in real time.
                                </p>
                                <button
                                    onClick={() => appStore.showToast('Upgrade txio not implemented', 'info')}
                                    className="w-full py-2 bg-white hover:bg-slate-100 text-near-black font-semibold text-xs rounded-lg transition-colors"
                                >
                                    View plans
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
