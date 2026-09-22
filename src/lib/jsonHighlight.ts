export const escapeHtml = (text: string) =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const TOKEN_REGEX = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[\[\]\{\},])/g;

/**
 * Tokenizes and colors a JSON string as an HTML string (via
 * dangerouslySetInnerHTML). Shared by JsonEditor and TerminalPanel so JSON
 * reads the same everywhere in the app: keys/strings sky-emerald, booleans
 * amber, numbers orange, null muted, punctuation slate.
 */
export const highlightJson = (code: string): string => {
    if (!code) return '';

    let lastIndex = 0;
    const parts: string[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(TOKEN_REGEX);

    while ((match = regex.exec(code)) !== null) {
        if (lastIndex < match.index) {
            parts.push(escapeHtml(code.slice(lastIndex, match.index)));
        }

        const token = match[0];
        let cls = 'text-sky-600 dark:text-sky-300';

        if (/^"/.test(token)) {
            cls = /:$/.test(token)
                ? 'text-sky-600 dark:text-sky-300'
                : 'text-emerald-600 dark:text-emerald-300';
        } else if (/true|false/.test(token)) {
            cls = 'text-amber-600 dark:text-amber-300';
        } else if (/null/.test(token)) {
            cls = 'text-slate-500 italic';
        } else if (/^-?\d/.test(token)) {
            cls = 'text-orange-600 dark:text-orange-300';
        } else if (/[[\]{},]/.test(token)) {
            cls = 'text-slate-500';
        }

        parts.push(`<span class="${cls}">${escapeHtml(token)}</span>`);
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < code.length) {
        parts.push(escapeHtml(code.slice(lastIndex)));
    }

    return parts.join('');
};

/** Best-effort: pretty-prints valid JSON, returns the input unchanged otherwise. */
export const tryPrettyPrintJson = (text: string): string => {
    try {
        return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
        return text;
    }
};
