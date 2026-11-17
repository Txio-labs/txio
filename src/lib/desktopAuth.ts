/**
 * Browser sign-in for Txio Desktop, in the style of an OAuth app handoff.
 *
 * 1. Desktop: makes a PKCE verifier and a state value, keeps both in its own
 *    storage, and opens `<site>/desktop-auth?challenge=…&state=…` in the system browser.
 * 2. Website: the user signs in as usual and confirms. The API returns a
 *    one-time code bound to the challenge, and the page opens
 *    `txio-desktop://auth?code=…&state=…` (or shows the code to paste).
 * 3. Desktop: the shell turns that link into `/signin#desktop_code=…&state=…`.
 *    The page checks the state and redeems the code with the verifier, through
 *    the shell's API proxy, so the session cookie lands in the desktop app.
 *
 * The code is single-use, expires in 5 minutes and is worthless without the
 * verifier, which never leaves the desktop app.
 */

/** OS-level link scheme Txio Desktop registers (see txio-desktop tauri.conf.json). */
export const DESKTOP_LINK_SCHEME = 'txio-desktop';

/** The public website, where desktop users sign in. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://txio.xyz').replace(/\/+$/, '');

const PENDING_DESKTOP_KEY = 'txio_desktop_signin';
const PENDING_WEB_KEY = 'txio_desktop_auth_request';
const PENDING_MAX_AGE_MS = 15 * 60 * 1000;

const base64url = (bytes: Uint8Array): string =>
    btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const randomToken = (): string => base64url(crypto.getRandomValues(new Uint8Array(32)));

export const isBase64Url = (s: string | null | undefined, min: number, max: number): s is string =>
    typeof s === 'string' && s.length >= min && s.length <= max && /^[A-Za-z0-9_-]+$/.test(s);

async function s256(verifier: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return base64url(new Uint8Array(digest));
}

// ── Desktop side ──────────────────────────────────────────────────────────

interface PendingDesktopSignIn {
    verifier: string;
    state: string;
    at: number;
}

/** Start a sign-in: store a fresh verifier and state, return the website URL to open. */
export async function startDesktopSignIn(): Promise<string> {
    const pending: PendingDesktopSignIn = { verifier: randomToken(), state: randomToken(), at: Date.now() };
    localStorage.setItem(PENDING_DESKTOP_KEY, JSON.stringify(pending));
    const challenge = await s256(pending.verifier);
    const q = new URLSearchParams({ challenge, state: pending.state });
    return `${SITE_URL}/desktop-auth?${q.toString()}`;
}

/** The verifier for an in-progress sign-in, if `state` matches it (or no state is given, for a pasted code). */
export function pendingVerifier(state?: string): string | null {
    try {
        const p = JSON.parse(localStorage.getItem(PENDING_DESKTOP_KEY) ?? 'null') as PendingDesktopSignIn | null;
        if (!p || Date.now() - p.at > PENDING_MAX_AGE_MS) return null;
        if (state !== undefined && state !== p.state) return null;
        return p.verifier;
    } catch {
        return null;
    }
}

export function clearDesktopSignIn(): void {
    try {
        localStorage.removeItem(PENDING_DESKTOP_KEY);
    } catch {
        // Nothing stored.
    }
}

/** Read and strip `#desktop_code=…&state=…`, which the shell puts on /signin. */
export function consumeDesktopCodeFragment(): { code: string; state: string } | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const code = params.get('desktop_code');
    const state = params.get('state');
    if (!code) return null;
    window.history.replaceState({}, '', window.location.pathname + window.location.search);
    return { code, state: state ?? '' };
}

// ── Website side ──────────────────────────────────────────────────────────

export interface DesktopAuthRequest {
    challenge: string;
    state: string;
}

export function readDesktopAuthRequest(search: string): DesktopAuthRequest | null {
    const q = new URLSearchParams(search);
    const challenge = q.get('challenge');
    const state = q.get('state');
    if (!isBase64Url(challenge, 43, 43) || !isBase64Url(state, 16, 128)) return null;
    return { challenge, state };
}

/** Park a request while the user signs in, so the app can come back to /desktop-auth. */
export function parkDesktopAuthRequest(req: DesktopAuthRequest): void {
    try {
        sessionStorage.setItem(PENDING_WEB_KEY, JSON.stringify({ ...req, at: Date.now() }));
    } catch {
        // Storage blocked: the user can reopen the link from the desktop app.
    }
}

export function parkedDesktopAuthRequest(): DesktopAuthRequest | null {
    try {
        const p = JSON.parse(sessionStorage.getItem(PENDING_WEB_KEY) ?? 'null') as (DesktopAuthRequest & { at: number }) | null;
        if (!p || Date.now() - p.at > PENDING_MAX_AGE_MS) return null;
        if (!isBase64Url(p.challenge, 43, 43) || !isBase64Url(p.state, 16, 128)) return null;
        return { challenge: p.challenge, state: p.state };
    } catch {
        return null;
    }
}

export function clearParkedDesktopAuthRequest(): void {
    try {
        sessionStorage.removeItem(PENDING_WEB_KEY);
    } catch {
        // Nothing stored.
    }
}

export const desktopAppLink = (code: string, state: string): string =>
    `${DESKTOP_LINK_SCHEME}://auth?${new URLSearchParams({ code, state }).toString()}`;
