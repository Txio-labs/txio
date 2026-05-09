import React from 'react';
import { User, Users, Shield, Key, Bell, LogOut } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { UserProfile } from '../../types';
import { ProfileTab } from './types';

interface ProfileSidebarProps {
  user: UserProfile;
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  onLogout: () => void;
}

const TabButton: React.FC<{
  id: ProfileTab;
  label: string;
  icon: React.ElementType;
  activeTab: ProfileTab;
  onClick: (id: ProfileTab) => void;
}> = ({ id, label, icon: Icon, activeTab, onClick }) => (
  <button 
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      activeTab === id 
      ? 'bg-slate-800 text-white' 
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
    }`}
  >
    <Icon size={16} className={activeTab === id ? 'text-sui-400' : 'text-slate-500'} />
    {label}
  </button>
);

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  user,
  activeTab,
  onTabChange,
  onLogout
}) => {
  return (
    <div className="w-full md:w-64 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 p-4 md:p-6 flex flex-col shrink-0">
      <div className="flex items-center gap-3 mb-4 md:mb-8 px-2">
        <Avatar size="md" src={user.avatarUrl} seed={user.email} />
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white truncate">{user.name}</h3>
          <p className="text-[10px] text-sui-500 font-bold uppercase tracking-wider">Team Admin</p>
        </div>
      </div>

      <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 no-scrollbar">
        <div className="px-4 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden md:block">
          Settings
        </div>
        <TabButton id="general" label="General" icon={User} activeTab={activeTab} onClick={onTabChange} />
        <TabButton id="team" label="Team" icon={Users} activeTab={activeTab} onClick={onTabChange} />
        <TabButton id="security" label="Security" icon={Shield} activeTab={activeTab} onClick={onTabChange} />
        <TabButton id="api-keys" label="Keys" icon={Key} activeTab={activeTab} onClick={onTabChange} />
      </div>

      <div className="pt-6 border-t border-slate-800 mt-auto hidden md:block">
        <button 
          onClick={onLogout} 
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded-lg transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
};