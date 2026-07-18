import React, { useState } from 'react';
import {
  Plus,
  AlertCircle,
  Trash2,
  Copy,
  Check,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { ApiKey } from '../types';

interface ApiKeysTabProps {
  apiKeys: ApiKey[];
  onApiKeysChange: (keys: ApiKey[]) => void;
}

export const ApiKeysTab: React.FC<ApiKeysTabProps> = ({
  apiKeys,
  onApiKeysChange
}) => {
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCreateKey = () => {
    const rawKey = `sui_sk_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2)}`;
    const newKey: ApiKey = {
      id: Math.random().toString(),
      name: newKeyName || 'Untitled Key',
      prefix: `${rawKey.substring(0, 12)}...${rawKey.substring(rawKey.length - 4)}`,
      created: Date.now(),
      lastUsed: 'Never',
      status: 'active'
    };

    onApiKeysChange([newKey, ...apiKeys]);
    setGeneratedKey(rawKey);
    setNewKeyName('');
    setIsCreatingKey(false);
  };

  const handleRevokeKey = (id: string) => {
    onApiKeysChange(
      apiKeys.map((key) =>
        key.id === id
          ? { ...key, status: 'revoked' }
          : key
      )
    );
  };

  const handleDeleteKey = (id: string) => {
    onApiKeysChange(
      apiKeys.filter((key) => key.id !== id)
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(173,223,241,0.15)_0%,rgba(0,49,82,0.96)_40%,rgba(0,27,46,1)_100%)] p-6">
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

          <button
            onClick={() => setIsCreatingKey(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-electric-violet px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white shadow-[0_18px_35px_-20px_rgba(173,223,241,0.8)] transition-colors hover:bg-soft-purple"
          >
            <Plus size={14} />
            Create Key
          </button>
        </div>
      </section>

      {generatedKey && (
        <section className="rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/10 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <Check size={16} />
            Key generated successfully
          </div>
          <p className="mt-2 text-xs leading-relaxed text-emerald-100/75">
            Copy this key now. It will not be shown again after you dismiss this
            panel.
          </p>
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <code className="flex-1 break-all rounded-2xl border border-emerald-500/20 bg-black/20 px-4 py-3 font-mono text-xs text-emerald-100">
              {generatedKey}
            </code>
            <button
              onClick={() => copyToClipboard(generatedKey)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200 transition-colors hover:bg-emerald-500/15"
            >
              {copiedKey ? <Check size={14} /> : <Copy size={14} />}
              {copiedKey ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button
            onClick={() => setGeneratedKey(null)}
            className="mt-4 text-[11px] font-semibold text-emerald-200/80 underline underline-offset-4"
          >
            Dismiss
          </button>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          {apiKeys.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-electric-violet/10 text-electric-violet">
                <Sparkles size={26} />
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">
                No API keys yet
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                Create a scoped key when you need CI, backend automation, or an
                external integration to reach txio Cloud.
              </p>
            </div>
          ) : (
            apiKeys.map((key) => (
              <div
                key={key.id}
                className="rounded-[1.75rem] border border-white/10 bg-[#003152]/85 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {key.name}
                    </div>
                    <div className="mt-2 rounded-2xl border border-white/10 bg-near-black/60 px-4 py-3 font-mono text-xs text-slate-300">
                      {key.prefix}
                    </div>
                  </div>

                  <span
                    className={`inline-flex self-start rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                      key.status === 'active'
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border-white/10 bg-white/[0.04] text-slate-400'
                    }`}
                  >
                    {key.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-4 border-t border-white/5 pt-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-6 text-xs text-slate-500">
                    <div>
                      Created
                      <div className="mt-1 text-slate-300">
                        {new Date(key.created).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      Last used
                      <div className="mt-1 text-slate-300">
                        {key.lastUsed}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {key.status === 'active' && (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-300 transition-colors hover:bg-amber-500/15"
                      >
                        <AlertCircle size={14} />
                        Revoke
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300 transition-colors hover:bg-red-500/15"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-[#003152]/85 p-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-600">
            New token
          </div>
          <h3 className="mt-3 text-xl font-bold text-white">
            Generate a fresh key
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Use clear naming so you know whether a token belongs to CI, a local
            script, or a deployed backend worker.
          </p>

          {isCreatingKey ? (
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  Key name
                </label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-near-black/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-electric-violet"
                  placeholder="e.g. production-ci"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsCreatingKey(false)}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 transition-colors hover:bg-white/[0.07]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateKey}
                  disabled={!newKeyName.trim()}
                  className="flex-1 rounded-2xl bg-electric-violet px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-soft-purple disabled:opacity-50"
                >
                  Generate
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingKey(true)}
              className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 transition-colors hover:bg-white/[0.07]"
            >
              Start creation
            </button>
          )}
        </section>
      </div>
    </div>
  );
};
