import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const api = vi.hoisted(() => ({
    getAdminOverview: vi.fn(),
    getAdminUsers: vi.fn(),
    getAdminRequests: vi.fn(),
    getAdminCollections: vi.fn(),
    getAdminRpcLogs: vi.fn(),
    adminDeleteUser: vi.fn()
}));

const store = vi.hoisted(() => ({
    showToast: vi.fn(),
    user: { id: 'u1', email: 'ada@example.com', name: 'Ada', isAdmin: true } as { email: string } | null
}));

vi.mock('@/lib/store', () => ({
    appStore: { showToast: store.showToast },
    useAppStore: () => ({ user: store.user })
}));

vi.mock('@/services/api', () => {
    class ApiError extends Error {
        status: number;
        constructor(message: string, status: number) {
            super(message);
            this.status = status;
        }
    }
    return { apiService: api, ApiError };
});

import { AdminPage, formatRelative } from './AdminPage';
import { ApiError } from '@/services/api';

const overview = {
    users: 12,
    admins: 1,
    workspaces: 14,
    collections: 7,
    saved_requests: 30,
    history_entries: 420,
    rpc_logs: 900,
    active_sessions: 9,
    signups_last_7d: 3,
    requests_last_24h: 25,
    rpc_calls_last_24h: 60
};

const iso = new Date().toISOString();

const seed = () => {
    api.getAdminOverview.mockResolvedValue(overview);
    api.getAdminUsers.mockResolvedValue([
        { id: 'u1', email: 'ada@example.com', name: 'Ada', created_at: iso, is_admin: true, google_linked: true, github_login: null, tier: 'Free', collection_count: 2, request_count: 40, last_active_at: iso },
        { id: 'u3', email: 'cy@example.com', name: 'Cy', created_at: iso, is_admin: false, google_linked: false, github_login: null, tier: 'Free', collection_count: 1, request_count: 1, last_active_at: iso },
        { id: 'u2', email: 'bob@example.com', name: null, created_at: iso, is_admin: false, google_linked: false, github_login: 'bobdev', tier: 'Pro', collection_count: 0, request_count: 0, last_active_at: null }
    ]);
    api.getAdminRequests.mockResolvedValue([
        { id: 'h1', user_email: 'ada@example.com', name: 'Get chain id', request_type: 'RPC', chain: 'sui', network: 'mainnet', method: 'sui_getChainIdentifier', status: 200, duration_ms: 87, executed_at: iso },
        { id: 'h2', user_email: null, name: 'Broken call', request_type: 'RPC', chain: 'sui', network: 'testnet', method: 'sui_nope', status: 500, duration_ms: 12, executed_at: iso }
    ]);
    api.getAdminCollections.mockResolvedValue([
        { id: 'c1', name: 'Sui basics', description: 'Starter calls', owner_email: 'ada@example.com', request_count: 5, created_at: iso, updated_at: iso }
    ]);
    api.getAdminRpcLogs.mockResolvedValue([
        { method: 'sui_getObject', success: false, error: 'object not found', timestamp: iso, user_email: 'bob@example.com' }
    ]);
};

