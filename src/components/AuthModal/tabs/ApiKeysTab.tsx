import React from 'react';
import { KeyRound, Construction, AlertTriangle } from 'lucide-react';

export const ApiKeysTab: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(163,163,163,0.15)_0%,rgba(24,24,27,0.96)_40%,rgba(10,10,10,1)_100%)] p-6">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-soft-purple/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-electric-violet/20 bg-electric-violet/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-electric-violet">
              <KeyRound size={12} />
              Cloud Access
            </div>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
              Control token-based access cleanly.
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Generate, revoke, and retire keys without losing visibility into
              how your workspace is exposed to external systems.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-[#18181b]/85 p-5">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Construction size={14} className="text-amber-400"/> API Key Management
        </h3>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <AlertTriangle size={14} className="text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-slate-400 leading-relaxed">
              API key management is not yet available. This feature will allow you to generate scoped keys for CI, backend automation, and external integrations to securely access txio Cloud.
            </p>
          </div>
        </div>
      </section>
      
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Coming Soon</h3>
        <div className="border border-white/10 bg-white/[0.02] rounded-lg p-3 opacity-60">
          <div className="text-xs text-slate-400">Secure key generation & hashing</div>
        </div>
        <div className="border border-white/10 bg-white/[0.02] rounded-lg p-3 opacity-60">
          <div className="text-xs text-slate-400">Granular scope controls</div>
        </div>
        <div className="border border-white/10 bg-white/[0.02] rounded-lg p-3 opacity-60">
          <div className="text-xs text-slate-400">Key rotation and revocation</div>
        </div>
        <div className="border border-white/10 bg-white/[0.02] rounded-lg p-3 opacity-60">
          <div className="text-xs text-slate-400">Usage monitoring and limits</div>
        </div>
      </div>
    </div>
  );
};