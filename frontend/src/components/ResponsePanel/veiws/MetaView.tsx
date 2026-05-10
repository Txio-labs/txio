import React from 'react';
import { Check, XCircle, Server } from 'lucide-react';
import { TestResult } from '../types';

interface MetaViewProps {
  endpoint?: string;
  status?: number;
  testResults: TestResult[];
  gasSummary: any;
}

export const MetaView: React.FC<MetaViewProps> = ({
  endpoint,
  status,
  testResults,
  gasSummary
}) => {
  const isSuccess = status ? status < 400 : false;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-black border border-white/10 rounded-2xl p-6">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Server size={14}/> RPC Connection
          </h4>
          <div className="text-xs text-slate-300 font-mono break-all">{endpoint || 'Unknown Endpoint'}</div>
          <div className="mt-2 flex items-center gap-2">
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              isSuccess ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>
              HTTP {status}
            </div>
          </div>
        </div>
        
        <div className="bg-black border border-white/10 rounded-2xl p-6">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
            Finality
          </h4>
          <div className="text-emerald-400 font-bold flex items-center gap-2">
            <Check size={16}/> PROVEN IMMUTABLE
          </div>
        </div>
      </div>

      {testResults.length > 0 && (
        <div className="bg-black border border-white/10 rounded-2xl p-6">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
            Test Results
          </h4>
          <div className="space-y-2">
            {testResults.map(t => (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                {t.passed ? (
                  <Check size={14} className="text-emerald-500 shrink-0"/>
                ) : (
                  <XCircle size={14} className="text-red-500 shrink-0"/>
                )}
                <span className={t.passed ? 'text-slate-300' : 'text-red-300'}>
                  <span className="font-bold text-slate-500 uppercase text-[9px] mr-2">
                    {t.category}
                  </span>
                  <span className="font-mono">{t.target.replace('_', ' ')}</span>
                  <span className="mx-2 opacity-50">{t.operator}</span>
                  <span className="font-bold">{String(t.value || '').split('::').pop()}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {gasSummary && (
        <div className="bg-black border border-white/10 rounded-2xl p-6">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
            Gas Breakdown (MIST)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Object.entries(gasSummary).map(([key, val]) => (
              <div key={key}>
                <div className="text-[10px] text-slate-600 font-bold uppercase mb-1">
                  {key.replace(/([A-Z])/g, ' $1')}
                </div>
                <div className="text-sm font-mono text-amber-500 font-bold">
                  {val as string}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};