import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { RequestType } from '../../../types';
import { NETWORKS } from '@/lib/constants';

interface CodeSnippetProps {
  request: any;
  network: string;
}

export const CodeSnippet: React.FC<CodeSnippetProps> = ({ request, network }) => {
  const [isCopied, setIsCopied] = useState(false);

  const generateSnippet = () => {
    if (request.type === RequestType.RPC) {
      const endpoint = NETWORKS[network];
      return `curl -X POST ${endpoint} \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "jsonrpc": "2.0",\n    "id": 1,\n    "method": "${request.rpcParams.method}",\n    "params": ${JSON.stringify(request.rpcParams.params)}\n  }'`;
    }
    
    const { packageId, module, function: func, typeArguments, arguments: args, gasBudget } = request.moveParams;
    const argsString = args.map((a: any) => `"${a.value}"`).join(' ');
    const typeArgsString = typeArguments.length > 0 ? `--type-args ${typeArguments.join(' ')}` : '';
    
    return `sui client call \\\n  --package ${packageId} \\\n  --module ${module} \\\n  --function ${func} \\\n  --gas-budget ${gasBudget} \\\n  ${typeArgsString} \\\n  --args ${argsString}`;
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(generateSnippet());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="p-6">
      <div className="flex justify-end mb-4">
        <button 
          onClick={handleCopySnippet}
          className="h-[28px] px-3 bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
        >
          {isCopied ? <Check size={12} /> : <Copy size={12} />}
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-black p-6 rounded-xl border border-white/10 text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap select-text leading-relaxed shadow-2xl">
        {generateSnippet()}
      </pre>
    </div>
  );
};