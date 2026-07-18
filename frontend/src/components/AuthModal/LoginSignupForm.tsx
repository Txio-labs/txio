import React, { useState } from 'react';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';

interface LoginSignupFormProps {
  mode: 'login' | 'signup';
  onModeChange: (mode: 'login' | 'signup') => void;
  onSubmit: (data: { name: string; email: string; password: string }) => Promise<void>;
}

export const LoginSignupForm: React.FC<LoginSignupFormProps> = ({ 
  mode, 
  onModeChange, 
  onSubmit 
}) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      setFormData({ name: '', email: '', password: '' });
    } catch {
      // AuthModal surfaces the backend error toast.
    } finally {
      setIsSubmitting(false);
    }
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
            : 'Join txio for free'}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div className="space-y-1">
            <label htmlFor="fullName" className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                id="fullName"
                type="text" 
                required 
                className="w-full bg-near-black border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-electric-violet focus:ring-1 focus:ring-electric-violet/50 outline-none transition-all" 
                placeholder="John Doe" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
          </div>
        )}
        
        <div className="space-y-1">
          <label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              id="email"
              type="email" 
              required 
              className="w-full bg-near-black border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-electric-violet focus:ring-1 focus:ring-electric-violet/50 outline-none transition-all" 
              placeholder="name@example.com" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              id="password"
              type="password" 
              required 
              className="w-full bg-near-black border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-electric-violet focus:ring-1 focus:ring-electric-violet/50 outline-none transition-all" 
              placeholder="••••••••" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
            />
          </div>
        </div>
        
        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-electric-violet hover:bg-electric-violet text-white font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-sui-900/50 mt-6 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isSubmitting
            ? 'Please wait...'
            : mode === 'login'
              ? 'Sign In'
              : 'Create Account'} 
          <ArrowRight size={16} />
        </button>
      </form>
      
      <div className="mt-6 pt-6 border-t border-white/5 text-center">
        <button 
          onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')} 
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <span className="text-electric-violet font-bold hover:underline">
            {mode === 'login' ? 'Sign Up' : 'Log In'}
          </span>
        </button>
      </div>
    </div>
  );
};
