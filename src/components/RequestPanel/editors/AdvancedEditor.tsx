import React from 'react';
import { Settings2 } from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { ChainId } from '@/types';

interface AdvancedEditorProps {
  chain?: ChainId;
}

const CUSTOM_RPC_KEY: Record<'sui' | 'evm' | 'stellar', 'customRpc' | 'evmCustomRpc' | 'stellarCustomRpc'> = {
  sui: 'customRpc',
  evm: 'evmCustomRpc',
  stellar: 'stellarCustomRpc'
};

// Surfaces the request-relevant subset of app settings (line numbers, custom
// RPC overrides) that would otherwise have no home in the tab strip. Full
// settings management still lives in the dedicated Settings page — this is a
// convenience mirror, not a duplicate source of truth.
export const AdvancedEditor: React.FC<AdvancedEditorProps> = ({ chain }) => {
  const { settings, network } = useAppStore();
  const resolvedChain = chain ?? 'sui';
  const settingsKey = CUSTOM_RPC_KEY[resolvedChain];
  const customRpcForChain = settings[settingsKey];

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 size={16} className="text-slate-400" />
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-[0.2em]">
          Advanced
        </h3>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black/40">
        <div>
          <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Editor line numbers</div>
          <div className="text-xs text-slate-500 mt-0.5">Show gutter line numbers in the JSON editor.</div>
        </div>
        <button
          onClick={() => appStore.updateSettings({ showLineNumbers: !settings.showLineNumbers })}
          className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${settings.showLineNumbers ? 'bg-electric-violet' : 'bg-slate-300 dark:bg-slate-700'}`}
        >
          <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.showLineNumbers ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black/40">
        <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Custom RPC endpoint</div>
        <div className="text-xs text-slate-500 mb-3">
          Override the default <span className="font-mono uppercase">{resolvedChain}</span> endpoint for <span className="font-mono">{network}</span>. Leave blank to use the default.
        </div>
        <input
          type="text"
          value={customRpcForChain[network] || ''}
          onChange={(e) =>
            appStore.updateSettings({
              [settingsKey]: { ...customRpcForChain, [network]: e.target.value }
            })
          }
          placeholder="https://..."
          className="w-full bg-white dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-200 focus:border-electric-violet focus:outline-none transition-colors"
        />
      </div>
    </div>
  );
};
