import React from 'react';
import { AlertCircle, Clock, Beaker, Activity, ExternalLink, Eye, FileText } from 'lucide-react';
import { TestResult } from './types';

interface ResponseHeaderProps {
  isError: boolean;
  duration?: number;
  testResults: TestResult[];
  txDigest: string | null;
  viewMode: string;
  onViewModeChange: (mode: string) => void;
}

export const ResponseHeader: React.FC<ResponseHeaderProps> = ({
  isError,
  duration,
  testResults,
  txDigest,
  viewMode,
  onViewModeChange
}) => {
  const passedTests = testResults.filter(t => t.passed).length;
  const failedTests = testResults.filter(t => !t.passed).length;

  return (
    <div className="flex items-center justify-between px-4 h-12 bg-black shrink-0 border-b border-white/10">
      <div className="flex items-center gap-5 text-[11px] font-bold">
        <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${
          isError ? 'text-red-400 bg-red-900/20' : 'text-emerald-400 bg-emerald-900/20'
        }`}>
          {isError && <AlertCircle size={12} />}
          {isError ? 'EXECUTION FAILED' : 'SUCCESS'}
        </div>
        
        {duration && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock size={12}/> {duration}ms
          </div>
        )}
        
        {testResults.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-md text-slate-300 border border-white/10">
            <Beaker size={12}/> 
            <span className="text-emerald-400">{passedTests} Pass</span> / 
            <span className="text-red-400">{failedTests} Fail</span>
          </div>
        )}
        
        {txDigest && (
          <div 
            onClick={() => window.open(`https://suiscan.xyz/mainnet/tx/${txDigest}`, '_blank')}
            className="flex items-center gap-2 text-sui-400 hover:text-sui-300 cursor-pointer"
          >
            <Activity size={12} /> 
            <span className="font-mono">{txDigest.slice(0, 10)}...</span> 
            <ExternalLink size={10} />
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex bg-[#050505] rounded-lg p-0.5 border border-white/10">
          <button 
            onClick={() => onViewModeChange('pretty')}
            className={`p-1.5 rounded ${viewMode === 'pretty' ? 'bg-white/10 text-sui-400' : 'text-slate-500'}`}
          >
            <Eye size={14} />
          </button>
          <button 
            onClick={() => onViewModeChange('raw')}
            className={`p-1.5 rounded ${viewMode === 'raw' ? 'bg-white/10 text-sui-400' : 'text-slate-500'}`}
          >
            <FileText size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};