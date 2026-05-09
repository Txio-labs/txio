import React from 'react';
import { Beaker, Workflow, Copy, Check } from 'lucide-react';
import { ActiveTab } from './types';

interface RequestTabsProps {
  activeTab: ActiveTab;
  testsCount: number;
  isSnippetCopied: boolean;
  onTabChange: (tab: ActiveTab) => void;
  onCopySnippet: () => void;
}

export const RequestTabs: React.FC<RequestTabsProps> = ({
  activeTab,
  testsCount,
  isSnippetCopied,
  onTabChange,
  onCopySnippet
}) => {
  const tabs: { id: ActiveTab; label: string; icon?: React.ReactNode }[] = [
    { id: 'builder', label: 'Builder' },
    { id: 'raw', label: 'Raw' },
    { id: 'tests', label: 'Tests', icon: <Beaker size={12} /> },
    { id: 'hooks', label: 'Hooks', icon: <Workflow size={12} /> },
    { id: 'code', label: 'Code' },
  ];

  return (
    <div className="border-b border-white/10 px-4 flex justify-between bg-black items-center h-10">
      <div className="flex gap-6 h-full">
        {tabs.map((tab) => (
          <button 
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`h-full text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'border-sui-500 text-sui-400' 
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'tests' && (
              <span className="bg-white/10 text-slate-500 rounded px-1">
                {testsCount}
              </span>
            )}
          </button>
        ))}
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={onCopySnippet}
          className="h-[28px] px-3 bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
        >
          {isSnippetCopied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
};