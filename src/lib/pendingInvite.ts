const KEY = 'txio_pending_invite';
const TOKEN_RE = /^[0-9a-f]{64}$/;

/**
 * Invitation links look like `/workspace#invite=<token>`. The token lives in
 * the fragment so it never reaches server logs, but a signed-out visitor is
 * redirected to sign in and loses the fragment, so it is parked in
 * sessionStorage until they are back. Returns true when a token was captured.
 */
export function captureInviteFromHash(): boolean {
    if (typeof window === 'undefined') return false;
    const match = window.location.hash.match(/(?:^#|&)invite=([^&]+)/);
    if (!match) return false;

    const token = decodeURIComponent(match[1]);
    const remaining = window.location.hash.replace(/(?:^#|&)invite=[^&]+/, '').replace(/^#&/, '#');
    const url = new URL(window.location.href);
    url.hash = remaining === '#' ? '' : remaining;
    window.history.replaceState({}, '', url.toString());

    // A malformed value is dropped instead of being sent to the server.
    if (!TOKEN_RE.test(token)) return false;
    try {
        sessionStorage.setItem(KEY, token);
    } catch {
        return false;
    }
    return true;
}

export function readPendingInvite(): string | null {
    try {
        const token = sessionStorage.getItem(KEY);
        return token && TOKEN_RE.test(token) ? token : null;
    } catch {
        return null;
    }
}

export function clearPendingInvite(): void {
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        /* storage unavailable */
    }
}
