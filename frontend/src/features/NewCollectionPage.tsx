import React, { useMemo, useState } from 'react';
import { Check, FolderOpen, Loader2, Save } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';

interface NewCollectionPageProps {
  tabId: string;
}

const NAME_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 280;

export const NewCollectionPage: React.FC<NewCollectionPageProps> = ({ tabId }) => {
  const { currentWorkspaceId, workspaces } = useAppStore();
  const [name, setName] = useState('New Collection');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const workspaceName = useMemo(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId)?.name ?? 'Current workspace',
    [currentWorkspaceId, workspaces]
  );

  const trimmedName = name.trim();
  const canSave = Boolean(trimmedName) && !isSaving && !savedId;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSave) return;

    setIsSaving(true);

    try {
      const collection = await appStore.createCollection(
        trimmedName,
        description.trim() || undefined
      );

      if (collection) {
        setSavedId(collection.id);
        appStore.renameTab(tabId, collection.name);
        appStore.showToast(`Collection "${collection.name}" created`, 'success');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-near-black p-6 md:p-10 custom-scrollbar">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-white/[0.06] pb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/[0.08] text-amber-300">
              <FolderOpen size={22} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">Create collection</h1>
              <p className="mt-1 text-sm text-slate-400">Set up the collection before it appears in the sidebar tree.</p>
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-dark-indigo-glow px-4 py-3 text-xs text-slate-400">
            <span className="block text-[10px] uppercase tracking-wider text-slate-500">Workspace</span>
            <span className="mt-1 block font-medium text-slate-200">{workspaceName}</span>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <section className="rounded-lg border border-white/[0.08] bg-dark-indigo-glow">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-100">Overview</h2>
              <p className="mt-1 text-xs text-slate-500">Name and describe the purpose of this collection.</p>
            </div>
            <div className="space-y-5 p-5">
              <div className="space-y-2">
                <label htmlFor="collection-name" className="block text-xs font-medium text-slate-400">Name</label>
                <input
                  id="collection-name"
                  value={name}
                  maxLength={NAME_MAX_LENGTH}
                  disabled={Boolean(savedId)}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-near-black px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-electric-violet/60 disabled:cursor-not-allowed disabled:text-slate-500"
                  placeholder="Collection name"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="collection-description" className="block text-xs font-medium text-slate-400">Description</label>
                <textarea
                  id="collection-description"
                  value={description}
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  disabled={Boolean(savedId)}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={6}
                  className="w-full resize-none rounded-lg border border-white/[0.08] bg-near-black px-3 py-2 text-sm leading-6 text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-electric-violet/60 disabled:cursor-not-allowed disabled:text-slate-500"
                  placeholder="What should this collection contain?"
                />
                <p className="text-[11px] text-slate-500">{description.length}/{DESCRIPTION_MAX_LENGTH}</p>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-white/[0.08] bg-dark-indigo-glow p-4">
              <h2 className="text-sm font-semibold text-slate-100">Collection metadata</h2>
              <dl className="mt-4 space-y-3 text-xs">
                <div>
                  <dt className="text-slate-500">Created by</dt>
                  <dd className="mt-1 text-slate-300">You</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Initial requests</dt>
                  <dd className="mt-1 text-slate-300">0</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Sidebar behavior</dt>
                  <dd className="mt-1 text-slate-300">Appears after save</dd>
                </div>
              </dl>
            </section>

            <button
              type="submit"
              disabled={!canSave}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-electric-violet px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-electric-violet/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : savedId ? <Check size={15} /> : <Save size={15} />}
              {savedId ? 'Collection saved' : isSaving ? 'Saving...' : 'Save collection'}
            </button>
          </aside>
        </form>
      </div>
    </div>
  );
};