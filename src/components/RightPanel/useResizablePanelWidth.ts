import { useCallback, useRef, useState } from 'react';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Drag-to-resize width for a panel anchored to the right edge of the screen
 * (dragging its left border). Persists the chosen width per storageKey so it
 * survives reloads; falls back silently if storage is unavailable.
 */
export function useResizablePanelWidth({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
}: {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
}) {
  const [width, setWidth] = useState(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      const parsed = saved ? Number(saved) : NaN;
      if (Number.isFinite(parsed)) {
        return clamp(parsed, minWidth, maxWidth);
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — fall back to default
    }
    return defaultWidth;
  });
  const isDraggingRef = useRef(false);

  const persist = useCallback((next: number) => {
    try {
      window.localStorage.setItem(storageKey, String(next));
    } catch {
      // ignore
    }
  }, [storageKey]);

  const startDragging = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const startX = e.clientX;
    const startWidth = width;

    const handleMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;
      // Panel is anchored to the right, so dragging left (negative delta) grows it.
      const delta = startX - moveEvent.clientX;
      setWidth(clamp(startWidth + delta, minWidth, maxWidth));
    };

    const handleUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      setWidth((current) => {
        persist(current);
        return current;
      });
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [width, minWidth, maxWidth, persist]);

  const resetWidth = useCallback(() => {
    setWidth(defaultWidth);
    persist(defaultWidth);
  }, [defaultWidth, persist]);

  return { width, startDragging, resetWidth };
}
