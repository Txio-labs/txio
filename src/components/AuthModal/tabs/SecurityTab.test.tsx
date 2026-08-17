import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const getSessions = vi.fn();
const revokeSession = vi.fn();
const updatePassword = vi.fn();
const showToast = vi.fn();

vi.mock('../../../lib/store', () => ({
  appStore: {
    showToast: (...args: unknown[]) => showToast(...args),
  },
  useAppStore: () => ({
    user: { email: 'nnajimakuochukwu4@gmail.com' },
  }),
}));

vi.mock('../../../services/api', () => ({
  apiService: {
    getSessions: (...args: unknown[]) => getSessions(...args),
    revokeSession: (...args: unknown[]) => revokeSession(...args),
    updatePassword: (...args: unknown[]) => updatePassword(...args),
  },
}));

import { SecurityTab } from './SecurityTab';

describe('SecurityTab session review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessions.mockResolvedValue([
      {
        id: 'sess-current',
        device_label: 'Chrome on macOS',
        ip_address: '1.2.3.4',
        created_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        is_current: true,
      },
      {
        id: 'sess-other',
        device_label: 'Firefox on Linux',
        ip_address: '5.6.7.8',
        created_at: new Date(Date.now() - 3_600_000).toISOString(),
        last_active_at: new Date(Date.now() - 3_600_000).toISOString(),
        is_current: false,
      },
    ]);
    revokeSession.mockResolvedValue(undefined);
  });

  it('loads and lists sessions when Review Sessions is clicked', async () => {
    render(<SecurityTab />);

    fireEvent.click(screen.getByRole('button', { name: 'Review Sessions' }));

    await waitFor(() => {
      expect(getSessions).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Chrome on macOS')).toBeTruthy();
    expect(screen.getByText('Firefox on Linux')).toBeTruthy();
    expect(screen.getByText('Current')).toBeTruthy();
  });

  it('revokes a non-current session', async () => {
    render(<SecurityTab />);

    fireEvent.click(screen.getByRole('button', { name: 'Review Sessions' }));
    await screen.findByText('Firefox on Linux');

    fireEvent.click(
      screen.getByRole('button', { name: 'Revoke session for Firefox on Linux' })
    );

    await waitFor(() => {
      expect(revokeSession).toHaveBeenCalledWith('sess-other');
    });
    expect(showToast).toHaveBeenCalledWith('Session revoked', 'success');
  });
});

describe('SecurityTab password rotation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updatePassword.mockResolvedValue(undefined);
  });

  it('submits the current and new password through apiService.updatePassword', async () => {
    render(<SecurityTab />);

    fireEvent.click(screen.getByRole('button', { name: 'Rotate Password' }));

    fireEvent.change(screen.getByLabelText('Current Password'), {
      target: { value: 'current-password-123' },
    });
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'new-password-456' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'new-password-456' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() => {
      expect(updatePassword).toHaveBeenCalledWith(
        'nnajimakuochukwu4@gmail.com',
        'current-password-123',
        'new-password-456'
      );
    });
    expect(showToast).toHaveBeenCalledWith(
      'Password rotated successfully!',
      'success'
    );
  });

  it('does not call updatePassword when the form is invalid', async () => {
    render(<SecurityTab />);

    fireEvent.click(screen.getByRole('button', { name: 'Rotate Password' }));

    // Mismatched confirmation is caught client-side before any request.
    fireEvent.change(screen.getByLabelText('Current Password'), {
      target: { value: 'current-password-123' },
    });
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'new-password-456' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'different-password' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(updatePassword).not.toHaveBeenCalled();
  });
});
