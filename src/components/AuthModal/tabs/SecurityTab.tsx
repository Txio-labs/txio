import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { appStore } from '../../../lib/store';
import { apiClient } from '../../../lib/api';
import { apiService } from '../../../services/api';
import type { ActiveSession } from '../../../types';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type SessionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: ActiveSession[] }
  | { status: 'error'; message: string };

function formatSessionDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Active now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
}

function useActiveSessions(enabled: boolean) {
  const [state, setState] = useState<SessionsState>({ status: 'idle' });
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const sessions = await apiService.getSessions();
      if (!mountedRef.current) return;
      setState({ status: 'ready', data: sessions });
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load sessions.';
      setState({ status: 'error', message });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch when panel opens
    load();
  }, [enabled, load]);

  const revoke = useCallback(
    async (sessionId: string) => {
      setRevokingId(sessionId);
      try {
        await apiService.revokeSession(sessionId);
        if (!mountedRef.current) return;
        appStore.showToast('Session revoked', 'success');
        await load();
      } catch (err) {
        if (!mountedRef.current) return;
        const message = err instanceof Error ? err.message : 'Could not revoke session.';
        appStore.showToast(message, 'error');
      } finally {
        if (mountedRef.current) setRevokingId(null);
      }
    },
    [load]
  );

  return { state, revokingId, retry: load, revoke };
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, htmlFor, error, children }) => (
  <div className="space-y-1.5">
    <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-400">{label}</label>
    {children}
    {error && (
      <p className="flex items-center gap-1.5 text-[11px] text-rose-400">
        <AlertCircle size={11} /> {error}
      </p>
    )}
  </div>
);

const inputBase =
  'w-full bg-white dark:bg-near-black border rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none transition-colors';
const editableInput = `${inputBase} border-slate-200 dark:border-white/[0.08] placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-electric-violet/60`;
const errorInput = `${inputBase} border-rose-500/40 focus:border-rose-500/60`;

const primaryButton =
  'px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
const secondaryButton =
  'px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

export const SecurityTab: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordFormVisible, setIsPasswordFormVisible] = useState(false);
  const [isSessionReviewVisible, setIsSessionReviewVisible] = useState(false);
  const [formData, setFormData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<PasswordFormData>>({});

  const {
    state: sessionsState,
    revokingId,
    retry: retrySessions,
    revoke: revokeSession,
  } = useActiveSessions(isSessionReviewVisible);

  const validatePasswordForm = (): boolean => {
    const newErrors: Partial<PasswordFormData> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'New password must be at least 8 characters';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordRotation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/auth/update-password', {
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
        confirm_password: formData.confirmPassword,
      });

      appStore.showToast('Password rotated successfully!', 'success');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsPasswordFormVisible(false);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to rotate password';
      appStore.showToast(errorMessage, 'error');
      setErrors({
        currentPassword: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof PasswordFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const renderSessionsPanel = () => {
    if (sessionsState.status === 'loading' || sessionsState.status === 'idle') {
      return <p className="text-xs text-slate-500">Loading sessions…</p>;
    }

    if (sessionsState.status === 'error') {
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-xs text-rose-400">{sessionsState.message}</p>
          <button type="button" className={secondaryButton} onClick={retrySessions}>
            Try again
          </button>
        </div>
      );
    }

    if (sessionsState.data.length === 0) {
      return <p className="text-xs text-slate-500">No active sessions found.</p>;
    }

    return (
      <ul className="rounded-lg border border-slate-200 dark:border-white/[0.08] divide-y divide-slate-200 dark:divide-white/[0.06] overflow-hidden">
        {sessionsState.data.map((session) => {
          const isRevoking = revokingId === session.id;
          return (
            <li key={session.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-near-black">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${session.is_current ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' : 'bg-slate-500'}`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{session.device_label}</span>
                  {session.is_current && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Current</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-500 truncate">
                  {session.ip_address !== 'unknown' ? session.ip_address : 'IP unavailable'}
                  {' · '}
                  {formatSessionDate(session.last_active_at)}
                </div>
              </div>
              {!session.is_current && (
                <button
                  type="button"
                  onClick={() => revokeSession(session.id)}
                  disabled={isRevoking}
                  aria-label={`Revoke session for ${session.device_label}`}
                  className="shrink-0 px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRevoking ? 'Revoking…' : 'Revoke'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Password Rotation Card */}
      <section className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-dark-indigo-glow overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.06]">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Password Rotation</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Keep credential lifetime short and rotate keys before your environment becomes sticky.
          </p>
        </div>

        <div className="p-5">
          {!isPasswordFormVisible ? (
            <button onClick={() => setIsPasswordFormVisible(true)} className={primaryButton}>
              Rotate Password
            </button>
          ) : (
            <form onSubmit={handlePasswordRotation} className="space-y-4 max-w-md">
              <Field label="Current Password" htmlFor="currentPassword" error={errors.currentPassword}>
                <input
                  id="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={handleInputChange('currentPassword')}
                  className={errors.currentPassword ? errorInput : editableInput}
                  placeholder="Enter your current password"
                  disabled={isLoading}
                />
              </Field>

              <Field label="New Password" htmlFor="newPassword" error={errors.newPassword}>
                <input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleInputChange('newPassword')}
                  className={errors.newPassword ? errorInput : editableInput}
                  placeholder="Enter your new password (min 8 characters)"
                  disabled={isLoading}
                />
              </Field>

              <Field label="Confirm New Password" htmlFor="confirmPassword" error={errors.confirmPassword}>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  className={errors.confirmPassword ? errorInput : editableInput}
                  placeholder="Confirm your new password"
                  disabled={isLoading}
                />
              </Field>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordFormVisible(false);
                    setFormData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                    setErrors({});
                  }}
                  className={secondaryButton}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button type="submit" className={primaryButton} disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Session Review Card */}
      <section className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-dark-indigo-glow overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.06]">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Session review</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit active surfaces and revoke stale sessions when operators or devices change.
          </p>
        </div>

        <div className="p-5">
          {!isSessionReviewVisible ? (
            <button type="button" onClick={() => setIsSessionReviewVisible(true)} className={primaryButton}>
              Review Sessions
            </button>
          ) : (
            <div className="space-y-4">
              {renderSessionsPanel()}
              <div className="flex gap-3 justify-end">
                <button type="button" className={secondaryButton} onClick={() => setIsSessionReviewVisible(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className={primaryButton}
                  onClick={retrySessions}
                  disabled={sessionsState.status === 'loading'}
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
