import React from 'react';
import { Folder, History, Box, Settings } from 'lucide-react';
import { appStore } from '@/lib/store';
import logo from '../../assets/logo.png';

interface SidebarNavProps {
  activeMode: string;
  onModeChange: (mode: string) => void;
  activeTabType?: string;
}

const FlowLogo = () => (
  <img 
    src={logo} 
    alt="Flow" 
    className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(14,165,233,0.5)] transition-transform duration-500 group-hover:scale-110"
  />
);

interface NavItemProps {
  mode: string;
  icon: React.ElementType;
  label: string;
  activeMode: string;
  onModeChange: (mode: string) => void;
}

const NavItem: React.FC<NavItemProps> = ({ 
  mode, 
  icon: Icon, 
  label,
  activeMode,
  onModeChange
}) => (
  <button 
    onClick={() => onModeChange(mode)} 
    className={`relative group p-2.5 rounded-xl transition-all duration-300 flex flex-col items-center gap-1 ${
      activeMode === mode 
      ? 'bg-gradient-to-br from-white/10 to-transparent text-sui-400 border border-white/10' 
      : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
    }`}
    title={label}
  >
    <Icon size={20} strokeWidth={1.5} className={activeMode === mode ? "drop-shadow-[0_0_5px_rgba(56,189,248,0.4)]" : ""} />
  </button>
);

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeMode,
  onModeChange,
  activeTabType
}) => {
  return (
    <div className="w-16 bg-black border-r border-white/10 flex flex-col items-center py-4 gap-4 z-20 shrink-0">
      <div 
        className="mb-2 group cursor-pointer relative"
        onClick={() => appStore.setActiveTab(null)}
      >
        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:rotate-12 relative z-10">
          <FlowLogo />
        </div>
      </div>
      
      <div className="w-8 h-px bg-white/10 my-1"></div>

      <NavItem 
        mode="collections" 
        icon={Folder} 
        label="Collections" 
        activeMode={activeMode}
        onModeChange={onModeChange}
      />
      <NavItem 
        mode="history" 
        icon={History} 
        label="History" 
        activeMode={activeMode}
        onModeChange={onModeChange}
      />
      <NavItem 
        mode="env" 
        icon={Box} 
        label="Environments" 
        activeMode={activeMode}
        onModeChange={onModeChange}
      />
      
      <div className="flex-1" />
      
      <button 
        onClick={() => appStore.openTab('settings')} 
        className={`p-3 transition-all duration-300 rounded-full ${activeTabType === 'settings' ? 'text-sui-400 bg-white/10 shadow-[0_0_10px_rgba(14,165,233,0.3)]' : 'text-slate-600 hover:text-slate-300 hover:bg-white/5'}`} 
        title="Settings"
      >
        <Settings size={20} strokeWidth={1.5} />
      </button>
    </div>
  );
};