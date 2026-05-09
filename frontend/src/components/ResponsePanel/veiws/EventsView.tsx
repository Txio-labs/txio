import React from 'react';

interface EventsViewProps {
  events: any;
}

export const EventsView: React.FC<EventsViewProps> = ({ events }) => {
  return (
    <div className="text-slate-300 font-mono text-xs p-6 bg-black rounded-xl border border-white/10 overflow-auto">
      <pre className="whitespace-pre-wrap">{JSON.stringify(events, null, 2)}</pre>
    </div>
  );
};