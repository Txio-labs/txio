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
      <section className="rounded-panel border border-line bg-sunken p-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1 text-[12px] font-semibold text-fg-subtle">
            <Users size={12} />
            Workspace members
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-fg">
            {workspace ? workspace.name : 'No workspace'}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Invite people by email. Editors can create and change collections and requests, viewers can read, simulate
            and comment. Wallets, session keys, API keys and history are never shared.
          </p>

          <button
            type="button"
            disabled={!workspace}
            onClick={() => setOpen(true)}
            className="mt-5 px-4 py-2 text-xs font-semibold rounded-lg bg-inverse text-on-inverse hover:opacity-90 disabled:opacity-50"
          >
            Manage members
          </button>
        </div>
      </section>

      {open && workspace && <MembersPanel workspace={workspace} onClose={() => setOpen(false)} />}
    </div>
  );
};
