'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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

    // Clean up URL if there are any query params left over
    useEffect(() => {
        if (initialized && window.location.search) {
            const url = new URL(window.location.href);
            url.search = '';
            window.history.replaceState({}, '', url.toString());
        }
    }, [initialized]);

    // Only redirect after initialization is complete.
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
        initialized
    ]);

    return null;
}
