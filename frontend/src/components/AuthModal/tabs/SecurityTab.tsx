import React from 'react';
import { Shield } from 'lucide-react';

export const SecurityTab: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Security</h2>
        <p className="text-slate-400 text-sm">Update your password and manage sessions.</p>
      </div>
      
      <div className="p-4 bg-amber-900/10 border border-amber-900/30 rounded-lg text-amber-500/80 text-sm flex gap-3">
        <Shield className="shrink-0" size={20} />
        <div>
          <p className="font-bold mb-1">Two-Factor Authentication is disabled</p>
          <p className="text-xs opacity-80">
            We recommend enabling 2FA to keep your account secure.
          </p>
        </div>
      </div>
    </div>
  );
};