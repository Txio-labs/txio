import { useEffect, useRef } from 'react';

/** Calls `onOutside` on a mouse press outside `ref`. Used by every shell dropdown. */
export function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
    const callback = useRef(onOutside);
    useEffect(() => {
        callback.current = onOutside;
    });
    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) callback.current();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [ref]);
}
