
import React, { useState, useRef, useEffect } from 'react';
import { AlignLeft, AlertCircle, Check, Copy, Trash2, Code, Minimize2 } from 'lucide-react';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({ 
  value: initialValue, 
  onChange, 
  placeholder = "Enter JSON...",
  readOnly = false 
}) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Sync scroll
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setValue(newVal);
    onChange(newVal); // Propagate up immediately for sync, validation happens on effects/utils
    
    try {
        if (newVal.trim()) {
            JSON.parse(newVal);
        }
        setError(null);
    } catch (err: any) {
        // Don't set error immediately on typing to avoid annoyance, 
        // usually nice to show "Invalid JSON" status somewhere less intrusive or on blur
    }
  };

  const handleBlur = () => {
      try {
          if (value.trim()) {
              JSON.parse(value);
          }
          setError(null);
      } catch (err: any) {
          setError(err.message);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;

    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Tab handling
    if (e.key === 'Tab') {
      e.preventDefault();
      
      if (e.shiftKey) {
          // Shift+Tab: Outdent
          // Simple implementation: remove 2 spaces from current line if present
          const linesBefore = value.substring(0, start).split('\n');
          const currentPosInLine = linesBefore[linesBefore.length - 1].length;
          const lineStart = start - currentPosInLine;
          
          // Check if current line starts with spaces
          if (value.substring(lineStart, lineStart + 2) === '  ') {
              const newVal = value.substring(0, lineStart) + value.substring(lineStart + 2);
              setValue(newVal);
              onChange(newVal);
              setTimeout(() => {
                  if (textareaRef.current) {
                      textareaRef.current.selectionStart = textareaRef.current.selectionEnd = Math.max(lineStart, start - 2);
                  }
              }, 0);
          }
      } else {
          // Tab: Indent (Insert spaces)
          const spaces = '  ';
          const newVal = value.substring(0, start) + spaces + value.substring(end);
          setValue(newVal);
          onChange(newVal);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
            }
          }, 0);
      }
      return;
    }

    // Auto-close brackets/quotes
    const pairs: Record<string, string> = {
        '{': '}',
        '[': ']',
        '"': '"'
    };

    if (pairs[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const closing = pairs[e.key];
        const newVal = value.substring(0, start) + e.key + closing + value.substring(end);
        setValue(newVal);
        onChange(newVal);
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
            }
        }, 0);
        return;
    }

    // Enter auto-indent & Bracket expansion
    if (e.key === 'Enter') {
        e.preventDefault();
        
        const linesBefore = value.substring(0, start).split('\n');
        const currentLine = linesBefore[linesBefore.length - 1];
        const match = currentLine.match(/^(\s*)/);
        const indentation = match ? match[1] : '';
        
        const charBefore = value.substring(start - 1, start);
        const charAfter = value.substring(end, end + 1);
        
        const isBetweenBrackets = (charBefore === '{' && charAfter === '}') || 
                                  (charBefore === '[' && charAfter === ']');
        
        if (isBetweenBrackets) {
            // Expansion logic:
            // [|] -> Enter ->
            // [
            //   |
            // ]
            const extraIndent = '  ';
            const insert = `\n${indentation}${extraIndent}\n${indentation}`;
            const newVal = value.substring(0, start) + insert + value.substring(end);
            
            setValue(newVal);
            onChange(newVal);
            
            // Position cursor after the extra indent on the new line
            const cursorPos = start + 1 + indentation.length + extraIndent.length;
            
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = cursorPos;
                }
            }, 0);
        } else {
            // Standard indent
            let extraIndent = '';
            // If previous char opens a block, indent next line
            if (charBefore === '{' || charBefore === '[') {
                extraIndent = '  ';
            }
            const insert = `\n${indentation}${extraIndent}`;
            const newVal = value.substring(0, start) + insert + value.substring(end);
            setValue(newVal);
            onChange(newVal);
            setTimeout(() => {
                if(textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + insert.length;
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
    } catch (e: any) {
      setError("Cannot format: Invalid JSON");
    }
  };

  const handleMinify = () => {
    try {
        const parsed = JSON.parse(value);
        const minified = JSON.stringify(parsed);
        setValue(minified);
        onChange(minified);
        setError(null);
    } catch (e: any) {
        setError("Cannot minify: Invalid JSON");
    }
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
      setValue('');
      onChange('');
      setError(null);
  };

  // Simple syntax highlighter
  const highlightJSON = (code: string) => {
    if (!code) return '';
    return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[\[\]\{\},])/g,
        (match) => {
          let cls = 'text-violet-300';
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'text-cyan-400 font-bold'; // Keys
            } else {
              cls = 'text-emerald-400'; // Strings
            }
          } else if (/true|false/.test(match)) {
            cls = 'text-amber-400 font-bold'; // Booleans
          } else if (/null/.test(match)) {
            cls = 'text-slate-500 italic'; // Null
          } else if (/^-?\d/.test(match)) {
            cls = 'text-purple-400'; // Numbers
          } else if (/[\[\]\{\},]/.test(match)) {
              cls = 'text-slate-500'; // Punctuation
          }
          return `<span class="${cls}">${match}</span>`;
        }
      );
  };

  // Line Numbers
  const lineCount = value.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e] rounded-xl border border-slate-800/80 overflow-hidden shadow-inner group focus-within:border-slate-700/80 focus-within:ring-1 focus-within:ring-slate-800 transition-all">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/50 border-b border-slate-800/50">
        <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-2">JSON Editor</span>
            <button onClick={handleFormat} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-sui-400 rounded transition-colors" title="Format">
                <AlignLeft size={12} />
            </button>
            <button onClick={handleMinify} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-sui-400 rounded transition-colors" title="Minify">
                <Minimize2 size={12} />
            </button>
        </div>
        <div className="flex items-center gap-1">
            {error && (
                <div className="flex items-center gap-1.5 mr-3 text-red-400 text-[10px] font-mono animate-pulse">
                    <AlertCircle size={10} /> Invalid JSON
                </div>
            )}
            <button onClick={handleCopy} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors" title="Copy">
                {copied ? <Check size={12} className="text-emerald-500"/> : <Copy size={12} />}
            </button>
            <button onClick={handleClear} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded transition-colors" title="Clear">
                <Trash2 size={12} />
            </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 group/editor">
        {/* Line Numbers */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-slate-900/30 text-right pr-2 pt-4 text-[10px] font-mono text-slate-700 select-none overflow-hidden border-r border-slate-800/30 leading-relaxed">
            <pre>{lineNumbers}</pre>
        </div>

        {/* Editor Area */}
        <div className="absolute inset-0 left-8 overflow-auto custom-scrollbar bg-[#050505]" onScroll={handleScroll}>
            {/* Syntax Highlight Layer */}
            <pre 
                ref={preRef}
                className="absolute top-0 left-0 min-w-full p-4 font-mono text-xs leading-relaxed pointer-events-none whitespace-pre"
                dangerouslySetInnerHTML={{ __html: highlightJSON(value) + '<br/>' }} 
            />
            
            {/* Input Layer */}
            <textarea
                ref={textareaRef}
                className="absolute top-0 left-0 min-w-full h-full p-4 font-mono text-xs leading-relaxed bg-transparent text-transparent caret-sui-400 resize-none outline-none whitespace-pre selection:bg-slate-700/50"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
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
      
      {/* Footer / Error Message Detail */}
      {error && (
          <div className="bg-red-900/10 border-t border-red-900/30 px-3 py-1.5 text-[10px] font-mono text-red-400 flex items-center gap-2">
              <AlertCircle size={10} />
              <span className="truncate">{error}</span>
          </div>
      )}
    </div>
  );
};
