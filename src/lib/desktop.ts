'use client';

import { useSyncExternalStore } from 'react';

/**
 * True inside the Txio Desktop (Tauri) window. Tauri 2 injects
 * `__TAURI_INTERNALS__` into every page it serves, even with
 * `withGlobalTauri` off.
 */
export const isDesktopApp = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * The marketing site's pages. The desktop app has no landing page: a signed-out
 * visit to any of these goes to /signin instead.
 */
export const MARKETING_PATHS = new Set(['/', '/features', '/integrations', '/infrastructure', '/partners', '/ecosystem', '/download']);

/**
 * `isDesktopApp()` for render code. `null` on the server and the first client
 * render (so hydration matches), then true or false.
 */
export function useIsDesktopApp(): boolean | null {
    return useSyncExternalStore<boolean | null>(
        () => () => {},
        isDesktopApp,
        () => null
    );
}
