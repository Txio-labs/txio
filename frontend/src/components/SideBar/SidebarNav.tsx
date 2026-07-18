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
      className="w-6 h-6 object-contain drop-shadow-[0_0_6px_rgba(173,223,241,0.35)]"
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
      className="relative group w-full flex items-center justify-center py-3"
      title={label}
    >
      <AnimatePresence>
        {isActive && (
          <motion.div
            layoutId="nav-pill"
            className="absolute left-0 w-[2px] h-6 bg-electric-violet rounded-r-full shadow-[0_0_10px_rgba(173,223,241,0.6)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          />
        )}
      </AnimatePresence>

      <div className={`
        relative p-2 rounded-xl transition-colors duration-200
        ${isActive
          ? 'text-electric-violet bg-electric-violet/[0.08]'
          : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'}
      `}>
        <Icon size={18} strokeWidth={isActive ? 2 : 1.75} className="relative z-10" />
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
      className="w-14 bg-near-black border-r border-white/[0.06] flex flex-col items-center py-4 gap-1 z-20 shrink-0 relative"
    >
      <motion.div
        variants={itemVariants}
        className="mb-4 group cursor-pointer relative"
        onClick={() => appStore.setActiveTab(null)}
      >
        <div className="relative z-10 p-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06] group-hover:border-electric-violet/30 transition-colors duration-300">
          <TxioLogo />
        </div>
      </motion.div>

      <div className="w-6 h-px bg-white/[0.06] mb-2"></div>

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
      
      <motion.div variants={itemVariants} className="w-full flex justify-center pb-1">
        <button
          onClick={() => appStore.openTab('settings')}
          className={`
            relative p-2 transition-colors duration-200 rounded-xl group
            ${activeTabType === 'settings'
              ? 'text-electric-violet bg-electric-violet/[0.08]'
              : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'}
          `}
          title="Settings"
        >
          <Settings size={18} strokeWidth={1.75} className="group-hover:rotate-45 transition-transform duration-500" />
        </button>
      </motion.div>
    </motion.div>
  );
};