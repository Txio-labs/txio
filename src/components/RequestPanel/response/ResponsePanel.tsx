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
    let cls = 'text-sky-300';
    if (/^"/.test(token)) {
      cls = /:$/.test(token) ? 'text-sky-300' : 'text-emerald-300';
    } else if (/true|false/.test(token)) {
      cls = 'text-amber-300';
    } else if (/null/.test(token)) {
      cls = 'text-slate-500 italic';
    } else if (/^-?\d/.test(token)) {
      cls = 'text-orange-300';
    } else if (/[[\]{},]/.test(token)) {
      cls = 'text-slate-500';
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
  if (status >= 200 && status < 300) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  if (status >= 400 && status < 500) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  if (status >= 500) return 'text-red-500 bg-red-500/10 border-red-500/20';
  return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
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

  const displayText = useMemo(() => {
    if (!searchTerm) return bodyText;
    return bodyText;
  }, [bodyText, searchTerm]);

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
    { id: 'json', label: 'JSON' },
    { id: 'headers', label: 'Headers' },
    { id: 'logs', label: 'Logs' },
    { id: 'raw', label: 'Raw' },
    { id: 'timing', label: 'Timing' },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
      {/* Header: title + sub-tabs */}
      <div className="flex items-center justify-between px-4 pt-3 border-b border-slate-200 dark:border-white/10 shrink-0">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-[0.2em] pb-3">
          Response
        </h3>
      </div>
      <div className="flex items-center gap-5 px-4 h-9 border-b border-slate-200 dark:border-white/10 shrink-0 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`h-full text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all shrink-0 ${
              tab === t.id
                ? 'border-electric-violet text-electric-violet'
                : 'border-transparent text-slate-500 hover:text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!outcome && !isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-8">
          <FileJson size={22} className="text-slate-300 dark:text-slate-700" />
          <p className="text-xs text-slate-500">Send a request to see the response here.</p>
        </div>
      )}

      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-8">
          <div className="h-5 w-5 rounded-full border-2 border-electric-violet/30 border-t-electric-violet animate-spin" />
          <p className="text-xs text-slate-500">Waiting for response…</p>
        </div>
      )}

      {outcome && !isLoading && (
        <>
          {/* Status row */}
          <div className="flex items-center flex-wrap gap-3 px-4 py-2.5 border-b border-slate-200 dark:border-white/10 shrink-0 text-xs">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border font-bold ${statusTone(outcome.status)}`}>
              <CircleDot size={10} />
              {outcome.status} {statusLabel(outcome.status)}
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <Clock size={11} /> {Math.round(outcome.duration)} ms
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <HardDrive size={11} /> {formatBytes(sizeBytes)}
            </span>
            <span className="text-slate-400 ml-auto font-mono text-[10px]">
              {new Date(outcome.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {tab === 'json' && (
            <>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded transition-colors"
                    title="Copy"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded transition-colors"
                    title="Download"
                  >
                    <Download size={12} />
                  </button>
                  <button
                    onClick={() => setExpanded((e) => !e)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded transition-colors"
                    title={expanded ? 'Minify' : 'Expand all'}
                  >
                    {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                  </button>
                  <button
                    onClick={() => setSearchOpen((s) => !s)}
                    className={`p-1.5 rounded transition-colors ${searchOpen ? 'bg-electric-violet/15 text-electric-violet' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                    title="Search"
                  >
                    <Search size={12} />
                  </button>
                </div>
              </div>

              {searchOpen && (
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-white/10 shrink-0">
                  <Search size={12} className="text-slate-500 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
                    placeholder="Search response..."
                    className="flex-1 bg-transparent outline-none text-[11px] font-mono text-slate-700 dark:text-white placeholder:text-slate-500"
                  />
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {searchTerm ? `${matchCount} match${matchCount === 1 ? '' : 'es'}` : ''}
                  </span>
                  <button onClick={() => setSearchOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 rounded transition-colors">
                    <X size={11} />
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-auto custom-scrollbar bg-white dark:bg-[#18181b] min-h-0">
                <pre
                  className="p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-all text-slate-700 dark:text-slate-200"
                  dangerouslySetInnerHTML={{ __html: highlightJSON(displayText) }}
                />
              </div>
            </>
          )}

          {tab === 'headers' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-8">
              <p className="text-xs text-slate-500 max-w-xs">
                JSON-RPC responses in Txio don&apos;t expose transport-level HTTP headers — only the JSON-RPC
                envelope (result/error) is captured. Nothing to show here.
              </p>
            </div>
          )}

          {tab === 'logs' && (
            <div className="flex-1 overflow-auto custom-scrollbar p-4 font-mono text-[11px] text-slate-500 space-y-1">
              <p>Full command + response logs are streamed to the Terminal panel (bottom bar).</p>
              {outcome.error ? (
                <p className="text-red-400">! {outcome.error}</p>
              ) : (
                <p className="text-emerald-500">✓ request completed in {Math.round(outcome.duration)}ms</p>
              )}
            </div>
          )}

          {tab === 'raw' && (
            <div className="flex-1 overflow-auto custom-scrollbar bg-white dark:bg-[#18181b] min-h-0">
              <pre className="p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-all text-slate-500">
                {bodyText}
              </pre>
            </div>
          )}

          {tab === 'timing' && (
            <div className="flex-1 overflow-auto custom-scrollbar p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total duration</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{Math.round(outcome.duration)} ms</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-electric-violet"
                  style={{ width: `${Math.min(100, (outcome.duration / 2000) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Detailed phase breakdown (DNS/TLS/TTFB) isn&apos;t available from the browser fetch API used here —
                only end-to-end request duration is measured.
              </p>
            </div>
          )}

          {/* Response Details footer */}
          <div className="border-t border-slate-200 dark:border-white/10 px-4 py-3 bg-slate-50 dark:bg-near-black/40 shrink-0">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Response Details</h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Status</dt>
                <dd className={`font-mono font-bold ${outcome.status >= 200 && outcome.status < 300 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {outcome.status} {statusLabel(outcome.status)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Response Time</dt>
                <dd className="font-mono text-slate-700 dark:text-slate-200">{Math.round(outcome.duration)} ms</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Response Size</dt>
                <dd className="font-mono text-slate-700 dark:text-slate-200">{formatBytes(sizeBytes)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Content Type</dt>
                <dd className="font-mono text-slate-700 dark:text-slate-200">application/json</dd>
              </div>
            </dl>
          </div>
        </>
      )}
    </div>
  );
};
