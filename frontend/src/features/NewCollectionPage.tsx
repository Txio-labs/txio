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
    <div className="h-full bg-near-black flex flex-col p-8 overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
          <div className="p-2 bg-electric-violet/10 rounded-lg">
            <FolderPlus size={24} className="text-electric-violet" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-200">New Collection</h1>
            <p className="text-sm text-slate-500">Create a new collection to organize your requests</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Collection Name <span className="text-red-400">*</span></label>
            <input 
              autoFocus
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-dark-indigo-glow/50 border border-white/10 rounded-lg px-4 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-violet/50 focus:ring-1 focus:ring-electric-violet/50 transition-all"
              placeholder="e.g., Core API, User Authentication"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-dark-indigo-glow/50 border border-white/10 rounded-lg px-4 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-violet/50 focus:ring-1 focus:ring-electric-violet/50 transition-all min-h-[120px] resize-y"
              placeholder="Optional description of what this collection is for..."
            />
          </div>
        </div>
        
        <div className="mt-8 flex justify-end gap-3">
          <button 
            onClick={() => appStore.closeTab(tabId)}
            className="px-6 py-2 bg-transparent hover:bg-white/5 text-slate-300 rounded-lg font-medium transition-colors border border-white/10"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSubmitting || !name.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-electric-violet hover:bg-electric-violet/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isSubmitting ? 'Saving...' : 'Save Collection'}
          </button>
        </div>
      </div>
    </div>
  );
};
