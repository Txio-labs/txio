import { describe, it, expect, beforeEach } from 'vitest';
import { captureInviteFromHash, clearPendingInvite, readPendingInvite } from './pendingInvite';

const TOKEN = 'a'.repeat(64);

describe('pending workspace invite', () => {
    beforeEach(() => {
        sessionStorage.clear();
        window.history.replaceState({}, '', '/workspace');
    });

    it('parks the token from the URL fragment and removes it from the address bar', () => {
        window.history.replaceState({}, '', `/workspace#invite=${TOKEN}`);
        expect(captureInviteFromHash()).toBe(true);
        expect(window.location.hash).toBe('');
        expect(readPendingInvite()).toBe(TOKEN);
    });

    it('keeps other fragment parts', () => {
        window.history.replaceState({}, '', `/workspace#github_connected=1&invite=${TOKEN}`);
        captureInviteFromHash();
        expect(window.location.hash).toBe('#github_connected=1');
    });

    it('ignores a malformed token and a page with no invite', () => {
        window.history.replaceState({}, '', '/workspace#invite=not-a-token');
        expect(captureInviteFromHash()).toBe(false);
        expect(readPendingInvite()).toBeNull();
        expect(captureInviteFromHash()).toBe(false);
    });

    it('clears', () => {
        window.history.replaceState({}, '', `/workspace#invite=${TOKEN}`);
        captureInviteFromHash();
        clearPendingInvite();
        expect(readPendingInvite()).toBeNull();
    });
});
