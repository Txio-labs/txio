import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Loader2, Trash2, UserPlus, X } from 'lucide-react';
import { apiService, ApiError } from '@/services/api';
import { appStore } from '@/lib/store';
import type { Workspace, WorkspaceMember } from '@/types';

interface MembersPanelProps {
  workspace: Workspace;
  onClose: () => void;
}

const roleLabel: Record<string, string> = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' };

const errorText = (err: unknown, fallback: string) => (err instanceof ApiError && err.message ? err.message : fallback);

/**
 * People in a workspace. Owners invite, change roles and remove people;
 * everyone else can see who is here, and leave.
 */
export const MembersPanel: React.FC<MembersPanelProps> = ({ workspace, onClose }) => {
  const isOwner = !workspace.role || workspace.role === 'owner';
  const [members, setMembers] = useState<WorkspaceMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('editor');
  const [busy, setBusy] = useState(false);
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);

  const load = useCallback(() => {
    apiService
      .getWorkspaceMembers(workspace.id)
      .then((m) => {
        setMembers(m);
        setLoadError(null);
      })
      .catch((err) => setLoadError(errorText(err, 'Could not load members.')));
  }, [workspace.id]);

  useEffect(load, [load]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setFallbackLink(null);
    try {
      const result = await apiService.inviteWorkspaceMember(workspace.id, email.trim(), role);
      setEmail('');
      if (result.emailSent) {
        appStore.showToast(`Invitation sent to ${result.member.email}`, 'success');
      } else {
        // The invite exists; the email did not go out. Let the owner deliver it.
        setFallbackLink(result.acceptLink);
        appStore.showToast('Invitation created, but the email could not be sent. Copy the link below.', 'info');
      }
      load();
    } catch (err) {
      appStore.showToast(errorText(err, 'Could not send the invitation.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (member: WorkspaceMember, next: 'viewer' | 'editor') => {
    if (!member.id) return;
    try {
      await apiService.updateWorkspaceMemberRole(workspace.id, member.id, next);
      load();
    } catch (err) {
      appStore.showToast(errorText(err, 'Could not change the role.'), 'error');
    }
  };

  const remove = async (member: WorkspaceMember) => {
    if (!member.id) return;
    try {
      await apiService.removeWorkspaceMember(workspace.id, member.id);
      appStore.showToast(member.status === 'pending' ? 'Invitation cancelled' : `${member.email} removed`, 'success');
      load();
    } catch (err) {
      appStore.showToast(errorText(err, 'Could not remove this person.'), 'error');
    }
  };

  const leave = async () => {
    try {
      await apiService.leaveWorkspace(workspace.id);
      appStore.showToast(`You left ${workspace.name}`, 'success');
      onClose();
      await appStore.fetchWorkspaces();
    } catch (err) {
      appStore.showToast(errorText(err, 'Could not leave the workspace.'), 'error');
    }
  };

  const fieldClass =
    'bg-white dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-electric-violet focus:outline-none';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={`Members of ${workspace.name}`}>
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181b] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Members</h2>
            <p className="text-[11px] text-slate-500 truncate max-w-[22rem]">{workspace.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {isOwner && (
            <form onSubmit={invite} className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="invite-email">
                Invite by email
              </label>
              <div className="flex gap-2">
                <input
                  id="invite-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={`${fieldClass} flex-1 min-w-0`}
                />
                <select
                  aria-label="Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
                  className={fieldClass}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={busy || !email.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black disabled:opacity-50"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Invite
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Editors can create and change collections and requests. Viewers can read, simulate and comment. The
                invitee must sign in with this exact email address.
              </p>
              {fallbackLink && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-900/10 p-2">
                  <code className="flex-1 truncate text-[10px] font-mono">{fallbackLink}</code>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(fallbackLink)}
                    aria-label="Copy invitation link"
                    className="p-1 text-slate-600 hover:text-slate-900 dark:hover:text-white"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              )}
            </form>
          )}

          <div>
            {members === null && !loadError && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 size={13} className="animate-spin" /> Loading members…
              </div>
            )}
            {loadError && <p role="alert" className="text-xs text-rose-500">{loadError}</p>}
            {members && members.length === 1 && (
              <p className="text-xs text-slate-500 mb-3">Only you are in this workspace. Invite someone by email.</p>
            )}
            <ul className="divide-y divide-slate-200 dark:divide-white/10">
              {members?.map((m) => (
                <li key={m.id ?? 'owner'} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">{m.email}</div>
                    <div className="text-[10px] text-slate-500">
                      {m.status === 'pending'
                        ? `Invited${m.expiresAt ? ` · expires ${new Date(m.expiresAt).toLocaleDateString()}` : ''}`
                        : m.status === 'owner'
                          ? 'Owner'
                          : 'Member'}
                    </div>
                  </div>
                  {isOwner && m.status !== 'owner' ? (
                    <>
                      <select
                        aria-label={`Role for ${m.email}`}
                        value={m.role}
                        onChange={(e) => void changeRole(m, e.target.value as 'viewer' | 'editor')}
                        className={fieldClass}
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => void remove(m)}
                        aria-label={m.status === 'pending' ? `Cancel invitation for ${m.email}` : `Remove ${m.email}`}
                        className="p-1.5 text-slate-500 hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-500">{roleLabel[m.role]}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {!isOwner && (
            <button onClick={() => void leave()} className="text-xs font-bold text-rose-500 hover:underline">
              Leave this workspace
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
