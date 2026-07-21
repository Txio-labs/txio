import React, { useState } from 'react';
import { AlertCircle, Terminal, X } from 'lucide-react';
import { curlToRpcRequest, ImportedRpcRequest } from '@/lib/importRequest';

interface ImportCurlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (request: ImportedRpcRequest) => void;
}

const PLACEHOLDER = `curl -X POST https://fullnode.mainnet.sui.io:443 \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"suix_getAllBalances","params":["0xabc..."]}'`;

export const ImportCurlModal: React.FC<ImportCurlModalProps> = ({ isOpen, onClose, onImport }) => {
  const [curlText, setCurlText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setCurlText('');
    setError(null);
    onClose();
  };

  const handleImport = () => {
    try {
      const request = curlToRpcRequest(curlText);
      setCurlText('');
      setError(null);
      onImport(request);
    } catch (err: any) {
      setError(err?.message || 'Could not parse this cURL command');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-near-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sui-500 to-transparent opacity-50" />

        <div className="p-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-dark-indigo-glow rounded-xl border border-white/5 flex items-center justify-center shrink-0">
                <Terminal size={18} className="text-electric-violet" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Import cURL</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paste a cURL command for a Sui JSON-RPC call.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-500 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <textarea
            value={curlText}
            onChange={(e) => {
              setCurlText(e.target.value);
              if (error) setError(null);
            }}
            placeholder={PLACEHOLDER}
            rows={8}
            autoFocus
            className="w-full bg-black/40 border border-white/5 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-violet/50 resize-none"
          />

          {error && (
            <div className="mt-3 flex items-start gap-2 text-xs text-red-400 bg-red-900/10 border border-red-900/30 rounded-lg p-3">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={handleClose}
              className="px-4 py-3 bg-dark-indigo-glow border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!curlText.trim()}
              className="px-4 py-3 bg-electric-violet hover:bg-electric-violet disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-sui-900/20 transition-all active:scale-95"
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
