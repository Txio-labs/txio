import React from 'react';

interface SyntaxHighlightedJsonProps {
  data: any;
}

export const SyntaxHighlightedJson: React.FC<SyntaxHighlightedJsonProps> = ({ data }) => {
  const jsonString = JSON.stringify(data, null, 2);
  const parts = jsonString.split(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g);
  
  return (
    <pre className="text-slate-300 leading-relaxed font-mono text-xs whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (!part) return null;
        let className = "text-slate-300";
        if (/^"/.test(part)) {
          if (/:$/.test(part)) {
            className = "text-cyan-500";
          } else {
            className = "text-emerald-400";
            if (/^"0x[a-fA-F0-9]{64}"$/.test(part)) {
              className = "text-sui-400 font-bold underline cursor-pointer hover:text-sui-300 transition-colors";
            }
          }
        } else if (/true|false/.test(part)) {
          className = "text-amber-500";
        } else if (/null/.test(part)) {
          className = "text-slate-500 italic";
        } else if (/-?\d+/.test(part)) {
          className = "text-purple-400";
        }
        return <span key={i} className={className}>{part}</span>;
      })}
    </pre>
  );
};