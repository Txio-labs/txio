import React from 'react';
import {
  KeyRound,
  Shield,
  Smartphone,
  Sparkles,
  RefreshCcw
} from 'lucide-react';
import { appStore } from '@/lib/store';

export const SecurityTab: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(127,196,227,0.12)_0%,rgba(0,49,82,0.96)_40%,rgba(0,27,46,1)_100%)] p-6">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-electric-violet/15 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-electric-violet/20 bg-electric-violet/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-electric-violet">
            <Shield size={12} />
            Security Layer
          </div>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
            Harden the account surface.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            Review identity protection, recovery posture, and session handling
            before they become problems in production.
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-[1.75rem] border border-white/10 bg-[#003152]/85 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-400">
              <Smartphone size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                Two-factor authentication
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                2FA is currently disabled. Enable a second checkpoint before
                expanding access to more operators.
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              appStore.showToast('2FA setup not implemented yet', 'info')
            }
            className="mt-5 w-full rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-amber-300 transition-colors hover:bg-amber-500/15"
          >
            Enable 2FA
          </button>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-[#003152]/85 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-electric-violet/10 p-3 text-electric-violet">
              <KeyRound size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                Password rotation
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Keep credential lifetime short and rotate keys before your
                environment becomes sticky.
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              appStore.showToast(
                'Password rotation flow not implemented yet',
                'info'
              )
            }
            className="mt-5 w-full rounded-2xl bg-electric-violet px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white shadow-[0_18px_35px_-20px_rgba(173,223,241,0.8)] transition-colors hover:bg-soft-purple"
          >
            Rotate Password
          </button>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-[#003152]/85 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400">
              <RefreshCcw size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                Session review
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Audit active surfaces and revoke stale sessions when operators
                or devices change.
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              appStore.showToast(
                'Session review not implemented yet',
                'info'
              )
            }
            className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-300 transition-colors hover:bg-white/[0.07]"
          >
            Review Sessions
          </button>
        </div>
      </div>

      <section className="rounded-[1.75rem] border border-white/10 bg-[#003152]/85 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-soft-purple/10 p-3 text-soft-purple">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              Recommended next step
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Turn on 2FA first. It gives the biggest security gain with the
              least friction for this workspace state.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
