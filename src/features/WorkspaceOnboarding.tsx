import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowRight,
    Building2,
    CheckCircle2,
    Layers3,
    ShieldCheck,
    Sparkles,
    Users,
    Workflow
} from 'lucide-react';

import { appStore, useAppStore } from '@/lib/store';
import { UserProfile, Workspace } from '@/types';

interface WorkspaceOnboardingProps {
    user: UserProfile;
    onCreateWorkspace: (
        name: string,
        type: Workspace['type']
    ) => Promise<unknown> | unknown;
}

export const WorkspaceOnboarding: React.FC<
    WorkspaceOnboardingProps
> = ({ user, onCreateWorkspace }) => {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const [workspaceName, setWorkspaceName] =
        useState(
            `${user.name}'s workspace`
        );
    const [workspaceType, setWorkspaceType] =
        useState<Workspace['type']>(
            'Personal'
        );
    const [isSubmitting, setIsSubmitting] =
        useState(false);
    const [formError, setFormError] =
        useState('');

    const workspaceSlug = useMemo(() => {
        const source =
            workspaceName.trim() ||
            `${user.name}'s workspace`;

        return source
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 42);
    }, [user.name, workspaceName]);

    const handleSubmit = async (
        event: React.FormEvent
    ) => {
        event.preventDefault();

        const normalizedName =
            workspaceName.trim();

        if (normalizedName.length < 2) {
            setFormError(
                'Workspace name must be at least 2 characters.'
            );
            return;
        }

        setIsSubmitting(true);
        setFormError('');

        try {
            await onCreateWorkspace(
                normalizedName,
                workspaceType
            );
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Couldn't create the workspace";

            setFormError(
                message ||
                    "Couldn't create the workspace. Try again?"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`min-h-screen selection:bg-electric-violet/30 ${
            isDark ? 'bg-near-black text-white' : 'bg-slate-50 text-slate-900'
        }`}>
            <div className="relative min-h-screen overflow-hidden">
                <div className={`absolute inset-0 bg-[size:34px_34px] ${
                    isDark
                        ? 'bg-[linear-gradient(rgba(163,163,163,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(163,163,163,0.06)_1px,transparent_1px)] opacity-20'
                        : 'bg-[linear-gradient(rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px)] opacity-40'
                }`} />
                <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-electric-violet/18 blur-[120px]" />
                <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-electric-violet/14 blur-[140px]" />

                <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-6 py-10 lg:flex-row lg:items-center lg:px-10">
                    <motion.div
                        initial={{
                            opacity: 0,
                            y: 18
                        }}
                        animate={{
                            opacity: 1,
                            y: 0
                        }}
                        transition={{
                            duration: 0.45
                        }}
                        className="flex-1"
                    >
                        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] ${
                            isDark
                                ? 'border-violet-400/20 bg-violet-400/10 text-violet-300'
                                : 'border-violet-200 bg-violet-100 text-violet-700'
                        }`}>
                            <Sparkles size={13} />
                            Workspace Setup
                        </div>

                        <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">
                            One last thing — name your workspace.
                        </h1>

                        <p className={`mt-5 max-w-2xl text-base leading-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Your account&apos;s good to go. Workspaces are where your collections, requests, and history live. You can have more than one later.
                        </p>

                        <div className="mt-8 grid gap-4 md:grid-cols-3">
                            {[
                                {
                                    title: 'Scoped collections',
                                    description:
                                        'Your requests and saved flows live inside the workspace — not floating around in one big pile.',
                                    icon: Layers3,
                                    tone: isDark ? 'text-electric-violet bg-electric-violet/10' : 'text-violet-600 bg-violet-100'
                                },
                                {
                                    title: 'Team-ready',
                                    description:
                                        'Solo today, team later. Same workspace, just more people.',
                                    icon: Users,
                                    tone: isDark ? 'text-electric-violet bg-electric-violet/10' : 'text-violet-600 bg-violet-100'
                                },
                                {
                                    title: 'Isolated state',
                                    description:
                                        'Workspaces are isolated. Different projects, different auth, no crosstalk.',
                                    icon: ShieldCheck,
                                    tone: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-600 bg-emerald-100'
                                }
                            ].map((item) => (
                                <div
                                    key={item.title}
                                    className={`rounded-[1.75rem] border p-5 backdrop-blur-sm ${
                                        isDark
                                            ? 'border-white/10 bg-white/[0.035] shadow-[0_24px_55px_-45px_rgba(0,0,0,0.85)]'
                                            : 'border-slate-200 bg-white shadow-sm'
                                    }`}
                                >
                                    <div
                                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.tone}`}
                                    >
                                        <item.icon size={18} />
                                    </div>
                                    <div className="mt-4 text-lg font-bold">
                                        {item.title}
                                    </div>
                                    <p className={`mt-2 text-sm leading-7 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className={`mt-8 rounded-[2rem] border p-5 ${
                            isDark
                                ? 'border-white/10 bg-white/[0.03] shadow-[0_28px_70px_-55px_rgba(0,0,0,0.95)]'
                                : 'border-slate-200 bg-white shadow-sm'
                        }`}>
                            <div className="flex items-start gap-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                                    isDark ? 'bg-electric-violet/10 text-electric-violet' : 'bg-violet-100 text-violet-600'
                                }`}>
                                    <Workflow size={20} />
                                </div>
                                <div>
                                    <div className={`text-sm font-bold uppercase tracking-[0.22em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Signed in as
                                    </div>
                                    <div className="mt-2 text-xl font-bold">
                                        {user.name}
                                    </div>
                                    <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {user.email}
                                    </p>
                                    <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] ${
                                        isDark
                                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                            : 'border-emerald-200 bg-emerald-50 text-emerald-600'
                                    }`}>
                                        <CheckCircle2 size={14} />
                                        Account verified
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{
                            opacity: 0,
                            x: 20
                        }}
                        animate={{
                            opacity: 1,
                            x: 0
                        }}
                        transition={{
                            duration: 0.45,
                            delay: 0.08
                        }}
                        className="w-full max-w-xl lg:max-w-lg"
                    >
                        <div className={`rounded-[2.2rem] border p-6 md:p-7 ${
                            isDark
                                ? 'border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96)_0%,rgba(10,10,10,0.98)_100%)] shadow-[0_45px_100px_-65px_rgba(163,163,163,0.75)]'
                                : 'border-slate-200 bg-white shadow-xl'
                        }`}>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className={`text-[10px] font-black uppercase tracking-[0.32em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Create Workspace
                                    </div>
                                    <h2 className="mt-3 text-2xl font-black">
                                        Name it and you&apos;re in.
                                    </h2>
                                    <p className={`mt-2 text-sm leading-7 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Once you create it, the IDE opens with your workspace already wired up.
                                    </p>
                                </div>

                                <div className={`rounded-2xl border p-3 ${
                                    isDark
                                        ? 'border-violet-400/15 bg-violet-400/10 text-violet-300'
                                        : 'border-violet-200 bg-violet-100 text-violet-600'
                                }`}>
                                    <Building2 size={20} />
                                </div>
                            </div>

                            <form
                                onSubmit={handleSubmit}
                                className="mt-8 space-y-6"
                            >
                                <div className="space-y-2">
                                    <label className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Workspace Name
                                    </label>
                                    <input
                                        value={workspaceName}
                                        onChange={(event) => {
                                            setFormError(
                                                ''
                                            );
                                            setWorkspaceName(
                                                event.target.value
                                            )
                                        }}
                                        placeholder={`${user.name}'s workspace`}
                                        className={`w-full rounded-[1.35rem] border px-4 py-4 text-sm outline-none transition-colors focus:border-violet-400/40 ${
                                            isDark
                                                ? 'border-white/10 bg-black/35 text-white placeholder:text-slate-600'
                                                : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                                        }`}
                                    />
                                </div>

                                {formError ? (
                                    <div className={`rounded-[1.25rem] border px-4 py-3 text-sm ${
                                        isDark
                                            ? 'border-red-500/20 bg-red-500/10 text-red-300'
                                            : 'border-red-200 bg-red-50 text-red-600'
                                    }`}>
                                        <div className="flex items-start gap-3">
                                            <AlertCircle
                                                size={
                                                    16
                                                }
                                                className="mt-0.5 shrink-0"
                                            />
                                            <span>
                                                {
                                                    formError
                                                }
                                            </span>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="space-y-3">
                                    <div className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Workspace Type
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        {[
                                            {
                                                id: 'Personal' as const,
                                                title: 'Personal',
                                                description:
                                                    'For solo work — prototypes, private collections, anything you don\'t need to share.',
                                                icon: Sparkles
                                            },
                                            {
                                                id: 'Team' as const,
                                                title: 'Team',
                                                description:
                                                    'Shared workspace. Invite teammates, collaborate on the same collections.',
                                                icon: Users
                                            }
                                        ].map((option) => {
                                            const isActive =
                                                workspaceType ===
                                                option.id;

                                            return (
                                                <button
                                                    key={
                                                        option.id
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        setWorkspaceType(
                                                            option.id
                                                        )
                                                    }
                                                    className={`rounded-[1.45rem] border p-4 text-left transition-all ${
                                                        isActive
                                                            ? isDark
                                                                ? 'border-violet-400/30 bg-violet-400/10 shadow-[0_20px_45px_-28px_rgba(163,163,163,0.6)]'
                                                                : 'border-violet-300 bg-violet-50 shadow-sm'
                                                            : isDark
                                                                ? 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                                                                isActive
                                                                    ? isDark
                                                                        ? 'bg-violet-400/15 text-violet-300'
                                                                        : 'bg-violet-100 text-violet-600'
                                                                    : isDark
                                                                        ? 'bg-white/[0.05] text-slate-400'
                                                                        : 'bg-slate-100 text-slate-500'
                                                            }`}
                                                        >
                                                            <option.icon
                                                                size={
                                                                    16
                                                                }
                                                            />
                                                        </div>
                                                        <div className="text-sm font-bold">
                                                            {
                                                                option.title
                                                            }
                                                        </div>
                                                    </div>
                                                    <p className={`mt-3 text-xs leading-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {
                                                            option.description
                                                        }
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className={`rounded-[1.6rem] border p-4 ${isDark ? 'border-white/10 bg-white/[0.035]' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className={`text-[10px] font-black uppercase tracking-[0.24em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Preview
                                    </div>
                                    <div className={`mt-3 flex items-center justify-between gap-4 rounded-[1.2rem] border px-4 py-3 ${
                                        isDark ? 'border-white/8 bg-black/25' : 'border-slate-200 bg-white'
                                    }`}>
                                        <div>
                                            <div className="text-sm font-bold">
                                                {workspaceName.trim() ||
                                                    `${user.name}'s workspace`}
                                            </div>
                                            <div className={`mt-1 font-mono text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                txio/{workspaceSlug || 'workspace'}
                                            </div>
                                        </div>
                                        <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                                            isDark
                                                ? 'border-white/10 bg-white/[0.04] text-slate-300'
                                                : 'border-slate-200 bg-slate-100 text-slate-600'
                                        }`}>
                                            {workspaceType}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`flex w-full items-center justify-center gap-2 rounded-[1.35rem] px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${
                                        isDark
                                            ? 'bg-slate-900 dark:bg-white shadow-[0_25px_55px_-28px_rgba(163,163,163,0.85)]'
                                            : 'bg-slate-900 shadow-[0_20px_45px_-25px_rgba(15,23,42,0.5)]'
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    ) : (
                                        <>
                                            Create Workspace
                                            <ArrowRight
                                                size={17}
                                            />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
