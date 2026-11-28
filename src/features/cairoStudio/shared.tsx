import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { highlightJson } from '@/lib/jsonHighlight';
import { cx } from '@/components/ui/primitives';

/** Copies `value` and shows a check for a moment. */
export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            onClick={() => {
                void navigator.clipboard?.writeText(value).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                });
            }}
            aria-label={copied ? 'Copied' : label}
            title={label}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] text-fg-subtle hover:bg-hover hover:text-fg"
        >
            {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
    );
}

/** A labelled, copyable monospace value. */
export function ValueRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-start gap-3 py-1 text-xs">
            <span className="w-28 shrink-0 text-fg-subtle">{label}</span>
            <span className={cx('min-w-0 flex-1 break-all text-fg', mono && 'font-mono')}>{value}</span>
            <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
        </div>
    );
}

/** Read-only, highlighted JSON with a copy button. */
export function JsonBlock({ value, label }: { value: unknown; label: string }) {
    const text = JSON.stringify(value, null, 2);
    return (
        <div className="rounded-[8px] border border-line bg-sunken">
            <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
                <span className="text-[12px] font-medium text-fg-subtle">{label}</span>
                <CopyButton value={text} label={`Copy ${label.toLowerCase()}`} />
            </div>
            <pre
                className="max-h-80 overflow-auto custom-scrollbar p-3 font-mono text-xs leading-relaxed text-fg"
                // highlightJson escapes the text before adding spans.
                dangerouslySetInnerHTML={{ __html: highlightJson(text) }}
            />
        </div>
    );
}

export function ErrorNote({ message }: { message: string }) {
    return (
        <div role="alert" className="rounded-[8px] border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            {message}
        </div>
    );
}
