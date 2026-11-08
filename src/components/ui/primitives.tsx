'use client';

/*
 * Txio UI primitives. Every screen builds on these so spacing, radii, type and
 * states stay identical across the app. Colors come from the semantic tokens in
 * globals.css (canvas / surface / elevated / line / fg), so both themes work.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export function cx(...parts: Array<string | false | null | undefined>): string {
    return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ Button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
    primary:
        'bg-inverse text-on-inverse hover:opacity-90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] disabled:opacity-40',
    secondary:
        'bg-surface text-fg border border-line hover:border-line-strong hover:bg-hover shadow-card disabled:opacity-50',
    outline:
        'bg-transparent text-fg border border-line-strong hover:bg-hover disabled:opacity-50',
    ghost: 'bg-transparent text-fg-muted hover:text-fg hover:bg-hover disabled:opacity-40',
    danger:
        'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/15 disabled:opacity-50',
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
    xs: 'h-6 px-2 text-[12px] gap-1 rounded-md',
    sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-[7px]',
    md: 'h-8 px-3 text-[14px] gap-2 rounded-control',
    lg: 'h-10 px-4 text-sm gap-2 rounded-[10px]',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
    trailing?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant = 'secondary', size = 'md', loading, icon, trailing, className, children, disabled, type = 'button', ...rest },
    ref
) {
    return (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            className={cx(
                'inline-flex items-center justify-center font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,opacity] duration-150 disabled:cursor-not-allowed',
                BUTTON_VARIANT[variant],
                BUTTON_SIZE[size],
                className
            )}
            {...rest}
        >
            {loading ? <Loader2 size={size === 'lg' ? 16 : 14} className="animate-spin" /> : icon}
            {children}
            {trailing}
        </button>
    );
});

export const IconButton = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean; size?: 'sm' | 'md' }
>(function IconButton({ label, active, size = 'md', className, children, type = 'button', ...rest }, ref) {
    return (
        <button
            ref={ref}
            type={type}
            aria-label={label}
            title={label}
            className={cx(
                'inline-flex items-center justify-center rounded-[7px] transition-colors shrink-0 disabled:opacity-40',
                size === 'sm' ? 'h-6 w-6' : 'h-8 w-8',
                active ? 'bg-active text-fg' : 'text-fg-subtle hover:text-fg hover:bg-hover',
                className
            )}
            {...rest}
        >
            {children}
        </button>
    );
});

/* ------------------------------------------------------------------ Inputs */

export const inputClass =
    'w-full h-8 rounded-control bg-surface border border-line px-2.5 text-[14px] text-fg placeholder:text-fg-subtle outline-none transition-[border-color,box-shadow] hover:border-line-strong focus:border-line-strong focus:ring-4 focus:ring-[var(--hover)] disabled:opacity-50';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }>(
    function Input({ className, mono, ...rest }, ref) {
        return <input ref={ref} className={cx(inputClass, mono && 'font-mono text-xs', className)} {...rest} />;
    }
);

export const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement> & { mono?: boolean }
>(function Textarea({ className, mono, ...rest }, ref) {
    return (
        <textarea
            ref={ref}
            className={cx(inputClass, 'h-auto py-2 leading-relaxed resize-y', mono && 'font-mono text-xs', className)}
            {...rest}
        />
    );
});

export function Field({
    label,
    hint,
    error,
    htmlFor,
    children,
    className,
    aside,
}: {
    label?: React.ReactNode;
    hint?: React.ReactNode;
    error?: React.ReactNode;
    htmlFor?: string;
    aside?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cx('flex flex-col gap-1.5', className)}>
            {(label || aside) && (
                <div className="flex items-center justify-between gap-2">
                    {label && (
                        <label htmlFor={htmlFor} className="text-xs font-medium text-fg-muted">
                            {label}
                        </label>
                    )}
                    {aside}
                </div>
            )}
            {children}
            {error ? (
                <p className="text-xs text-red-500">{error}</p>
            ) : hint ? (
                <p className="text-xs text-fg-subtle">{hint}</p>
            ) : null}
        </div>
    );
}

/* -------------------------------------------------------------------- Card */

export function Card({
    className,
    children,
    interactive,
    as: Tag = 'div',
    ...rest
}: React.HTMLAttributes<HTMLElement> & { interactive?: boolean; as?: 'div' | 'section' | 'article' | 'button' | 'li' }) {
    const Comp = Tag as React.ElementType;
    return (
        <Comp
            className={cx(
                'rounded-card border border-line bg-surface shadow-card',
                interactive && 'transition-colors hover:border-line-strong hover:bg-hover text-left',
                className
            )}
            {...rest}
        >
            {children}
        </Comp>
    );
}

