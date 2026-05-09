import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AuthModalProps, ProfileTab, ApiKey } from './types';
import { LoginSignupForm } from './LoginSignupForm';
import { ProfileSidebar } from './ProfileSidebar';
import { GeneralTab } from './tabs/GeneralTab';
import { TeamTab } from './tabs/TeamTab';
import { SecurityTab } from './tabs/SecurityTab';
import { ApiKeysTab } from './tabs/ApiKeysTab';

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
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    { id: '1', name: 'Development Key', prefix: 'sui_sk_live_8...3a21', created: Date.now() - 86400000 * 5, lastUsed: '2 hours ago', status: 'active' },
    { id: '2', name: 'Legacy CI', prefix: 'sui_sk_test_9...1b99', created: Date.now() - 86400000 * 30, lastUsed: 'Never', status: 'revoked' }
  ]);

  if (!isOpen) return null;

  const handleFormSubmit = (data: { name: string; email: string; password: string }) => {
    if (mode === 'login') {
      onLogin(data.email, data.password);
    } else {
      onSignup(data.name, data.email, data.password);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div 
        className={`bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full overflow-hidden relative transition-all duration-300 flex flex-col ${
          user ? 'max-w-4xl h-[85vh] md:h-[600px]' : 'max-w-md h-auto'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-slate-500 hover:text-white transition-colors bg-slate-900/50 p-1 rounded-full hover:bg-slate-800"
        >
          <X size={20} />
        </button>

        {user ? (
          <div className="flex flex-col md:flex-row h-full">
            <ProfileSidebar 
              user={user}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onLogout={onLogout}
            />
            
            <div className="flex-1 bg-slate-900 p-6 md:p-8 overflow-y-auto custom-scrollbar">
              {renderTabContent()}
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