describe('AdminPage', () => {
    beforeEach(() => {
        seed();
    });

    it('shows platform totals and the user list by default', async () => {
        render(<AdminPage />);

        expect(await screen.findByText('ada@example.com')).toBeInTheDocument();
        expect(screen.getByText('420')).toBeInTheDocument();
        expect(screen.getByText('+3 in 7 days')).toBeInTheDocument();
        expect(screen.getByText('Admin', { selector: 'span' })).toBeInTheDocument();
        expect(screen.getByText('@bobdev')).toBeInTheDocument();
        // Falls back to the email's local part when no display name is set.
        expect(screen.getByText('bob')).toBeInTheDocument();
    });

    it('switches between requests, collections and RPC logs', async () => {
        render(<AdminPage />);
        await screen.findByText('ada@example.com');

        fireEvent.click(screen.getByRole('tab', { name: /requests/i }));
        expect(screen.getByText('Get chain id')).toBeInTheDocument();
        expect(screen.getByText('deleted user')).toBeInTheDocument();
        expect(screen.getByText('87 ms')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: /collections/i }));
        expect(screen.getByText('Sui basics')).toBeInTheDocument();
        expect(screen.getByText('Starter calls')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: /rpc logs/i }));
        expect(screen.getByText('sui_getObject')).toBeInTheDocument();
        expect(screen.getByText('object not found')).toBeInTheDocument();
    });

    it('filters the active view by search text', async () => {
        render(<AdminPage />);
        await screen.findByText('ada@example.com');

        fireEvent.change(screen.getByLabelText('Search admin data'), { target: { value: 'bobdev' } });

        expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();
        expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });

    it('shows an access-required state when the server returns 403', async () => {
        api.getAdminOverview.mockRejectedValue(new ApiError('Admin access required', 403));

        render(<AdminPage />);

        expect(await screen.findByText('Admin access required')).toBeInTheDocument();
        expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    it('shows the error and retries on refresh for other failures', async () => {
        api.getAdminUsers.mockRejectedValueOnce(new ApiError('Service unavailable', 503));

        render(<AdminPage />);
        expect(await screen.findByText('Service unavailable')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

        await waitFor(() => expect(screen.getByText('ada@example.com')).toBeInTheDocument());
        expect(screen.queryByText('Service unavailable')).not.toBeInTheDocument();
    });
});

describe('AdminPage user deletion', () => {
    beforeEach(() => {
        seed();
    });

    it('offers delete only for non-admin accounts other than your own', async () => {
        render(<AdminPage />);
        await screen.findByText('ada@example.com');

        expect(screen.queryByRole('button', { name: 'Delete ada@example.com' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete bob@example.com' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete cy@example.com' })).toBeInTheDocument();
    });

    it('requires typing the email before deleting, then refreshes the data', async () => {
        api.adminDeleteUser.mockResolvedValue(undefined);
        render(<AdminPage />);
        await screen.findByText('ada@example.com');

        fireEvent.click(screen.getByRole('button', { name: 'Delete cy@example.com' }));
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('1 collection with');
        expect(dialog).toHaveTextContent('1 history entry');

        const confirm = screen.getByRole('button', { name: 'Delete account' });
        expect(confirm).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText('cy@example.com'), { target: { value: 'wrong@example.com' } });
        expect(confirm).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText('cy@example.com'), { target: { value: ' CY@example.com ' } });
        expect(confirm).toBeEnabled();

        const loadsBefore = api.getAdminOverview.mock.calls.length;
        fireEvent.click(confirm);

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(api.adminDeleteUser).toHaveBeenCalledWith('cy@example.com');
        expect(store.showToast).toHaveBeenCalledWith('Deleted cy@example.com', 'success');
        expect(api.getAdminOverview.mock.calls.length).toBe(loadsBefore + 1);
    });

    it('keeps the dialog open and shows the server error when deletion fails', async () => {
        api.adminDeleteUser.mockRejectedValue(new ApiError('Admin accounts can\'t be deleted from the dashboard', 403));
        render(<AdminPage />);
        await screen.findByText('ada@example.com');

        fireEvent.click(screen.getByRole('button', { name: 'Delete bob@example.com' }));
        fireEvent.change(screen.getByPlaceholderText('bob@example.com'), { target: { value: 'bob@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

        expect(await screen.findByText("Admin accounts can't be deleted from the dashboard")).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(store.showToast).not.toHaveBeenCalled();
    });

    it('cancel closes the dialog without deleting', async () => {
        render(<AdminPage />);
        await screen.findByText('ada@example.com');

        fireEvent.click(screen.getByRole('button', { name: 'Delete bob@example.com' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(api.adminDeleteUser).not.toHaveBeenCalled();
    });
});

describe('formatRelative', () => {
    const now = Date.parse('2026-09-23T12:00:00Z');

    it('formats recent timestamps relative to now', () => {
        expect(formatRelative('2026-09-23T11:59:30Z', now)).toBe('just now');
        expect(formatRelative('2026-09-23T11:45:00Z', now)).toBe('15m ago');
        expect(formatRelative('2026-09-23T09:00:00Z', now)).toBe('3h ago');
        expect(formatRelative('2026-09-20T12:00:00Z', now)).toBe('3d ago');
    });

    it('handles missing and invalid values', () => {
        expect(formatRelative(null, now)).toBe('—');
        expect(formatRelative('not a date', now)).toBe('—');
    });
});
