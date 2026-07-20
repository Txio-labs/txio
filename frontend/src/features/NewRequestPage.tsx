import React, { useRef, useState } from 'react';
import { Terminal, Layers, FolderOpen } from 'lucide-react';
import { appStore } from '@/lib/store';
import { RequestType, RequestItem } from '../types';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { ImportedRpcRequest, parseImportFile } from '@/lib/importRequest';
import { ImportCurlModal } from '@/components/ImportCurlModal';
import { apiService } from '@/services/api';

interface NewRequestPageProps {
  tabId: string;
  initialData?: any;
}

export const NewRequestPage: React.FC<NewRequestPageProps> = ({ tabId, initialData }) => {
  const [isCurlModalOpen, setIsCurlModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const collectionId: string | undefined = initialData?.collectionId;

  // Resolve a human-readable collection name for display when pre-scoped.
  const collectionName = collectionId
    ? (() => {
        type CollectionNode = ReturnType<typeof appStore.getSnapshot>['collections'][number];
        const findCollection = (nodes: CollectionNode[], id: string): string | undefined => {
          for (const node of nodes) {
            if (node.id === id) return node.name;
            if (node.children) {
              const found = findCollection(node.children, id);
              if (found) return found;
            }
          }
          return undefined;
        };
        return findCollection(appStore.getSnapshot().collections, collectionId) ?? 'collection';
      })()
    : undefined;

  const handleCreate = async (type: 'rpc' | 'ptb') => {
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

    // 3. If this request was opened from a collection sidebar quick-action,
    //    persist it to that collection immediately so it appears in the tree.
    if (collectionId) {
      try {
        await apiService.addRequest(collectionId, requestData);
        await appStore.fetchCollections();
        appStore.showToast(`${type === 'rpc' ? 'RPC' : 'PTB'} request added to ${collectionName ?? 'collection'}`, 'success');
      } catch {
        appStore.showToast(`${type === 'rpc' ? 'RPC' : 'PTB'} request created`, 'success');
      }
    } else {
      appStore.showToast(`${type === 'rpc' ? 'RPC' : 'PTB'} request created`, 'success');
    }
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

  const handleImportedRequests = async (requests: ImportedRpcRequest[]) => {
    if (!requests.length) return;

    const [first, ...rest] = requests;

    // The current tab becomes the first imported request.
    const firstItem = buildRequestItem(first, tabId);
    appStore.finalizeRequest(tabId, 'rpc', firstItem);

    // Additional requests (from a file/HAR with multiple entries) each get their own tab.
    rest.forEach((req, index) => {
      appStore.openTab(
        'rpc',
        buildRequestItem(req, `rpc-import-${Date.now()}-${index}`)
      );
    });

    appStore.setActiveTab(tabId);

    // If opened from a collection, persist the first imported request to that collection.
    if (collectionId) {
      try {
        await apiService.addRequest(collectionId, firstItem);
        await appStore.fetchCollections();
      } catch {
        // Non-fatal — request is still open in the tab
      }
    }

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
        <h1 className="text-lg font-bold text-slate-200 mb-2 px-1">Select Request Type</h1>

        {collectionName && (
          <div className="flex items-center gap-2 mb-6 px-1 text-xs text-slate-400">
            <FolderOpen size={13} className="text-amber-500/80 shrink-0" />
            <span>Adding to <span className="text-slate-200 font-medium">{collectionName}</span></span>
          </div>
        )}
        {!collectionName && <div className="mb-6" />}
        
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
