import React from 'react';
import {
  Activity,
  BadgeCheck,
  ChevronRight,
  Key,
  LogOut,
  Shield,
  Sparkles,
  User,
  Users
} from 'lucide-react';

import { Avatar } from '../ui/Avatar';
import { UserProfile } from '../../types';
import { ProfileTab } from './types';

interface ProfileSidebarProps {
  user: UserProfile;
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  onLogout: () => void;
}

const TabButton: React.FC<{
  id: ProfileTab;
  label: string;
  caption: string;
  icon: React.ElementType;
  activeTab: ProfileTab;
  onClick: (id: ProfileTab) => void;
}> = ({
  id,
  label,
  caption,
  icon: Icon,
  activeTab,
  onClick
}) => {
  const isActive = activeTab === id;

  return (
    <button
      onClick={() => onClick(id)}
      className={`group flex w-full items-center gap-3 rounded-[1.35rem] border px-4 py-3 text-left transition-all duration-200 ${
        isActive
          ? 'border-electric-violet/25 bg-electric-violet/10 text-white shadow-[0_18px_35px_-22px_rgba(123,63,242,0.55)]'
          : 'border-white/6 bg-white/[0.025] text-slate-400 hover:border-white/12 hover:bg-white/[0.045] hover:text-slate-200'
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border transition-colors ${
          isActive
            ? 'border-electric-violet/25 bg-electric-violet/12 text-electric-violet'
            : 'border-white/6 bg-black/35 text-slate-500 group-hover:text-slate-300'
        }`}
      >
        <Icon size={16} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{label}</div>
        <div className="truncate text-[11px] text-slate-500">
          {caption}
        </div>
      </div>

      <ChevronRight
        size={14}
        className={`transition-all ${
          isActive
            ? 'text-electric-violet'
            : 'text-slate-600 group-hover:translate-x-0.5 group-hover:text-slate-300'
        }`}
      />
    </button>
  );
};

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  user,
  activeTab,
  onTabChange,
  onLogout
}) => {
  const profileHandle = `@${user.email
    .split('@')[0]
    .toLowerCase()}`;

  return (
    <div className="flex w-full shrink-0 flex-col border-b border-white/10 bg-[linear-gradient(180deg,#040406_0%,#07070a_48%,#050507_100%)] p-4 md:w-[320px] md:border-b-0 md:border-r md:border-white/10 md:p-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(15,15,22,0.96)_0%,rgba(8,8,12,0.98)_58%,rgba(5,5,7,1)_100%)] p-5 shadow-[0_35px_80px_-55px_rgba(0,0,0,0.95)]">
        <div className="absolute -right-12 top-0 h-28 w-28 rounded-full bg-electric-violet/12 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-soft-purple/12 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-electric-violet/20 bg-electric-violet/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-electric-violet">
            <Sparkles size={12} />
            Account Center
          </div>

          <div className="mt-5 flex items-center gap-4">
            <div className="rounded-[1.45rem] border border-white/10 bg-black/35 p-1.5 shadow-xl">
              <Avatar
                size="xl"
                src={user.avatarUrl}
                seed={user.email}
              />
            </div>

            <div className="min-w-0">
              <div className="truncate text-lg font-bold text-white">
                {user.name}
              </div>
              <div className="truncate text-xs text-slate-400">
                {user.email}
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                <BadgeCheck size={12} />
                Verified Session
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">
                Handle
              </div>
              <div className="mt-2 truncate text-sm font-semibold text-white">
                {profileHandle}
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">
                Surface
              </div>
              <div className="mt-2 text-sm font-semibold text-white">
                Workspace
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[1.45rem] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-electric-violet/15 bg-electric-violet/10 p-2 text-electric-violet">
                <Shield size={15} />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  Account state is workspace-aware
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Identity changes are reflected across the drawer and active
                  workspace surfaces as soon as you save them.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-600">
          <Activity size={12} />
          Profile Navigation
        </div>

        <div className="space-y-3">
          <TabButton
            id="general"
            label="General"
            caption="Overview, identity, workspace presence"
            icon={User}
            activeTab={activeTab}
            onClick={onTabChange}
          />
          <TabButton
            id="team"
            label="Team"
            caption="Members, roles, and collaborative access"
            icon={Users}
            activeTab={activeTab}
            onClick={onTabChange}
          />
          <TabButton
            id="security"
            label="Security"
            caption="Authentication posture and session controls"
            icon={Shield}
            activeTab={activeTab}
            onClick={onTabChange}
          />
          <TabButton
            id="api-keys"
            label="API Keys"
            caption="Token management for external workflows"
            icon={Key}
            activeTab={activeTab}
            onClick={onTabChange}
          />
        </div>
      </div>

      <div className="mt-auto space-y-4 pt-6">
        <div className="rounded-[1.55rem] border border-white/8 bg-white/[0.03] p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-600">
            Session Note
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            This drawer is designed as an operational account surface: clear
            state, quick access, and minimal friction.
          </p>
        </div>

        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
};
