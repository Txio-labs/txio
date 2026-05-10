import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { appStore } from '@/lib/store';
import { TabProps } from './types';

export const GeneralTab: React.FC<TabProps & { onLogout: () => void }> = ({ 
  user, 
  onLogout 
}) => {
  const [editName, setEditName] = useState(user?.name || '');

  const handleSaveProfile = () => {
    appStore.updateUser({ name: editName });
    appStore.showToast('Profile updated', 'success');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">General Settings</h2>
        <p className="text-slate-400 text-sm">Manage your personal information and preferences.</p>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Display Name</label>
            <input 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:border-sui-500 outline-none" 
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
            <input 
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:border-sui-500 outline-none cursor-not-allowed opacity-70" 
              defaultValue={user?.email} 
              readOnly 
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <button 
            onClick={handleSaveProfile}
            className="px-4 py-2 bg-sui-600 hover:bg-sui-500 text-white text-xs font-bold rounded-lg transition-all"
          >
            Save Changes
          </button>
        </div>

        {/* Mobile Logout */}
        <button 
          onClick={onLogout} 
          className="w-full flex md:hidden items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded-lg transition-colors border border-red-900/30"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
};