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

import { appStore } from '@/lib/store';
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
        <div className="min-h-screen bg-near-black text-white selection:bg-electric-violet/30">
            <div className="relative min-h-screen overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(173,223,241,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(173,223,241,0.06)_1px,transparent_1px)] bg-[size:34px_34px] opacity-20" />
                <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-electric-violet/18 blur-[120px]" />
                <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-soft-purple/14 blur-[140px]" />

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
                        <div className="inline-flex items-center gap-2 rounded-full border border-electric-violet/20 bg-electric-violet/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-electric-violet">
                            <Sparkles size={13} />
                            Workspace Setup
                        </div>

                        <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl">
                            One last thing — name your workspace.
                        </h1>

                        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-400">
                            Your account&apos;s good to go. Workspaces are where your collections, requests, and history live. You can have more than one later.
                        </p>

                        <div className="mt-8 grid gap-4 md:grid-cols-3">
                            {[
                                {
                                    title: 'Scoped collections',
                                    description:
                                        'Your requests and saved flows live inside the workspace — not floating around in one big pile.',
                                    icon: Layers3,
                                    tone: 'text-electric-violet bg-electric-violet/10'
                                },
                                {
                                    title: 'Team-ready',
                                    description:
                                        'Solo today, team later. Same workspace, just more people.',
                                    icon: Users,
                                    tone: 'text-soft-purple bg-soft-purple/10'
                                },
                                {
                                    title: 'Isolated state',
                                    description:
                                        'Workspaces are isolated. Different projects, different auth, no crosstalk.',
                                    icon: ShieldCheck,
                                    tone: 'text-emerald-400 bg-emerald-500/10'
                                }
                            ].map((item) => (
                                <div
                                    key={item.title}
                                    className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-5 shadow-[0_24px_55px_-45px_rgba(0,0,0,0.85)] backdrop-blur-sm"
                                >
                                    <div
                                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.tone}`}
                                    >
                                        <item.icon size={18} />
                                    </div>
                                    <div className="mt-4 text-lg font-bold text-white">
                                        {item.title}
                                    </div>
                                    <p className="mt-2 text-sm leading-7 text-slate-400">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_28px_70px_-55px_rgba(0,0,0,0.95)]">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-electric-violet/10 text-electric-violet">
                                    <Workflow size={20} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">
                                        Signed in as
                                    </div>
                                    <div className="mt-2 text-xl font-bold text-white">
                                        {user.name}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-400">
                                        {user.email}
                                    </p>
                                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400">
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
                        <div className="rounded-[2.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(0,49,82,0.96)_0%,rgba(0,27,46,0.98)_100%)] p-6 shadow-[0_45px_100px_-65px_rgba(173,223,241,0.75)] md:p-7">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-500">
                                        Create Workspace
                                    </div>
                                    <h2 className="mt-3 text-2xl font-black text-white">
                                        Name it and you&apos;re in.
                                    </h2>
                                    <p className="mt-2 text-sm leading-7 text-slate-400">
                                        Once you create it, the IDE opens with your workspace already wired up.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-electric-violet/15 bg-electric-violet/10 p-3 text-electric-violet">
                                    <Building2 size={20} />
                                </div>
                            </div>

                            <form
                                onSubmit={handleSubmit}
                                className="mt-8 space-y-6"
                            >
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
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
                                        className="w-full rounded-[1.35rem] border border-white/10 bg-black/35 px-4 py-4 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-electric-violet/40"
                                    />
                                </div>

                                {formError ? (
                                    <div className="rounded-[1.25rem] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
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
                                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
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
                                                            ? 'border-electric-violet/30 bg-electric-violet/10 shadow-[0_20px_45px_-28px_rgba(173,223,241,0.6)]'
                                                            : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                                                                isActive
                                                                    ? 'bg-electric-violet/15 text-electric-violet'
                                                                    : 'bg-white/[0.05] text-slate-400'
                                                            }`}
                                                        >
                                                            <option.icon
                                                                size={
                                                                    16
                                                                }
                                                            />
                                                        </div>
                                                        <div className="text-sm font-bold text-white">
                                                            {
                                                                option.title
                                                            }
                                                        </div>
                                                    </div>
                                                    <p className="mt-3 text-xs leading-6 text-slate-400">
                                                        {
                                                            option.description
                                                        }
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.035] p-4">
                                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                                        Preview
                                    </div>
                                    <div className="mt-3 flex items-center justify-between gap-4 rounded-[1.2rem] border border-white/8 bg-black/25 px-4 py-3">
                                        <div>
                                            <div className="text-sm font-bold text-white">
                                                {workspaceName.trim() ||
                                                    `${user.name}'s workspace`}
                                            </div>
                                            <div className="mt-1 font-mono text-xs text-slate-500">
                                                txio/{workspaceSlug || 'workspace'}
                                            </div>
                                        </div>
                                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                                            {workspaceType}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex w-full items-center justify-center gap-2 rounded-[1.35rem] bg-electric-violet px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_25px_55px_-28px_rgba(173,223,241,0.85)] transition-all hover:bg-soft-purple disabled:cursor-not-allowed disabled:opacity-60"
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
