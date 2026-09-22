import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => appStore.updateSettings({ theme: isDark ? 'light' : 'dark' })}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
        isDark
          ? 'border-white/10 text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/5'
          : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-100'
      } ${className}`}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
};
