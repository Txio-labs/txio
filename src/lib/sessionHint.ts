const SESSION_HINT_KEY = 'txio_session_hint';

/**
 * "A session probably exists" flag. The real session is an HttpOnly cookie
 * that script cannot read; this lets the app choose its first screen before
 * the profile request returns. It is not a credential.
 */
export function hasSessionHint(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return localStorage.getItem(SESSION_HINT_KEY) === '1';
    } catch {
        return false;
    }
}

export function setSessionHint(active: boolean): void {
    if (typeof window === 'undefined') return;
    try {
        if (active) {
            localStorage.setItem(SESSION_HINT_KEY, '1');
        } else {
            localStorage.removeItem(SESSION_HINT_KEY);
        }
    } catch {
        /* storage unavailable */
    }
}
