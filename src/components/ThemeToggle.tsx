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
      className={`p-2.5 rounded-[10px] border transition-all active:scale-95 ${
        isDark
          ? 'border-line text-fg-subtle hover:text-fg hover:border-line-strong hover:bg-hover'
          : 'border-line text-fg-subtle hover:text-fg hover:border-line-strong hover:bg-hover'
      } ${className}`}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
};
