import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { highlightJson } from '@/lib/jsonHighlight';
import {
    AlignLeft,
    AlertCircle,
    Check,
    Copy,
    Trash2,
    Minimize2,
    Search,
    X,
    CornerDownLeft,
    Indent
} from 'lucide-react';

interface JsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    readOnly?: boolean;
}

interface ParseError {
    message: string;
    line?: number;
    column?: number;
    position?: number;
}

const parseErrorPosition = (
    message: string,
    text: string
): { line?: number; column?: number; position?: number } => {
    const posMatch = message.match(/position (\d+)/i);

    if (posMatch) {
        const position = Number(posMatch[1]);
        const upTo = text.slice(0, position);
        const line = upTo.split('\n').length;
        const lastNewline = upTo.lastIndexOf('\n');
        const column =
            position - (lastNewline === -1 ? 0 : lastNewline + 1);

        return {
            position,
            line,
            column: column + 1
        };
    }

    const lineMatch = message.match(/line (\d+) column (\d+)/i);
    if (lineMatch) {
        return {
            line: Number(lineMatch[1]),
            column: Number(lineMatch[2])
        };
    }

    return {};
};

export const JsonEditor: React.FC<JsonEditorProps> = ({
    value: initialValue,
    onChange,
    placeholder = 'Enter JSON...',
    readOnly = false
}) => {
    const { settings } = useAppStore();
    const showLineNumbers = settings.showLineNumbers;
    const [value, setValue] = useState(initialValue);
    const [prevInitialValue, setPrevInitialValue] = useState(initialValue);
    const [error, setError] = useState<ParseError | null>(null);
    const [copied, setCopied] = useState(false);
    const [caret, setCaret] = useState({ line: 1, column: 1 });
    const [activeLine, setActiveLine] = useState(1);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchIndex, setSearchIndex] = useState(0);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);
    const lineGutterRef = useRef<HTMLDivElement>(null);

    if (initialValue !== prevInitialValue) {
        setPrevInitialValue(initialValue);
        setValue(initialValue);
    }

    const validate = useCallback(
        (text: string): ParseError | null => {
            const trimmed = text.trim();

            if (!trimmed) {
                return null;
            }

            try {
                JSON.parse(text);
                return null;
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : String(err);
                return {
                    message,
                    ...parseErrorPosition(message, text)
                };
            }
        },
        []
    );

    const handleScroll = () => {
        if (textareaRef.current && preRef.current) {
            const { scrollTop, scrollLeft } =
                textareaRef.current;
            preRef.current.scrollTop = scrollTop;
            preRef.current.scrollLeft = scrollLeft;
            if (lineGutterRef.current) {
                lineGutterRef.current.scrollTop = scrollTop;
            }
        }
    };

    const updateCaret = (
        textarea: HTMLTextAreaElement
    ) => {
        const upTo = textarea.value.slice(
            0,
            textarea.selectionStart
        );
        const line = upTo.split('\n').length;
        const lastNewline = upTo.lastIndexOf('\n');
        const column =
            textarea.selectionStart -
            (lastNewline === -1 ? 0 : lastNewline + 1) +
            1;

        setCaret({ line, column });
        setActiveLine(line);
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
        const newVal = e.target.value;
        setValue(newVal);
        onChange(newVal);
        updateCaret(e.currentTarget);
    };

    const handleBlur = () => {
        setError(validate(value));
    };

    const handleSelect = (
        e: React.SyntheticEvent<HTMLTextAreaElement>
    ) => {
        updateCaret(e.currentTarget);
    };

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLTextAreaElement>
    ) => {
        if (readOnly) return;

        // Cmd/Ctrl+Shift+F → format (must be checked before plain Ctrl+F)
        if (
            (e.metaKey || e.ctrlKey) &&
            e.shiftKey &&
            e.key.toLowerCase() === 'f'
        ) {
            e.preventDefault();
            handleFormat();
            return;
        }

        // Cmd/Ctrl+F → search
        if (
            (e.metaKey || e.ctrlKey) &&
            e.key.toLowerCase() === 'f'
        ) {
            e.preventDefault();
            setSearchOpen(true);
            return;
        }

        // Esc → close search
        if (e.key === 'Escape' && searchOpen) {
            e.preventDefault();
            setSearchOpen(false);
            return;
        }

        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        if (e.key === 'Tab') {
            e.preventDefault();

            if (e.shiftKey) {
                const linesBefore = value
                    .substring(0, start)
                    .split('\n');
                const currentPosInLine =
                    linesBefore[linesBefore.length - 1].length;
                const lineStart = start - currentPosInLine;

                if (
                    value.substring(
                        lineStart,
                        lineStart + 2
                    ) === '  '
                ) {
                    const newVal =
                        value.substring(0, lineStart) +
                        value.substring(lineStart + 2);
                    setValue(newVal);
                    onChange(newVal);
                    setTimeout(() => {
                        if (textareaRef.current) {
                            textareaRef.current.selectionStart =
                                textareaRef.current.selectionEnd =
                                    Math.max(
                                        lineStart,
                                        start - 2
                                    );
                        }
                    }, 0);
                }
            } else {
                const spaces = '  ';
                const newVal =
                    value.substring(0, start) +
                    spaces +
                    value.substring(end);
                setValue(newVal);
                onChange(newVal);
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.selectionStart =
                            textareaRef.current.selectionEnd =
                                start + 2;
                    }
                }, 0);
            }
            return;
        }

        const pairs: Record<string, string> = {
            '{': '}',
            '[': ']',
            '"': '"'
        };

        if (
            pairs[e.key] &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.altKey
        ) {
            e.preventDefault();
            const closing = pairs[e.key];
            const newVal =
                value.substring(0, start) +
                e.key +
                closing +
                value.substring(end);
            setValue(newVal);
            onChange(newVal);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart =
                        textareaRef.current.selectionEnd =
                            start + 1;
                }
            }, 0);
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();

            const linesBefore = value
                .substring(0, start)
                .split('\n');
            const currentLine =
                linesBefore[linesBefore.length - 1];
            const match = currentLine.match(/^(\s*)/);
            const indentation = match ? match[1] : '';

            const charBefore = value.substring(
                start - 1,
                start
            );
            const charAfter = value.substring(
                end,
                end + 1
            );

            const isBetweenBrackets =
                (charBefore === '{' && charAfter === '}') ||
                (charBefore === '[' && charAfter === ']');

            if (isBetweenBrackets) {
                const extraIndent = '  ';
                const insert = `\n${indentation}${extraIndent}\n${indentation}`;
                const newVal =
                    value.substring(0, start) +
                    insert +
                    value.substring(end);

                setValue(newVal);
                onChange(newVal);

                const cursorPos =
                    start +
                    1 +
                    indentation.length +
                    extraIndent.length;

                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.selectionStart =
                            textareaRef.current.selectionEnd =
                                cursorPos;
                    }
                }, 0);
            } else {
                let extraIndent = '';

                if (charBefore === '{' || charBefore === '[') {
                    extraIndent = '  ';
                }

                const insert = `\n${indentation}${extraIndent}`;
                const newVal =
                    value.substring(0, start) +
                    insert +
                    value.substring(end);
                setValue(newVal);
                onChange(newVal);

                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.selectionStart =
                            textareaRef.current.selectionEnd =
                                start + insert.length;
                    }
                }, 0);
            }
        }
    };

    const handleFormat = () => {
        try {
            const parsed = JSON.parse(value);
            const formatted = JSON.stringify(parsed, null, 2);
            setValue(formatted);
            onChange(formatted);
            setError(null);
        } catch (e) {
            setError(validate(value));
        }
    };

    const handleMinify = () => {
        try {
            const parsed = JSON.parse(value);
            const minified = JSON.stringify(parsed);
            setValue(minified);
            onChange(minified);
            setError(null);
        } catch (e) {
            setError(validate(value));
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleClear = () => {
        setValue('');
        onChange('');
        setError(null);
    };


    const lines = value.split('\n');
    const lineCount = lines.length;

    const sizeBytes = useMemo(
        () => new Blob([value]).size,
        [value]
    );

    const formatBytes = (b: number) => {
        if (b < 1024) return `${b}B`;
        if (b < 1024 * 1024)
            return `${(b / 1024).toFixed(1)}KB`;
        return `${(b / (1024 * 1024)).toFixed(2)}MB`;
    };

    const searchMatches = useMemo(() => {
        if (!searchTerm) return [] as number[];

        const matches: number[] = [];
        let idx = 0;

        while (
            (idx = value
                .toLowerCase()
                .indexOf(
                    searchTerm.toLowerCase(),
                    idx
                )) !== -1
        ) {
            matches.push(idx);
            idx += searchTerm.length;
        }

        return matches;
    }, [searchTerm, value]);

    const jumpToMatch = (matchIdx: number) => {
        if (
            !textareaRef.current ||
            searchMatches.length === 0
        )
            return;

        const wrapped =
            ((matchIdx % searchMatches.length) +
                searchMatches.length) %
            searchMatches.length;
        const position = searchMatches[wrapped];
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
            position,
            position + searchTerm.length
        );
        setSearchIndex(wrapped);
        updateCaret(textareaRef.current);
    };

    useEffect(() => {
        if (searchOpen && searchMatches.length > 0) {
            jumpToMatch(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    const isValid =
        !error && (!value.trim() || value.trim() === '');
    const hasContent = value.trim().length > 0;
    let parseValid = false;

    try {
        if (hasContent) {
            JSON.parse(value);
            parseValid = true;
        }
    } catch {
        parseValid = false;
    }

    return (
        <div className="flex flex-col h-full bg-sunken overflow-hidden transition-colors">
            <div className="flex items-center justify-between px-2 h-9 bg-surface border-b border-line">
                <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-semibold text-fg-subtle mr-2">
                        JSON
                    </span>
                    <button
                        onClick={handleFormat}
                        className="px-2 py-1 hover:bg-hover text-fg-muted hover:text-fg rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Format (⌘⇧F)"
                    >
                        <AlignLeft size={11} /> Format
                    </button>
                    <button
                        onClick={handleMinify}
                        className="px-2 py-1 hover:bg-hover text-fg-muted hover:text-fg rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Minify"
                    >
                        <Minimize2 size={11} /> Minify
                    </button>
                    <button
                        onClick={() =>
                            setSearchOpen((s) => !s)
                        }
                        className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                            searchOpen
                                ? 'bg-active text-fg'
                                : 'hover:bg-hover text-fg-muted hover:text-fg'
                        }`}
                        title="Find (⌘F)"
                    >
                        <Search size={11} /> Find
                    </button>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleCopy}
                        className="p-1.5 hover:bg-hover text-fg-muted hover:text-fg rounded transition-colors"
                        title="Copy"
                    >
                        {copied ? (
                            <Check
                                size={12}
                                className="text-emerald-500 dark:text-emerald-400"
                            />
                        ) : (
                            <Copy size={12} />
                        )}
                    </button>
                    <button
                        onClick={handleClear}
                        className="p-1.5 hover:bg-hover text-fg-muted hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
                        title="Clear"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            {searchOpen && (
                <div className="flex items-center gap-2 px-3 py-2 bg-sunken border-b border-line">
                    <Search
                        size={12}
                        className="text-fg-subtle shrink-0"
                    />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) =>
                            setSearchTerm(e.target.value)
                        }
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                jumpToMatch(
                                    e.shiftKey
                                        ? searchIndex - 1
                                        : searchIndex + 1
                                );
                            } else if (e.key === 'Escape') {
                                setSearchOpen(false);
                            }
                        }}
                        placeholder="Find in JSON..."
                        autoFocus
                        className="flex-1 bg-transparent outline-none text-[12px] font-mono text-fg placeholder:text-fg-subtle"
                    />
                    <span className="text-[12px] text-fg-subtle font-mono shrink-0">
                        {searchMatches.length > 0
                            ? `${searchIndex + 1}/${searchMatches.length}`
                            : searchTerm
                              ? '0/0'
                              : ''}
                    </span>
                    <button
                        onClick={() =>
                            setSearchOpen(false)
                        }
                        className="p-1 hover:bg-hover text-fg-subtle hover:text-fg rounded transition-colors"
                    >
                        <X size={11} />
                    </button>
                </div>
            )}

            <div className="relative flex-1 min-h-0 flex">
                {showLineNumbers && (
                <div
                    ref={lineGutterRef}
                    className="shrink-0 w-11 bg-sunken border-r border-line overflow-hidden select-none pointer-events-none"
                    data-testid="json-editor-line-gutter"
                >
                    <div className="py-4 pr-3 text-right font-mono text-[12px] leading-relaxed text-fg-subtle">
                        {Array.from(
                            { length: lineCount },
                            (_, i) => i + 1
                        ).map((n) => {
                            const isErrorLine =
                                error?.line === n;
                            const isActive = activeLine === n;
                            return (
                                <div
                                    key={n}
                                    className={`flex items-center justify-end gap-1 px-1 ${
                                        isErrorLine
                                            ? 'text-red-500 dark:text-red-400'
                                            : isActive
                                              ? 'text-fg-muted'
                                              : 'text-fg-subtle'
                                    }`}
                                >
                                    {isErrorLine && (
                                        <span className="text-red-500 leading-none">
                                            ●
                                        </span>
                                    )}
                                    <span>{n}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                )}

                <div
                    className="relative flex-1 overflow-auto custom-scrollbar bg-sunken"
                    onScroll={handleScroll}
                >
                    <pre
                        ref={preRef}
                        className="absolute top-0 left-0 min-w-full p-4 font-mono text-[13px] leading-relaxed pointer-events-none whitespace-pre"
                        dangerouslySetInnerHTML={{
                            __html:
                                highlightJson(value) +
                                '<br/>'
                        }}
                    />
                    <textarea
                        ref={textareaRef}
                        className="absolute top-0 left-0 min-w-full h-full p-4 font-mono text-[13px] leading-relaxed bg-transparent text-transparent caret-fg resize-none outline-none whitespace-pre selection:bg-active"
                        value={value}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onSelect={handleSelect}
                        onClick={handleSelect}
                        onKeyUp={handleSelect}
                        onBlur={handleBlur}
                        onScroll={handleScroll}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                        placeholder={placeholder}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between px-3 h-7 bg-surface border-t border-line text-[12px] font-mono">
                <div className="flex items-center gap-3 text-fg-subtle">
                    <span className="flex items-center gap-1">
                        <CornerDownLeft size={9} />
                        Ln {caret.line}, Col {caret.column}
                    </span>
                    <span className="flex items-center gap-1">
                        <Indent size={9} />2 spaces
                    </span>
                    <span>{lineCount} lines</span>
                    <span>{formatBytes(sizeBytes)}</span>
                </div>
                <div className="flex items-center gap-2">
                    {!hasContent ? (
                        <span className="text-fg-subtle">
                            empty
                        </span>
                    ) : parseValid ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400/80">
                            <Check size={10} /> valid JSON
                        </span>
                    ) : error ? (
                        <span
                            className="flex items-center gap-1 text-red-500 dark:text-red-400 cursor-help truncate max-w-md"
                            title={error.message}
                        >
                            <AlertCircle size={10} />
                            {error.line
                                ? `error · ln ${error.line}, col ${error.column ?? '?'}`
                                : 'invalid JSON'}
                        </span>
                    ) : (
                        <span className="text-amber-600 dark:text-amber-400/80 flex items-center gap-1">
                            <AlertCircle size={10} />
                            unsaved
                        </span>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-500/20 px-3 py-1.5 text-[12px] font-mono text-red-600 dark:text-red-300/90 flex items-center gap-2">
                    <AlertCircle size={10} className="shrink-0" />
                    <span className="truncate">
                        {error.message}
                    </span>
                </div>
            )}
        </div>
    );
};