import React from 'react';

/**
 * Base skeleton block. Matches the app's muted-fill convention
 * (bg-slate-100/white-4% used for inert surfaces elsewhere) rather than a
 * generic gray, so it reads as "this app, loading" not a foreign component.
 * Composed shapes below cover the loading states that actually need one —
 * a bare spinner is fine for a single value or a button; a skeleton earns
 * its place once there's a real layout shape to preview.
 */
export const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className = '',
  style
}) => (
  <div
    role="presentation"
    aria-hidden="true"
    data-testid="skeleton"
    style={style}
    className={`animate-pulse rounded-md bg-slate-200/70 dark:bg-white/[0.08] ${className}`}
  />
);

/** A line of text at a given width — pass a % or fixed width. */
export const SkeletonText: React.FC<{ className?: string; width?: string }> = ({
  className = '',
  width = '100%'
}) => <Skeleton className={`h-3 rounded ${className}`} style={{ width }} />;

/** Stat-card shape: label line + a larger number line, matching AdminPage's StatCard. */
export const SkeletonStat: React.FC = () => (
  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-dark-indigo-glow px-4 py-3 min-w-0 space-y-2">
    <Skeleton className="h-2.5 w-16" />
    <Skeleton className="h-6 w-12" />
  </div>
);

/** One table row of skeleton cells, matching a real <tr>'s column count. */
export const SkeletonRow: React.FC<{ columns: number }> = ({ columns }) => (
  <tr>
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton className="h-3" style={{ width: i === 0 ? '70%' : '50%' }} />
      </td>
    ))}
  </tr>
);
