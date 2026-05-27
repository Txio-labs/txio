import React from 'react';
import { BadgeCheck, ChevronRight, Key, LogOut, Shield, User, Users } from 'lucide-react';

import { Avatar } from '../ui/Avatar';
import { UserProfile } from '../../types';
import { ProfileTab } from './types';

interface ProfileSidebarProps {
    user: UserProfile;
    activeTab: ProfileTab;
    onTabChange: (tab: ProfileTab) => void;
    onLogout: () => void;
}

interface NavItem {
    id: ProfileTab;
    label: string;
    icon: React.ElementType;
}

const NAV_ITEMS: readonly NavItem[] = [
    { id: 'general', label: 'General', icon: User },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'api-keys', label: 'API keys', icon: Key },
] as const;

const TabButton: React.FC<{
    item: NavItem;
    isActive: boolean;
    onClick: (id: ProfileTab) => void;
}> = ({ item, isActive, onClick }) => {
    const { id, label, icon: Icon } = item;
    return (
        <button
            onClick={() => onClick(id)}
            className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                isActive
                    ? 'bg-electric-violet/[0.1] text-white'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
            }`}
        >
            <Icon
                size={15}
                className={isActive ? 'text-electric-violet' : 'text-slate-500 group-hover:text-slate-300'}
            />
            <span className="flex-1 text-sm font-medium">{label}</span>
            {isActive && <ChevronRight size={13} className="text-electric-violet" />}
        </button>
    );
};

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
    user,
    activeTab,
    onTabChange,
    onLogout,
}) => {
    const profileHandle = `@${user.email.split('@')[0].toLowerCase()}`;

    return (
        <div className="flex w-full shrink-0 flex-col border-b border-white/[0.08] bg-dark-indigo-glow p-4 md:w-[260px] md:border-b-0 md:border-r md:border-white/[0.08]">
            {/* Identity */}
            <div className="flex items-center gap-3 px-1 py-2">
                <Avatar size="lg" src={user.avatarUrl} seed={user.email} />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{user.name}</div>
                    <div className="truncate text-xs text-slate-500">{user.email}</div>
                </div>
            </div>

            <div className="mt-2 flex items-center gap-2 px-1 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 text-emerald-400">
                    <BadgeCheck size={12} />
                    Verified
                </span>
                <span className="text-slate-700">·</span>
                <span className="truncate font-mono">{profileHandle}</span>
            </div>

            {/* Navigation */}
            <nav className="mt-6 space-y-0.5" aria-label="Profile navigation">
                {NAV_ITEMS.map((item) => (
                    <TabButton
                        key={item.id}
                        item={item}
                        isActive={activeTab === item.id}
                        onClick={onTabChange}
                    />
                ))}
            </nav>

            {/* Sign out — desktop */}
            <div className="mt-auto pt-6 hidden md:block">
                <button
                    onClick={onLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-400 hover:bg-rose-500/[0.08] hover:text-rose-300 transition-colors"
                >
                    <LogOut size={15} className="text-slate-500 group-hover:text-rose-400" />
                    Sign out
                </button>
            </div>
        </div>
    );
};
