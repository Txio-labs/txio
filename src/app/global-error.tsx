'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[GlobalError]', error);
    }, [error]);

    return (
        <html lang="en" className="dark">
            <body className="min-h-screen bg-[#0a0a0f] text-white antialiased">
                <div className="flex min-h-screen flex-col items-center justify-center px-6">
                    <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center shadow-[0_30px_80px_-55px_rgba(163,163,163,0.65)]">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-red-500/10 text-red-400">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                <path d="M12 9v4" />
                                <path d="M12 17h.01" />
                            </svg>
                        </div>
                        <h2 className="mt-5 text-2xl font-bold text-white">
                            Application error
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-slate-400">
                            A critical error crashed the application.
                            {error.digest && (
                                <span className="mt-2 block font-mono text-xs text-slate-500">
                                    Error: {error.digest}
                                </span>
                            )}
                        </p>
                        <button
                            onClick={reset}
                            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-electric-violet px-5 py-3 text-sm font-bold text-white transition-all hover:bg-soft-purple"
                        >
                            Reload application
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
