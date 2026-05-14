import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, History, Box, Settings, LayoutGrid, Database, Activity, ShieldCheck } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import logoDark from '../../assets/txio2.png';
import logoLight from '../../assets/txio3.png';

interface SidebarNavProps {
  activeMode: string;
  onModeChange: (mode: string) => void;
  activeTabType?: string;
}

const TxioLogo = () => {
  const { theme } = useAppStore();
  const logo = theme === 'dark' ? logoDark : logoLight;
  
  return (
    <img 
      src={logo.src} 
      alt="txio" 
      className="w-7 h-7 object-contain drop-shadow-[0_0_12px_rgba(123,63,242,0.6)]"
    />
  );
};

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
}) => {
  const isActive = activeMode === mode;
  
  return (
    <button 
      onClick={() => onModeChange(mode)} 
      className="relative group w-full flex items-center justify-center py-4"
      title={label}
    >
      <AnimatePresence>
        {isActive && (
          <motion.div 
            layoutId="nav-pill"
            className="absolute left-0 w-1 h-8 bg-gradient-to-b from-electric-violet to-soft-purple rounded-r-full shadow-[0_0_15px_rgba(123,63,242,0.8)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          />
        )}
      </AnimatePresence>
      
      <div className={`
        relative p-2.5 rounded-2xl transition-all duration-500
        ${isActive 
          ? 'text-white bg-white/5 shadow-inner' 
          : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]'}
      `}>
        <Icon size={22} strokeWidth={isActive ? 2 : 1.5} className="relative z-10" />
        
        {isActive && (
          <motion.div 
            layoutId="nav-glow"
            className="absolute inset-0 bg-electric-violet/10 blur-xl rounded-full"
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          />
        )}
      </div>
    </button>
  );
};

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeMode,
  onModeChange,
  activeTabType
}) => {
  const containerVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-16 bg-near-black border-r border-white/5 flex flex-col items-center py-6 gap-2 z-20 shrink-0 relative overflow-hidden"
    >
      {/* Background Accent */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-electric-violet/5 to-transparent pointer-events-none"></div>

      <motion.div 
        variants={itemVariants}
        className="mb-8 group cursor-pointer relative"
        onClick={() => appStore.setActiveTab(null)}
      >
        <div className="absolute inset-0 bg-electric-violet/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div className="relative z-10 p-2 rounded-2xl bg-white/[0.03] border border-white/5 group-hover:border-white/10 transition-all duration-500 group-hover:rotate-[360deg]">
          <TxioLogo />
        </div>
      </motion.div>
      
      <div className="w-8 h-px bg-white/5 mb-4 opacity-50"></div>

      <motion.div variants={itemVariants} className="w-full">
        <NavItem 
          mode="collections" 
          icon={LayoutGrid} 
          label="Collections" 
          activeMode={activeMode}
          onModeChange={onModeChange}
        />
      </motion.div>
      
      <motion.div variants={itemVariants} className="w-full">
        <NavItem 
          mode="history" 
          icon={Activity} 
          label="History" 
          activeMode={activeMode}
          onModeChange={onModeChange}
        />
      </motion.div>
      
      <motion.div variants={itemVariants} className="w-full">
        <NavItem 
          mode="env" 
          icon={Database} 
          label="Environments" 
          activeMode={activeMode}
          onModeChange={onModeChange}
        />
      </motion.div>

      <div className="flex-1" />
      
      <motion.div variants={itemVariants} className="w-full flex justify-center pb-2">
        <button 
          onClick={() => appStore.openTab('settings')} 
          className={`
            relative p-3 transition-all duration-500 rounded-2xl group
            ${activeTabType === 'settings' 
              ? 'text-electric-violet bg-white/5' 
              : 'text-slate-600 hover:text-slate-300 hover:bg-white/5'}
          `} 
          title="Settings"
        >
          <Settings size={20} strokeWidth={1.5} className="group-hover:rotate-90 transition-transform duration-700" />
          {activeTabType === 'settings' && (
             <div className="absolute inset-0 bg-electric-violet/10 blur-xl rounded-full" />
          )}
        </button>
      </motion.div>
    </motion.div>
  );
};