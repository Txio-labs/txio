
import React, { useState } from 'react';
import { Settings, Server, Layout, Shield, Monitor, Globe, ChevronRight } from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { NETWORKS } from '@/lib/constants';
import { ALL_NETWORKS, Network } from '../types';

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
      ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon size={18} className={isActive ? 'text-electric-violet' : 'text-slate-500'} />
      {label}
    </div>
    {isActive && <ChevronRight size={14} className="text-slate-500" />}
  </button>
);

export const SettingsPage: React.FC = () => {
  const { settings } = useAppStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  return (
    <div className="h-full bg-slate-50 dark:bg-near-black flex flex-col md:flex-row overflow-hidden">
      {/* Settings Sidebar */}
      <div className="w-full md:w-64 bg-slate-50 dark:bg-near-black border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/5 p-4 md:p-6 shrink-0">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 px-2">
            <Settings size={24} className="text-slate-400" /> Settings
        </h1>
        <div className="space-y-1">
          <MenuLink id="general" label="General" icon={Monitor} isActive={activeSection === 'general'} onSelect={setActiveSection} />
          <MenuLink id="network" label="Network & RPC" icon={Server} isActive={activeSection === 'network'} onSelect={setActiveSection} />
          <MenuLink id="appearance" label="Appearance" icon={Layout} isActive={activeSection === 'appearance'} onSelect={setActiveSection} />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
        <div className="max-w-3xl space-y-8">
            {activeSection === 'general' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">General Settings</h2>
                        <p className="text-slate-400 text-sm">Configure basic editor behavior and analytics.</p>
                    </div>

                    <div className="bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/5 rounded-xl p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Editor Auto-Save</h3>
                                <p className="text-xs text-slate-500 mt-1">Debounced auto-save of the active request tab (savedTabs) while editing.</p>
                            </div>
                            <button 
                                onClick={() => appStore.updateSettings({ autoSave: !settings.autoSave })}
                                className={`w-11 h-6 rounded-full transition-colors relative ${settings.autoSave ? 'bg-electric-violet' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.autoSave ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Show Line Numbers</h3>
                                <p className="text-xs text-slate-500 mt-1">Show or hide the line-number gutter in JSON editors.</p>
                            </div>
                            <button 
                                onClick={() => appStore.updateSettings({ showLineNumbers: !settings.showLineNumbers })}
                                className={`w-11 h-6 rounded-full transition-colors relative ${settings.showLineNumbers ? 'bg-electric-violet' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.showLineNumbers ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/5 pt-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Telemetry</h3>
                                <p className="text-xs text-slate-500 mt-1">Queue anonymous product events locally when enabled (no third-party network yet).</p>
                            </div>
                            <button 
                                onClick={() => appStore.updateSettings({ telemetry: !settings.telemetry })}
                                className={`w-11 h-6 rounded-full transition-colors relative ${settings.telemetry ? 'bg-electric-violet' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.telemetry ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/5 rounded-xl p-6 space-y-6">
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Preferred Explorers</h3>
                            <p className="text-xs text-slate-500">Choose the block explorer used for external wallet links, per chain family.</p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Sui</p>
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
                                            className={`px-4 py-3 rounded-lg border text-xs font-bold transition-all ${
                                                settings.explorer === exp.id
                                                    ? 'bg-electric-violet/20 border-sui-500 text-electric-violet'
                                                    : 'bg-slate-50 dark:bg-near-black border-slate-200 dark:border-white/10 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            {exp.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">EVM</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {([
                                        { id: 'family', label: 'Chain-native', hint: 'Etherscan-family' },
                                        { id: 'blockscout', label: 'Blockscout', hint: 'Where available' }
                                    ] as const).map((exp) => (
                                        <button
                                            key={exp.id}
                                            type="button"
                                            onClick={() => appStore.updateSettings({ evmExplorer: exp.id })}
                                            className={`px-4 py-3 rounded-lg border text-xs font-bold transition-all text-left ${
                                                settings.evmExplorer === exp.id
                                                    ? 'bg-electric-violet/20 border-sui-500 text-electric-violet'
                                                    : 'bg-slate-50 dark:bg-near-black border-slate-200 dark:border-white/10 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <div>{exp.label}</div>
                                            <div className="text-[10px] font-medium opacity-70 mt-0.5">{exp.hint}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Stellar</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {([
                                        { id: 'stellarexpert', label: 'StellarExpert' },
                                        { id: 'stellarchain', label: 'StellarChain' }
                                    ] as const).map((exp) => (
                                        <button
                                            key={exp.id}
                                            type="button"
                                            onClick={() => appStore.updateSettings({ stellarExplorer: exp.id })}
                                            className={`px-4 py-3 rounded-lg border text-xs font-bold transition-all ${
                                                settings.stellarExplorer === exp.id
                                                    ? 'bg-electric-violet/20 border-sui-500 text-electric-violet'
                                                    : 'bg-slate-50 dark:bg-near-black border-slate-200 dark:border-white/10 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
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
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Network & RPC</h2>
                        <p className="text-slate-400 text-sm">Manage custom RPC endpoints for each environment.</p>
                    </div>

                    <div className="bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/5 rounded-xl p-6 space-y-6">
                         {ALL_NETWORKS.map((net) => (
                             <div key={net} className="space-y-2">
                                 <div className="flex justify-between">
                                     <label className="text-xs font-bold text-slate-400 uppercase">{net}</label>
                                     <span className="text-[10px] text-slate-600">Default: {NETWORKS[net]}</span>
                                 </div>
                                 <input 
                                    className="w-full bg-slate-50 dark:bg-near-black border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white font-mono placeholder:text-slate-700 focus:border-electric-violet outline-none"
                                    placeholder={`Custom ${net} RPC URL`}
                                    value={settings.customRpc[net as Network]}
                                    onChange={(e) => appStore.updateSettings({ 
                                        customRpc: { ...settings.customRpc, [net]: e.target.value } 
                                    })}
                                 />
                             </div>
                         ))}
                    </div>
                </div>
            )}
            
             {activeSection === 'appearance' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Appearance</h2>
                        <p className="text-slate-400 text-sm">Customize the look and feel of the IDE.</p>
                    </div>

                    <div className="bg-white dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/5 rounded-xl p-6 space-y-6">
                        <div className="space-y-3">
                             <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Theme Preference</h3>
                             <div className="grid grid-cols-2 gap-4">
                                 <button 
                                    onClick={() => appStore.updateSettings({ theme: 'dark' })}
                                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${settings.theme === 'dark' ? 'bg-slate-200 dark:bg-slate-800 border-sui-500 ring-1 ring-electric-violet/50' : 'bg-slate-50 dark:bg-near-black border-slate-200 dark:border-white/10 opacity-50'}`}
                                 >
                                     <div className="w-full h-20 bg-white dark:bg-dark-indigo-glow rounded-lg border border-slate-200 dark:border-white/10 mb-2"></div>
                                     <span className="text-xs font-bold text-slate-900 dark:text-white">Dark Mode</span>
                                 </button>
                                 <button 
                                    onClick={() => appStore.updateSettings({ theme: 'light' })}
                                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${settings.theme === 'light' ? 'bg-slate-100 border-sui-500 ring-1 ring-electric-violet/50' : 'bg-slate-50 dark:bg-near-black border-slate-200 dark:border-white/10 opacity-50'}`}
                                 >
                                     <div className="w-full h-20 bg-white rounded-lg border border-slate-200 mb-2"></div>
                                     <span className="text-xs font-bold text-slate-400">Light Mode</span>
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