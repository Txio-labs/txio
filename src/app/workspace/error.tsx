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
        <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-red-500/10 text-red-400">
                <AlertTriangle size={22} />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-white">
                Workspace error
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
                The workspace encountered an error and couldn&apos;t render.
            </p>
            {error.digest && (
                <p className="mt-2 font-mono text-xs text-slate-500">
                    Error: {error.digest}
                </p>
            )}
            <button
                onClick={reset}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-electric-violet px-5 py-3 text-sm font-bold text-white transition-all hover:bg-soft-purple"
            >
                <RefreshCw size={15} />
                Reload workspace
            </button>
        </div>
    );
}
