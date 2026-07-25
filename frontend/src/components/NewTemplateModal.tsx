import React, { useState } from 'react';
import { FileCode, X } from 'lucide-react';

export interface NewTemplateInput {
  title: string;
  type: string;
  description: string;
}

interface NewTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: NewTemplateInput) => void;
  isSubmitting?: boolean;
}

const RECIPE_TYPES = ['PTB', 'MoveCall', 'Publish'];

export const NewTemplateModal: React.FC<NewTemplateModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isSubmitting
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState(RECIPE_TYPES[0]);
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setTitle('');
    setType(RECIPE_TYPES[0]);
    setDescription('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = () => {
    onCreate({ title: title.trim(), type, description: description.trim() });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/70 dark:bg-near-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0c0c0e] border border-slate-200 dark:border-white/5 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sui-500 to-transparent opacity-50" />

        <div className="p-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-dark-indigo-glow rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-center shrink-0">
                <FileCode size={18} className="text-electric-violet" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">New Template</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Save a reusable transaction recipe for this workspace.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Name
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Batch Coin Transfer"
            autoFocus
            className="w-full bg-black/40 border border-slate-200 dark:border-white/5 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-violet/50"
          />

          <label className="block text-[10px] font-bold uppercase text-slate-500 mt-4 mb-1">
            Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {RECIPE_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                  type === t
                    ? 'bg-electric-violet/20 border-electric-violet/50 text-white'
                    : 'bg-black/20 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <label className="block text-[10px] font-bold uppercase text-slate-500 mt-4 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this template do?"
            rows={3}
            className="w-full bg-black/40 border border-slate-200 dark:border-white/5 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-violet/50 resize-none"
          />

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={handleClose}
              className="px-4 py-3 bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white text-xs font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || isSubmitting}
              className="px-4 py-3 bg-electric-violet hover:bg-electric-violet disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-sui-900/20 transition-all active:scale-95"
            >
              {isSubmitting ? 'Creating…' : 'Create Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};