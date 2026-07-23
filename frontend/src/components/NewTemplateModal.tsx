import React, { useState } from 'react';
import { FileCode, X } from 'lucide-react';
import { RecipeTemplateType } from '@/types';

interface NewTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, type: RecipeTemplateType) => Promise<void>;
}

const TEMPLATE_TYPES: RecipeTemplateType[] = ['PTB', 'MoveCall', 'Publish'];

export const NewTemplateModal: React.FC<NewTemplateModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<RecipeTemplateType>('PTB');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setTitle('');
    setType('PTB');
    setError(null);
    onClose();
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await onCreate(title.trim(), type);
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Could not create the template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-near-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sui-500 to-transparent opacity-50" />

        <div className="p-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-dark-indigo-glow rounded-xl border border-white/5 flex items-center justify-center shrink-0">
                <FileCode size={18} className="text-electric-violet" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">New Template</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Save a starting point for future transaction recipes.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-500 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="template-title" className="text-xs font-bold text-slate-500 uppercase">
                Title
              </label>
              <input
                id="template-title"
                type="text"
                autoFocus
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Transfer Coins"
                className="mt-1 w-full bg-black/40 border border-white/5 rounded-lg py-2.5 px-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-violet/50"
              />
            </div>

            <div>
              <label htmlFor="template-type" className="text-xs font-bold text-slate-500 uppercase">
                Type
              </label>
              <select
                id="template-type"
                value={type}
                onChange={(e) => setType(e.target.value as RecipeTemplateType)}
                className="mt-1 w-full bg-black/40 border border-white/5 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-electric-violet/50"
              >
                {TEMPLATE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-3 text-xs text-red-400 bg-red-900/10 border border-red-900/30 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={handleClose}
              className="px-4 py-3 bg-dark-indigo-glow border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || isSaving}
              className="px-4 py-3 bg-electric-violet hover:bg-electric-violet disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-sui-900/20 transition-all active:scale-95"
            >
              {isSaving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
