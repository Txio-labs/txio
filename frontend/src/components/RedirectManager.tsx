'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';

export function RedirectManager() {
    const { viewMode } = useAppStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const modeToPath: Record<string, string> = {
            'landing': '/',
            'docs': '/docs',
            'ecosystem': '/ecosystem',
            'signin': '/signin',
            'signup': '/signup',
            'features': '/features',
            'otp': '/otp',
            'integrations': '/integrations',
            'infrastructure': '/infrastructure',
            'partners': '/partners',
            'app': '/workspace'
        };

        const targetPath = modeToPath[viewMode];
        if (targetPath && pathname !== targetPath) {
            router.push(targetPath);
        }
    }, [viewMode, router, pathname]);

    return null;
}