export function CardHeader({
    title,
    description,
    icon,
    actions,
    className,
}: {
    title: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cx('flex items-start justify-between gap-3 px-4 pt-3.5 pb-3 border-b border-line', className)}>
            <div className="flex items-start gap-2.5 min-w-0">
                {icon && <span className="mt-0.5 text-fg-subtle shrink-0">{icon}</span>}
                <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold text-fg tracking-tight truncate">{title}</h3>
                    {description && <p className="text-xs text-fg-subtle mt-0.5">{description}</p>}
                </div>
            </div>
            {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </div>
    );
}

/* ------------------------------------------------------------ Badge & dots */

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'local';

const TONE_BADGE: Record<Tone, string> = {
    neutral: 'bg-hover text-fg-muted border-line',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    local: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20',
};

const TONE_DOT: Record<Tone, string> = {
    neutral: 'bg-fg-subtle',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-red-500',
    info: 'bg-sky-500',
    local: 'bg-fuchsia-400',
};

export function Badge({
    tone = 'neutral',
    children,
    className,
    dot,
    mono,
}: {
    tone?: Tone;
    children: React.ReactNode;
    className?: string;
    dot?: boolean;
    mono?: boolean;
}) {
    return (
        <span
            className={cx(
                'inline-flex items-center gap-1.5 h-5 px-1.5 rounded-md border text-[12px] font-medium whitespace-nowrap',
                mono && 'font-mono text-[12px]',
                TONE_BADGE[tone],
                className
            )}
        >
            {dot && <span className={cx('h-1.5 w-1.5 rounded-full', TONE_DOT[tone])} />}
            {children}
        </span>
    );
}

export function StatusDot({ tone = 'neutral', pulse, className }: { tone?: Tone; pulse?: boolean; className?: string }) {
    return (
        <span className={cx('relative inline-flex h-2 w-2 shrink-0', className)}>
            {pulse && <span className={cx('absolute inset-0 rounded-full opacity-60 animate-ping', TONE_DOT[tone])} />}
            <span className={cx('relative inline-flex h-2 w-2 rounded-full', TONE_DOT[tone])} />
        </span>
    );
}

/** Network name to status tone: mainnet is live, testnet warns, devnet informs, localnet is local. */
export function networkTone(network?: string | null): Tone {
    const n = (network || '').toLowerCase();
    if (n.includes('main')) return 'success';
    if (n.includes('test') || n.includes('sepolia') || n.includes('holesky')) return 'warning';
    if (n.includes('dev')) return 'info';
    if (n.includes('local')) return 'local';
    return 'neutral';
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <kbd
            className={cx(
                'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-[5px] border border-line bg-sunken text-[12px] font-medium text-fg-subtle font-sans',
                className
            )}
        >
            {children}
        </kbd>
    );
}

/* ------------------------------------------------------------- Page layout */

/** Scrollable page inside the workspace frame. */
export function Page({ children, className, width = 'default' }: { children: React.ReactNode; className?: string; width?: 'default' | 'wide' | 'narrow' | 'full' }) {
    // Every page uses the full width of the workspace frame; `width` is kept for callers.
    void width;
    return (
        <div className="h-full overflow-y-auto custom-scrollbar">
            <div className={cx('w-full px-5 md:px-8 2xl:px-12 py-6 md:py-8', className)}>{children}</div>
        </div>
    );
}

