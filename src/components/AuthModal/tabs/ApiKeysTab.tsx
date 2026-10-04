import React from 'react';
import { KeyRound } from 'lucide-react';
import { appStore } from '@/lib/store';

// Keys are created, scoped and revoked on the Developers page; this tab points there.
export const ApiKeysTab: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <section className="rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">
            <KeyRound size={12} />
            API access
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">API keys</h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Scoped, revocable keys for CI and scripts. Each key gets only the scopes you tick
            (history, simulate, execute) and is rate limited per key. The key is shown once, when you create it.
          </p>

          <button
            type="button"
            onClick={() => appStore.openTab('developers')}
            className="mt-5 px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-near-black hover:opacity-90"
          >
            Open the Developers page
          </button>
        </div>
      </section>
    </div>
  );
};
