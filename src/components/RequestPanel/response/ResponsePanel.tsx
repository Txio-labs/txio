import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  Search,
  X,
  Clock,
  HardDrive,
  FileJson,
  CircleDot,
} from 'lucide-react';
import { RequestOutcome } from './types';

type ResponseTab = 'json' | 'headers' | 'logs' | 'raw' | 'timing';

interface ResponsePanelProps {
  outcome: RequestOutcome | null;
  isLoading: boolean;
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const highlightJSON = (code: string) => {
  if (!code) return '';
  const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[\[\]\{\},])/g;
  let lastIndex = 0;
  const parts: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    if (lastIndex < match.index) {
      parts.push(escapeHtml(code.slice(lastIndex, match.index)));
    }
    const token = match[0];
    let cls = 'text-sky-600 dark:text-sky-300';
    if (/^"/.test(token)) {
      cls = /:$/.test(token) ? 'text-sky-600 dark:text-sky-300' : 'text-emerald-600 dark:text-emerald-300';
    } else if (/true|false/.test(token)) {
      cls = 'text-amber-600 dark:text-amber-300';
    } else if (/null/.test(token)) {
      cls = 'text-fg-subtle italic';
    } else if (/^-?\d/.test(token)) {
      cls = 'text-orange-600 dark:text-orange-300';
    } else if (/[[\]{},]/.test(token)) {
      cls = 'text-fg-subtle';
    }
    parts.push(`<span class="${cls}">${escapeHtml(token)}</span>`);
    lastIndex = tokenRegex.lastIndex;
  }
  if (lastIndex < code.length) parts.push(escapeHtml(code.slice(lastIndex)));
  return parts.join('');
};

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(2)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};

const statusTone = (status: number) => {
  if (status >= 200 && status < 300) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (status >= 400 && status < 500) return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
  if (status >= 500) return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20';
  return 'text-fg-subtle bg-hover border-line';
};

const statusLabel = (status: number) => {
  const labels: Record<number, string> = {
    200: 'OK',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    408: 'Timeout',
    500: 'Internal Error',
    502: 'Bad Gateway',
    503: 'Unavailable',
  };
  return labels[status] ?? (status >= 200 && status < 300 ? 'OK' : status >= 500 ? 'Server Error' : status >= 400 ? 'Client Error' : '');
};

const timeAgo = (ts: number) => {
  const secs = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  return mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
};

/** Wraps search matches in <mark> inside already-highlighted HTML (text nodes only). */
const markMatches = (html: string, term: string) => {
  if (!term) return html;
  const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rx = new RegExp(`(${safe})`, 'gi');
  return html.replace(/(^|>)([^<]+)(?=<|$)/g, (_m, lead: string, text: string) => `${lead}${text.replace(rx, '<mark class="rounded-[3px] bg-amber-300/60 dark:bg-amber-400/40 text-inherit">$1</mark>')}`);
};

const ToolButton: React.FC<{ title: string; onClick: () => void; active?: boolean; children: React.ReactNode }> = ({ title, onClick, active, children }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`h-7 w-7 inline-flex items-center justify-center rounded-[7px] transition-colors ${
      active ? 'bg-active text-fg' : 'text-fg-subtle hover:text-fg hover:bg-hover'
    }`}
  >
    {children}
  </button>
);

