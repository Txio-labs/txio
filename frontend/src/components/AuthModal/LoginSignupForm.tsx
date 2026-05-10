import React, { useState } from 'react';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';

interface LoginSignupFormProps {
  mode: 'login' | 'signup';
  onModeChange: (mode: 'login' | 'signup') => void;
  onSubmit: (data: { name: string; email: string; password: string }) => void;
}

export const LoginSignupForm: React.FC<LoginSignupFormProps> = ({ 
  mode, 
  onModeChange, 
  onSubmit 
}) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: '', email: '', password: '' });
  };

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-slate-400 text-sm">
          {mode === 'login' 
            ? 'Enter your credentials to access your workspace' 
            : 'Join Flow for free'}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                required 
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-sui-500 focus:ring-1 focus:ring-sui-500/50 outline-none transition-all" 
                placeholder="John Doe" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
          </div>
        )}
        
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="email" 
              required 
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-sui-500 focus:ring-1 focus:ring-sui-500/50 outline-none transition-all" 
              placeholder="name@example.com" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="password" 
              required 
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-sui-500 focus:ring-1 focus:ring-sui-500/50 outline-none transition-all" 
              placeholder="••••••••" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
            />
          </div>
        </div>
        
        <button 
          type="submit" 
          className="w-full bg-sui-600 hover:bg-sui-500 text-white font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-sui-900/50 mt-6 flex items-center justify-center gap-2"
        >
          {mode === 'login' ? 'Sign In' : 'Create Account'} 
          <ArrowRight size={16} />
        </button>
      </form>
      
      <div className="mt-6 pt-6 border-t border-slate-800 text-center">
        <button 
          onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')} 
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <span className="text-sui-400 font-bold hover:underline">
            {mode === 'login' ? 'Sign Up' : 'Log In'}
          </span>
        </button>
      </div>
    </div>
  );
};