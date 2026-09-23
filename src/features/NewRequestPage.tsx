import React, { useRef, useState } from 'react';
import { Terminal, Layers, FolderOpen, FolderPlus, FolderKanban, ArrowRight } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { RequestType, RequestItem, ChainId } from '../types';
import { DEFAULT_MOVE_CALL, RPC_CHAINS } from '@/lib/constants';
import { ImportedRpcRequest, parseImportFile } from '@/lib/importRequest';
import { ImportCurlModal } from '@/components/ImportCurlModal';
import { apiService } from '@/services/api';
import { withTxChain } from '@/services/transactionService';

// Each chain builds transactions in its own native shape; the label says
// what the user will actually get.
export const TRANSACTION_OPTIONS: Record<ChainId, { title: string; subtitle: string }> = {
  sui: { title: 'Sui Transaction', subtitle: 'Move call, simulated then signed with your wallet' },
  evm: { title: 'EVM Contract Call', subtitle: 'Read or write a contract, or send a transfer' },
  solana: { title: 'Solana Transaction', subtitle: 'Program instruction, simulated then signed' },
  stellar: { title: 'Stellar Transaction', subtitle: 'Soroban contract call, simulated then signed' },
};

const LAST_CHAIN_KEY = 'txio_newRequestChain';

const readLastChain = (): ChainId | null => {
  try {
    const v = localStorage.getItem(LAST_CHAIN_KEY);
    return RPC_CHAINS.some((c) => c.id === v) ? (v as ChainId) : null;
  } catch {
    return null;
  }
};

interface NewRequestPageProps {
  tabId: string;
  initialData?: any;
}