export const ResponsePanel: React.FC<ResponsePanelProps> = ({ outcome, isLoading }) => {
  const [tab, setTab] = useState<ResponseTab>('json');
  const [expanded, setExpanded] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  const bodyText = useMemo(() => {
    if (!outcome) return '';
    if (outcome.error) return outcome.error;
    try {
      return JSON.stringify(outcome.result ?? null, null, expanded ? 2 : 0);
    } catch {
      return String(outcome.result);
    }
  }, [outcome, expanded]);

  const sizeBytes = useMemo(() => new Blob([bodyText]).size, [bodyText]);
  const lines = useMemo(() => bodyText.split('\n'), [bodyText]);
  const html = useMemo(() => markMatches(highlightJSON(bodyText), searchTerm), [bodyText, searchTerm]);

  const matchCount = useMemo(() => {
    if (!searchTerm) return 0;
    return bodyText.toLowerCase().split(searchTerm.toLowerCase()).length - 1;
  }, [bodyText, searchTerm]);

  const handleCopy = () => {
    navigator.clipboard.writeText(bodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([bodyText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `txio-response-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: ResponseTab; label: string }[] = [
    { id: 'json', label: 'Body' },
    { id: 'raw', label: 'Raw' },
    { id: 'headers', label: 'Headers' },
    { id: 'timing', label: 'Timing' },
    { id: 'logs', label: 'Logs' },
  ];

  const ok = outcome ? outcome.status >= 200 && outcome.status < 300 && !outcome.error : false;

  return (
    <div className="flex flex-col h-full min-h-0 bg-surface">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-11 border-b border-line shrink-0">
        <h3 className="text-[14px] font-semibold text-fg">Response</h3>
        {outcome && !isLoading && (
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md border font-mono font-medium ${statusTone(outcome.status)}`}>
              <CircleDot size={11} />
              {outcome.status} {statusLabel(outcome.status)}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-fg-muted font-mono tabular">
              <Clock size={12} className="text-fg-subtle" />
              {Math.round(outcome.duration)} ms
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-fg-muted font-mono tabular">
              <HardDrive size={12} className="text-fg-subtle" />
              {formatBytes(sizeBytes)}
            </span>
            <span className="hidden lg:inline text-fg-subtle">{timeAgo(outcome.timestamp)}</span>
          </div>
        )}
        <div className="flex-1" />
        {outcome && !isLoading && (
          <div className="flex items-center gap-0.5">
            <ToolButton title="Search" active={searchOpen} onClick={() => setSearchOpen((v) => !v)}>
              <Search size={14} />
            </ToolButton>
            <ToolButton title={expanded ? 'Compact' : 'Pretty print'} onClick={() => setExpanded((v) => !v)}>
              {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </ToolButton>
            <ToolButton title="Copy" onClick={handleCopy}>
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </ToolButton>
            <ToolButton title="Download" onClick={handleDownload}>
              <Download size={14} />
            </ToolButton>
          </div>
        )}
      </div>

      {!outcome && !isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
          <div className="h-11 w-11 rounded-[11px] border border-line bg-sunken flex items-center justify-center text-fg-subtle">
            <FileJson size={18} />
          </div>
          <div>
            <p className="text-[14px] font-medium text-fg">No response yet</p>
            <p className="mt-1 text-[13px] text-fg-muted">Send a request to see the response here.</p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
            Press
            <kbd className="h-5 px-1.5 rounded-[5px] border border-line bg-sunken font-sans text-[11px] inline-flex items-center">⌘</kbd>
            <kbd className="h-5 px-1.5 rounded-[5px] border border-line bg-sunken font-sans text-[11px] inline-flex items-center">↵</kbd>
            to send
          </span>
        </div>
      )}

      {isLoading && (
        <div className="flex-1 p-4 space-y-3" aria-busy="true">
          <p className="text-[13px] text-fg-muted">Waiting for response…</p>
          {[72, 88, 54, 80, 40].map((w, i) => (
            <div
              key={i}
              className="h-3.5 rounded bg-[linear-gradient(90deg,var(--hover),var(--active),var(--hover))] bg-[length:200%_100%] animate-shimmer"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      )}

      {outcome && !isLoading && (
        <>
          <div className="flex items-center gap-1 px-3 h-10 border-b border-line shrink-0 overflow-x-auto no-scrollbar" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`h-7 px-2.5 rounded-[7px] text-[13px] transition-colors shrink-0 ${
                  tab === t.id ? 'bg-active text-fg font-medium' : 'text-fg-subtle hover:text-fg'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {outcome.error && (
            <div className="mx-3 mt-3 rounded-[10px] border border-red-500/25 bg-red-500/[0.06] px-3 py-2.5 text-[13px] text-red-700 dark:text-red-300 shrink-0">
              <div className="font-medium">Request failed</div>
              <div className="mt-0.5 font-mono text-xs break-words">{outcome.error}</div>
            </div>
          )}

          {tab === 'json' && !outcome.error && (
            <>
              {searchOpen && (
                <div className="flex items-center gap-2 px-3 h-10 border-b border-line shrink-0">
                  <Search size={14} className="text-fg-subtle shrink-0" />
                  <input
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search response..."
                    className="flex-1 bg-transparent outline-none text-[13px] font-mono text-fg placeholder:text-fg-subtle"
                  />
                  <span className="text-xs text-fg-subtle font-mono shrink-0">
                    {searchTerm ? `${matchCount} match${matchCount === 1 ? '' : 'es'}` : ''}
                  </span>
                  <button onClick={() => { setSearchOpen(false); setSearchTerm(''); }} className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-hover text-fg-subtle" aria-label="Close search">
                    <X size={13} />
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-auto custom-scrollbar min-h-0 flex bg-sunken">
                {expanded && (
                  <div aria-hidden className="shrink-0 select-none py-3 pl-3 pr-2 text-right font-mono text-[12px] leading-[1.7] text-fg-subtle/70 border-r border-line">
                    {lines.map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                )}
                <pre
                  className={`flex-1 min-w-0 py-3 px-4 font-mono text-[13px] leading-[1.7] text-fg ${expanded ? 'whitespace-pre' : 'whitespace-pre-wrap break-all'}`}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            </>
          )}

          {tab === 'raw' && (
            <div className="flex-1 overflow-auto custom-scrollbar bg-sunken min-h-0">
              <pre className="p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-all text-fg">{bodyText}</pre>
            </div>
          )}

          {tab === 'headers' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-8">
              <p className="text-[13px] text-fg-muted max-w-xs leading-relaxed">
                JSON-RPC responses in Txio don&apos;t expose transport-level HTTP headers — only the JSON-RPC envelope
                (result/error) is captured. Nothing to show here.
              </p>
            </div>
          )}

          {tab === 'logs' && (
            <div className="flex-1 overflow-auto custom-scrollbar p-4 font-mono text-[13px] text-fg-muted space-y-1.5">
              <p>Full command and response logs stream to the Terminal panel.</p>
              {outcome.error ? (
                <p className="text-red-600 dark:text-red-400">! {outcome.error}</p>
              ) : (
                <p className="text-emerald-600 dark:text-emerald-400">✓ request completed in {Math.round(outcome.duration)}ms</p>
              )}
            </div>
          )}

          {tab === 'timing' && (
            <div className="flex-1 overflow-auto custom-scrollbar p-4 space-y-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-fg-muted">Total duration</span>
                <span className="font-mono text-fg tabular">{Math.round(outcome.duration)} ms</span>
              </div>
              <div className="h-2 rounded-full bg-hover overflow-hidden">
                <div
                  className={`h-full rounded-full ${outcome.duration < 300 ? 'bg-emerald-500' : outcome.duration < 1000 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, (outcome.duration / 2000) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-fg-subtle leading-relaxed">
                Detailed phase breakdown (DNS/TLS/TTFB) isn&apos;t available from the browser fetch API used here — only
                end-to-end request duration is measured.
              </p>
            </div>
          )}

          {/* Details */}
          <div className="border-t border-line px-4 py-2.5 shrink-0">
            <h4 className="sr-only">Response details</h4>
            <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
              <div className="flex items-center gap-1.5">
                <dt className="text-fg-subtle">Status</dt>
                <dd className={`font-mono font-medium ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {outcome.status} {statusLabel(outcome.status)}
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-fg-subtle">Response Time</dt>
                <dd className="font-mono text-fg">{Math.round(outcome.duration)} ms</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-fg-subtle">Response Size</dt>
                <dd className="font-mono text-fg">{formatBytes(sizeBytes)}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-fg-subtle">Content Type</dt>
                <dd className="font-mono text-fg">application/json</dd>
              </div>
            </dl>
          </div>
        </>
      )}
    </div>
  );
};
