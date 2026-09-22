import React from 'react';
import { Radio } from 'lucide-react';

// JSON-RPC calls in Txio go straight over a fetch() POST with a fixed
// `Content-Type: application/json` body — there is no per-request custom
// header concept in the current request model (see RequestItem in
// src/types/index.ts). This tab is a placeholder so the tab strip matches
// the reference layout without fabricating header state that nothing reads
// or sends.
export const HeadersEditor: React.FC = () => (
  <div className="p-6 md:p-10 max-w-2xl mx-auto">
    <div className="flex flex-col items-center text-center gap-3 py-12 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-near-black/40">
      <Radio size={20} className="text-slate-400" />
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No custom headers for this request</h3>
      <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
        JSON-RPC calls are sent as a single <code className="font-mono text-[11px]">application/json</code> POST body —
        there&apos;s nothing to configure here. Use environment variables to parameterize the request body instead.
      </p>
    </div>
  </div>
);
