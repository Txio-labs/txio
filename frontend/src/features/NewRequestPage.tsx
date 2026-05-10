import React from 'react';
import { Terminal, Layers, Plus } from 'lucide-react';
import { appStore } from '@/lib/store';
import { RequestType, RequestItem } from '../types';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';

interface NewRequestPageProps {
  tabId: string;
  initialData?: any;
}

export const NewRequestPage: React.FC<NewRequestPageProps> = ({ tabId }) => {

  const handleCreate = (type: 'rpc' | 'ptb') => {
    let reqType = RequestType.RPC;
    let name = 'Untitled Request';

    if (type === 'ptb') {
        reqType = RequestType.TRANSACTION;
        name = 'Untitled PTB';
    }

    const requestData: RequestItem = {
      id: tabId,
      name: name,
      type: reqType,
      rpcParams: { method: '', params: [] },
      moveParams: { ...DEFAULT_MOVE_CALL },
      localVars: []
    };
    
    // 1. Finalize the request (changes tab type from 'new_request' to 'rpc' or 'ptb')
    appStore.finalizeRequest(tabId, type === 'ptb' ? 'ptb' : 'rpc', requestData);
    
    // 2. CRITICAL: Set this tab as active so WorkspaceContent re-renders with RPCBuilder
    appStore.setActiveTab(tabId);
    
    // Optional: Show a toast notification
    appStore.showToast(`${type === 'rpc' ? 'RPC' : 'PTB'} request created`, 'success');
  };

  return (
    <div className="h-full bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <h1 className="text-lg font-bold text-slate-200 mb-6 px-1">Select Request Type</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
                onClick={() => handleCreate('rpc')}
                className="flex flex-col items-center gap-4 p-8 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-600 hover:bg-slate-800 transition-colors group text-center"
            >
                <div className="text-slate-500 group-hover:text-white transition-colors"><Terminal size={32} /></div>
                <div>
                    <div className="font-bold text-slate-200">JSON-RPC</div>
                    <div className="text-xs text-slate-500 mt-1">Standard RPC Method Call</div>
                </div>
            </button>

            <button 
                onClick={() => handleCreate('ptb')}
                className="flex flex-col items-center gap-4 p-8 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-600 hover:bg-slate-800 transition-colors group text-center"
            >
                <div className="text-slate-500 group-hover:text-white transition-colors"><Layers size={32} /></div>
                <div>
                    <div className="font-bold text-slate-200">Transaction Builder</div>
                    <div className="text-xs text-slate-500 mt-1">Move Call & PTB Construction</div>
                </div>
            </button>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-800">
             <div className="flex justify-center gap-4">
                 <button onClick={() => appStore.showToast('Import cURL not implemented', 'info')} className="text-xs text-slate-500 hover:text-slate-300 font-mono">Import cURL</button>
                 <button onClick={() => appStore.showToast('File import not implemented', 'info')} className="text-xs text-slate-500 hover:text-slate-300 font-mono">Import from File</button>
             </div>
        </div>
      </div>
    </div>
  );
};