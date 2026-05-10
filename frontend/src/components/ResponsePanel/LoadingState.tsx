import React from 'react';

export const LoadingState: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-black">
      <div className="relative">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-t-2 border-sui-400"></div>
        <div className="absolute inset-0 bg-sui-400/10 blur-xl animate-pulse rounded-full"></div>
      </div>
      <p className="font-mono text-xs mt-6 animate-pulse tracking-[0.3em] text-sui-400/80">
        EXECUTING ON-CHAIN...
      </p>
    </div>
  );
};