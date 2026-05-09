import React from 'react';

interface RawViewProps {
  response: any;
}

export const RawView: React.FC<RawViewProps> = ({ response }) => {
  return (
    <pre className="text-slate-500 font-mono text-xs whitespace-pre-wrap">
      {JSON.stringify(response, null, 2)}
    </pre>
  );
};