'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

export const ThemeSync = () => {
    const { theme } = useAppStore();

    useEffect(() => {
        document.documentElement.classList.toggle(
            'dark',
            theme === 'dark'
        );
        document.documentElement.style.colorScheme =
            theme;
    }, [theme]);

    return null;
};
