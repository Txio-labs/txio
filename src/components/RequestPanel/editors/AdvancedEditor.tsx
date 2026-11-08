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
  const endpointsForNetwork = customRpcForChain[network] || [];
  const primaryEndpoint = endpointsForNetwork[0] || '';

  return (
    <div className="p-4 md:p-6 w-full space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 size={16} className="text-fg-subtle" />
        <h3 className="text-xs font-semibold text-fg">
          Advanced
        </h3>
      </div>

      <div className="flex items-center justify-between p-4 rounded-[10px] border border-line bg-sunken">
        <div>
          <div className="text-sm font-semibold text-fg">Editor line numbers</div>
          <div className="text-xs text-fg-subtle mt-0.5">Show gutter line numbers in the JSON editor.</div>
        </div>
        <button
          onClick={() => appStore.updateSettings({ showLineNumbers: !settings.showLineNumbers })}
          className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${settings.showLineNumbers ? 'bg-inverse' : 'bg-line-strong'}`}
        >
          <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.showLineNumbers ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className="p-4 rounded-[10px] border border-line bg-sunken">
        <div className="text-sm font-semibold text-fg mb-1">Custom RPC endpoint</div>
        <div className="text-xs text-fg-subtle mb-3">
          Highest-priority override for <span className="font-mono uppercase">{resolvedChain}</span> on <span className="font-mono">{network}</span>. Leave blank to use the default.
          {endpointsForNetwork.length > 1 ? ` ${endpointsForNetwork.length - 1} more backup endpoint${endpointsForNetwork.length > 2 ? 's are' : ' is'} configured in Settings.` : ' Add backup endpoints for failover in Settings → Network & RPC.'}
        </div>
        <input
          type="text"
          value={primaryEndpoint}
          onChange={(e) => {
            const value = e.target.value;
            const next = value.trim()
              ? [value, ...endpointsForNetwork.slice(1)]
              : endpointsForNetwork.slice(1);
            appStore.updateSettings({
              [settingsKey]: { ...customRpcForChain, [network]: next }
            })
          }}
          placeholder="https://..."
          className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs font-mono text-fg focus:border-line-strong focus:outline-none transition-colors"
        />
      </div>
    </div>
  );
};
