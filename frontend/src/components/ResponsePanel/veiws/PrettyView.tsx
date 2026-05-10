import React from 'react';
import { AlertCircle } from 'lucide-react';
import { SyntaxHighlightedJson } from '../utils/syntaxHighlighter';

interface PrettyViewProps {
  response: any;
  isError: boolean;
  endpoint?: string;
  onCopy: () => void;
  copied: boolean;
}

export const PrettyView: React.FC<PrettyViewProps> = ({
  response,
  isError,
  endpoint,
  onCopy,
  copied
}) => {
  return (
    <div className="relative group min-h-full">
      {isError && endpoint && (
        <div className="mb-4 p-3 bg-red-900/10 border border-red-900/30 rounded-lg flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-red-400">Request Failed</div>
            <div className="text-[10px] text-red-300/70 font-mono mt-1">Endpoint: {endpoint}</div>
          </div>
        </div>
      )}
      
      <button 
        onClick={onCopy} 
        className="absolute top-0 right-0 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-xl"
      >
        {copied ? (
          <>
            <span className="text-emerald-400">✓</span>
            <span>Copied</span>
          </>
        ) : (
          <>
            <span>📋</span>
            <span>Copy</span>
          </>
        )}
      </button>

      <SyntaxHighlightedJson data={response} />
    </div>
  );
};