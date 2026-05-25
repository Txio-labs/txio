import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Layers, RefreshCw, Copy, Check, Plus } from 'lucide-react';
import { appStore } from '@/lib/store';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { apiService, AiChatMessage, AiToolCall } from '@/services/api';
import { RequestType } from '../types';
import { Avatar } from '../components/ui/Avatar';

interface Message extends AiChatMessage {
  toolCall?: AiToolCall | null;
}

const INITIAL_MESSAGE: Message = {
  role: 'model',
  text: 'Sui AI Console ready.'
};

export const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    INITIAL_MESSAGE
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const normalizeToolArgs = (
    toolCall: AiToolCall
  ) => toolCall.args || {};

  const resolveToolCallLabel = (
    toolCall: AiToolCall
  ) => {
    const args = normalizeToolArgs(toolCall);

    return typeof args.name === 'string' && args.name.trim()
      ? args.name
      : toolCall.name;
  };

  const handleSend = async (userMessage: string) => {
    const trimmedMessage = userMessage.trim();

    if (!trimmedMessage || isTyping) return;

    setInput('');
    const nextHistory: Message[] = [
      ...messages,
      { role: 'user', text: trimmedMessage }
    ];
    setMessages(prev => [
      ...prev,
      { role: 'user', text: trimmedMessage }
    ]);
    setIsTyping(true);

    try {
      const response = await apiService.sendAiChat(
        nextHistory.map(({ role, text }) => ({
          role,
          text
        }))
      );

      setMessages(prev => [
        ...prev,
        {
          role: response.role,
          text: response.text,
          toolCall:
            response.toolCall ?? null
        }
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error &&
        error.message.trim()
          ? error.message
          : 'AI Service Unavailable.';

      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: `Error: ${errorMessage}`
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const executeToolCall = (
    toolCall: AiToolCall
  ) => {
    const args = normalizeToolArgs(
      toolCall
    );

    if (toolCall.name === 'create_rpc_request') {
      appStore.openTab('rpc', {
        id: `rpc-gen-${Date.now()}`,
        name:
          typeof args.name === 'string' &&
          args.name.trim()
            ? args.name
            : 'Generated Request',
        type: RequestType.RPC,
        rpcParams: {
          method:
            typeof args.method === 'string'
              ? args.method
              : '',
          params: Array.isArray(args.params)
            ? args.params
            : []
        },
        moveParams: {
          ...DEFAULT_MOVE_CALL
        }
      });
    }

    if (toolCall.name === 'create_ptb') {
      appStore.openTab('ptb', {
        id: `ptb-gen-${Date.now()}`,
        name:
          typeof args.name === 'string' &&
          args.name.trim()
            ? args.name
            : 'Generated PTB',
        type: RequestType.TRANSACTION,
        rpcParams: {
          method: '',
          params: []
        },
        moveParams: {
          ...DEFAULT_MOVE_CALL
        },
        description:
          typeof args.description === 'string'
            ? args.description
            : undefined
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-near-black font-sans">
      <div className="px-4 py-2 border-b border-white/5 bg-dark-indigo-glow flex justify-between items-center shrink-0">
        <span className="font-bold text-slate-400 text-xs">AI Console</span>
        <button onClick={() => setMessages([INITIAL_MESSAGE])} className="p-1 text-slate-500 hover:text-white"><RefreshCw size={14}/></button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
             <Avatar 
                size="xs" 
                type={m.role === 'model' ? 'bot' : 'user'} 
                seed={m.role === 'model' ? 'sui-ai' : 'txio-user'} 
             />
             <div className={`max-w-[90%] space-y-2`}>
                 <div className={`p-3 rounded text-xs font-mono whitespace-pre-wrap relative group ${m.role === 'user' ? 'bg-slate-800 text-slate-200' : 'bg-near-black border border-white/5 text-slate-300'}`}>
                     {m.text}
                     {m.role === 'model' && (
                        <button onClick={() => handleCopy(m.text, i)} className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white">
                            {copiedId === i ? <Check size={12}/> : <Copy size={12}/>}
                        </button>
                     )}
                 </div>
                 {m.toolCall && (
                     <div className="bg-dark-indigo-glow border border-white/5 p-2 rounded flex items-center justify-between">
                         <div className="text-xs text-electric-violet font-mono flex items-center gap-2">
                             {m.toolCall.name === 'create_rpc_request' ? <Terminal size={12}/> : <Layers size={12}/>}
                             {resolveToolCallLabel(m.toolCall)}
                         </div>
                         <button onClick={() => executeToolCall(m.toolCall!)} className="p-1 bg-sui-700 text-white rounded hover:bg-electric-violet"><Plus size={12}/></button>
                     </div>
                 )}
             </div>
          </div>
        ))}
        {isTyping && <div className="text-xs text-slate-600 italic px-10">Processing...</div>}
      </div>

      <div className="p-3 border-t border-white/5 bg-dark-indigo-glow">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="relative">
              <input 
                  className="w-full bg-near-black border border-white/10 rounded p-2 pr-10 text-xs text-white font-mono focus:border-electric-violet outline-none"
                  placeholder="Enter prompt..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isTyping}
              />
              <button type="submit" disabled={!input.trim()} className="absolute right-2 top-1.5 text-slate-500 hover:text-white"><Send size={14}/></button>
          </form>
      </div>
    </div>
  );
};