export const NewRequestPage: React.FC<NewRequestPageProps> = ({ tabId, initialData }) => {
  const [isCurlModalOpen, setIsCurlModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { collections } = useAppStore();

  // If opened generically (e.g. the tab bar "+" or command palette), the
  // user hasn't chosen a destination yet — ask before the RPC/PTB type
  // picker. If opened from a collection's own "+" (CollectionTree.tsx), the
  // destination is already decided, so skip straight to the type picker.
  const openedFromCollection = Boolean(initialData?.collectionId);
  const [collectionId, setCollectionId] = useState<string | undefined>(initialData?.collectionId);
  const [destinationChosen, setDestinationChosen] = useState(openedFromCollection);
  const [isPickingExisting, setIsPickingExisting] = useState(false);

  const topLevelCollections = collections.filter((c) => c.type === 'collection');

  // No chain is preselected on first use — txio has no "default" chain.
  // After that, the last choice is remembered as a convenience.
  const [chain, setChain] = useState<ChainId | null>(
    () => initialData?.rpcParams?.chain ?? readLastChain()
  );
  const chooseChain = (id: ChainId) => {
    setChain(id);
    try {
      localStorage.setItem(LAST_CHAIN_KEY, id);
    } catch {
      // storage unavailable — the choice just isn't remembered
    }
  };
  const chainLabel = RPC_CHAINS.find((c) => c.id === chain)?.label;
  const txOption = chain ? TRANSACTION_OPTIONS[chain] : null;

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

  const handleChooseExisting = (id: string) => {
    setCollectionId(id);
    setDestinationChosen(true);
  };

  const handleRunWithoutCollection = () => {
    setCollectionId(undefined);
    setDestinationChosen(true);
  };

  const handleCreateNewCollection = async () => {
    const name = window.prompt('Name your new collection:', 'My Collection');
    if (!name || !name.trim()) return;

    const newCollection = await appStore.createCollection(name.trim());
    if (!newCollection) return;

    setCollectionId(newCollection.id);
    setDestinationChosen(true);
  };

  const handleCreate = async (type: 'rpc' | 'transaction') => {
    if (!chain) return;
    const isTx = type === 'transaction';

    const base: RequestItem = {
      id: tabId,
      name: isTx ? `Untitled ${TRANSACTION_OPTIONS[chain].title}` : `Untitled ${chainLabel} Request`,
      type: isTx ? RequestType.TRANSACTION : RequestType.RPC,
      network: appStore.getSnapshot().network,
      rpcParams: { method: '', params: [], chain },
      moveParams: { ...DEFAULT_MOVE_CALL },
      localVars: []
    };
    const requestData = isTx ? withTxChain(base, chain) : base;

    // 1. Finalize the request (changes tab type from 'new_request' to 'rpc')
    appStore.finalizeRequest(tabId, 'rpc', requestData);

    // 2. CRITICAL: Set this tab as active so WorkspaceContent re-renders with RPCBuilder
    appStore.setActiveTab(tabId);

    // 3. If this request was opened from a collection sidebar quick-action,
    //    persist it to that collection immediately so it appears in the tree.
    if (collectionId) {
      try {
        await apiService.addRequest(collectionId, requestData);
        await appStore.fetchCollections();
        appStore.showToast(`${requestData.name.replace('Untitled ', '')} added to ${collectionName ?? 'collection'}`, 'success');
      } catch {
        appStore.showToast(`${requestData.name.replace('Untitled ', '')} created`, 'success');
      }
    } else {
      appStore.showToast(`${requestData.name.replace('Untitled ', '')} created`, 'success');
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

  if (!destinationChosen) {
    return (
      <div className="h-full bg-white dark:bg-near-black flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-200 mb-1 px-1">Where should this request live?</h1>
          <p className="text-xs text-slate-500 mb-6 px-1">Save it to a collection now, or skip and run it standalone.</p>

          {!isPickingExisting ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setIsPickingExisting(true)}
                disabled={topLevelCollections.length === 0}
                className="flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/5 rounded-lg hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group text-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 dark:disabled:hover:border-white/5 disabled:hover:bg-slate-50 dark:disabled:hover:bg-dark-indigo-glow"
                title={topLevelCollections.length === 0 ? 'No collections yet' : undefined}
              >
                <div className="text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors"><FolderKanban size={26} /></div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-200 text-sm">Existing Collection</div>
                  <div className="text-xs text-slate-500 mt-1">Continue in a collection you already have</div>
                </div>
              </button>

              <button
                onClick={() => void handleCreateNewCollection()}
                className="flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/5 rounded-lg hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group text-center"
              >
                <div className="text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors"><FolderPlus size={26} /></div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-200 text-sm">New Collection</div>
                  <div className="text-xs text-slate-500 mt-1">Create a collection for this request</div>
                </div>
              </button>

              <button
                onClick={handleRunWithoutCollection}
                className="flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/5 rounded-lg hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group text-center"
              >
                <div className="text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors"><ArrowRight size={26} /></div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-200 text-sm">No Collection</div>
                  <div className="text-xs text-slate-500 mt-1">Run standalone — save it later if you want</div>
                </div>
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/5 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Choose a collection</span>
                <button onClick={() => setIsPickingExisting(false)} className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-300">Back</button>
              </div>
              <div className="max-h-72 overflow-y-auto custom-scrollbar p-1.5">
                {topLevelCollections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleChooseExisting(c.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <FolderKanban size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate flex-1">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white dark:bg-near-black flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-200 mb-2 px-1">Select Request Type</h1>

        {collectionName && (
          <div className="flex items-center gap-2 mb-6 px-1 text-xs text-slate-500 dark:text-slate-400">
            <FolderOpen size={13} className="text-amber-500/80 shrink-0" />
            <span>Adding to <span className="text-slate-900 dark:text-slate-200 font-medium">{collectionName}</span></span>
          </div>
        )}
        {!collectionName && <div className="mb-6" />}

        <div className="mb-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">Chain</div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Chain">
            {RPC_CHAINS.map((c) => (
              <button
                key={c.id}
                role="radio"
                aria-checked={chain === c.id}
                onClick={() => chooseChain(c.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  chain === c.id
                    ? 'border-electric-violet/60 bg-electric-violet/10 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {!chain && <p className="text-xs text-slate-500 mt-2 px-1">Pick the chain this request targets.</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
                onClick={() => handleCreate('rpc')}
                disabled={!chain}
                className="flex flex-col items-center gap-4 p-8 bg-slate-50 dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/5 rounded-lg enabled:hover:border-slate-400 dark:enabled:hover:border-slate-600 enabled:hover:bg-slate-100 dark:enabled:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors group text-center"
            >
                <div className="text-slate-400 dark:text-slate-500 group-enabled:group-hover:text-slate-900 dark:group-enabled:group-hover:text-white transition-colors"><Terminal size={32} /></div>
                <div>
                    <div className="font-bold text-slate-900 dark:text-slate-200">{chainLabel ? `${chainLabel} JSON-RPC` : 'JSON-RPC'}</div>
                    <div className="text-xs text-slate-500 mt-1">Call any RPC method on the node</div>
                </div>
            </button>

            <button
                onClick={() => handleCreate('transaction')}
                disabled={!chain}
                className="flex flex-col items-center gap-4 p-8 bg-slate-50 dark:bg-dark-indigo-glow border border-slate-200 dark:border-white/5 rounded-lg enabled:hover:border-slate-400 dark:enabled:hover:border-slate-600 enabled:hover:bg-slate-100 dark:enabled:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors group text-center"
            >
                <div className="text-slate-400 dark:text-slate-500 group-enabled:group-hover:text-slate-900 dark:group-enabled:group-hover:text-white transition-colors"><Layers size={32} /></div>
                <div>
                    <div className="font-bold text-slate-900 dark:text-slate-200">{txOption?.title ?? 'Transaction'}</div>
                    <div className="text-xs text-slate-500 mt-1">{txOption?.subtitle ?? 'Build and sign a transaction'}</div>
                </div>
            </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5">
             <div className="flex justify-center gap-4">
                 <button onClick={() => setIsCurlModalOpen(true)} className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 font-mono">Import cURL</button>
                 <button onClick={handleFileButtonClick} className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 font-mono">Import from File</button>
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
