import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const showToast = vi.fn();
const updateUser = vi.fn();

vi.mock('../../../lib/store', () => ({
    appStore: {
        showToast: (...args: unknown[]) => showToast(...args),
        updateUser: (...args: unknown[]) => updateUser(...args),
    },
    useAppStore: () => ({
        history: [],
        collections: [],
    }),
}));

vi.mock('../../../services/api', () => ({
    API_BASE: 'https://api.example.com/api/v1',
    apiService: { getToken: () => null },
}));

import { GeneralTab } from './GeneralTab';

describe('GeneralTab', () => {
    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: undefined,
        bannerUrl: undefined,
        notificationPreferences: {},
        githubAccount: null,
    };

    const mockLogout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock console.error to verify guards
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('GitHub connect button', () => {
        it('github_connect_shows_coming_soon_without_navigating', () => {
            const mockLocation = { href: '' };
            const originalLocation = window.location;
            Object.defineProperty(window, 'location', { value: mockLocation, configurable: true });

            render(<GeneralTab user={mockUser} onLogout={mockLogout} />);
            fireEvent.click(screen.getByRole('button', { name: 'Connect GitHub' }));

            expect(showToast).toHaveBeenCalledWith('GitHub linking is coming soon', 'info');
            expect(mockLocation.href).toBe('');

            Object.defineProperty(window, 'location', { value: originalLocation, configurable: true });
        });

        it('github_connect_link_not_shown_when_already_linked', () => {
            const linkedUser = {
                ...mockUser,
                githubAccount: {
                    login: 'testuser',
                    id: 'github-123',
                },
            };

            render(
                <GeneralTab user={linkedUser} onLogout={mockLogout} />
            );

            // Should show the connected GitHub account
            expect(screen.getByText('@testuser')).toBeTruthy();

            // Should NOT show the Connect button
            expect(screen.queryByRole('button', { name: 'Connect GitHub' })).toBeNull();
        });

        it('already_linked_github_account_unaffected', () => {
            const linkedUser = {
                ...mockUser,
                githubAccount: {
                    login: 'developer',
                    id: 'github-456',
                },
            };

            render(
                <GeneralTab user={linkedUser} onLogout={mockLogout} />
            );

            // Verify the linked account is displayed
            expect(screen.getByText('@developer')).toBeTruthy();

            // Verify no connect button is shown
            const connectButton = screen.queryByRole('button', { name: 'Connect GitHub' });
            expect(connectButton).toBeNull();
        });
    });

    describe('Profile form', () => {
        it('should render profile details', () => {
            render(
                <GeneralTab user={mockUser} onLogout={mockLogout} />
            );

            expect(screen.getByDisplayValue(mockUser.name)).toBeTruthy();
            expect(screen.getByDisplayValue(mockUser.email)).toBeTruthy();
        });

        it('should allow editing display name', async () => {
            render(
                <GeneralTab user={mockUser} onLogout={mockLogout} />
            );

            const nameInput = screen.getByDisplayValue(mockUser.name);
            fireEvent.change(nameInput, { target: { value: 'New Name' } });

            expect(nameInput).toHaveValue('New Name');
        });

        it('should show save button when changes are made', async () => {
            render(
                <GeneralTab user={mockUser} onLogout={mockLogout} />
            );

            const nameInput = screen.getByDisplayValue(mockUser.name);
            fireEvent.change(nameInput, { target: { value: 'New Name' } });

            const saveButton = screen.getByRole('button', { name: 'Save changes' });
            expect(saveButton).not.toBeDisabled();
        });

        it('should save profile changes', async () => {
            render(
                <GeneralTab user={mockUser} onLogout={mockLogout} />
            );

            const nameInput = screen.getByDisplayValue(mockUser.name);
            fireEvent.change(nameInput, { target: { value: 'New Name' } });

            const saveButton = screen.getByRole('button', { name: 'Save changes' });
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(updateUser).toHaveBeenCalledWith({ name: 'New Name' });
                expect(showToast).toHaveBeenCalledWith('Profile updated', 'success');
            });
        });
    });

    describe('Logout button', () => {
        it('should render logout button on mobile', () => {
            render(
                <GeneralTab user={mockUser} onLogout={mockLogout} />
            );

            expect(screen.getByRole('button', { name: 'Sign Out' })).toBeTruthy();
        });

        it('should call onLogout when logout button is clicked', () => {
            render(
                <GeneralTab user={mockUser} onLogout={mockLogout} />
            );

            const logoutButton = screen.getByRole('button', { name: 'Sign Out' });
            fireEvent.click(logoutButton);

            expect(mockLogout).toHaveBeenCalled();
        });
    });

    describe('Null user handling', () => {
        it('should not render when user is null', () => {
            const { container } = render(
                <GeneralTab user={null} onLogout={mockLogout} />
            );

            expect(container.firstChild).toBeNull();
        });
    });
});
