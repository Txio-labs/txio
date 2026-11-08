import React, { useState } from 'react';
import { FolderPlus, Save } from 'lucide-react';
import { appStore } from '@/lib/store';

interface NewCollectionPageProps {
  tabId: string;
}

export const NewCollectionPage: React.FC<NewCollectionPageProps> = ({ tabId }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      appStore.showToast('Collection name is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await appStore.createCollection(name.trim(), description.trim() || undefined);
      appStore.closeTab(tabId);
    } catch (e: any) {
      // Error is handled in store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full bg-surface flex flex-col p-8 overflow-y-auto">
      <div className="w-full">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-line">
          <div className="p-2 bg-hover rounded-lg">
            <FolderPlus size={24} className="text-fg" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-fg">New Collection</h1>
            <p className="text-sm text-fg-subtle">Create a new collection to organize your requests</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-fg-muted mb-2">Collection Name <span className="text-red-500 dark:text-red-400">*</span></label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-sunken border border-line rounded-lg px-4 py-2 text-fg placeholder:text-fg-subtle focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-line transition-all"
              placeholder="e.g., Core API, User Authentication"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-muted mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-sunken border border-line rounded-lg px-4 py-2 text-fg placeholder:text-fg-subtle focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-line transition-all min-h-[120px] resize-y"
              placeholder="Optional description of what this collection is for..."
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={() => appStore.closeTab(tabId)}
            className="px-6 py-2 bg-transparent hover:bg-hover text-fg-muted rounded-lg font-medium transition-colors border border-line"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSubmitting || !name.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-inverse hover:opacity-90 text-on-inverse rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isSubmitting ? 'Saving...' : 'Save Collection'}
          </button>
        </div>
      </div>
    </div>
  );
};
