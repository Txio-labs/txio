
import React, { useState } from 'react';
import { Settings, Server, Layout, Shield, Monitor, Globe, ChevronRight, Plus, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { EVM_NETWORKS, NETWORKS, SOLANA_NETWORKS, STELLAR_NETWORKS } from '@/lib/constants';
import { AppSettings, ALL_NETWORKS, Network } from '../types';

type RpcSettingsKey = 'customRpc' | 'evmCustomRpc' | 'stellarCustomRpc' | 'solanaCustomRpc';

/**
 * Editable, ordered list of failover RPC endpoints for one (chain, network)
 * pair. First entry is tried first; the built-in default (shown separately)
 * is always the final fallback and isn't part of this list.
 */
const RpcEndpointListEditor: React.FC<{
  endpoints: string[];
  onChange: (next: string[]) => void;
}> = ({ endpoints, onChange }) => {
  const [draft, setDraft] = useState('');

  const addEndpoint = () => {
    const value = draft.trim();
    if (!value || endpoints.includes(value)) {
      return;
    }
    onChange([...endpoints, value]);
    setDraft('');
  };

  const removeAt = (index: number) => {
    onChange(endpoints.filter((_, i) => i !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= endpoints.length) {
      return;
    }
    const next = [...endpoints];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      {endpoints.map((url, index) => (
        <div key={`${url}-${index}`} className="flex items-center gap-1.5">
          <span className="w-4 shrink-0 text-center text-[12px] font-semibold text-fg-subtle">{index + 1}</span>
          <span className="flex-1 min-w-0 truncate rounded-md border border-line bg-surface px-2.5 py-1.5 font-mono text-xs text-fg">
            {url}
          </span>
          <button
            type="button"
            onClick={() => move(index, -1)}
            disabled={index === 0}
            title="Higher priority"
            className="rounded p-1 text-fg-subtle hover:bg-hover hover:text-fg disabled:opacity-30"
          >
            <ArrowUp size={12} />
          </button>
          <button
            type="button"
            onClick={() => move(index, 1)}
            disabled={index === endpoints.length - 1}
            title="Lower priority"
            className="rounded p-1 text-fg-subtle hover:bg-hover hover:text-fg disabled:opacity-30"
          >
            <ArrowDown size={12} />
          </button>
          <button
            type="button"
            onClick={() => removeAt(index)}
            title="Remove"
            className="rounded p-1 text-fg-subtle hover:bg-red-500/10 hover:text-red-500"
          >
            <X size={12} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-1.5">
        <span className="w-4 shrink-0" />
        <input
          className="flex-1 min-w-0 bg-surface border border-line rounded-md px-2.5 py-1.5 text-xs text-fg font-mono placeholder:text-fg-subtle dark:placeholder:text-slate-700 focus:border-line-strong outline-none"
          placeholder="Add a backup RPC URL…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addEndpoint();
            }
          }}
        />
        <button
          type="button"
          onClick={addEndpoint}
          disabled={!draft.trim()}
          title="Add endpoint"
          className="rounded p-1.5 text-fg-subtle hover:bg-hover hover:text-fg disabled:opacity-30"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};

type SettingsSection = 'general' | 'network' | 'appearance';

const MenuLink = ({
  id,
  label,
  icon: Icon,
  isActive,
  onSelect,
}: { id: SettingsSection, label: string, icon: any, isActive: boolean, onSelect: (id: SettingsSection) => void }) => (
  <button
    onClick={() => onSelect(id)}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      isActive
      ? 'bg-active text-fg'
      : 'text-fg-muted hover:text-fg hover:bg-hover'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon size={18} className={isActive ? 'text-fg' : 'text-fg-subtle'} />
      {label}
    </div>
    {isActive && <ChevronRight size={14} className="text-fg-subtle" />}
  </button>
);

export const SettingsPage: React.FC = () => {
  const { settings } = useAppStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  return (
    <div className="h-full bg-surface flex flex-col md:flex-row overflow-hidden">
      {/* Settings Sidebar */}
      <div className="w-full md:w-64 bg-surface border-b md:border-b-0 md:border-r border-line p-4 md:p-6 shrink-0">
        <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-fg flex items-center gap-3">
<span className="h-9 w-9 rounded-[9px] border border-line bg-surface shadow-card flex items-center justify-center text-fg-muted shrink-0"><Settings size={16} /></span>
Settings
        </h1>
        <div className="space-y-1">
          <MenuLink id="general" label="General" icon={Monitor} isActive={activeSection === 'general'} onSelect={setActiveSection} />
          <MenuLink id="network" label="Network & RPC" icon={Server} isActive={activeSection === 'network'} onSelect={setActiveSection} />
          <MenuLink id="appearance" label="Appearance" icon={Layout} isActive={activeSection === 'appearance'} onSelect={setActiveSection} />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
        <div className="w-full space-y-8">
            {activeSection === 'general' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                        <h2 className="text-xl font-semibold text-fg mb-1">General Settings</h2>
                        <p className="text-fg-subtle text-sm">Configure basic editor behavior and analytics.</p>
                    </div>

                    <div className="bg-elevated border border-line rounded-[10px] p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-fg">Editor Auto-Save</h3>
                                <p className="text-[14px] text-fg-muted mt-1.5">Debounced auto-save of the active request tab (savedTabs) while editing.</p>
                            </div>
                            <button 
                                onClick={() => appStore.updateSettings({ autoSave: !settings.autoSave })}
                                className={`w-11 h-6 rounded-full transition-colors relative ${settings.autoSave ? 'bg-inverse' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.autoSave ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-fg">Show Line Numbers</h3>
                                <p className="text-[14px] text-fg-muted mt-1.5">Show or hide the line-number gutter in JSON editors.</p>
                            </div>
                            <button 
                                onClick={() => appStore.updateSettings({ showLineNumbers: !settings.showLineNumbers })}
                                className={`w-11 h-6 rounded-full transition-colors relative ${settings.showLineNumbers ? 'bg-inverse' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.showLineNumbers ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between border-t border-line pt-6">
                            <div>
                                <h3 className="text-sm font-semibold text-fg">Telemetry</h3>
                                <p className="text-[14px] text-fg-muted mt-1.5">Queue anonymous product events locally when enabled (no third-party network yet).</p>
                            </div>
                            <button 
                                onClick={() => appStore.updateSettings({ telemetry: !settings.telemetry })}
                                className={`w-11 h-6 rounded-full transition-colors relative ${settings.telemetry ? 'bg-inverse' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.telemetry ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-elevated border border-line rounded-[10px] p-6 space-y-6">
                        <div>
                            <h3 className="text-sm font-semibold text-fg">Preferred Explorers</h3>
                            <p className="text-xs text-fg-subtle">Choose the block explorer used for external wallet links, per chain family.</p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <p className="text-[12px] font-semibold uppercase tracking-wide text-fg-muted mb-2">Sui</p>
                                <div className="grid grid-cols-3 gap-3">
                                    {([
                                        { id: 'suiscan', label: 'Suiscan' },
                                        { id: 'suiexplorer', label: 'Sui Explorer' },
                                        { id: 'suivision', label: 'Suivision' }
                                    ] as const).map((exp) => (
                                        <button
                                            key={exp.id}
                                            type="button"
                                            onClick={() => appStore.updateSettings({ explorer: exp.id })}
                                            className={`px-4 py-3 rounded-lg border text-xs font-semibold transition-all ${
                                                settings.explorer === exp.id
                                                    ? 'bg-active border-fg/40 text-fg'
                                                    : 'bg-surface border-line text-fg-muted hover:bg-hover'
                                            }`}
                                        >
                                            {exp.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-[12px] font-semibold uppercase tracking-wide text-fg-muted mb-2">EVM</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {([
                                        { id: 'family', label: 'Chain-native', hint: 'Etherscan-family' },
                                        { id: 'blockscout', label: 'Blockscout', hint: 'Where available' }
                                    ] as const).map((exp) => (
                                        <button
                                            key={exp.id}
                                            type="button"
                                            onClick={() => appStore.updateSettings({ evmExplorer: exp.id })}
                                            className={`px-4 py-3 rounded-lg border text-xs font-semibold transition-all text-left ${
                                                settings.evmExplorer === exp.id
                                                    ? 'bg-active border-fg/40 text-fg'
                                                    : 'bg-surface border-line text-fg-muted hover:bg-hover'
                                            }`}
                                        >
                                            <div>{exp.label}</div>
                                            <div className="text-[12px] font-medium opacity-70 mt-0.5">{exp.hint}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-[12px] font-semibold uppercase tracking-wide text-fg-muted mb-2">Stellar</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {([
                                        { id: 'stellarexpert', label: 'StellarExpert' },
                                        { id: 'stellarchain', label: 'StellarChain' }
                                    ] as const).map((exp) => (
                                        <button
                                            key={exp.id}
                                            type="button"
                                            onClick={() => appStore.updateSettings({ stellarExplorer: exp.id })}
                                            className={`px-4 py-3 rounded-lg border text-xs font-semibold transition-all ${
                                                settings.stellarExplorer === exp.id
                                                    ? 'bg-active border-fg/40 text-fg'
                                                    : 'bg-surface border-line text-fg-muted hover:bg-hover'
                                            }`}
                                        >
                                            {exp.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-[12px] font-semibold uppercase tracking-wide text-fg-muted mb-2">Solana</p>
                                <div className="grid grid-cols-3 gap-3">
                                    {([
                                        { id: 'solanaexplorer', label: 'Solana Explorer' },
                                        { id: 'solscan', label: 'Solscan' },
                                        { id: 'solanafm', label: 'SolanaFM' }
                                    ] as const).map((exp) => (
                                        <button
                                            key={exp.id}
                                            type="button"
                                            onClick={() => appStore.updateSettings({ solanaExplorer: exp.id })}
                                            className={`px-4 py-3 rounded-lg border text-xs font-semibold transition-all ${
                                                settings.solanaExplorer === exp.id
                                                    ? 'bg-active border-fg/40 text-fg'
                                                    : 'bg-surface border-line text-fg-muted hover:bg-hover'
                                            }`}
                                        >
                                            {exp.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'network' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                        <h2 className="text-xl font-semibold text-fg mb-1">Network & RPC</h2>
                        <p className="text-fg-subtle text-sm">Add backup RPC endpoints per chain and network. Requests try each in order, top to bottom, before falling back to the built-in default.</p>
                    </div>

                    {([
                        { chainLabel: 'Sui', defaults: NETWORKS, settingsKey: 'customRpc' as const },
                        { chainLabel: 'EVM', defaults: EVM_NETWORKS, settingsKey: 'evmCustomRpc' as const },
                        { chainLabel: 'Stellar', defaults: STELLAR_NETWORKS, settingsKey: 'stellarCustomRpc' as const },
                        { chainLabel: 'Solana', defaults: SOLANA_NETWORKS, settingsKey: 'solanaCustomRpc' as const }
                    ] as { chainLabel: string; defaults: Record<Network, string>; settingsKey: RpcSettingsKey }[]).map(({ chainLabel, defaults, settingsKey }) => (
                        <div key={chainLabel} className="bg-elevated border border-line rounded-[10px] p-6 space-y-6">
                            <h3 className="text-sm font-semibold text-fg">{chainLabel}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {ALL_NETWORKS.map((net) => (
                                    <div key={net} className="space-y-2 min-w-0">
                                        <div className="flex justify-between gap-2">
                                            <label className="text-xs font-semibold text-fg-muted uppercase shrink-0">{net}</label>
                                            <span className="text-[12px] text-fg-subtle truncate">Fallback: {defaults[net]}</span>
                                        </div>
                                        <RpcEndpointListEditor
                                            endpoints={settings[settingsKey][net]}
                                            onChange={(next) => appStore.updateSettings({
                                                [settingsKey]: { ...settings[settingsKey], [net]: next }
                                            } as Partial<AppSettings>)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
             {activeSection === 'appearance' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                        <h2 className="text-xl font-semibold text-fg mb-1">Appearance</h2>
                        <p className="text-fg-subtle text-sm">Customize the look and feel of the IDE.</p>
                    </div>

                    <div className="bg-elevated border border-line rounded-[10px] p-6 space-y-6">
                        <div className="space-y-3">
                             <h3 className="text-sm font-semibold text-fg">Theme Preference</h3>
                             <div className="grid grid-cols-2 gap-4">
                                 <button 
                                    onClick={() => appStore.updateSettings({ theme: 'dark' })}
                                    className={`p-4 rounded-[10px] border flex flex-col items-center gap-2 ${settings.theme === 'dark' ? 'bg-active border-fg/40 ring-1 ring-line-strong' : 'bg-surface border-line opacity-50'}`}
                                 >
                                     <div className="w-full h-20 bg-elevated rounded-lg border border-line mb-2"></div>
                                     <span className="text-xs font-semibold text-fg">Dark Mode</span>
                                 </button>
                                 <button 
                                    onClick={() => appStore.updateSettings({ theme: 'light' })}
                                    className={`p-4 rounded-[10px] border flex flex-col items-center gap-2 ${settings.theme === 'light' ? 'bg-hover border-fg/40 ring-1 ring-line-strong' : 'bg-surface border-line opacity-50'}`}
                                 >
                                     <div className="w-full h-20 bg-white rounded-lg border border-line mb-2"></div>
                                     <span className="text-xs font-semibold text-fg-subtle">Light Mode</span>
                                 </button>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};