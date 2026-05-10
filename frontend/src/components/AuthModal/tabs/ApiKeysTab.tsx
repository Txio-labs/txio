import React, { useState } from 'react';
import { Plus, AlertCircle, Trash2, Copy, Check } from 'lucide-react';
import { ApiKey } from '../types';

interface ApiKeysTabProps {
  apiKeys: ApiKey[];
  onApiKeysChange: (keys: ApiKey[]) => void;
}

export const ApiKeysTab: React.FC<ApiKeysTabProps> = ({ 
  apiKeys, 
  onApiKeysChange 
}) => {
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCreateKey = () => {
    const rawKey = `sui_sk_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2)}`;
    const newKey: ApiKey = {
      id: Math.random().toString(),
      name: newKeyName || 'Untitled Key',
      prefix: `${rawKey.substring(0, 12)}...${rawKey.substring(rawKey.length - 4)}`,
      created: Date.now(),
      lastUsed: 'Never',
      status: 'active'
    };
    onApiKeysChange([newKey, ...apiKeys]);
    setGeneratedKey(rawKey);
    setNewKeyName('');
    setIsCreatingKey(false);
  };

  const handleRevokeKey = (id: string) => {
    onApiKeysChange(apiKeys.map(k => k.id === id ? { ...k, status: 'revoked' } : k));
  };

  const handleDeleteKey = (id: string) => {
    onApiKeysChange(apiKeys.filter(k => k.id !== id));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">API Keys</h2>
          <p className="text-slate-400 text-sm">
            Manage API keys for accessing the Flow Cloud API.
          </p>
        </div>
        <button 
          onClick={() => setIsCreatingKey(true)} 
          className="px-3 py-1.5 bg-sui-600 hover:bg-sui-500 text-white text-xs font-bold rounded flex items-center gap-2"
        >
          <Plus size={14} /> <span className="hidden sm:inline">Create Key</span>
        </button>
      </div>

      {generatedKey && (
        <div className="bg-emerald-900/20 border border-emerald-900/50 p-4 rounded-xl flex flex-col gap-2 mb-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Check size={16} /> Key Generated Successfully
          </div>
          <p className="text-xs text-slate-400">Save this key now. You won't be able to see it again.</p>
          <div className="flex gap-2">
            <code className="flex-1 bg-black/50 p-2 rounded text-emerald-200 font-mono text-xs border border-emerald-900/30 break-all">
              {generatedKey}
            </code>
            <button 
              onClick={() => copyToClipboard(generatedKey)} 
              className="p-2 bg-emerald-800/30 hover:bg-emerald-800/50 text-emerald-400 rounded border border-emerald-800/50"
            >
              {copiedKey ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <button 
            onClick={() => setGeneratedKey(null)} 
            className="self-end text-[10px] text-emerald-500 hover:text-emerald-300 underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {isCreatingKey && (
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl animate-in fade-in slide-in-from-top-2">
          <h3 className="text-sm font-bold text-white mb-3">Create New API Key</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Key Name</label>
              <input 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sui-500 outline-none" 
                placeholder="e.g. Production CI"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsCreatingKey(false)} 
                className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateKey} 
                disabled={!newKeyName.trim()} 
                className="px-3 py-1.5 bg-sui-600 hover:bg-sui-500 disabled:opacity-50 text-white text-xs font-bold rounded"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border border-slate-800 rounded-lg overflow-x-auto bg-slate-950">
        <table className="w-full text-left text-sm min-w-[600px]">
          <thead className="bg-slate-900 border-b border-slate-800 text-xs text-slate-500 uppercase font-medium">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Key Prefix</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {apiKeys.map((key) => (
              <tr key={key.id} className="group hover:bg-slate-900/50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-200">{key.name}</td>
                <td className="px-4 py-3 font-mono text-slate-500 text-xs">{key.prefix}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(key.created).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {key.status === 'active' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-900/20 text-emerald-400 text-[10px] font-bold border border-emerald-900/50">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700">
                      Revoked
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right flex justify-end gap-2">
                  {key.status === 'active' && (
                    <button 
                      onClick={() => handleRevokeKey(key.id)}
                      className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-900/20 rounded transition-colors"
                      title="Revoke Key"
                    >
                      <AlertCircle size={14} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteKey(key.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                    title="Delete Key"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {apiKeys.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-xs italic">
                  No API keys found. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};