import React, { useEffect, useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import { apiService, ApiError } from '@/services/api';
import { appStore, useAppStore } from '@/lib/store';
import { captureInviteFromHash, clearPendingInvite, readPendingInvite } from '@/lib/pendingInvite';
import type { WorkspaceInvitePreview } from '@/types';

/**
 * Shown to a signed-in user who arrived through an invitation link. Nothing
 * is joined until they confirm, and the invitation only works for the email
 * address it was sent to.
 */
export const InviteBanner: React.FC = () => {
  const { user } = useAppStore();
  // The link may have been opened straight on this page, before any redirect
  // logic had a chance to park its token, so capture it here too (idempotent).
  const [token] = useState<string | null>(() => {
    captureInviteFromHash();
    return readPendingInvite();
  });
  const [preview, setPreview] = useState<WorkspaceInvitePreview | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!token || !user) return;
    apiService
      .previewWorkspaceInvite(token)
      .then(setPreview)
      .catch((err) => {
        clearPendingInvite();
        setProblem(err instanceof ApiError ? 'This invitation is invalid, already used, or has expired.' : 'Could not check the invitation.');
      });
  }, [token, user]);

  if (!token || !user || dismissed || (!preview && !problem)) return null;

  const close = () => {
    clearPendingInvite();
    setDismissed(true);
  };

  const accept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const workspace = await apiService.acceptWorkspaceInvite(token);
      clearPendingInvite();
      await appStore.fetchWorkspaces(workspace.id);
      appStore.showToast(`You joined ${workspace.name}`, 'success');
      setDismissed(true);
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : 'Could not accept the invitation.');
    } finally {
      setAccepting(false);
    }
  };

  const mismatch = preview && user.email && preview.invitedEmail.toLowerCase() !== user.email.toLowerCase();

  return (
    <div role="dialog" aria-label="Workspace invitation" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181b] p-5 shadow-2xl">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Users size={16} /> Workspace invitation
        </div>

        {problem ? (
          <p role="alert" className="mt-3 text-xs text-rose-500">{problem}</p>
        ) : preview ? (
          <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p>
              You were invited to <strong>{preview.workspaceName}</strong> as {preview.role === 'editor' ? 'an editor' : 'a viewer'}.
            </p>
            <p className="text-slate-500">Invitation sent to {preview.invitedEmail}. You are signed in as {user.email}.</p>
            {mismatch && (
              <p role="alert" className="text-amber-600">
                These are different addresses, so the invitation cannot be accepted here. Sign in with {preview.invitedEmail}.
              </p>
            )}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={close} className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">
            {problem ? 'Close' : 'Not now'}
          </button>
          {preview && !problem && (
            <button
              onClick={() => void accept()}
              disabled={accepting || Boolean(mismatch)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black disabled:opacity-50"
            >
              {accepting && <Loader2 size={12} className="animate-spin" />} Join workspace
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
