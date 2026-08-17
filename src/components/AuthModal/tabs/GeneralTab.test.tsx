import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { UserProfile } from '@/types';

const mockUser: UserProfile = {
  id: 'user-1234567890abcdef',
  name: 'Test User',
  email: 'test@txio.dev',
  role: 'member',
  avatar: '',
  githubAccount: undefined,
  notificationPreferences: {
    emailNotifications: true,
    executionAlerts: true,
    securityAlerts: true,
    marketingUpdates: false,
  },
};

vi.mock('@/lib/store', () => ({
  appStore: {
    user: null,
    updateUser: vi.fn(),
    showToast: vi.fn(),
    collections: [],
    history: [],
    customTemplates: [],
    isHydrated: true,
  },
  useAppStore: () => ({
    user: null,
    updateUser: vi.fn(),
    showToast: vi.fn(),
    collections: [],
    history: [],
    customTemplates: [],
    isHydrated: true,
  }),
}));

vi.mock('@/services/api', () => ({
  API_BASE: 'https://txio-oyac.onrender.com/api/v1',
  apiService: {
    updateProfile: vi.fn(),
  },
}));

import { GeneralTab } from './GeneralTab';
import { API_BASE } from '@/services/api';

describe('GeneralTab GitHub connect link', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as unknown as { location: unknown }).location;
    window.location = { ...originalLocation, href: '' } as unknown as Location;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('navigates to API_BASE/auth/github/login when Connect is clicked', () => {
    render(<GeneralTab user={mockUser} onLogout={vi.fn()} />);

    const connectButton = screen.getByRole('button', { name: /connect/i });
    expect(connectButton).toBeInTheDocument();

    fireEvent.click(connectButton);

    expect(window.location.href).toBe(`${API_BASE}/auth/github/login`);
  });

  it('does not show Connect button when githubAccount is already linked', () => {
    const userWithGithub: UserProfile = {
      ...mockUser,
      githubAccount: {
        id: 'gh-123',
        login: 'octocat',
      },
    };

    render(<GeneralTab user={userWithGithub} onLogout={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /connect/i })).toBeNull();
    expect(screen.getByText('@octocat')).toBeInTheDocument();
  });
});
