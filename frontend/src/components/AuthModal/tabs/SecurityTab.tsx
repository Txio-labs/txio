import React, { useCallback, useEffect, useRef, useState } from 'react';
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
      return <p className="session-status">Loading sessions…</p>;
    }

    if (sessionsState.status === 'error') {
      return (
        <div className="session-status-block">
          <p className="error-message">{sessionsState.message}</p>
          <button type="button" className="btn btn-secondary" onClick={retrySessions}>
            Try again
          </button>
        </div>
      );
    }

    if (sessionsState.data.length === 0) {
      return <p className="session-status">No active sessions found.</p>;
    }

    return (
      <ul className="session-list">
        {sessionsState.data.map((session) => {
          const isRevoking = revokingId === session.id;
          return (
            <li key={session.id} className="session-row">
              <div className="session-info">
                <div className="session-device">
                  <span
                    className={`session-dot ${session.is_current ? 'current' : ''}`}
                    aria-hidden="true"
                  />
                  <span>
                    {session.device_label}
                    {session.is_current ? (
                      <span className="session-current-badge"> Current</span>
                    ) : null}
                  </span>
                </div>
                <div className="session-meta">
                  {session.ip_address !== 'unknown' ? session.ip_address : 'IP unavailable'}
                  {' · '}
                  {formatSessionDate(session.last_active_at)}
                </div>
              </div>
              {!session.is_current ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => revokeSession(session.id)}
                  disabled={isRevoking}
                  aria-label={`Revoke session for ${session.device_label}`}
                >
                  {isRevoking ? 'Revoking…' : 'Revoke'}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="security-tab">
      {/* Password Rotation Card */}
      <div className="security-card">
        <div className="security-card-header">
          <h3>Password Rotation</h3>
          <p className="security-card-description">
            Keep credential lifetime short and rotate keys before your environment becomes sticky.
          </p>
        </div>

        {!isPasswordFormVisible ? (
          <button
            onClick={() => setIsPasswordFormVisible(true)}
            className="btn btn-primary"
          >
            Rotate Password
          </button>
        ) : (
          <form onSubmit={handlePasswordRotation} className="password-form">
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleInputChange('currentPassword')}
                className={`form-input ${errors.currentPassword ? 'error' : ''}`}
                placeholder="Enter your current password"
                disabled={isLoading}
              />
              {errors.currentPassword && (
                <span className="error-message">{errors.currentPassword}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleInputChange('newPassword')}
                className={`form-input ${errors.newPassword ? 'error' : ''}`}
                placeholder="Enter your new password (min 8 characters)"
                disabled={isLoading}
              />
              {errors.newPassword && (
                <span className="error-message">{errors.newPassword}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your new password"
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>

            <div className="form-actions">
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
                className="btn btn-secondary"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Session Review Card */}
      <div className="security-card">
        <div className="security-card-header">
          <h3>Session review</h3>
          <p className="security-card-description">
            Audit active surfaces and revoke stale sessions when operators or devices change.
          </p>
        </div>

        {!isSessionReviewVisible ? (
          <button
            type="button"
            onClick={() => setIsSessionReviewVisible(true)}
            className="btn btn-primary"
          >
            Review Sessions
          </button>
        ) : (
          <div className="session-review-panel">
            {renderSessionsPanel()}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsSessionReviewVisible(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={retrySessions}
                disabled={sessionsState.status === 'loading'}
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .security-tab {
          padding: 20px;
        }

        .security-card {
          background: var(--bg-card, #fff);
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        .security-card-header {
          margin-bottom: 16px;
        }

        .security-card-header h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .security-card-description {
          margin: 0;
          color: var(--text-secondary, #666);
          font-size: 14px;
        }

        .password-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #333);
        }

        .form-input {
          padding: 10px 12px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--primary-color, #0066cc);
          box-shadow: 0 0 0 2px rgba(0,102,204,0.1);
        }

        .form-input.error {
          border-color: var(--error-color, #dc3545);
        }

        .form-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          color: var(--error-color, #dc3545);
          font-size: 12px;
          margin-top: 4px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 8px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: var(--primary-color, #0066cc);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--primary-hover, #0052a3);
        }

        .btn-secondary {
          background: var(--bg-secondary, #f0f0f0);
          color: var(--text-primary, #333);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--bg-hover, #e0e0e0);
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }

        .session-review-panel {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .session-status {
          margin: 0;
          color: var(--text-secondary, #666);
          font-size: 14px;
        }

        .session-status-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-start;
        }

        .session-list {
          list-style: none;
          margin: 0;
          padding: 0;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 6px;
          overflow: hidden;
        }

        .session-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border-bottom: 1px solid var(--border-color, #eee);
        }

        .session-row:last-child {
          border-bottom: none;
        }

        .session-info {
          min-width: 0;
          flex: 1;
        }

        .session-device {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #333);
        }

        .session-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #9ca3af;
          flex-shrink: 0;
        }

        .session-dot.current {
          background: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        .session-current-badge {
          margin-left: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #059669;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .session-meta {
          margin-top: 4px;
          font-size: 12px;
          color: var(--text-secondary, #666);
        }
      `}</style>
    </div>
  );
};
