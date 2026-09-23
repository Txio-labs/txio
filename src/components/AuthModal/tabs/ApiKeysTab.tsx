import React from 'react';
import { KeyRound, Sparkles } from 'lucide-react';

// Cloud API keys need a real backend: an issuing endpoint that hashes and
// stores the key server-side, and key-based auth middleware to verify it on
// each request. Neither exists yet, so this tells the user honestly rather
// than generating a client-side key that would silently fail everywhere.
export const ApiKeysTab: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-[linear-gradient(145deg,rgba(100,100,100,0.07)_0%,rgba(248,250,252,0.9)_40%,rgba(255,255,255,1)_100%)] dark:bg-[linear-gradient(145deg,rgba(163,163,163,0.15)_0%,rgba(24,24,27,0.96)_40%,rgba(10,10,10,1)_100%)] p-6">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-electric-violet/15 blur-3xl" />

        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-electric-violet/20 bg-electric-violet/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-electric-violet">
            <KeyRound size={12} />
            Cloud Access
          </div>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            API keys are coming soon.
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Scoped, revocable tokens for CI, backend automation, and external integrations to reach
            txio programmatically aren&apos;t available yet. This tab will let you generate and manage
            them once that&apos;s ready.
          </p>
        </div>
      </section>

      <div className="rounded-[1.75rem] border border-dashed border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-electric-violet/10 text-electric-violet">
          <Sparkles size={26} />
        </div>
        <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">Nothing to show yet</h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Check back once API key management ships.
        </p>
      </div>
    </div>
  );
};
