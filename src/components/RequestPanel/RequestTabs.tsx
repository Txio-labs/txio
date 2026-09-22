import React from 'react';
import { Beaker, Workflow, ShieldCheck, WalletCards } from 'lucide-react';
import { ActiveTab } from './types';
import { RequestType } from '../../types';

interface RequestTabsProps {
  activeTab: ActiveTab;
  requestType: RequestType;
  testsCount: number;
  testSummary?: { passed: number; total: number };
  onTabChange: (tab: ActiveTab) => void;
}

export const RequestTabs: React.FC<RequestTabsProps> = ({
  activeTab,
  requestType,
  testsCount,
  testSummary,
  onTabChange
}) => {
  // Screenshot framing (Params/Headers/Auth/Body/Transaction/Advanced) mapped onto
  // the existing builder: Params -> 'builder' (method + params form), Body -> 'raw'
  // (full JSON envelope). Headers/Auth/Advanced are new tabs — JSON-RPC calls in
  // this app have no HTTP header/auth concept, so those render an explanatory
  // empty state rather than fabricated data. Tests/Hooks/Code are kept as-is.
  const tabs: { id: ActiveTab; label: string; icon?: React.ReactNode }[] = [
    { id: 'builder', label: 'Params' },
    { id: 'headers', label: 'Headers' },
    { id: 'auth', label: 'Auth' },
    { id: 'raw', label: 'Body' },
    { id: 'transaction', label: 'Transaction' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'tests', label: 'Tests', icon: <Beaker size={12} /> },
    { id: 'hooks', label: 'Hooks', icon: <Workflow size={12} /> },
    { id: 'code', label: 'Code' },
  ];

  const isReadOnly = requestType === RequestType.RPC;

  return (
    <div className="border-b border-slate-200 dark:border-white/10 px-4 flex justify-between items-center h-10 bg-slate-50 dark:bg-near-black shrink-0 overflow-x-auto no-scrollbar">
      <div className="flex gap-6 h-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`h-full text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === tab.id
                ? 'border-electric-violet text-electric-violet'
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

      <div className="hidden md:flex items-center gap-2 pl-4 shrink-0">
        {isReadOnly && (
          <span
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-widest"
            title="This request only reads chain state — it cannot mutate anything."
          >
            <ShieldCheck size={11} /> Read-only request
          </span>
        )}
        {isReadOnly && (
          <span
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-[9px] font-bold uppercase tracking-widest"
            title="No wallet connection is needed to send this request."
          >
            <WalletCards size={11} /> No wallet required
          </span>
        )}
      </div>
    </div>
  );
};
