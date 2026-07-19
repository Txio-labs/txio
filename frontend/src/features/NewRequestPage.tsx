import React, { useRef, useState } from 'react';
import { Terminal, Layers, Plus } from 'lucide-react';
import { appStore } from '@/lib/store';
import { RequestType, RequestItem } from '../types';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { ImportedRpcRequest, parseImportFile } from '@/lib/importRequest';
import { ImportCurlModal } from '@/components/ImportCurlModal';

interface NewRequestPageProps {
  tabId: string;
  initialData?: any;
}

export const NewRequestPage: React.FC<NewRequestPageProps> = ({ tabId }) => {
  const [isCurlModalOpen, setIsCurlModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      network: appStore.getSnapshot().network,
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

  const buildRequestItem = (imported: ImportedRpcRequest, id: string): RequestItem => ({
    id,
    name: imported.name || imported.method,
    type: RequestType.RPC,
    network: appStore.getSnapshot().network,
    rpcParams: { method: imported.method, params: imported.params },
    moveParams: { ...DEFAULT_MOVE_CALL },
    localVars: []
  });

  const handleImportedRequests = (requests: ImportedRpcRequest[]) => {
    if (!requests.length) return;

    const [first, ...rest] = requests;

    // The current tab becomes the first imported request.
    appStore.finalizeRequest(tabId, 'rpc', buildRequestItem(first, tabId));

    // Additional requests (from a file/HAR with multiple entries) each get their own tab.
    rest.forEach((req, index) => {
      appStore.openTab(
        'rpc',
        buildRequestItem(req, `rpc-import-${Date.now()}-${index}`)
      );
    });

    appStore.setActiveTab(tabId);

    appStore.showToast(
      requests.length > 1
        ? `Imported ${requests.length} requests`
        : `Imported "${first.method}"`,
      'success'
    );
  };

  const handleCurlImport = (request: ImportedRpcRequest) => {
    setIsCurlModalOpen(false);
    handleImportedRequests([request]);
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const requests = parseImportFile(text);
      handleImportedRequests(requests);
    } catch (err: any) {
      appStore.showToast(err?.message || 'Failed to import file', 'error');
    }
  };

  return (
    <div className="h-full bg-near-black flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <h1 className="text-lg font-bold text-slate-200 mb-6 px-1">Select Request Type</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
                onClick={() => handleCreate('rpc')}
                className="flex flex-col items-center gap-4 p-8 bg-dark-indigo-glow border border-white/5 rounded-lg hover:border-slate-600 hover:bg-white/5 transition-colors group text-center"
            >
                <div className="text-slate-500 group-hover:text-white transition-colors"><Terminal size={32} /></div>
                <div>
                    <div className="font-bold text-slate-200">JSON-RPC</div>
                    <div className="text-xs text-slate-500 mt-1">Standard RPC Method Call</div>
                </div>
            </button>

            <button 
                onClick={() => handleCreate('ptb')}
                className="flex flex-col items-center gap-4 p-8 bg-dark-indigo-glow border border-white/5 rounded-lg hover:border-slate-600 hover:bg-white/5 transition-colors group text-center"
            >
                <div className="text-slate-500 group-hover:text-white transition-colors"><Layers size={32} /></div>
                <div>
                    <div className="font-bold text-slate-200">Transaction Builder</div>
                    <div className="text-xs text-slate-500 mt-1">Move Call & PTB Construction</div>
                </div>
            </button>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/5">
             <div className="flex justify-center gap-4">
                 <button onClick={() => setIsCurlModalOpen(true)} className="text-xs text-slate-500 hover:text-slate-300 font-mono">Import cURL</button>
                 <button onClick={handleFileButtonClick} className="text-xs text-slate-500 hover:text-slate-300 font-mono">Import from File</button>
                 <input
                     ref={fileInputRef}
                     type="file"
                     accept=".json,.har,application/json"
                     className="hidden"
                     onChange={handleFileChange}
                 />
             </div>
        </div>
      </div>

      <ImportCurlModal
        isOpen={isCurlModalOpen}
        onClose={() => setIsCurlModalOpen(false)}
        onImport={handleCurlImport}
      />
    </div>
  );
};
