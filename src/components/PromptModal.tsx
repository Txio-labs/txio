import React, { useEffect, useState } from 'react';
import { LucideIcon, X } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  icon?: LucideIcon;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  title,
  description,
  label,
  placeholder,
  initialValue = '',
  confirmLabel = 'Save',
  icon: Icon,
  onClose,
  onSubmit
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setValue(initialValue);
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/70 dark:bg-near-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/5 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-electric-violet to-transparent opacity-50" />

        <div className="p-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="w-10 h-10 bg-white dark:bg-dark-indigo-glow rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-electric-violet" />
                </div>
              )}
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
                {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-900 dark:text-white transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{label}</label>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') onClose();
            }}
            placeholder={placeholder}
            autoFocus
            className="w-full bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/5 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-violet/50"
          />

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-3 bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-900 dark:text-white text-xs font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="px-4 py-3 bg-slate-900 dark:bg-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-near-black text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
