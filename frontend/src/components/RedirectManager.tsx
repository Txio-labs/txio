'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAppStore, appStore } from '@/lib/store';
import { apiService } from '@/services/api';
import { FeatureId } from '@/types';

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
    const searchParams = useSearchParams();
    const [initialized, setInitialized] = useState(false);

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
        if (expectedMode && viewMode !== expectedMode) {
            appStore.setViewMode(expectedMode as any);
        }
    }, [pathname, initialized, viewMode]);

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) return;

        // OAuth callback: treat this as the source of truth and
        // prevent generic viewMode redirects from taking over.
        apiService.setToken(token);
        void appStore.initialize();

        try {
            const payloadSegment = token
                .split('.')[1]
                ?.replace(/-/g, '+')
                .replace(/_/g, '/');
            const normalizedPayload =
                (payloadSegment || '').padEnd(
                    Math.ceil(
                        (payloadSegment || '')
                            .length / 4
                    ) * 4,
                    '='
                );
            const payload = JSON.parse(
                atob(normalizedPayload)
            );
            appStore.updateUser({
                id: payload.sub,
                email: payload.email,
                name: payload.email.split('@')[0]
            });

            appStore.setViewMode('app');
            appStore.showToast('Authentication successful!', 'success');

            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            window.history.replaceState({}, '', url.toString());
        } catch (e) {
            console.error('Failed to parse token', e);
        }
    }, [searchParams]);

    // Only redirect after initialization is complete.
    // Additionally, if OAuth token param is present, don't route based on
    // current viewMode (it may still be 'landing' during state hydration).
    useEffect(() => {
        if (!initialized) return;

        const token = searchParams.get('token');
        const hasStoredToken =
            typeof window !== 'undefined' &&
            !!localStorage.getItem('txio_token');

        // OAuth callback: handle token-based redirects deterministically
        if (token) {
            // Ensure we don't get bounced back to landing due to transient
            // viewMode values during hydration.
            appStore.setViewMode('app');

            const targetPath = '/workspace';
            if (pathname !== targetPath) {
                router.replace(targetPath);
            }
            return;
        }

        // If authenticated, always stay on workspace.
        if (user || hasStoredToken) {
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
            return;
        }

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

        const targetPath = modeToPath[viewMode];
        if (targetPath && pathname !== targetPath) {
            router.replace(targetPath);
        }
    }, [
        viewMode,
        user,
        router,
        pathname,
        initialized,
        searchParams
    ]);

    return null;
}
