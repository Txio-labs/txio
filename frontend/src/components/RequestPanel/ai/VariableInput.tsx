import React from 'react';
import { EnvironmentVariable } from '../../../types';

interface VariableInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  envVars: EnvironmentVariable[];
}

export const VariableInput: React.FC<VariableInputProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  className, 
  disabled,
  envVars 
}) => {
  const hasVar = value.includes('{{');
  const isVarResolved = hasVar && envVars.some(v => value.includes(`{{${v.key}}}`));

  return (
    <div className="relative w-full group">
      <input 
        type="text" 
        disabled={disabled}
        className={`${className} ${
          hasVar 
            ? (isVarResolved ? 'text-emerald-400 font-bold' : 'text-amber-500 font-bold') 
            : 'text-slate-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} transition-all`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hasVar && (
        <div 
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${isVarResolved ? 'bg-emerald-500' : 'bg-amber-500'} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} 
          title={isVarResolved ? "Resolved Variable" : "Unresolved Variable"}
        />
      )}
    </div>
  );
};