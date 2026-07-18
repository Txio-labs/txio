import React from 'react';
import {
  Plus,
  MoreVertical,
  Shield,
  Users,
  Sparkles
} from 'lucide-react';
import { Avatar } from '../../ui/Avatar';
import { TeamMember } from '../../../types';
import { appStore } from '@/lib/store';

interface TeamTabProps {
  teamMembers?: TeamMember[];
}

export const TeamTab: React.FC<TeamTabProps> = ({
  teamMembers = []
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(173,223,241,0.14)_0%,rgba(0,49,82,0.96)_42%,rgba(0,27,46,1)_100%)] p-6">
        <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-soft-purple/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-electric-violet/20 bg-electric-violet/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-electric-violet">
              <Users size={12} />
              Team Surface
            </div>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
              Manage who gets inside the workspace.
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Invite operators, assign roles, and keep shared access aligned
              with the same precision as the rest of the toolchain.
            </p>
          </div>

          <button
            onClick={() =>
              appStore.showToast('Invite flow not implemented yet', 'info')
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-electric-violet px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white shadow-[0_18px_35px_-20px_rgba(173,223,241,0.8)] transition-colors hover:bg-soft-purple"
          >
            <Plus size={14} />
            Invite Member
          </button>
        </div>
      </section>

      {teamMembers.length === 0 ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="rounded-[1.75rem] border border-white/10 bg-[#003152]/85 p-6">
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-electric-violet/10 text-electric-violet">
                <Users size={28} />
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">
                No team members yet
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                Start with a focused operator crew. Invite collaborators when
                you are ready to share collections, requests, and execution
                visibility.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-[#003152]/85 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-electric-violet/10 p-3 text-electric-violet">
                  <Shield size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    Tight permission model
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Add editors only when they need access to shared requests or
                    execution flows.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-[#003152]/85 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-soft-purple/10 p-3 text-soft-purple">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    Shared collection strategy
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Keep a clean split between personal experiments and team
                    operational requests.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="rounded-[1.75rem] border border-white/10 bg-[#003152]/85 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    size="md"
                    type={member.name.includes('AI') ? 'bot' : 'user'}
                    seed={member.email}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {member.name}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {member.email}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    appStore.showToast('Member actions not implemented', 'info')
                  }
                  className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-white"
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                    member.role === 'Admin'
                      ? 'border-electric-violet/20 bg-electric-violet/10 text-electric-violet'
                      : member.role === 'Editor'
                        ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                        : 'border-white/10 bg-white/[0.04] text-slate-300'
                  }`}
                >
                  {member.role}
                </span>

                <span
                  className={`inline-flex items-center gap-2 text-xs font-medium ${
                    member.status === 'Active'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      member.status === 'Active'
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  {member.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
