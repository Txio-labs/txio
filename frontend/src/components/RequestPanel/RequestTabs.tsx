import React from 'react';
import { Beaker, Workflow } from 'lucide-react';
import { ActiveTab } from './types';

interface RequestTabsProps {
  activeTab: ActiveTab;
  testsCount: number;
  testSummary?: { passed: number; total: number };
  onTabChange: (tab: ActiveTab) => void;
}

export const RequestTabs: React.FC<RequestTabsProps> = ({
  activeTab,
  testsCount,
  testSummary,
  onTabChange
}) => {
  const tabs: { id: ActiveTab; label: string; icon?: React.ReactNode }[] = [
    { id: 'builder', label: 'Builder' },
    { id: 'raw', label: 'Raw' },
    { id: 'tests', label: 'Tests', icon: <Beaker size={12} /> },
    { id: 'hooks', label: 'Hooks', icon: <Workflow size={12} /> },
    { id: 'code', label: 'Code' },
  ];

  return (
    <div className="border-b border-slate-200 dark:border-white/10 px-4 flex justify-between bg-slate-50 dark:bg-near-black items-center h-10">
      <div className="flex gap-6 h-full">
        {tabs.map((tab) => (
          <button 
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`h-full text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'border-sui-500 text-electric-violet' 
                : 'border-transparent text-slate-500 hover:text-slate-600 dark:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'tests' && (
              testSummary ? (
                <span
                  className={`rounded px-1 ${
                    testSummary.passed === testSummary.total
                      ? 'bg-emerald-900/30 text-emerald-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {testSummary.passed}/{testSummary.total}
                </span>
              ) : (
                <span className="bg-white/10 text-slate-500 rounded px-1">
                  {testsCount}
                </span>
              )
            )}
          </button>
        ))}
      </div>
    </div>
  );
};