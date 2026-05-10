
import React, { useState } from 'react';
import { Settings, Server, Layout, Shield, Monitor, Globe, ChevronRight } from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { Network } from '../types';

export const SettingsPage: React.FC = () => {
  const { settings } = useAppStore();
  const [activeSection, setActiveSection] = useState<'general' | 'network' | 'appearance'>('general');

  const MenuLink = ({ id, label, icon: Icon }: { id: typeof activeSection, label: string, icon: any }) => (
    <button 
      onClick={() => setActiveSection(id)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
        activeSection === id 
        ? 'bg-slate-800 text-white' 
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={activeSection === id ? 'text-sui-400' : 'text-slate-500'} />
        {label}
      </div>
      {activeSection === id && <ChevronRight size={14} className="text-slate-500" />}
    </button>
  );

  return (
    <div className="h-full bg-slate-950 flex flex-col md:flex-row overflow-hidden">
      {/* Settings Sidebar */}
      <div className="w-full md:w-64 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 p-4 md:p-6 shrink-0">
        <h1 className="text-xl font-bold text-white mb-6 flex items-center gap-2 px-2">
            <Settings size={24} className="text-slate-400" /> Settings
        </h1>
        <div className="space-y-1">
          <MenuLink id="general" label="General" icon={Monitor} />
          <MenuLink id="network" label="Network & RPC" icon={Server} />
          <MenuLink id="appearance" label="Appearance" icon={Layout} />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
        <div className="max-w-3xl space-y-8">
            {activeSection === 'general' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">General Settings</h2>
                        <p className="text-slate-400 text-sm">Configure basic editor behavior and analytics.</p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-200">Editor Auto-Save</h3>
                                <p className="text-xs text-slate-500 mt-1">Automatically save changes to requests in tabs.</p>
                            </div>
                            <button 
                                onClick={() => appStore.updateSettings({ autoSave: !settings.autoSave })}
                                className={`w-11 h-6 rounded-full transition-colors relative ${settings.autoSave ? 'bg-sui-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.autoSave ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-200">Show Line Numbers</h3>
                                <p className="text-xs text-slate-500 mt-1">Display line numbers in JSON editors and snippets.</p>
                            </div>
                            <button 
                                onClick={() => appStore.updateSettings({ showLineNumbers: !settings.showLineNumbers })}
                                className={`w-11 h-6 rounded-full transition-colors relative ${settings.showLineNumbers ? 'bg-sui-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.showLineNumbers ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-800 pt-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-200">Telemetry</h3>
                                <p className="text-xs text-slate-500 mt-1">Allow Flow to send anonymous usage data.</p>
                            </div>
                            <button 
                                onClick={() => appStore.updateSettings({ telemetry: !settings.telemetry })}
                                className={`w-11 h-6 rounded-full transition-colors relative ${settings.telemetry ? 'bg-sui-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.telemetry ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                        <h3 className="text-sm font-bold text-slate-200">Preferred Explorer</h3>
                        <p className="text-xs text-slate-500">Choose the block explorer used for external links.</p>
                        <div className="grid grid-cols-3 gap-3">
                             {['suiscan', 'suiexplorer', 'suivision'].map((exp) => (
                                 <button 
                                    key={exp}
                                    onClick={() => appStore.updateSettings({ explorer: exp as any })}
                                    className={`px-4 py-3 rounded-lg border text-xs font-bold capitalize transition-all ${
                                        settings.explorer === exp 
                                        ? 'bg-sui-600/20 border-sui-500 text-sui-400' 
                                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800'
                                    }`}
                                 >
                                     {exp === 'suiexplorer' ? 'Sui Explorer' : exp}
                                 </button>
                             ))}
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'network' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">Network & RPC</h2>
                        <p className="text-slate-400 text-sm">Manage custom RPC endpoints for each environment.</p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                         {['mainnet', 'testnet', 'devnet'].map((net) => (
                             <div key={net} className="space-y-2">
                                 <div className="flex justify-between">
                                     <label className="text-xs font-bold text-slate-400 uppercase">{net}</label>
                                     <span className="text-[10px] text-slate-600">Default: https://fullnode.{net}.sui.io</span>
                                 </div>
                                 <input 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white font-mono placeholder:text-slate-700 focus:border-sui-500 outline-none"
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
                        <h2 className="text-xl font-bold text-white mb-1">Appearance</h2>
                        <p className="text-slate-400 text-sm">Customize the look and feel of the IDE.</p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                        <div className="space-y-3">
                             <h3 className="text-sm font-bold text-slate-200">Theme Preference</h3>
                             <div className="grid grid-cols-2 gap-4">
                                 <button 
                                    onClick={() => appStore.updateSettings({ theme: 'dark' })}
                                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${settings.theme === 'dark' ? 'bg-slate-800 border-sui-500 ring-1 ring-sui-500/50' : 'bg-slate-950 border-slate-700 opacity-50'}`}
                                 >
                                     <div className="w-full h-20 bg-slate-900 rounded-lg border border-slate-700 mb-2"></div>
                                     <span className="text-xs font-bold text-white">Dark Mode</span>
                                 </button>
                                 <button 
                                    onClick={() => appStore.updateSettings({ theme: 'light' })}
                                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${settings.theme === 'light' ? 'bg-slate-100 border-sui-500 ring-1 ring-sui-500/50' : 'bg-slate-950 border-slate-700 opacity-50'}`}
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
