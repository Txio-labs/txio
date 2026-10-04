import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mocks = vi.hoisted(() => ({
    getWorkspaceMembers: vi.fn(),
    inviteWorkspaceMember: vi.fn(),
    updateWorkspaceMemberRole: vi.fn(),
    removeWorkspaceMember: vi.fn(),
    leaveWorkspace: vi.fn(),
    previewWorkspaceInvite: vi.fn(),
    acceptWorkspaceInvite: vi.fn(),
    showToast: vi.fn(),
    fetchWorkspaces: vi.fn(async () => []),
    user: { id: 'u1', email: 'invitee@x.com', name: 'I' } as { id: string; email: string; name: string } | null
}));

vi.mock('@/services/api', () => ({
    apiService: {
        getWorkspaceMembers: mocks.getWorkspaceMembers,
        inviteWorkspaceMember: mocks.inviteWorkspaceMember,
        updateWorkspaceMemberRole: mocks.updateWorkspaceMemberRole,
        removeWorkspaceMember: mocks.removeWorkspaceMember,
        leaveWorkspace: mocks.leaveWorkspace,
        previewWorkspaceInvite: mocks.previewWorkspaceInvite,
        acceptWorkspaceInvite: mocks.acceptWorkspaceInvite
    },
    ApiError: class ApiError extends Error {}
}));
vi.mock('@/lib/store', () => ({
    appStore: { showToast: mocks.showToast, fetchWorkspaces: mocks.fetchWorkspaces },
    useAppStore: () => ({ user: mocks.user })
}));

import { MembersPanel } from './MembersPanel';
import { InviteBanner } from './InviteBanner';
import { canEditWorkspace } from '../types';

const ws = (role?: 'owner' | 'editor' | 'viewer') => ({ id: 'w1', name: 'Team', type: 'Team' as const, activeEnvId: '', ...(role ? { role } : {}) });
const members = [
    { id: null, email: 'owner@x.com', role: 'owner', status: 'owner', expiresAt: null },
    { id: 'm1', email: 'ed@x.com', role: 'editor', status: 'active', expiresAt: null },
    { id: 'm2', email: 'later@x.com', role: 'viewer', status: 'pending', expiresAt: '2030-01-01T00:00:00Z' }
];

describe('MembersPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getWorkspaceMembers.mockResolvedValue(members);
    });

    it('lets an owner invite, change roles and remove; shows pending invitations', async () => {
        mocks.inviteWorkspaceMember.mockResolvedValue({ member: members[2], emailSent: true, acceptLink: 'https://app/x#invite=t' });
        render(<MembersPanel workspace={ws('owner')} onClose={() => undefined} />);
        await screen.findByText('ed@x.com');
        expect(screen.getByText(/Invited · expires/)).toBeTruthy();

        fireEvent.change(screen.getByLabelText('Invite by email'), { target: { value: 'new@x.com' } });
        fireEvent.click(screen.getByRole('button', { name: /invite/i }));
        await waitFor(() => expect(mocks.inviteWorkspaceMember).toHaveBeenCalledWith('w1', 'new@x.com', 'editor'));

        fireEvent.change(screen.getByLabelText('Role for ed@x.com'), { target: { value: 'viewer' } });
        await waitFor(() => expect(mocks.updateWorkspaceMemberRole).toHaveBeenCalledWith('w1', 'm1', 'viewer'));

        fireEvent.click(screen.getByLabelText('Remove ed@x.com'));
        await waitFor(() => expect(mocks.removeWorkspaceMember).toHaveBeenCalledWith('w1', 'm1'));
        fireEvent.click(screen.getByLabelText('Cancel invitation for later@x.com'));
        await waitFor(() => expect(mocks.removeWorkspaceMember).toHaveBeenCalledWith('w1', 'm2'));
    });

    it('offers the link to the owner when the email could not be sent', async () => {
        mocks.inviteWorkspaceMember.mockResolvedValue({ member: members[2], emailSent: false, acceptLink: 'https://app/workspace#invite=abc' });
        render(<MembersPanel workspace={ws()} onClose={() => undefined} />);
        await screen.findByText('ed@x.com');
        fireEvent.change(screen.getByLabelText('Invite by email'), { target: { value: 'new@x.com' } });
        fireEvent.click(screen.getByRole('button', { name: /invite/i }));
        expect(await screen.findByText('https://app/workspace#invite=abc')).toBeTruthy();
    });

    it('gives non-owners no invite form or role controls, only a way to leave', async () => {
        render(<MembersPanel workspace={ws('viewer')} onClose={() => undefined} />);
        await screen.findByText('ed@x.com');
        expect(screen.queryByLabelText('Invite by email')).toBeNull();
        expect(screen.queryByLabelText('Role for ed@x.com')).toBeNull();
        fireEvent.click(screen.getByText('Leave this workspace'));
        await waitFor(() => expect(mocks.leaveWorkspace).toHaveBeenCalledWith('w1'));
    });
});

describe('InviteBanner', () => {
    const TOKEN = 'b'.repeat(64);
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        mocks.user = { id: 'u1', email: 'invitee@x.com', name: 'I' };
        window.history.replaceState({}, '', `/workspace#invite=${TOKEN}`);
    });

    it('previews the invitation and joins only after the user confirms', async () => {
        mocks.previewWorkspaceInvite.mockResolvedValue({ workspaceName: 'Team', invitedEmail: 'invitee@x.com', role: 'editor' });
        mocks.acceptWorkspaceInvite.mockResolvedValue({ id: 'w9', name: 'Team' });
        render(<InviteBanner />);
        await screen.findByText(/You were invited to/);
        expect(mocks.acceptWorkspaceInvite).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: /join workspace/i }));
        await waitFor(() => expect(mocks.acceptWorkspaceInvite).toHaveBeenCalledWith(TOKEN));
        expect(mocks.fetchWorkspaces).toHaveBeenCalledWith('w9');
        expect(sessionStorage.getItem('txio_pending_invite')).toBeNull();
    });

    it('blocks acceptance when signed in with a different email', async () => {
        mocks.previewWorkspaceInvite.mockResolvedValue({ workspaceName: 'Team', invitedEmail: 'someone.else@x.com', role: 'viewer' });
        render(<InviteBanner />);
        await screen.findByText(/different addresses/);
        expect((screen.getByRole('button', { name: /join workspace/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('does nothing for a signed-out visitor and when there is no invitation', () => {
        mocks.user = null;
        const { container } = render(<InviteBanner />);
        expect(container.firstChild).toBeNull();
        expect(mocks.previewWorkspaceInvite).not.toHaveBeenCalled();
    });
});

describe('canEditWorkspace', () => {
    it('is true for owners, editors and workspaces from before roles existed; false for viewers', () => {
        expect(canEditWorkspace(ws('owner'))).toBe(true);
        expect(canEditWorkspace(ws('editor'))).toBe(true);
        expect(canEditWorkspace(ws())).toBe(true);
        expect(canEditWorkspace(ws('viewer'))).toBe(false);
        expect(canEditWorkspace(null)).toBe(true);
    });
});
