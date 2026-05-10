import React from 'react';
import { Plus, MoreVertical } from 'lucide-react';
import { Avatar } from '../../ui/Avatar';
import { TeamMember } from '../../../types';
import { appStore } from '@/lib/store';

interface TeamTabProps {
  teamMembers?: TeamMember[];
}

export const TeamTab: React.FC<TeamTabProps> = ({ teamMembers = [] }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Team Members</h2>
          <p className="text-slate-400 text-sm">Manage access and roles for your workspace.</p>
        </div>
        <button 
          onClick={() => appStore.showToast('Invite flow not implemented', 'info')} 
          className="px-3 py-1.5 bg-sui-600 hover:bg-sui-500 text-white text-xs font-bold rounded flex items-center gap-2"
        >
          <Plus size={14} /> <span className="hidden sm:inline">Invite Member</span>
        </button>
      </div>

      <div className="border border-slate-800 rounded-lg overflow-x-auto bg-slate-950">
        <table className="w-full text-left text-sm min-w-[500px]">
          <thead className="bg-slate-900 border-b border-slate-800 text-xs text-slate-500 uppercase font-medium">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {teamMembers.map((member) => (
              <tr key={member.id} className="group hover:bg-slate-900/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar size="sm" type={member.name.includes('AI') ? 'bot' : 'user'} seed={member.email} />
                    <div>
                      <div className="text-slate-200 font-medium">{member.name}</div>
                      <div className="text-xs text-slate-500">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                    member.role === 'Admin' ? 'bg-purple-900/20 text-purple-400 border-purple-900/50' : 
                    member.role === 'Editor' ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' : 
                    'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {member.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {member.status === 'Active' ? (
                    <span className="text-emerald-400 text-xs flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Active
                    </span>
                  ) : (
                    <span className="text-amber-400 text-xs flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div> Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button 
                    onClick={() => appStore.showToast('Member actions not implemented', 'info')} 
                    className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800"
                  >
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};