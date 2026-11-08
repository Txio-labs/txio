import React, { useId } from 'react';

/**
 * The Txio mark: four rounded petals forming an X, in the brand's blue gradient.
 * Vector with a transparent background, so it reads on light and dark surfaces.
 */
export function TxioMark({ size = 20, className }: { size?: number; className?: string }) {
    const id = useId().replace(/:/g, '');
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
            <defs>
                <linearGradient id={`txg-${id}`} x1="18" y1="18" x2="84" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#7dd8fb" />
                    <stop offset="0.5" stopColor="#3f9bf2" />
                    <stop offset="1" stopColor="#1647d4" />
                </linearGradient>
            </defs>
            <g fill={`url(#txg-${id})`} stroke={`url(#txg-${id})`} strokeWidth="7" strokeLinejoin="round">
                <polygon points="23,22 36,22 47,36 39,44" />
                <polygon points="65,22 78,22 64,44 52,44" />
                <polygon points="23,77 36,77 47,63 39,55" />
                <polygon points="65,77 78,77 64,55 52,55" />
            </g>
        </svg>
    );
}

/** Mark plus wordmark. */
export function TxioLogo({ size = 22, className, wordmark = true }: { size?: number; className?: string; wordmark?: boolean }) {
    return (
        <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
            <TxioMark size={size} />
            {wordmark && <span className="text-[16px] font-semibold tracking-[-0.03em] text-fg">txio</span>}
        </span>
    );
}
