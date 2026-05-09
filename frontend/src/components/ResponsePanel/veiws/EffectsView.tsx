import React from 'react';

interface EffectsViewProps {
  effects: any;
}

export const EffectsView: React.FC<EffectsViewProps> = ({ effects }) => {
  return (
    <div className="text-slate-300 font-mono text-xs p-6 bg-black rounded-xl border border-white/10 overflow-auto">
      <pre className="whitespace-pre-wrap">{JSON.stringify(effects, null, 2)}</pre>
    </div>
  );
};