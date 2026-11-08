'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function WorkspaceError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[WorkspaceError]', error);
    }, [error]);

    return (
        <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-[10px] border border-line bg-hover p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-card bg-red-500/10 text-red-600 dark:text-red-400">
                <AlertTriangle size={22} />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-white">
                Workspace error
            </h2>
            <p className="mt-3 text-sm leading-7 text-fg-subtle">
                The workspace encountered an error and couldn&apos;t render.
            </p>
            {error.digest && (
                <p className="mt-2 font-mono text-xs text-fg-subtle">
                    Error: {error.digest}
                </p>
            )}
            <button
                onClick={reset}
                className="mt-6 inline-flex items-center gap-2 rounded-card bg-inverse px-5 py-3 text-sm font-semibold text-on-inverse transition-all hover:bg-soft-purple"
            >
                <RefreshCw size={15} />
                Reload workspace
            </button>
        </div>
    );
}
