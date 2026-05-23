import React, {
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  Activity,
  BadgeCheck,
  Check,
  Clock3,
  Layers3,
  LogOut,
  Mail,
  PencilLine,
  ShieldCheck,
  Sparkles,
  UserRound,
  Waypoints,
  Workflow
} from 'lucide-react';

import {
  appStore,
  useAppStore
} from '@/lib/store';
import { CollectionNode } from '@/types';
import { Avatar } from '../../ui/Avatar';
import { TabProps } from './types';

const countRequests = (
  nodes: CollectionNode[]
): number => {
  return nodes.reduce((total, node) => {
    if (node.type === 'request') {
      return total + 1;
    }

    if (node.children) {
      return total + countRequests(node.children);
    }

    return total;
  }, 0);
};

const SnapshotCard: React.FC<{
  label: string;
  value: number | string;
  detail: string;
  icon: React.ElementType;
  toneClassName: string;
}> = ({
  label,
  value,
  detail,
  icon: Icon,
  toneClassName
}) => {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.85)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
            {label}
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-white">
            {value}
          </div>
        </div>

        <div
          className={`rounded-[1rem] border border-white/8 p-2.5 ${toneClassName}`}
        >
          <Icon size={16} />
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        {detail}
      </div>
    </div>
  );
};

const PostureItem: React.FC<{
  title: string;
  description: string;
  icon: React.ElementType;
  accentClassName: string;
}> = ({
  title,
  description,
  icon: Icon,
  accentClassName
}) => {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 rounded-[1rem] border border-white/8 p-2.5 ${accentClassName}`}
        >
          <Icon size={15} />
        </div>

        <div>
          <div className="text-sm font-semibold text-white">
            {title}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export const GeneralTab: React.FC<
  TabProps & { onLogout: () => void }
> = ({ user, onLogout }) => {
  const { history, collections, network } =
    useAppStore();

  const [editName, setEditName] =
    useState(user?.name || '');
  const [saved, setSaved] =
    useState(false);

  useEffect(() => {
    setEditName(user?.name || '');
    setSaved(false);
  }, [user?.name]);

  const savedRequestCount = useMemo(
    () => countRequests(collections),
    [collections]
  );

  if (!user) {
    return null;
  }

  const normalizedName =
    editName.trim();
  const hasNameChanged =
    normalizedName.length > 0 &&
    normalizedName !== user.name;
  const profileHandle = `@${user.email
    .split('@')[0]
    .toLowerCase()}`;
  const shortUserId =
    user.id.length > 16
      ? `${user.id.slice(0, 8)}...${user.id.slice(-4)}`
      : user.id;

  const handleSaveProfile = () => {
    if (!normalizedName) {
      appStore.showToast(
        'Display name cannot be empty',
        'error'
      );
      return;
    }

    appStore.updateUser({
      name: normalizedName
    });

    setEditName(normalizedName);
    setSaved(true);

    appStore.showToast(
      'Profile updated',
      'success'
    );

    window.setTimeout(() => {
      setSaved(false);
    }, 1800);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(16,16,24,0.96)_0%,rgba(8,8,12,0.98)_55%,rgba(5,5,7,1)_100%)] p-6 shadow-[0_35px_90px_-55px_rgba(0,0,0,0.95)] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,63,242,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(167,139,250,0.09),transparent_32%)]" />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_340px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-electric-violet/20 bg-electric-violet/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-electric-violet">
              <Sparkles size={12} />
              Profile Overview
            </div>

            <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white md:text-4xl">
              Account settings built like a control surface.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              Manage your visible identity, verify workspace status, and keep
              profile data aligned across the active txio session.
            </p>

            <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm md:p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                <div className="flex items-center gap-4">
                  <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-1.5">
                    <Avatar
                      size="xl"
                      src={user.avatarUrl}
                      seed={user.email}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                      Primary Account
                    </div>
                    <div className="mt-2 truncate text-xl font-bold text-white">
                      {user.name}
                    </div>
                    <div className="truncate text-sm text-slate-400">
                      {user.email}
                    </div>
                  </div>
                </div>

                <div className="grid flex-1 gap-3 min-[520px]:grid-cols-3">
                  <div className="rounded-[1.25rem] border border-white/8 bg-black/25 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">
                      Handle
                    </div>
                    <div className="mt-2 truncate text-sm font-semibold text-white">
                      {profileHandle}
                    </div>
                  </div>

                  <div className="rounded-[1.25rem] border border-white/8 bg-black/25 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">
                      Network
                    </div>
                    <div className="mt-2 text-sm font-semibold capitalize text-white">
                      {network}
                    </div>
                  </div>

                  <div className="rounded-[1.25rem] border border-white/8 bg-black/25 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">
                      Status
                    </div>
                    <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.55)]" />
                      Synced
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 min-[520px]:grid-cols-3 xl:grid-cols-1">
            <SnapshotCard
              label="Calls"
              value={history.length}
              detail="Tracked executions in the current session."
              icon={Activity}
              toneClassName="bg-electric-violet/10 text-electric-violet"
            />
            <SnapshotCard
              label="Collections"
              value={collections.length}
              detail="Saved request groups available in the workspace."
              icon={Layers3}
              toneClassName="bg-soft-purple/10 text-soft-purple"
            />
            <SnapshotCard
              label="Requests"
              value={savedRequestCount}
              detail="Reusable request definitions stored across collections."
              icon={Workflow}
              toneClassName="bg-white/8 text-slate-300"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_320px]">
        <section className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,13,18,0.96)_0%,rgba(8,8,12,0.98)_100%)] p-6 shadow-[0_30px_70px_-55px_rgba(0,0,0,0.95)]">
          <div className="flex flex-col gap-3 border-b border-white/8 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600">
                Identity
              </div>
              <h3 className="mt-2 text-xl font-bold text-white">
                Profile details
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Keep the identity markers used in the header, drawer, and
                workspace aligned.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-slate-300">
              <BadgeCheck
                size={14}
                className="text-electric-violet"
              />
              Verified operator
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Display Name
              </label>

              <div className="flex items-center gap-3 rounded-[1.3rem] border border-white/10 bg-black/35 px-4 py-3 transition-colors focus-within:border-electric-violet/40">
                <UserRound
                  size={16}
                  className="text-electric-violet"
                />

                <input
                  value={editName}
                  onChange={(e) => {
                    setSaved(false);
                    setEditName(
                      e.target.value
                    );
                  }}
                  placeholder="Display name"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Email Address
              </label>

              <div className="flex items-center gap-3 rounded-[1.3rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-300">
                <Mail
                  size={16}
                  className="text-slate-500"
                />
                <span className="truncate">
                  {user.email}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-[1rem] border border-electric-violet/15 bg-electric-violet/10 p-2.5 text-electric-violet">
                  <Waypoints size={16} />
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">
                    Workspace Handle
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {profileHandle}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-[1rem] border border-white/8 bg-white/[0.04] p-2.5 text-slate-300">
                  <ShieldCheck size={16} />
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">
                    Account ID
                  </div>
                  <div className="mt-1 font-mono text-sm text-white">
                    {shortUserId}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-electric-violet/15 bg-[linear-gradient(145deg,rgba(123,63,242,0.12)_0%,rgba(18,18,28,0.92)_55%,rgba(9,9,13,1)_100%)] p-5 shadow-[0_24px_65px_-50px_rgba(123,63,242,0.65)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-electric-violet/20 bg-electric-violet/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-electric-violet">
                  <Sparkles size={12} />
                  Profile Continuity
                </div>

                <h4 className="mt-3 text-lg font-semibold text-white">
                  Changes stay consistent across the active workspace.
                </h4>

                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Display identity updates are applied immediately in the
                  account drawer and current workspace session while server-side
                  profile storage continues expanding.
                </p>
              </div>

              <div className="rounded-[1.25rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                Ready to sync
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-[1.55rem] border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-white">
                Apply profile updates
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Changes are reflected across active workspace surfaces
                immediately.
              </p>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={!hasNameChanged}
              className={`inline-flex items-center justify-center gap-2 rounded-[1.2rem] px-5 py-3 text-xs font-bold uppercase tracking-[0.22em] transition-all duration-300 disabled:cursor-not-allowed ${
                saved
                  ? 'bg-emerald-500 text-black'
                  : hasNameChanged
                    ? 'bg-electric-violet text-white shadow-[0_22px_45px_-25px_rgba(123,63,242,0.9)] hover:bg-soft-purple'
                    : 'border border-white/10 bg-white/[0.04] text-slate-500'
              }`}
            >
              {saved ? (
                <Check size={14} />
              ) : (
                <PencilLine size={14} />
              )}
              {saved
                ? 'Saved'
                : 'Save Changes'}
            </button>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,13,18,0.96)_0%,rgba(8,8,12,0.98)_100%)] p-5 shadow-[0_24px_55px_-45px_rgba(0,0,0,0.9)]">
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-600">
              Account Posture
            </div>

            <div className="mt-4 space-y-3">
              <PostureItem
                title="Verified session"
                description="Your current operator session is authenticated and available across the workspace."
                icon={ShieldCheck}
                accentClassName="bg-electric-violet/10 text-electric-violet"
              />
              <PostureItem
                title="Fast identity updates"
                description="Display name changes are reflected locally right away to keep the UI consistent."
                icon={Sparkles}
                accentClassName="bg-soft-purple/10 text-soft-purple"
              />
              <PostureItem
                title="Workspace continuity"
                description="Saved collections, requests, and account context stay visible inside the active session."
                icon={Workflow}
                accentClassName="bg-white/8 text-slate-300"
              />
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,13,18,0.96)_0%,rgba(8,8,12,0.98)_100%)] p-5 shadow-[0_24px_55px_-45px_rgba(0,0,0,0.9)]">
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-600">
              Workspace Footprint
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Collection groups
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Active saved request sets
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">
                  {collections.length}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Request library
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Saved reusable request entries
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">
                  {savedRequestCount}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Latest activity
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Recorded request executions
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <Clock3
                    size={14}
                    className="text-electric-violet"
                  />
                  {history.length}
                </div>
              </div>
            </div>
          </section>

          <button
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-3 rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300 md:hidden"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
