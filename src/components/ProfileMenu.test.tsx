import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@dicebear/core', () => ({ createAvatar: () => ({ toString: () => '<svg></svg>' }) }));
vi.mock('@dicebear/collection', () => ({ notionists: {}, bottts: {}, identicon: {} }));

const { mockAppStore, mockWallet } = vi.hoisted(() => ({
  mockAppStore: {
    user: {
      id: 'user-1',
      name: 'Victor Oladimeji',
      email: 'oladimejivictor611@gmail.com',
    },
    settings: { theme: 'dark' },
    workspaces: [
      { id: 'ws-1', name: 'Personal Workspace', type: 'Personal', activeEnvId: 'env-1' },
      { id: 'ws-2', name: 'Team Workspace', type: 'Team', activeEnvId: 'env-2' },
    ],
    currentWorkspaceId: 'ws-1',
  },
  mockWallet: {
    currentWallet: { family: 'sui', address: '0x7A3B00000000000000000000000000000000091F' },
    isConnected: true,
  },
}));

const setAuthModal = vi.fn();
const openTab = vi.fn();
const setWorkspace = vi.fn();
const updateSettings = vi.fn();
const logout = vi.fn();

vi.mock('@/lib/store', () => ({
  useAppStore: () => mockAppStore,
  appStore: {
    setAuthModal: (...args: unknown[]) => setAuthModal(...args),
    openTab: (...args: unknown[]) => openTab(...args),
    setWorkspace: (...args: unknown[]) => setWorkspace(...args),
    updateSettings: (...args: unknown[]) => updateSettings(...args),
    logout: (...args: unknown[]) => logout(...args),
  },
}));

vi.mock('@/wallet', () => ({
  useWallet: () => mockWallet,
}));

import { ProfileMenu } from './ProfileMenu';

describe('ProfileMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppStore.user = {
      id: 'user-1',
      name: 'Victor Oladimeji',
      email: 'oladimejivictor611@gmail.com',
    };
    mockWallet.isConnected = true;
    mockWallet.currentWallet = { family: 'sui', address: '0x7A3B00000000000000000000000000000000091F' };
  });

  it('renders a sign-in avatar button when there is no user, and opens the auth modal', () => {
    mockAppStore.user = null as any;
    render(<ProfileMenu />);

    fireEvent.click(screen.getByTitle('Sign in'));
    expect(setAuthModal).toHaveBeenCalledWith(true);
  });

  it('opens the dropdown and shows the real user name and email', () => {
    render(<ProfileMenu />);
    fireEvent.click(screen.getByTitle('Account'));

    expect(screen.getByText('Victor Oladimeji')).toBeInTheDocument();
    expect(screen.getByText('oladimejivictor611@gmail.com')).toBeInTheDocument();
  });

  it('shows the connected wallet address with a live indicator when connected', () => {
    render(<ProfileMenu />);
    fireEvent.click(screen.getByTitle('Account'));

    expect(screen.getByText('Connected Wallet')).toBeInTheDocument();
    expect(screen.getByTitle('Connected')).toBeInTheDocument();
  });

  it('shows "Not connected" when no wallet is connected', () => {
    mockWallet.isConnected = false;
    mockWallet.currentWallet = null as any;
    render(<ProfileMenu />);
    fireEvent.click(screen.getByTitle('Account'));

    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });

  it('expands the workspace list and switches workspace on click', () => {
    render(<ProfileMenu />);
    fireEvent.click(screen.getByTitle('Account'));
    fireEvent.click(screen.getByText('Switch Workspace'));

    const teamOption = screen.getByText('Team Workspace');
    fireEvent.click(teamOption);

    expect(setWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ws-2', name: 'Team Workspace' })
    );
  });

  it('toggles theme via the Appearance row', () => {
    render(<ProfileMenu />);
    fireEvent.click(screen.getByTitle('Account'));
    fireEvent.click(screen.getByText('Appearance'));

    expect(updateSettings).toHaveBeenCalledWith({ theme: 'light' });
  });

  it('navigates to settings and closes the menu', () => {
    render(<ProfileMenu />);
    fireEvent.click(screen.getByTitle('Account'));
    fireEvent.click(screen.getByText('Settings'));

    expect(openTab).toHaveBeenCalledWith('settings');
  });

  it('calls logout when Sign Out is clicked', () => {
    render(<ProfileMenu />);
    fireEvent.click(screen.getByTitle('Account'));
    fireEvent.click(screen.getByText('Sign Out'));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
