'use client';

import { captureInviteFromHash } from '@/lib/pendingInvite';
import { hasSessionHint } from '@/lib/sessionHint';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore, appStore } from '@/lib/store';
import { apiService } from '@/services/api';
import { FeatureId } from '@/types';

// Read and clear the short-lived OAuth token the backend hands off via a
// URL fragment. A cookie can't be used here: the backend and frontend are
// different sites (different eTLD+1), so a cookie the backend's redirect
// response sets is scoped to the backend's own origin and is never visible
// to document.cookie here. A fragment is never sent to any server (this
// one included) and is stripped from Referer headers, so it's read once
// on load and immediately stripped from the URL.
function consumeOAuthFragmentSuccess(): boolean {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash;
    if (!/(?:^#|&)oauth=success/.test(hash)) return false;
    const remainingHash = hash.replace(/(?:^#|&)oauth=success/, '').replace(/^#&/, '#');
    const url = new URL(window.location.href);
    url.hash = remainingHash === '#' ? '' : remainingHash;
    window.history.replaceState({}, '', url.toString());
    return true;
}

// OAuth failures (state mismatch, account already linked elsewhere, provider
// not configured, ...) come back as `#oauth_error=<message>` so the user lands
// in the app instead of on a bare backend response.
function consumeOAuthFragmentError(): string | null {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash;
    const match = hash.match(/(?:^#|&)oauth_error=([^&]+)/);
    if (!match) return null;
    const remainingHash = hash.replace(/(?:^#|&)oauth_error=[^&]+/, '').replace(/^#&/, '#');
    const url = new URL(window.location.href);
    url.hash = remainingHash === '#' ? '' : remainingHash;
    window.history.replaceState({}, '', url.toString());
    return decodeURIComponent(match[1]);
}

const workspaceViewModeToTab: Partial<
    Record<string, FeatureId>
> = {
    docs: 'docs',
    ecosystem: 'ecosystem',
    features: 'features',
    integrations: 'integrations',
    infrastructure: 'infrastructure',
    partners: 'partners'
};

const workspacePathToTab: Partial<
    Record<string, FeatureId>
> = {
    '/docs': 'docs',
    '/ecosystem': 'ecosystem',
    '/features': 'features',
    '/integrations': 'integrations',
    '/infrastructure': 'infrastructure',
    '/partners': 'partners'
};

export function RedirectManager() {
    const { viewMode, user } = useAppStore();
    const router = useRouter();
    const pathname = usePathname();
    const [initialized, setInitialized] = useState(false);
    // Guards a one-time startup race in the viewMode->pathname effect below
    // — see the comment there.
    const hasSkippedInitialSync = useRef(false);

    // Restore session state BEFORE any redirect logic runs
    useEffect(() => {
        appStore.initialize().then(() => setInitialized(true));
    }, []);

    // Sync viewMode from pathname when pathname changes (public routes & workspace)
    useEffect(() => {
        if (!initialized) return;

        const pathToMode: Record<string, string> = {
            '/': 'landing',
            '/docs': 'docs',
            '/ecosystem': 'ecosystem',
            '/signin': 'signin',
            '/signup': 'signup',
            '/features': 'features',
            '/otp': 'otp',
            '/integrations': 'integrations',
            '/infrastructure': 'infrastructure',
            '/partners': 'partners',
            '/workspace': 'app'
        };

        const expectedMode = pathToMode[pathname];
        if (expectedMode && appStore.getSnapshot().viewMode !== expectedMode) {
            appStore.setViewMode(expectedMode as any);
        }
        // Only react to real URL navigation (pathname), not to viewMode
        // changes this effect itself may have caused — otherwise this races
        // with the viewMode -> URL effect below and the two fight forever.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, initialized]);

    // An invitation link's token is parked before any redirect can drop it.
    useEffect(() => {
        if (captureInviteFromHash() && !hasSessionHint()) {
            appStore.showToast('Sign in with the invited email address to accept the workspace invitation.', 'info');
        }
    }, []);

    // Surface an OAuth failure (state mismatch, account-linking conflict,
    // provider not configured, etc.) as a toast instead of leaving the user
    // on a bare backend response with no way back into the app.
    useEffect(() => {
        const error = consumeOAuthFragmentError();
        if (!error) return;
        appStore.showToast(error, 'error');
    }, []);

    // OAuth callback: the session cookie was set on the redirect response.
    // Hydrate the user from the server (initialize fetches /auth/profile).
    useEffect(() => {
        if (!consumeOAuthFragmentSuccess()) return;

        apiService.setSessionHint(true);
        void appStore
            .initialize()
            .then(() => {
                appStore.setViewMode('app');
                appStore.showToast('Authentication successful!', 'success');
            })
            .catch((e) => {
                console.error('Post-OAuth session initialization failed', e);
            });
    }, [initialized]);

    // Auth-driven redirects. These key off `user` and `pathname` directly
    // (never off the viewMode -> path table below), so they can safely react
    // to real URL navigation without racing the effect above.
    useEffect(() => {
        if (!initialized) return;

        // If authenticated, always stay on workspace.
        if (user) {
            const workspaceTab =
                workspacePathToTab[pathname] ||
                workspaceViewModeToTab[
                    viewMode
                ];

            if (workspaceTab) {
                appStore.openTab(workspaceTab);

                if (viewMode !== 'app') {
                    appStore.setViewMode('app');
                }
            }

            const targetPath = '/workspace';
            if (pathname !== targetPath) {
                router.replace(targetPath);
            }
            return;
        }

        // If not authenticated and trying to access workspace, redirect to landing
        if (pathname === '/workspace') {
            router.replace('/');
        }
    }, [user, pathname, viewMode, router, initialized]);

    // Sync URL from viewMode when viewMode changes via in-app navigation
    // (e.g. an embedded tab switch calling appStore.setViewMode directly,
    // without going through next/navigation). `pathname` is intentionally
    // excluded from the dependency array — the effect above already keeps
    // viewMode in sync when the user navigates via the URL/back-button, and
    // reacting to both directions symmetrically makes the two effects fight:
    // a raw router.push() leaves a one-render window where pathname has
    // moved but viewMode hasn't caught up yet, so this effect would read a
    // stale viewMode and shove the URL back to where it just came from.
    useEffect(() => {
        if (!initialized || user) return;
        if (pathname === '/workspace') return;

        const modeToPath: Record<string, string> = {
            landing: '/',
            docs: '/docs',
            ecosystem: '/ecosystem',
            signin: '/signin',
            signup: '/signup',
            features: '/features',
            otp: '/otp',
            integrations: '/integrations',
            infrastructure: '/infrastructure',
            partners: '/partners'
        };

        // On the very first opportunity this effect gets to run after
        // initialization, `viewMode` may still be its pre-hydration default
        // ('landing') even though the pathname->viewMode effect above has
        // already fired in this same commit to correct it — that effect's
        // `setViewMode` call doesn't update *this* render's `viewMode`
        // closure, only a future one. Without this guard this effect would
        // read the stale default and bounce a hard-refreshed public route
        // (e.g. '/features') straight back to '/'. So: skip exactly once,
        // right after initialization, and only when pathname is a route
        // this effect doesn't yet agree with — every run after that is
        // trusted, including a legitimate in-app navigation to 'landing'.
        if (!hasSkippedInitialSync.current) {
            hasSkippedInitialSync.current = true;
            if (modeToPath[viewMode] !== pathname) return;
        }

        const targetPath = modeToPath[viewMode];
        if (targetPath && pathname !== targetPath) {
            router.replace(targetPath);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, user, router, initialized]);

    return null;
}