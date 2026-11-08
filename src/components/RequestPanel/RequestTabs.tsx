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
  // Params -> 'builder' (method + params form), Body -> 'raw' (full JSON
  // envelope). JSON-RPC calls here carry no per-request headers or auth, so
  // there are no tabs for them.
  const tabs: { id: ActiveTab; label: string; icon?: React.ReactNode }[] = [
    { id: 'builder', label: 'Params' },
    { id: 'raw', label: 'Body' },
    { id: 'transaction', label: 'Transaction' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'tests', label: 'Tests', icon: <Beaker size={12} /> },
    { id: 'hooks', label: 'Hooks', icon: <Workflow size={12} /> },
    { id: 'code', label: 'Code' },
  ];

  const isReadOnly = requestType === RequestType.RPC;

  return (
    <div className="border-b border-line px-4 flex justify-between items-end h-9 shrink-0 overflow-x-auto no-scrollbar">
      <div role="tablist" className="flex gap-1 h-full">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.id)}
              className={`relative h-full px-2 text-[14px] transition-colors flex items-center gap-1.5 shrink-0 ${
                active ? 'text-fg font-medium' : 'text-fg-subtle hover:text-fg'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'tests' &&
                (testSummary ? (
                  <span
                    className={`rounded-[5px] px-1 text-[12px] font-mono ${
                      testSummary.passed === testSummary.total
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-500/15 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {testSummary.passed}/{testSummary.total}
                  </span>
                ) : (
                  <span className="bg-active text-fg-subtle rounded-[5px] px-1 text-[12px] font-mono">{testsCount}</span>
                ))}
              {active && <span className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full bg-fg" />}
            </button>
          );
        })}
      </div>

      <div className="hidden md:flex items-center gap-1.5 pl-4 shrink-0 self-center">
        {isReadOnly && (
          <span
            className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[12px] font-medium"
            title="This request only reads chain state — it cannot mutate anything."
          >
            <ShieldCheck size={12} /> Read-only request
          </span>
        )}
        {isReadOnly && (
          <span
            className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-hover text-fg-muted text-[12px] font-medium"
            title="No wallet connection is needed to send this request."
          >
            <WalletCards size={12} /> No wallet required
          </span>
        )}
      </div>
    </div>
  );
};
