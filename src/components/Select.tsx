
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  fullWidth?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'glass';
  size?: 'xs' | 'sm' | 'md';
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  value,
  options,
  onChange,
  className = '',
  placeholder,
  fullWidth = false,
  variant = 'default',
  size = 'md',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Rendered through a portal (see menuRect below): a plain `absolute` menu
  // gets clipped by any scrolling/overflow-hidden ancestor between it and
  // the viewport (the request panel's scroll area, the terminal panel,
  // etc.) instead of just flipping above the trigger when there's no room.
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);

  const selectedOption = options.find(o => o.value === value);

  const updateMenuRect = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 140);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 200 && rect.top > 200;
    setMenuRect({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: fullWidth ? rect.left : Math.max(8, rect.right - menuWidth),
      width: menuWidth,
      openUp
    });
  }, [fullWidth]);

  useEffect(() => {
    if (!isOpen) return;
    updateMenuRect();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', updateMenuRect, true); // Capture phase — tracks the trigger through any scrolling ancestor.
    window.addEventListener('resize', updateMenuRect);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updateMenuRect, true);
      window.removeEventListener('resize', updateMenuRect);
    };
  }, [isOpen, updateMenuRect]);

  const sizeClasses = {
    xs: 'px-2 py-1 text-[10px] min-h-[24px]',
    sm: 'px-2.5 py-1.5 text-xs min-h-[32px]',
    md: 'px-3 py-2 text-sm min-h-[38px]',
  };

  const variantClasses = {
    default: 'bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:text-white shadow-sm',
    outline: 'bg-transparent border border-slate-200 dark:border-white/10 text-slate-400 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:text-white',
    ghost: 'bg-transparent border-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:text-white',
    glass: 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 backdrop-blur-md',
  };

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'inline-block min-w-[120px]'} ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between gap-2 rounded-lg font-medium transition-all duration-200 outline-none select-none
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${isOpen ? 'border-electric-violet/50 ring-1 ring-electric-violet/20 text-slate-900 dark:text-white z-20 relative' : ''}
          ${fullWidth ? 'w-full' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed grayscale-[0.5]' : ''}
        `}
      >
        <div className="flex items-center gap-2 truncate flex-1">
          {selectedOption?.icon}
          <span className={`truncate ${selectedOption ? '' : 'opacity-50 italic font-normal'}`}>
            {selectedOption?.label || placeholder || 'Select...'}
          </span>
        </div>
        <ChevronDown
          size={size === 'xs' ? 12 : 14}
          className={`shrink-0 transition-transform duration-300 text-slate-500 ${isOpen ? 'rotate-180 text-electric-violet' : ''}`}
        />
      </button>

      {isOpen && menuRect && createPortal(
        <>
          {/* Backdrop for mobile/safety to close on click outside if pure CSS */}
          <button className="fixed inset-0 z-[100] cursor-default" onClick={() => setIsOpen(false)} tabIndex={-1} aria-hidden="true"></button>
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuRect.openUp ? undefined : menuRect.top,
              bottom: menuRect.openUp ? window.innerHeight - menuRect.top : undefined,
              left: menuRect.left,
              width: menuRect.width
            }}
            className="z-[101] p-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-2.5 py-1.5 text-left rounded-lg transition-colors group
                    ${size === 'xs' ? 'text-[10px]' : 'text-xs'}
                    ${option.value === value
                      ? 'bg-slate-100 dark:bg-white/10 text-electric-violet font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 truncate">
                     {option.icon}
                     <span className="truncate">{option.label}</span>
                  </div>
                  {option.value === value && <Check size={12} className="text-electric-violet shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
