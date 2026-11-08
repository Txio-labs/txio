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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-elevated border border-line rounded-card shadow-card w-full max-w-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-fg-subtle to-transparent opacity-50" />

        <div className="p-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-elevated rounded-[10px] border border-line flex items-center justify-center shrink-0">
                <FileCode size={18} className="text-fg" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-fg">New Template</h2>
                <p className="text-xs text-fg-subtle mt-0.5">
                  Save a reusable transaction recipe for this workspace.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-fg-subtle hover:text-fg transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <label className="block text-[12px] font-semibold uppercase text-fg-subtle mb-1">
            Name
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Batch Coin Transfer"
            autoFocus
            className="w-full bg-surface border border-line rounded-lg p-2.5 text-xs text-fg placeholder:text-fg-subtle focus:outline-none focus:border-line-strong"
          />

          <label className="block text-[12px] font-semibold uppercase text-fg-subtle mt-4 mb-1">
            Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {RECIPE_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                  type === t
                    ? 'bg-active border-line-strong text-white'
                    : 'bg-canvas border-line text-fg-subtle hover:text-fg'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <label className="block text-[12px] font-semibold uppercase text-fg-subtle mt-4 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this template do?"
            rows={3}
            className="w-full bg-surface border border-line rounded-lg p-2.5 text-xs text-fg placeholder:text-fg-subtle focus:outline-none focus:border-line-strong resize-none"
          />

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={handleClose}
              className="px-4 py-3 bg-elevated border border-line hover:bg-hover text-fg-subtle hover:text-fg text-xs font-semibold rounded-[10px] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || isSubmitting}
              className="px-4 py-3 bg-inverse hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-on-inverse text-xs font-semibold rounded-[10px] shadow-card transition-all"
            >
              {isSubmitting ? 'Creating…' : 'Create Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};