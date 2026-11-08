import React, { useEffect, useRef, useState } from 'react';
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
  // Tracks whether `value` has been reset for the current open. Adjusting
  // state during render (rather than in an effect) is React's documented
  // pattern for resetting state in response to a prop change — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [resetForOpen, setResetForOpen] = useState(false);

  if (isOpen && !resetForOpen) {
    setResetForOpen(true);
    if (value !== initialValue) setValue(initialValue);
  } else if (!isOpen && resetForOpen) {
    setResetForOpen(false);
  }

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-elevated border border-line rounded-card shadow-card w-full max-w-xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-fg-subtle to-transparent opacity-50" />

        <div className="p-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="w-10 h-10 bg-elevated rounded-[10px] border border-line flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-fg" />
                </div>
              )}
              <div>
                <h2 className="text-sm font-semibold text-fg">{title}</h2>
                {description && <p className="text-xs text-fg-subtle mt-0.5">{description}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-fg-subtle hover:text-fg transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <label className="block text-[12px] font-semibold uppercase text-fg-subtle mb-1">{label}</label>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') onClose();
            }}
            placeholder={placeholder}
            autoFocus
            className="w-full bg-surface border border-line rounded-lg p-2.5 text-xs text-fg placeholder:text-fg-subtle focus:outline-none focus:border-line-strong"
          />

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-3 bg-elevated border border-line hover:bg-hover text-fg-subtle hover:text-fg text-xs font-semibold rounded-[10px] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="px-4 py-3 bg-inverse hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-on-inverse text-xs font-semibold rounded-[10px] shadow-card transition-all"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
