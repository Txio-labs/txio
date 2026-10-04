import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { MembersPanel } from '../../MembersPanel';
import { TeamMember } from '../../../types';

interface TeamTabProps {
  /** Unused. Members come from the current workspace on the server. */
  teamMembers?: TeamMember[];
}

// Membership is per workspace and lives on the server. This tab opens the
// same members panel the workspace menu does, for the workspace in use.
export const TeamTab: React.FC<TeamTabProps> = () => {
  const { workspaces, currentWorkspaceId } = useAppStore();
  const [open, setOpen] = useState(false);
  const workspace = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <section className="rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">
            <Users size={12} />
            Workspace members
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {workspace ? workspace.name : 'No workspace'}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Invite people by email. Editors can create and change collections and requests, viewers can read, simulate
            and comment. Wallets, session keys, API keys and history are never shared.
          </p>

          <button
            type="button"
            disabled={!workspace}
            onClick={() => setOpen(true)}
            className="mt-5 px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black hover:opacity-90 disabled:opacity-50"
          >
            Manage members
          </button>
        </div>
      </section>

      {open && workspace && <MembersPanel workspace={workspace} onClose={() => setOpen(false)} />}
    </div>
  );
};
