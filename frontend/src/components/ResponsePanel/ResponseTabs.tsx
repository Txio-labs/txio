import React from 'react';
import { ContentTab } from './types';

interface ResponseTabsProps {
  activeTab: ContentTab;
  hasEvents: boolean;
  hasEffects: boolean;
  onTabChange: (tab: ContentTab) => void;
}

export const ResponseTabs: React.FC<ResponseTabsProps> = ({
  activeTab,
  hasEvents,
  hasEffects,
  onTabChange
}) => {
  const tabs = [
    { id: 'body' as ContentTab, label: 'Payload' },
    { id: 'meta' as ContentTab, label: 'Metadata' },
    ...(hasEvents ? [{ id: 'events' as ContentTab, label: 'Events' }] : []),
    ...(hasEffects ? [{ id: 'effects' as ContentTab, label: 'Effects' }] : [])
  ];

  return (
    <div className="flex bg-black px-4 border-b border-white/10 shrink-0">
      {tabs.map(tab => (
        <button 
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
            activeTab === tab.id 
              ? 'border-sui-500 text-white' 
              : 'border-transparent text-slate-500'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};