export function PageHeader({
    eyebrow,
    title,
    description,
    actions,
    icon,
    className,
}: {
    eyebrow?: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
}) {
    return (
        <header className={cx('flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6 md:mb-8', className)}>
            <div className="min-w-0 flex items-start gap-3.5">
                {icon && (
                    <div className="h-10 w-10 rounded-[10px] border border-line bg-surface shadow-card flex items-center justify-center text-fg-muted shrink-0">
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                    {eyebrow && <div className="text-[12px] font-medium text-fg-subtle mb-1.5 flex items-center gap-1.5">{eyebrow}</div>}
                    <h1 className="text-[22px] md:text-2xl font-semibold tracking-[-0.03em] text-fg">{title}</h1>
                    {description && <p className="mt-1.5 text-[14px] text-fg-muted max-w-2xl leading-relaxed">{description}</p>}
                </div>
            </div>
            {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
        </header>
    );
}

export function SectionTitle({
    children,
    actions,
    className,
    count,
}: {
    children: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
    count?: number;
}) {
    return (
        <div className={cx('flex items-center justify-between gap-3 mb-3', className)}>
            <h2 className="text-[14px] font-semibold text-fg tracking-tight flex items-center gap-2">
                {children}
                {typeof count === 'number' && <span className="text-fg-subtle font-normal tabular">{count}</span>}
            </h2>
            {actions && <div className="flex items-center gap-1.5">{actions}</div>}
        </div>
    );
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
    compact,
}: {
    icon?: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
    compact?: boolean;
}) {
    return (
        <div
            className={cx(
                'flex flex-col items-center justify-center text-center rounded-card border border-dashed border-line-strong',
                compact ? 'py-8 px-4' : 'py-14 px-6',
                className
            )}
        >
            {icon && (
                <div className="mb-3 h-10 w-10 rounded-[10px] border border-line bg-surface shadow-card flex items-center justify-center text-fg-subtle">
                    {icon}
                </div>
            )}
            <p className="text-[14px] font-medium text-fg">{title}</p>
            {description && <p className="mt-1 text-xs text-fg-subtle max-w-sm leading-relaxed">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

/* -------------------------------------------------------------- Segmented */

export function Segmented<T extends string>({
    value,
    onChange,
    options,
    size = 'md',
    className,
}: {
    value: T;
    onChange: (v: T) => void;
    options: Array<{ value: T; label: React.ReactNode; icon?: React.ReactNode }>;
    size?: 'sm' | 'md';
    className?: string;
}) {
    return (
        <div
            role="tablist"
            className={cx('inline-flex items-center p-0.5 rounded-[9px] bg-hover border border-line gap-0.5', className)}
        >
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(o.value)}
                        className={cx(
                            'inline-flex items-center gap-1.5 rounded-[7px] font-medium transition-colors whitespace-nowrap',
                            size === 'sm' ? 'h-6 px-2 text-[12px]' : 'h-7 px-2.5 text-xs',
                            active ? 'bg-surface text-fg shadow-[0_1px_2px_rgba(0,0,0,0.12)] border border-line' : 'text-fg-subtle hover:text-fg border border-transparent'
                        )}
                    >
                        {o.icon}
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/* ------------------------------------------------------------------- Misc */

export function Spinner({ size = 14, className }: { size?: number; className?: string }) {
    return <Loader2 size={size} className={cx('animate-spin text-fg-subtle', className)} />;
}

export function Divider({ className, vertical }: { className?: string; vertical?: boolean }) {
    return vertical ? (
        <span className={cx('w-px self-stretch bg-line', className)} />
    ) : (
        <div className={cx('h-px w-full bg-line', className)} />
    );
}

/** A label/value row used in detail lists. */
export function KeyValue({ label, children, mono, className }: { label: React.ReactNode; children: React.ReactNode; mono?: boolean; className?: string }) {
    return (
        <div className={cx('flex items-center justify-between gap-4 py-2 text-[14px]', className)}>
            <span className="text-fg-subtle shrink-0">{label}</span>
            <span className={cx('text-fg min-w-0 truncate text-right', mono && 'font-mono text-xs')}>{children}</span>
        </div>
    );
}

/** Stat block for overview rows. */
export function Stat({
    label,
    value,
    hint,
    icon,
    className,
}: {
    label: React.ReactNode;
    value: React.ReactNode;
    hint?: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cx('p-4', className)}>
            <div className="flex items-center justify-between text-xs text-fg-subtle">
                <span>{label}</span>
                {icon}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-fg tabular">{value}</div>
            {hint && <div className="mt-1 text-[12px] text-fg-subtle">{hint}</div>}
        </div>
    );
}

/** Modal frame: overlay + centered panel. Content and actions are passed in. */
export function Modal({
    open,
    onClose,
    children,
    width = 'md',
    labelledBy,
    className,
}: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    width?: 'sm' | 'md' | 'lg' | 'xl';
    labelledBy?: string;
    className?: string;
}) {
    React.useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open) return null;
    const w = width === 'sm' ? 'max-w-sm' : width === 'lg' ? 'max-w-2xl' : width === 'xl' ? 'max-w-4xl' : 'max-w-md';
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <button
                aria-label="Close dialog"
                onClick={onClose}
                className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] animate-in fade-in"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                className={cx(
                    'relative w-full rounded-t-panel sm:rounded-panel border border-line bg-elevated shadow-pop animate-in fade-in zoom-in-95 max-h-[90vh] overflow-hidden flex flex-col',
                    w,
                    className
                )}
            >
                {children}
            </div>
        </div>
    );
}

export function ModalHeader({
    title,
    description,
    icon,
    onClose,
    id,
}: {
    title: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ReactNode;
    onClose?: () => void;
    id?: string;
}) {
    return (
        <div className="flex items-start gap-3 px-5 pt-5 pb-4">
            {icon && (
                <div className="h-9 w-9 rounded-[9px] border border-line bg-surface flex items-center justify-center text-fg-muted shrink-0">
                    {icon}
                </div>
            )}
            <div className="min-w-0 flex-1">
                <h2 id={id} className="text-[16px] font-semibold tracking-tight text-fg">
                    {title}
                </h2>
                {description && <p className="mt-1 text-[14px] text-fg-muted leading-relaxed">{description}</p>}
            </div>
            {onClose && (
                <IconButton label="Close" size="sm" onClick={onClose} className="-mr-1 -mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                </IconButton>
            )}
        </div>
    );
}

export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cx('flex items-center justify-end gap-2 px-5 py-3.5 border-t border-line bg-sunken/60', className)}>
            {children}
        </div>
    );
}
