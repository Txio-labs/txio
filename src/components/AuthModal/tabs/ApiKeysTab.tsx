import React from 'react';
import { KeyRound } from 'lucide-react';
import { appStore } from '@/lib/store';

// Keys are created, scoped and revoked on the Developers page; this tab points there.
export const ApiKeysTab: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <section className="rounded-panel border border-line bg-sunken p-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1 text-[12px] font-semibold text-fg-subtle">
            <KeyRound size={12} />
            API access
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-fg">API keys</h2>

          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Scoped, revocable keys for CI and scripts. Each key gets only the scopes you tick
            (history, simulate, execute) and is rate limited per key. The key is shown once, when you create it.
          </p>

          <button
            type="button"
            onClick={() => appStore.openTab('developers')}
            className="mt-5 px-4 py-2 text-xs font-semibold rounded-lg bg-inverse text-on-inverse hover:opacity-90"
          >
            Open the Developers page
          </button>
        </div>
      </section>
    </div>
  );
};
