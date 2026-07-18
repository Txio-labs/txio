import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
        if (
            textareaRef.current &&
            preRef.current &&
            lineGutterRef.current
        ) {
            const { scrollTop, scrollLeft } =
                textareaRef.current;
            preRef.current.scrollTop = scrollTop;
            preRef.current.scrollLeft = scrollLeft;
            lineGutterRef.current.scrollTop = scrollTop;
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

        // Cmd/Ctrl+F → search
        if (
            (e.metaKey || e.ctrlKey) &&
            e.key.toLowerCase() === 'f'
        ) {
            e.preventDefault();
            setSearchOpen(true);
            return;
        }

        // Cmd/Ctrl+Shift+F → format
        if (
            (e.metaKey || e.ctrlKey) &&
            e.shiftKey &&
            e.key.toLowerCase() === 'f'
        ) {
            e.preventDefault();
            handleFormat();
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

    const highlightJSON = (code: string) => {
        if (!code) return '';
        return code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(
                /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[\[\]\{\},])/g,
                (match) => {
                    let cls = 'text-sky-300';

                    if (/^"/.test(match)) {
                        if (/:$/.test(match)) {
                            cls = 'text-sky-300';
                        } else {
                            cls = 'text-emerald-300';
                        }
                    } else if (/true|false/.test(match)) {
                        cls = 'text-amber-300';
                    } else if (/null/.test(match)) {
                        cls = 'text-slate-500 italic';
                    } else if (/^-?\d/.test(match)) {
                        cls = 'text-orange-300';
                    } else if (/[\[\]\{\},]/.test(match)) {
                        cls = 'text-slate-500';
                    }

                    return `<span class="${cls}">${match}</span>`;
                }
            );
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
        <div className="flex flex-col h-full bg-[#003152] rounded-xl border border-white/10 overflow-hidden shadow-[0_24px_60px_-40px_rgba(0,0,0,0.85)] focus-within:border-electric-violet/30 transition-colors">
            <div className="flex items-center justify-between px-3 py-2 bg-[#003152] border-b border-white/5">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em] mr-2">
                        JSON
                    </span>
                    <button
                        onClick={handleFormat}
                        className="px-2 py-1 hover:bg-white/5 text-slate-400 hover:text-electric-violet rounded text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                        title="Format (⌘⇧F)"
                    >
                        <AlignLeft size={11} /> Format
                    </button>
                    <button
                        onClick={handleMinify}
                        className="px-2 py-1 hover:bg-white/5 text-slate-400 hover:text-electric-violet rounded text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                        title="Minify"
                    >
                        <Minimize2 size={11} /> Minify
                    </button>
                    <button
                        onClick={() =>
                            setSearchOpen((s) => !s)
                        }
                        className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition-colors ${
                            searchOpen
                                ? 'bg-electric-violet/15 text-electric-violet'
                                : 'hover:bg-white/5 text-slate-400 hover:text-white'
                        }`}
                        title="Find (⌘F)"
                    >
                        <Search size={11} /> Find
                    </button>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleCopy}
                        className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded transition-colors"
                        title="Copy"
                    >
                        {copied ? (
                            <Check
                                size={12}
                                className="text-emerald-400"
                            />
                        ) : (
                            <Copy size={12} />
                        )}
                    </button>
                    <button
                        onClick={handleClear}
                        className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-red-400 rounded transition-colors"
                        title="Clear"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            {searchOpen && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#003152] border-b border-white/5">
                    <Search
                        size={12}
                        className="text-slate-500 shrink-0"
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
                        className="flex-1 bg-transparent outline-none text-[11px] font-mono text-white placeholder:text-slate-600"
                    />
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
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
                        className="p-1 hover:bg-white/5 text-slate-500 hover:text-white rounded transition-colors"
                    >
                        <X size={11} />
                    </button>
                </div>
            )}

            <div className="relative flex-1 min-h-0 flex">
                <div
                    ref={lineGutterRef}
                    className="shrink-0 w-12 bg-[#001B2E] border-r border-white/5 overflow-hidden select-none pointer-events-none"
                >
                    <div className="py-4 pr-3 text-right font-mono text-[10px] leading-relaxed text-slate-700">
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
                                            ? 'text-red-400'
                                            : isActive
                                              ? 'text-slate-300'
                                              : 'text-slate-700'
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

                <div
                    className="relative flex-1 overflow-auto custom-scrollbar bg-[#003152]"
                    onScroll={handleScroll}
                >
                    <pre
                        ref={preRef}
                        className="absolute top-0 left-0 min-w-full p-4 font-mono text-[12px] leading-relaxed pointer-events-none whitespace-pre"
                        dangerouslySetInnerHTML={{
                            __html:
                                highlightJSON(value) +
                                '<br/>'
                        }}
                    />
                    <textarea
                        ref={textareaRef}
                        className="absolute top-0 left-0 min-w-full h-full p-4 font-mono text-[12px] leading-relaxed bg-transparent text-transparent caret-electric-violet resize-none outline-none whitespace-pre selection:bg-electric-violet/20"
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

            <div className="flex items-center justify-between px-3 py-1.5 bg-[#001B2E] border-t border-white/5 text-[10px] font-mono">
                <div className="flex items-center gap-3 text-slate-600">
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
                        <span className="text-slate-700">
                            empty
                        </span>
                    ) : parseValid ? (
                        <span className="flex items-center gap-1 text-emerald-400/80">
                            <Check size={10} /> valid JSON
                        </span>
                    ) : error ? (
                        <span
                            className="flex items-center gap-1 text-red-400 cursor-help truncate max-w-md"
                            title={error.message}
                        >
                            <AlertCircle size={10} />
                            {error.line
                                ? `error · ln ${error.line}, col ${error.column ?? '?'}`
                                : 'invalid JSON'}
                        </span>
                    ) : (
                        <span className="text-amber-400/80 flex items-center gap-1">
                            <AlertCircle size={10} />
                            unsaved
                        </span>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-950/30 border-t border-red-500/20 px-3 py-1.5 text-[10px] font-mono text-red-300/90 flex items-center gap-2">
                    <AlertCircle size={10} className="shrink-0" />
                    <span className="truncate">
                        {error.message}
                    </span>
                </div>
            )}
        </div>
    );
};
