
import React, { useRef, useState } from 'react';
import { User, Mail, Shield, Key, CreditCard, Bell, Award, Zap, Activity, Camera, Image as ImageIcon, Check } from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { Avatar } from '../components/ui/Avatar';

export const ProfilePage: React.FC = () => {
    const { user, history } = useAppStore();
    const [nameInput, setNameInput] = useState(user?.name || '');
    const [isSaving, setIsSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);
    
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    
    if (!user) return <div className="p-10 text-slate-500">Please log in.</div>;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatarUrl' | 'bannerUrl') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                appStore.updateUser({ [field]: result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        setIsSaving(true);
        appStore.updateUser({ name: nameInput });
        setTimeout(() => {
            setIsSaving(false);
            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 2000);
        }, 600);
    };

    return (
        <div className="h-full bg-slate-950 overflow-y-auto custom-scrollbar">
            {/* Header / Banner */}
            <div 
                className="h-48 bg-gradient-to-r from-slate-900 to-slate-800 relative border-b border-slate-800 bg-cover bg-center group"
                style={{ backgroundImage: user.bannerUrl ? `url(${user.bannerUrl})` : undefined }}
            >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                
                <input 
                    type="file" 
                    ref={bannerInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'bannerUrl')}
                />
                <button 
                    onClick={() => bannerInputRef.current?.click()}
                    className="absolute top-4 right-6 p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                    title="Change Banner"
                >
                    <ImageIcon size={16} />
                </button>

                <div className="absolute -bottom-12 left-6 md:left-10 flex items-end gap-6 z-10">
                    <div className="relative group/avatar">
                        <div className="p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
                            <Avatar size="xl" type="user" className="rounded-xl" src={user.avatarUrl} seed={user.email} />
                        </div>
                        
                        <input 
                            type="file" 
                            ref={avatarInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'avatarUrl')}
                        />
                        <button 
                            onClick={() => avatarInputRef.current?.click()}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover/avatar:opacity-100 rounded-2xl transition-opacity m-1.5"
                        >
                            <Camera size={24} />
                        </button>
                    </div>
                    
                    <div className="mb-4">
                        <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-md">{user.name}</h1>
                        <p className="text-slate-300 font-mono text-xs md:text-sm drop-shadow-md">{user.email}</p>
                    </div>
                </div>
                
                <div className="absolute bottom-4 right-6 flex gap-3 z-10 hidden sm:flex">
                     <div className="px-4 py-2 bg-black/40 backdrop-blur rounded-lg border border-white/10 text-xs font-mono text-slate-300">
                        USER ID: <span className="text-white font-bold">{user.id}</span>
                     </div>
                </div>
            </div>

            <div className="mt-16 px-4 md:px-10 pb-10 max-w-6xl mx-auto space-y-8">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-4 md:p-5 rounded-xl">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-sui-500/10 text-sui-400 rounded-lg"><Zap className="w-4 h-4 md:w-5 md:h-5" /></div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase hidden md:inline">Plan</span>
                        </div>
                        <div className="text-lg md:text-xl font-bold text-white">Pro</div>
                        <div className="text-[10px] md:text-xs text-slate-400 mt-1">Unlimited</div>
                    </div>
                     <div className="bg-slate-900 border border-slate-800 p-4 md:p-5 rounded-xl">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><Activity className="w-4 h-4 md:w-5 md:h-5" /></div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase hidden md:inline">Activity</span>
                        </div>
                        <div className="text-lg md:text-xl font-bold text-white">{history.length} Calls</div>
                        <div className="text-[10px] md:text-xs text-slate-400 mt-1">This Session</div>
                    </div>
                     <div className="bg-slate-900 border border-slate-800 p-4 md:p-5 rounded-xl">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><Award className="w-4 h-4 md:w-5 md:h-5" /></div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase hidden md:inline">Reputation</span>
                        </div>
                        <div className="text-lg md:text-xl font-bold text-white">Lvl 42</div>
                        <div className="text-[10px] md:text-xs text-slate-400 mt-1">Sui Builder</div>
                    </div>
                     <div className="bg-slate-900 border border-slate-800 p-4 md:p-5 rounded-xl">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg"><Shield className="w-4 h-4 md:w-5 md:h-5" /></div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase hidden md:inline">Security</span>
                        </div>
                        <div className="text-lg md:text-xl font-bold text-white">Strong</div>
                        <div className="text-[10px] md:text-xs text-slate-400 mt-1">2FA On</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Settings */}
                    <div className="lg:col-span-2 space-y-6">
                        <section>
                            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">Profile Information</h2>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Display Name</label>
                                        <input 
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-300 focus:border-sui-500 outline-none" 
                                            value={nameInput} 
                                            onChange={(e) => setNameInput(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                                        <input className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-500" defaultValue={user.email} disabled />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">GitHub Connected</label>
                                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-300">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> {user.name.replace(' ', '')}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Timezone</label>
                                         <input className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-300 focus:border-sui-500 outline-none" defaultValue="UTC-08:00 (Pacific Time)" />
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button 
                                        onClick={handleSave}
                                        className={`px-4 py-2 bg-sui-600 hover:bg-sui-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${savedSuccess ? 'bg-emerald-600 hover:bg-emerald-500' : ''}`}
                                    >
                                        {isSaving ? 'Saving...' : savedSuccess ? <><Check size={14} /> Saved</> : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">Recent Sessions</h2>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
                                <table className="w-full text-left min-w-[500px]">
                                    <thead className="bg-slate-950 text-xs text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Device</th>
                                            <th className="px-6 py-3 font-medium">Location</th>
                                            <th className="px-6 py-3 font-medium">Last Active</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 text-sm text-slate-400">
                                        <tr>
                                            <td className="px-6 py-4 flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Chrome on macOS</td>
                                            <td className="px-6 py-4">San Francisco, US</td>
                                            <td className="px-6 py-4">Active now</td>
                                        </tr>
                                         <tr>
                                            <td className="px-6 py-4 flex items-center gap-2"><div className="w-2 h-2 bg-slate-600 rounded-full"></div> Firefox on Windows</td>
                                            <td className="px-6 py-4">New York, US</td>
                                            <td className="px-6 py-4">2 days ago</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    {/* Sidebar Settings */}
                    <div className="space-y-6">
                        <section>
                             <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">Workspace & Billing</h2>
                             <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 space-y-1">
                                <button onClick={() => appStore.showToast('Billing page not implemented', 'info')} className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-800 flex items-center gap-3 text-slate-300 transition-colors">
                                    <CreditCard size={18} className="text-slate-500" /> Billing & Invoices
                                </button>
                                <button onClick={() => appStore.showToast('Token management not implemented', 'info')} className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-800 flex items-center gap-3 text-slate-300 transition-colors">
                                    <Key size={18} className="text-slate-500" /> API Access Tokens
                                </button>
                                <button onClick={() => appStore.showToast('Notification preferences not implemented', 'info')} className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-800 flex items-center gap-3 text-slate-300 transition-colors">
                                    <Bell size={18} className="text-slate-500" /> Notifications
                                </button>
                             </div>
                        </section>

                        <div className="p-6 rounded-xl bg-gradient-to-br from-sui-900/40 to-slate-900 border border-sui-500/20">
                            <h3 className="text-white font-bold mb-2">Upgrade to Team</h3>
                            <p className="text-xs text-slate-400 mb-4">Collaborate with your team on shared collections and environment configs.</p>
                            <button onClick={() => appStore.showToast('Upgrade flow not implemented', 'info')} className="w-full py-2 bg-white text-slate-900 font-bold text-xs rounded uppercase tracking-wider hover:bg-sui-50 transition-colors">View Plans</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
