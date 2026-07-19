import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AuthModalProps, ProfileTab, ApiKey } from './types';
import { LoginSignupForm } from './LoginSignupForm';
import { ProfileSidebar } from './ProfileSidebar';
import { GeneralTab } from './tabs/GeneralTab';
import { TeamTab } from './tabs/TeamTab';
import { SecurityTab } from './tabs/SecurityTab';
import { ApiKeysTab } from './tabs/ApiKeysTab';
import { appStore } from '@/lib/store';

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  user,
  onLogin, 
  onSignup, 
  onLogout,
  teamMembers = []
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [activeTab, setActiveTab] = useState<ProfileTab>('general');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const isProfileDrawer = Boolean(user);

  if (!isOpen) return null;

  const handleFormSubmit = async (data: { name: string; email: string; password: string }) => {
    try {
      if (mode === 'login') {
        await onLogin(data.email, data.password);
      } else {
        await onSignup(data.name, data.email, data.password);
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Authentication failed. Please try again.';

      appStore.showToast(message, 'error');
      throw error;
    }
  };

  const renderTabContent = () => {
    if (!user) return null;
    
    switch (activeTab) {
      case 'general':
        return <GeneralTab user={user} onLogout={onLogout} />;
      case 'team':
        return <TeamTab teamMembers={teamMembers} />;
      case 'security':
        return <SecurityTab />;
      case 'api-keys':
        return <ApiKeysTab apiKeys={apiKeys} onApiKeysChange={setApiKeys} />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-50 bg-near-black/70 backdrop-blur-sm animate-in fade-in duration-200 font-sans ${
        isProfileDrawer
          ? 'flex justify-end p-0'
          : 'flex items-center justify-center p-4'
      }`}
    >
      <div 
        className={`bg-dark-indigo-glow border border-white/10 shadow-2xl w-full overflow-hidden relative transition-all duration-300 flex flex-col ${
          isProfileDrawer
            ? 'h-full max-w-full sm:max-w-[820px] md:max-w-[1080px] rounded-none border-y-0 border-r-0 border-l-white/10 animate-in slide-in-from-right-8 duration-300'
            : 'max-w-md h-auto rounded-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className={`absolute top-4 right-4 z-10 text-slate-500 hover:text-white transition-colors p-1 rounded-full hover:bg-white/5 ${
            isProfileDrawer
              ? 'bg-near-black/70'
              : 'bg-dark-indigo-glow/50'
          }`}
        >
          <X size={20} />
        </button>

        {user ? (
          <div className="flex h-full flex-col md:flex-row">
            <ProfileSidebar 
              user={user}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onLogout={onLogout}
            />
            
            <div className="relative min-w-0 flex-1 overflow-hidden bg-[linear-gradient(180deg,#070709_0%,#003152_52%,#060608_100%)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(173,223,241,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(127,196,227,0.1),transparent_30%)]" />
              <div className="relative h-full overflow-y-auto p-5 md:p-8 custom-scrollbar">
                {renderTabContent()}
              </div>
            </div>
          </div>
        ) : (
          <LoginSignupForm 
            mode={mode}
            onModeChange={setMode}
            onSubmit={handleFormSubmit}
          />
        )}
      </div>
    </div>
  );
};
