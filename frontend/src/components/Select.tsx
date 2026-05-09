
import React, { useState, useRef, useEffect } from 'react';
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
}

export const Select: React.FC<SelectProps> = ({ 
  value, 
  options, 
  onChange, 
  className = '', 
  placeholder,
  fullWidth = false,
  variant = 'default',
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<'bottom' | 'top'>('bottom');

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    // Auto-close on scroll to prevent detached menus
    const handleScroll = () => {
        if (isOpen) setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true); // Capture phase
    
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  // Check available space on open
  useEffect(() => {
      if (isOpen && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          if (spaceBelow < 200 && rect.top > 200) {
              setMenuPosition('top');
          } else {
              setMenuPosition('bottom');
          }
      }
  }, [isOpen]);

  const sizeClasses = {
    xs: 'px-2 py-1 text-[10px] min-h-[24px]',
    sm: 'px-2.5 py-1.5 text-xs min-h-[32px]',
    md: 'px-3 py-2 text-sm min-h-[38px]',
  };

  const variantClasses = {
    default: 'bg-[#0A0A0A] border border-white/10 text-slate-300 hover:border-white/20 hover:text-white shadow-sm',
    outline: 'bg-transparent border border-white/10 text-slate-400 hover:border-white/20 hover:text-white',
    ghost: 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-white',
    glass: 'bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20 backdrop-blur-md',
  };

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'inline-block min-w-[120px]'} ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between gap-2 rounded-lg font-medium transition-all duration-200 outline-none select-none
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${isOpen ? 'border-sui-500/50 ring-1 ring-sui-500/20 text-white z-20 relative' : ''}
          ${fullWidth ? 'w-full' : ''}
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
          className={`shrink-0 transition-transform duration-300 text-slate-500 ${isOpen ? 'rotate-180 text-sui-400' : ''}`} 
        />
      </button>

      {isOpen && (
        <div 
            className={`
                absolute z-[100] w-full min-w-[140px] p-1 bg-[#0c0c0e] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top
                ${menuPosition === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'}
                ${fullWidth ? '' : 'right-0'}
            `}
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
                    ? 'bg-white/10 text-sui-400 font-bold'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }
                `}
              >
                <div className="flex items-center gap-2 truncate">
                   {option.icon}
                   <span className="truncate">{option.label}</span>
                </div>
                {option.value === value && <Check size={12} className="text-sui-400 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Backdrop for mobile/safety to close on click outside if pure CSS */}
      {isOpen && <div className="fixed inset-0 z-[10] cursor-default" onClick={() => setIsOpen(false)}></div>}
    </div>
  );
};
